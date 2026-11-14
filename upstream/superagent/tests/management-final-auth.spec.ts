/** Real Store/HTTP/Mesh authority with explicit CLI/agent fixtures; no online model or Worker isolation claim. */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { Setup } from '../src/app/setup.ts'
import { Passes } from '../src/app/passes.ts'
import { Commands } from '../src/infra/commands.ts'
import { workerBin } from '../src/infra/environment.ts'
import { MeshSecurityStore } from '../src/extensions/mesh/security-store.ts'
import { MeshAccessDenied } from '../src/extensions/mesh/auth.ts'
import { feishuKind } from '../src/sources/feishu.ts'
import { KV } from '../src/kv.ts'
import { startRuntime, type Host } from './fixtures/host.ts'
import { testMachine } from './fixtures/deployment.ts'

let h: Host | undefined
afterEach(async () => { vi.useRealTimers(); await h?.stop(); h = undefined })
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function host() {
  h = await startRuntime()
  await vi.waitFor(() => expect(h!.runtime.health['sync:feishu']).toMatchObject({ state: 'ready' }))
  await h.runtime.idle()
  return h
}
function revoke() {
  const facts = new MeshSecurityStore(h!.runtime.store), tenant = h!.runtime.store.get('mesh-instance-tenant') as string
  const policy = facts.policy(tenant)!
  facts.setPolicy({ ...policy, emergencyRevocationEpoch: policy.emergencyRevocationEpoch + 1 })
}
const authorization = () => h!.ctx.cognitiveMesh.authorizeRequest('fixture-host-admin-credential-01234567890123456789')

it('refuses the actual HTTP settings commit after revocation during an asynchronous model check', async () => {
  const { runtime, ctx, api } = await host(), pending = deferred<unknown>(), entered = deferred<void>()
  const llm = ctx.llm as unknown as { resolveCallConfig: ReturnType<typeof vi.fn> }
  llm.resolveCallConfig.mockImplementationOnce(() => { entered.resolve(); return pending.promise })
  const before = runtime.store.settings().executor, revision = runtime.store.blockRevision('executor')
  const model = { provider: 'test-provider', model: 'test-model' }
  const response = api('PUT', 'settings/executor', { value: { ...before, model, maxWorkers: 5 }, revision })
  await entered.promise; revoke(); pending.resolve(model)
  expect(await response).toEqual({ status: 401, body: { error: 'Access denied' } })
  expect(runtime.store.settings().executor).toEqual(before)
  expect(runtime.store.blockRevision('executor')).toBe(revision)
})
it('refuses a Source account commit and restart after revocation during account verification', async () => {
  const { runtime, api } = await host(), pending = deferred<void>(), entered = deferred<void>()
  vi.spyOn(Setup.prototype, 'checkAccounts').mockImplementationOnce(() => { entered.resolve(); return pending.promise })
  const restart = vi.spyOn(Setup.prototype, 'restart'), before = runtime.settings.block('source:github')
  const value = before.value as { enabled: boolean; config: Record<string, unknown> }
  const response = api('PUT', 'settings/source:github', { value: { ...value, config: { ...value.config, cli: '/fixture/other-gh' } }, revision: before.revision })
  await entered.promise; revoke(); pending.resolve()
  expect((await response).status).toBe(401)
  expect(runtime.settings.block('source:github')).toEqual(before)
  expect(restart).not.toHaveBeenCalled()
})
it('refuses policy sync persistence after revocation and never retries the request as a system operation', async () => {
  const { runtime, api } = await host(), pending = deferred<unknown>(), entered = deferred<void>()
  const lark = vi.mocked(Commands.prototype.lark)
  lark.mockImplementationOnce(() => { entered.resolve(); return pending.promise as never })
  const before = runtime.store.settings().policy, revision = runtime.store.blockRevision('policy')
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const response = api('POST', 'policy-sync/feishu')
  await entered.promise; revoke(); pending.resolve({ users: [{ member_id: 'new-member', name: 'New' }], has_more: false })
  expect((await response).status).toBe(401)
  expect(runtime.store.settings().policy).toEqual(before)
  expect(runtime.store.blockRevision('policy')).toBe(revision)
  const count = lark.mock.calls.length
  await vi.advanceTimersByTimeAsync(60000)
  expect(lark.mock.calls.length).toBe(count)
})
it('does not hand a failed but still authenticated manual sync to the automatic retry loop', async () => {
  const { api } = await host(), lark = vi.mocked(Commands.prototype.lark)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  lark.mockRejectedValueOnce(new Error('owned network fixture failure'))
  expect((await api('POST', 'policy-sync/feishu')).status).toBe(500)
  const count = lark.mock.calls.length
  await vi.advanceTimersByTimeAsync(60000)
  expect(lark.mock.calls.length).toBe(count)
})
it('blocks the real Source label writer after its external read returns to a revoked request', async () => {
  const { runtime, api } = await host(), pending = deferred<unknown>(), entered = deferred<void>()
  vi.mocked(Commands.prototype.lark).mockImplementationOnce(() => { entered.resolve(); return pending.promise as never })
  const before = runtime.store.get(KV.sources.labels('feishu'))
  const response = api('POST', 'sources/feishu/labels')
  await entered.promise; revoke(); pending.resolve({ chats: [{ chat_id: 'owned-chat', name: 'Must not persist' }] })
  expect((await response).status).toBe(401)
  expect(runtime.store.get(KV.sources.labels('feishu'))).toEqual(before)
})
it('keeps a retained Source context and its signal/authorization clones revoked at actual subprocess dispatch', async () => {
  const { runtime } = await host(), request = authorization()
  vi.mocked(Commands.prototype.run).mockRestore() // This negative must reach the real final dispatch check.
  const context = runtime.context(feishuKind, () => { request.check() })
  const commands = context.commands.withSignal(new AbortController().signal).withAuthorization(() => {})
  const target = join(h!.directory, 'must-not-exist')
  revoke()
  expect(() => context.state.set(KV.sources.labels('feishu'), {})).toThrow(MeshAccessDenied)
  const facts = new MeshSecurityStore(runtime.store), tenant = runtime.store.get('mesh-instance-tenant') as string, before = facts.auditCount(tenant)
  expect(() => context.atomic(() => { throw new Error('must never enter') })).toThrow(MeshAccessDenied)
  expect(facts.auditCount(tenant)).toBe(before + 1)
  await expect(commands.run(process.execPath, ['-e', 'require("node:fs").writeFileSync(process.argv[1],"bad")', target])).rejects.toThrow(MeshAccessDenied)
  expect(existsSync(target)).toBe(false)
})
it('keeps a previously authorized pause commit but refuses later scheduling after revocation during delivery', async () => {
  const { runtime, api } = await host(), pending = deferred<'injected'>(), entered = deferred<void>()
  vi.spyOn(runtime.sessions, 'delivery').mockImplementationOnce(() => { entered.resolve(); return pending.promise })
  const passes = vi.spyOn(Passes.prototype, 'request')
  const response = api('POST', 'executor/pause', { paused: true })
  await entered.promise
  expect(runtime.store.settings().paused).toBe(true) // This write was admitted before revocation; do not pretend it rolls back.
  const count = passes.mock.calls.length
  revoke(); pending.resolve('injected')
  expect((await response).status).toBe(401)
  expect(runtime.store.settings().paused).toBe(true)
  expect(passes.mock.calls.length).toBe(count)
})
it.each([false, true])('repairs committed but unapplied commands on a fresh retry (also changes another field: %s)', async changed => {
  const { runtime, api, directory } = await host(), pending = deferred<void>(), entered = deferred<void>()
  const apply = vi.spyOn(Setup.prototype, 'blockCommands').mockImplementationOnce(async (_blocked, authorize) => {
    entered.resolve(); await pending.promise; authorize?.()
  })
  const executor = runtime.store.settings().executor
  const value = { ...executor, blockedCommands: [...executor.blockedCommands, 'm0-owned-blocked'] }
  const first = api('PUT', 'settings/executor', { value, revision: runtime.store.blockRevision('executor') })
  await entered.promise
  expect(runtime.store.settings().executor.blockedCommands).toContain('m0-owned-blocked')
  revoke(); pending.resolve()
  expect((await first).status).toBe(401)
  expect(existsSync(join(workerBin(directory), 'm0-owned-blocked'))).toBe(false)
  // An unrelated tool update may change its own allowed field, but cannot apply the revoked management request's environment.
  await runtime.settings.save('executor', { ...value, maxWorkers: value.maxWorkers + 1 }, runtime.store.blockRevision('executor'), 'tool')
  expect(apply).toHaveBeenCalledTimes(1)
  expect(existsSync(join(workerBin(directory), 'm0-owned-blocked'))).toBe(false)
  const revision = runtime.store.blockRevision('executor')
  const current = runtime.store.settings().executor
  const retry = await api('PUT', 'settings/executor', { value: changed ? { ...current, maxWorkers: current.maxWorkers + 1 } : current, revision })
  expect(retry).toMatchObject({ status: 200, body: { saved: true, restarting: false } })
  expect(runtime.store.blockRevision('executor')).toBe(revision + (changed ? 1 : 0))
  expect(existsSync(join(workerBin(directory), 'm0-owned-blocked'))).toBe(true)
})
it('serializes environment publication and refuses an older writer after a concurrent settings save', async () => {
  const { runtime, api, directory } = await host(), entered = deferred<void>(), original = Setup.prototype.blockCommands
  let signalled = false
  vi.spyOn(Setup.prototype, 'blockCommands').mockImplementation(function(this: Setup, blocked, authorize) {
    return original.call(this, blocked, () => {
      authorize?.()
      if (!signalled && readdirSync(workerBin(directory)).some(name => name.startsWith('.gh.') && name.endsWith('.tmp'))) {
        signalled = true; entered.resolve()
      }
    })
  })
  const before = runtime.store.settings().executor
  const first = api('PUT', 'settings/executor', { value: { ...before, blockedCommands: [...before.blockedCommands, 'm0-old-block'] }, revision: runtime.store.blockRevision('executor') })
  await entered.promise
  const next = await api('PUT', 'settings/executor', { value: { ...before, blockedCommands: [...before.blockedCommands, 'm0-new-block'] }, revision: runtime.store.blockRevision('executor') })
  expect((await first).status).toBe(409)
  expect(next.status).toBe(200)
  expect(existsSync(join(workerBin(directory), 'm0-new-block'))).toBe(true)
  expect(existsSync(join(workerBin(directory), 'm0-old-block'))).toBe(false)
})
it('recognizes unapplied account settings when a deferred restart was cancelled, then accepts a new authorized retry', async () => {
  const { runtime, api } = await host()
  vi.spyOn(Setup.prototype, 'checkAccounts').mockResolvedValue(undefined)
  const restart = vi.spyOn(Setup.prototype, 'restart')
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const before = runtime.settings.block('source:github'), original = before.value as { enabled: boolean; config: Record<string, unknown> }
  const value = { ...original, config: { ...original.config, cli: '/fixture/new-account-gh' } }
  expect(await api('PUT', 'settings/source:github', { value, revision: before.revision })).toMatchObject({ status: 200, body: { restarting: true } })
  revoke(); await vi.advanceTimersByTimeAsync(1)
  expect(await runtime.settings.save('eval', runtime.store.settings().eval, runtime.store.blockRevision('eval'), 'tool')).toMatchObject({ restarting: false })
  const policy = runtime.store.settings().policy
  expect(await runtime.settings.save('policy', { ...policy, rules: [{ id: 'owned-test', name: 'Owned', enabled: true, instruction: 'Fixture only' }] }, runtime.store.blockRevision('policy'), 'sync'))
    .toMatchObject({ restarting: false })
  await vi.advanceTimersByTimeAsync(1)
  expect(restart).toHaveBeenCalledTimes(1)
  const revision = runtime.store.blockRevision('source:github')
  expect(await api('PUT', 'settings/source:github', { value, revision })).toMatchObject({ status: 200, body: { restarting: true } })
  expect(runtime.store.blockRevision('source:github')).toBe(revision)
  expect(restart).toHaveBeenCalledTimes(2)
  expect(() => restart.mock.calls[0]![0]!()).toThrow(MeshAccessDenied)
  expect(() => restart.mock.calls[1]![0]!()).not.toThrow()
})
it.each(['success', 'failure'])('does not disclose a late model-catalog %s after request revocation', async mode => {
  const { ctx, api } = await host(), pending = deferred<never>(), entered = deferred<void>()
  ctx.sessionController.modelCatalog = () => { entered.resolve(); return pending.promise }
  const response = api('GET', 'models')
  await entered.promise; revoke()
  if (mode === 'success') pending.resolve({ providerDetails: 'not for revoked request' } as never)
  else pending.reject(new Error('private provider diagnostic'))
  expect(await response).toEqual({ status: 401, body: { error: 'Access denied' } })
})
it('rechecks a management restart when its delayed callback actually fires', async () => {
  const { ctx, directory } = await host(), request = authorization(), restart = vi.fn()
  const setup = new Setup({ context: ctx, machine: testMachine({ stateDir: directory }), lifetime: new AbortController().signal, restart })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  setup.restart(() => { request.check() }); revoke()
  await vi.advanceTimersByTimeAsync(1)
  expect(restart).not.toHaveBeenCalled()
})
