import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { Store } from '../src/app/store.ts'
import { MeshSecurityStore } from '../src/extensions/mesh/security-store.ts'
import { TrustedIdentityAuthority, MeshAccessDenied } from '../src/extensions/mesh/auth.ts'
import { LocalSafetyGate } from '../src/extensions/mesh/safety.ts'
import { SessionBindingAuthority, type ManagedSessionTarget } from '../src/extensions/mesh/session-bindings.ts'

let directory: string, file: string, store: Store, facts: MeshSecurityStore, clock: number
let identities: TrustedIdentityAuthority, gate: LocalSafetyGate, bindings: SessionBindingAuthority
let lifetime: AbortController, targets: Map<string, ManagedSessionTarget>
const target = (parentSessionId?: string): ManagedSessionTarget => ({ ...(parentSessionId ? { parentSessionId } : {}),
  permissions: { tools: { allow: ['read'], deny: [] }, resources: { allow: ['fixture'], deny: [] }, environments: { allow: ['SANDBOX'], deny: [] } } })
function load() {
  facts = new MeshSecurityStore(store)
  identities = new TrustedIdentityAuthority(facts, token => token === 'a' || token === 'b' ? { tenantId: token, actorRef: 'admin' } : undefined, lifetime.signal, () => clock)
  gate = new LocalSafetyGate(facts, lifetime.signal, () => clock)
  bindings = new SessionBindingAuthority(identities, facts, gate, id => targets.get(id), () => clock)
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mesh-bindings-')); file = join(directory, 'state.sqlite')
  store = new Store(file); clock = 1000; lifetime = new AbortController(); targets = new Map([['root', target()], ['child', target('root')]])
  load()
  for (const tenantId of ['a', 'b']) {
    facts.grant({ tenantId, actorRef: 'admin', roles: ['admin'], expiresAt: 2_000_000, version: 1 })
    facts.setPolicy({ tenantId, safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 0 })
  }
})
afterEach(() => { store.close(); rmSync(directory, { recursive: true, force: true }) })

it('derives identity and bounded expiry from authenticated facts; retry and reopen preserve the exact grant', () => {
  const context = identities.authenticate('a'), first = bindings.issue(context, 'root')
  expect(first).toMatchObject({ tenantId: 'a', actorRef: 'admin', identityVersion: 1, expiresAt: 901000 })
  clock += 100
  expect(bindings.issue(context, 'root')).toEqual(first)
  store.close(); store = new Store(file); load()
  expect(bindings.restore(identities.authenticate('a'), 'root')).toEqual(first)
  expect(() => gate.assert('root', 'read', 'fixture', 'SANDBOX')).not.toThrow()
  expect(gate.executionReady()).toBe(false)
})
it('denies forged contexts, foreign tenant collisions, unmanaged IDs and scope changes without overwriting facts', () => {
  const a = identities.authenticate('a'), first = bindings.issue(a, 'root')
  expect(() => bindings.issue({ ...a }, 'root')).toThrow(MeshAccessDenied)
  expect(() => bindings.issue(identities.authenticate('b'), 'root')).toThrow(MeshAccessDenied)
  expect(() => bindings.issue(a, 'unknown')).toThrow(MeshAccessDenied)
  targets.set('root', { permissions: { ...target().permissions, tools: { allow: ['read', 'write'], deny: [] } } })
  expect(() => bindings.issue(a, 'root')).toThrow(MeshAccessDenied)
  expect(facts.binding('root')).toEqual(first)
})
it('narrows children to parent scope and expiry, and a durable parent tombstone revokes all descendants', () => {
  const a = identities.authenticate('a')
  bindings.issue(a, 'root'); clock += 100
  targets.set('child', { ...target('root'), permissions: { ...target().permissions, tools: { allow: ['read', 'write'], deny: [] } } })
  const child = bindings.issue(a, 'child')
  expect(child.expiresAt).toBe(901000)
  expect(child.current.tools.allow).toEqual(['read'])
  expect(() => gate.assert('child', 'write', 'fixture', 'SANDBOX')).toThrow()
  bindings.revoke(a, 'root')
  store.close(); store = new Store(file); load()
  expect(facts.binding('root')?.revoked).toBe(true)
  expect(() => bindings.restore(identities.authenticate('a'), 'child')).toThrow(MeshAccessDenied)
  expect(() => bindings.issue(identities.authenticate('a'), 'root')).toThrow(MeshAccessDenied)
  expect(() => gate.assert('child', 'read', 'fixture', 'SANDBOX')).toThrow()
})
it('does not renew expired or stale bindings, and refuses missing parents without leaving a partial row', () => {
  const a = identities.authenticate('a'); bindings.issue(a, 'root')
  clock = 901000
  expect(() => bindings.issue(a, 'root')).toThrow(MeshAccessDenied)
  clock = 1000
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 })
  expect(() => bindings.restore(identities.authenticate('a'), 'root')).toThrow(MeshAccessDenied)
  expect(() => bindings.issue(identities.authenticate('a'), 'child')).toThrow(MeshAccessDenied)
  expect(facts.binding('child')).toBeUndefined()
})
it('denies corrupted recovered expiry instead of treating null/missing timestamps as unbounded', () => {
  bindings.issue(identities.authenticate('a'), 'root')
  const corrupt = { ...facts.binding('root'), expiresAt: null }
  store.db.prepare('UPDATE mesh_session_security SET binding=? WHERE session_id=?').run(JSON.stringify(corrupt), 'root')
  expect(() => bindings.restore(identities.authenticate('a'), 'root')).toThrow(MeshAccessDenied)
  expect(() => gate.assert('root', 'read', 'fixture', 'SANDBOX')).toThrow()
})
it('denial audit failure cannot enter a direct gateway body, and stopped issuers cannot provision', () => {
  let entered = 0
  store.db.exec('DROP TABLE mesh_gate_audit')
  expect(() => { bindings.restore(identities.authenticate('a'), 'root'); entered++ }).toThrow(MeshAccessDenied)
  expect(entered).toBe(0)
  lifetime.abort()
  expect(() => bindings.issue(identities.authenticate('a'), 'root')).toThrow(MeshAccessDenied)
})
