import { Context } from '@deepseek-ai/cordis'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { Store } from '../src/app/store.ts'
import { registerHttp, type HttpHost } from '../src/app/http.ts'
import { MeshSecurityStore } from '../src/extensions/mesh/security-store.ts'
import { TrustedIdentityAuthority } from '../src/extensions/mesh/auth.ts'
import { LocalSafetyGate } from '../src/extensions/mesh/safety.ts'
import { SessionBindingAuthority } from '../src/extensions/mesh/session-bindings.ts'
import { CognitiveMeshService } from '../src/extensions/mesh/service.ts'
import { MESH_DEPENDENCIES } from '../src/extensions/mesh/contracts.ts'

let root: string, ctx: Context, store: Store, facts: MeshSecurityStore, mesh: CognitiveMeshService
type Handler = (req: unknown, res: unknown) => Promise<void>
let handler: Handler
let saved: number, ready: Promise<void>
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mesh-management-')); store = new Store(join(root, 'state.sqlite')); facts = new MeshSecurityStore(store)
  facts.grant({ tenantId: 'a', actorRef: 'admin', roles: ['admin'], expiresAt: 2000000, version: 1 })
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 0 })
  ctx = new Context()
  for (const name of MESH_DEPENDENCIES) if (name !== 'webServer') ctx.reflect.provide(name, {})
  ctx.reflect.provide('webServer', { host: '127.0.0.1', port: 3082, register: (route: { handler: Handler }) => { handler = route.handler; return () => {} } })
  const lifetime = new AbortController(), identities = new TrustedIdentityAuthority(facts, token => token === 'key' ? { tenantId: 'a', actorRef: 'admin' } : undefined, lifetime.signal, () => 1000)
  const gate = new LocalSafetyGate(facts, lifetime.signal, () => 1000)
  const bindings = new SessionBindingAuthority(identities, facts, gate, id => id === 'managed' ? { permissions: {
    tools: { allow: ['read'], deny: [] }, resources: { allow: ['fixture'], deny: [] }, environments: { allow: ['SANDBOX'], deny: [] } } } : undefined, () => 1000)
  mesh = new CognitiveMeshService(ctx, { authority: identities, bindings, lifetime: lifetime.signal })
  saved = 0; ready = Promise.resolve()
})
afterEach(async () => { await ctx.fiber.dispose(); store.close(); rmSync(root, { recursive: true, force: true }) })
function mount() {
  registerHttp(ctx, { get ready() { return ready }, store: { tickets: { get: () => undefined } },
    settings: { pause: async () => { saved++; return {} } } } as unknown as HttpHost)
}
async function call(path: string, body: unknown = {}, duringBody = () => {}, token = 'key') {
  let status = 0, text = ''
  await handler({ method: 'POST', url: '/orchestrator/api/' + path,
    headers: { host: '127.0.0.1:3082', 'x-orchestrator-request': '1', authorization: 'Bearer ' + token },
    async *[Symbol.asyncIterator]() { duringBody(); yield Buffer.from(JSON.stringify(body)) } },
  { writeHead: (value: number) => { status = value }, end: (value: string) => { text = value } })
  return { status, body: JSON.parse(text) as Record<string, unknown> }
}
it('delivers only server-selected bindings via authenticated HTTP and keeps tombstones across retries', async () => {
  mount()
  expect(await call('mesh/sessions/managed/issue')).toMatchObject({ status: 200, body: { sessionId: 'managed', tenantId: 'a', expiresAt: 901000 } })
  expect(await call('mesh/sessions/managed/restore')).toMatchObject({ status: 200 })
  expect(await call('mesh/sessions/managed/revoke')).toEqual({ status: 200, body: { revoked: true } })
  expect(await call('mesh/sessions/managed/issue')).toEqual({ status: 401, body: { error: 'Access denied' } })
})
it('rejects identity and scope input, and authenticates before disclosing the target', async () => {
  mount()
  expect((await call('mesh/sessions/managed/issue', { tenantId: 'other' })).status).toBe(401)
  expect((await call('mesh/sessions/managed/issue', { tools: ['bash'] })).status).toBe(400)
  for (const id of ['managed', 'unknown']) expect(await call(`mesh/sessions/${id}/issue`, {}, () => {}, 'wrong'))
    .toEqual({ status: 401, body: { error: 'Access denied' } })
  expect(facts.binding('managed')).toBeUndefined()
})
it('keeps the original request context across body reads; revocation cannot reauthenticate the same request', async () => {
  mount()
  const result = await call('executor/pause', { paused: true }, () => facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 }))
  expect(result).toEqual({ status: 401, body: { error: 'Access denied' } }); expect(saved).toBe(0)
  expect((await call('executor/pause', { paused: true })).status).toBe(200); expect(saved).toBe(1)
})
it('rechecks the original context after startup and rejects retained authorization on dependency loss', async () => {
  let release!: () => void
  ready = new Promise<void>(resolve => { release = resolve }); mount()
  const pending = call('executor/pause', { paused: true })
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 }); release()
  expect((await pending).status).toBe(401); expect(saved).toBe(0)
  const authorization = mesh.authorizeRequest('key')
  await ctx.fiber.dispose()
  expect(() => authorization.check()).toThrow('CognitiveMesh unavailable')
})
