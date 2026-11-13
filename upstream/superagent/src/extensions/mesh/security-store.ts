/** Minimal persistent M0 safety facts on the existing Store connection. */
import type { DatabaseSync } from 'node:sqlite'
import type { Store } from '../../app/store.ts'
import { validBinding, type SafetyBinding } from './safety.ts'

export interface IdentityGrant { tenantId: string; actorRef: string; roles: readonly string[]; expiresAt: number; version: number }
export interface SafetyPolicy { tenantId: string; safetyPolicyVersion: string; emergencyRevocationEpoch: number }
const SCHEMA = 2

/** Called inside Store's original migration transaction; failure rolls back all DDL and metadata. */
export function migrateMeshSecurity(db: DatabaseSync): void {
  const row = db.prepare("SELECT value FROM kv WHERE key='mesh-schema-version'").get()
  const version: unknown = row ? JSON.parse(String(row.value)) : 0
  if (version === SCHEMA) { verifyMeshSchema(db); return }
  if (version !== 0 && version !== 1) throw new Error('Unsupported mesh security schema')
  if (version === 0) db.exec(`
    CREATE TABLE mesh_identity (tenant_id TEXT NOT NULL, actor_ref TEXT NOT NULL, roles TEXT NOT NULL,
      expires_at INTEGER NOT NULL, version INTEGER NOT NULL, PRIMARY KEY (tenant_id,actor_ref));
    CREATE TABLE mesh_safety_policy (tenant_id TEXT PRIMARY KEY, safety_policy_version TEXT NOT NULL,
      emergency_revocation_epoch INTEGER NOT NULL CHECK(emergency_revocation_epoch >= 0));
    CREATE TABLE mesh_gate_audit (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL, actor_ref TEXT NOT NULL,
      request_id TEXT NOT NULL, reason_code TEXT NOT NULL, safety_policy_version TEXT NOT NULL,
      emergency_revocation_epoch INTEGER NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX mesh_gate_audit_tenant_at ON mesh_gate_audit(tenant_id,at,id);
  `)
  db.exec('CREATE TABLE mesh_session_security (session_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, binding TEXT NOT NULL)')
  db.prepare("INSERT INTO kv(key,value) VALUES ('mesh-schema-version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(SCHEMA))
  verifyMeshSchema(db)
}

const EXPECTED_COLUMNS = {
  mesh_identity: ['tenant_id', 'actor_ref', 'roles', 'expires_at', 'version'],
  mesh_safety_policy: ['tenant_id', 'safety_policy_version', 'emergency_revocation_epoch'],
  mesh_gate_audit: ['id', 'tenant_id', 'actor_ref', 'request_id', 'reason_code', 'safety_policy_version', 'emergency_revocation_epoch', 'at'],
  mesh_session_security: ['session_id', 'tenant_id', 'binding'],
}
/** Detect drift at startup instead of trusting the version marker alone. */
export function verifyMeshSchema(db: DatabaseSync): void {
  for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
    const info = db.prepare('SELECT name,type FROM pragma_table_info(?)').all(table)
    const actual = info.map(row => String(row.name))
    const integer = new Set(['expires_at', 'version', 'id', 'emergency_revocation_epoch', 'at'])
    if (info.some(row => row.type !== (integer.has(String(row.name)) ? 'INTEGER' : 'TEXT'))
      || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Mesh security schema drift: ${table}`)
  }
  const columns = db.prepare("SELECT name FROM pragma_index_info('mesh_gate_audit_tenant_at')").all().map(row => String(row.name))
  if (JSON.stringify(columns) !== JSON.stringify(['tenant_id', 'at', 'id'])) throw new Error('Mesh audit index drift')
}

/** Trusted application-side persistence; never exported through CognitiveMeshService. */
export class MeshSecurityStore {
  constructor(private readonly store: Pick<Store, 'db' | 'atomic'>) {}
  atomic<T>(work: () => T): T { return this.store.atomic(work) }
  /** Called only by trusted bootstrap code; conflicting Session reuse never silently widens its binding. */
  bind(binding: SafetyBinding): void {
    if (!validBinding(binding) || binding.revoked) throw new Error('Invalid Session safety binding')
    this.store.atomic(() => {
      const current = this.binding(binding.sessionId)
      if (current) {
        if (JSON.stringify(current) !== JSON.stringify(binding)) throw new Error('Conflicting Session safety binding')
        return
      }
      this.store.db.prepare('INSERT INTO mesh_session_security VALUES (?,?,?)').run(binding.sessionId, binding.tenantId, JSON.stringify(binding))
    })
  }
  binding(sessionId: string): SafetyBinding | undefined {
    const row = this.store.db.prepare('SELECT tenant_id,binding FROM mesh_session_security WHERE session_id=?').get(sessionId)
    if (!row) return undefined
    const value = JSON.parse(String(row.binding)) as SafetyBinding
    if (!validBinding(value) || value.sessionId !== sessionId || value.tenantId !== row.tenant_id) throw new Error('Corrupt Session safety binding')
    return value
  }
  /** A tombstone survives reload and prevents the same Session ID from being reissued. */
  revokeBinding(tenantId: string, sessionId: string): void {
    this.store.atomic(() => {
      const current = this.binding(sessionId)
      if (!current || current.tenantId !== tenantId) throw new Error('Session binding unavailable')
      this.store.db.prepare('UPDATE mesh_session_security SET binding=? WHERE session_id=? AND tenant_id=?')
        .run(JSON.stringify({ ...current, revoked: true }), sessionId, tenantId)
    })
  }
  grant(grant: IdentityGrant): void {
    if (!grant.tenantId || !grant.actorRef || !Number.isSafeInteger(grant.expiresAt) || !Number.isSafeInteger(grant.version) || grant.version < 1
        || !Array.isArray(grant.roles) || !grant.roles.every(role => typeof role === 'string' && role.length > 0)) throw new Error('Invalid identity grant')
    const result = this.store.db.prepare(`INSERT INTO mesh_identity VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,actor_ref) DO UPDATE SET
      roles=excluded.roles,expires_at=excluded.expires_at,version=excluded.version WHERE excluded.version>mesh_identity.version`)
      .run(grant.tenantId, grant.actorRef, JSON.stringify(grant.roles), grant.expiresAt, grant.version)
    if (Number(result.changes) !== 1) {
      const current = this.identity(grant.tenantId, grant.actorRef)
      if (JSON.stringify(current) !== JSON.stringify(grant)) throw new Error('Identity grant version conflict')
    }
  }
  identity(tenantId: string, actorRef: string): IdentityGrant | undefined {
    const row = this.store.db.prepare('SELECT * FROM mesh_identity WHERE tenant_id=? AND actor_ref=?').get(tenantId, actorRef)
    if (!row) return undefined
    const roles: unknown = JSON.parse(String(row.roles)), expiresAt = Number(row.expires_at), version = Number(row.version)
    if (!tenantId || !actorRef || !Array.isArray(roles) || !roles.every(role => typeof role === 'string' && role.length > 0)
      || !Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(version) || version < 1) throw new Error('Corrupt identity grant')
    return { tenantId, actorRef, roles: roles as string[], expiresAt, version }
  }
  policy(tenantId: string): SafetyPolicy | undefined {
    const row = this.store.db.prepare('SELECT * FROM mesh_safety_policy WHERE tenant_id=?').get(tenantId)
    if (!row) return undefined
    const safetyPolicyVersion = String(row.safety_policy_version), emergencyRevocationEpoch = Number(row.emergency_revocation_epoch)
    if (!tenantId || !safetyPolicyVersion || !Number.isSafeInteger(emergencyRevocationEpoch) || emergencyRevocationEpoch < 0) throw new Error('Corrupt safety policy')
    return { tenantId, safetyPolicyVersion, emergencyRevocationEpoch }
  }
  setPolicy(policy: SafetyPolicy): void {
    if (!policy.tenantId || !policy.safetyPolicyVersion || !Number.isSafeInteger(policy.emergencyRevocationEpoch) || policy.emergencyRevocationEpoch < 0) throw new Error('Invalid safety policy')
    const result = this.store.db.prepare(`INSERT INTO mesh_safety_policy VALUES (?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET
      safety_policy_version=excluded.safety_policy_version,emergency_revocation_epoch=excluded.emergency_revocation_epoch
      WHERE excluded.emergency_revocation_epoch>=mesh_safety_policy.emergency_revocation_epoch`)
      .run(policy.tenantId, policy.safetyPolicyVersion, policy.emergencyRevocationEpoch)
    if (Number(result.changes) !== 1) throw new Error('Safety revocation epoch cannot decrease')
  }
  deny(tenantId: string, actorRef: string, requestId: string, reason: string, at: number): void {
    const policy = this.policy(tenantId)
    this.store.db.prepare('INSERT INTO mesh_gate_audit(tenant_id,actor_ref,request_id,reason_code,safety_policy_version,emergency_revocation_epoch,at) VALUES (?,?,?,?,?,?,?)')
      .run(tenantId, actorRef, requestId, reason, policy?.safetyPolicyVersion ?? 'UNKNOWN', policy?.emergencyRevocationEpoch ?? -1, at)
  }
  auditCount(tenantId: string): number { return Number(this.store.db.prepare('SELECT COUNT(*) AS n FROM mesh_gate_audit WHERE tenant_id=?').get(tenantId)?.n ?? 0) }
}
