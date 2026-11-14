import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { Store } from '../src/app/store.ts'
import { MeshSecurityStore } from '../src/extensions/mesh/security-store.ts'
import { TrustedIdentityAuthority, MeshAccessDenied } from '../src/extensions/mesh/auth.ts'

let root: string, file: string, store: Store, facts: MeshSecurityStore, clock: number
let lifetime: AbortController
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mesh-security-')); file = join(root, 'state.sqlite')
  store = new Store(file); facts = new MeshSecurityStore(store); clock = 1000; lifetime = new AbortController()
  for (const tenantId of ['a', 'b']) {
    facts.grant({ tenantId, actorRef: 'admin', roles: ['admin'], expiresAt: 2000, version: 1 })
    facts.setPolicy({ tenantId, safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 0 })
  }
})
afterEach(() => { try { store.close() } catch {} rmSync(root, { recursive: true, force: true }) })
const authority = () => new TrustedIdentityAuthority(facts, token => token === 'a-key' ? { tenantId: 'a', actorRef: 'admin' }
  : token === 'b-key' ? { tenantId: 'b', actorRef: 'admin' } : undefined, lifetime.signal, () => clock)

it('rejects missing, forged, cloned and foreign-issuer contexts; tenant/roles never come from body fields', () => {
  const auth = authority(), other = authority(), valid = auth.authenticate('a-key')
  expect(auth.require(valid, 'admin').tenantId).toBe('a')
  for (const context of [undefined, null, { tenantId: 'a', actorRef: 'admin', roles: ['admin'] }, { ...valid }, other.authenticate('a-key')]) {
    expect(() => auth.require(context, 'admin')).toThrow(MeshAccessDenied)
  }
  expect(Object.isFrozen(valid)).toBe(true)
  expect(Object.isFrozen(valid.roles)).toBe(true)
  expect(() => auth.authenticate('unknown-token')).toThrow(MeshAccessDenied)
})
it('scopes all identity lookups to the authenticated tenant, including the same actor ID in both tenants', () => {
  facts.grant({ tenantId: 'b', actorRef: 'victim', roles: ['reader'], expiresAt: 2000, version: 1 })
  const auth = authority(), a = auth.authenticate('a-key'), b = auth.authenticate('b-key')
  expect(auth.readIdentity(a, 'victim')).toBeUndefined()
  expect(auth.readIdentity(b, 'victim')?.tenantId).toBe('b')
  expect(auth.securityStatus(a).policy.tenantId).toBe('a')
})
it('revalidates expiry, grant revision, safety version, revocation epoch and owner lifetime on each call', () => {
  const auth = authority(), a = auth.authenticate('a-key')
  clock = 2000; expect(() => auth.require(a, 'admin')).toThrow(MeshAccessDenied)
  clock = 1000
  facts.grant({ tenantId: 'a', actorRef: 'admin', roles: [], expiresAt: 2000, version: 2 })
  expect(() => auth.require(a, 'admin')).toThrow(MeshAccessDenied)
  facts.grant({ tenantId: 'a', actorRef: 'admin', roles: ['admin'], expiresAt: 2000, version: 3 })
  const current = auth.authenticate('a-key')
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v2', emergencyRevocationEpoch: 1 })
  expect(() => auth.require(current, 'admin')).toThrow(MeshAccessDenied)
  const fresh = auth.authenticate('a-key'); lifetime.abort()
  expect(() => auth.require(fresh, 'admin')).toThrow(MeshAccessDenied)
  expect(facts.auditCount('a')).toBeGreaterThanOrEqual(4)
})
it('refuses roles and stale writes, and denial audit failure never grants access', () => {
  const auth = authority(), a = auth.authenticate('a-key')
  expect(() => auth.require(a, 'writer')).toThrow(MeshAccessDenied)
  expect(() => facts.grant({ tenantId: 'a', actorRef: 'admin', roles: ['writer'], expiresAt: 2000, version: 1 })).toThrow('version conflict')
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v2', emergencyRevocationEpoch: 2 })
  expect(() => facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 })).toThrow('cannot decrease')
  store.db.exec('DROP TABLE mesh_gate_audit')
  expect(() => auth.require(undefined, 'admin')).toThrow(MeshAccessDenied)
})
it('reopens the original SQLite with identity, policy/epoch and denial audit intact, without duplicate migrations', () => {
  const auth = authority(); expect(() => auth.require(auth.authenticate('a-key'), 'writer')).toThrow(MeshAccessDenied)
  store.close(); store = new Store(file); facts = new MeshSecurityStore(store)
  expect(facts.identity('a', 'admin')?.version).toBe(1)
  expect(facts.policy('a')?.emergencyRevocationEpoch).toBe(0)
  expect(facts.auditCount('a')).toBe(1)
})
it('rolls back all extension DDL when migration metadata cannot commit', () => {
  store.db.exec("DROP TABLE mesh_session_security; DROP TABLE mesh_identity; DROP TABLE mesh_safety_policy; DROP TABLE mesh_gate_audit; DELETE FROM kv WHERE key='mesh-schema-version'; CREATE TRIGGER fail_mesh BEFORE INSERT ON kv WHEN NEW.key='mesh-schema-version' BEGIN SELECT RAISE(ABORT,'injected migration failure'); END;")
  store.close()
  expect(() => new Store(file)).toThrow('injected migration failure')
  const db = new DatabaseSync(file)
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'mesh_%'").all()).toEqual([])
  expect(db.prepare("SELECT value FROM kv WHERE key='schema'").get()).toBeDefined()
  db.close()
})
it('fails closed on schema/index drift instead of accepting a version marker alone', () => {
  store.db.exec('DROP INDEX mesh_gate_audit_tenant_at'); store.close()
  expect(() => new Store(file)).toThrow('Mesh audit index drift')
})

it('rejects corrupt recovered security facts generically and preserves a readable offline backup', () => {
  store.db.prepare("UPDATE mesh_identity SET roles='null' WHERE tenant_id='a'").run()
  expect(() => authority().authenticate('a-key')).toThrow(MeshAccessDenied)
  expect(facts.auditCount('UNAUTHENTICATED')).toBe(1)
  store.close(); const backup = join(root, 'backup.sqlite'); copyFileSync(file, backup)
  const restored = new Store(backup)
  try { expect(new MeshSecurityStore(restored).auditCount('UNAUTHENTICATED')).toBe(1) } finally { restored.close() }
})
