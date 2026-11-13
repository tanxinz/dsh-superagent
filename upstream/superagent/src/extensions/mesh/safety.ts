/** Synchronous final authorization; missing facts deny before any tool or RPC body. */
import type { MeshSecurityStore } from './security-store.ts'

export interface Dimension { readonly allow: readonly string[]; readonly deny: readonly string[] }
export interface PermissionSet { readonly tools: Dimension; readonly resources: Dimension; readonly environments: Dimension }
export interface SafetyBinding {
  readonly sessionId: string; readonly tenantId: string; readonly actorRef: string; readonly role: string
  readonly parentSessionId?: string; readonly expiresAt: number; readonly identityVersion: number
  readonly safetyPolicyVersion: string; readonly emergencyRevocationEpoch: number
  readonly trusted: PermissionSet; readonly current: PermissionSet
  readonly revoked?: true
}
/** Validate untrusted persisted JSON too; NaN, missing expiry and malformed lists must never grant. */
export function validBinding(value: unknown): value is SafetyBinding {
  if (!value || typeof value !== 'object') return false
  const b = value as SafetyBinding
  const text = (s: unknown) => typeof s === 'string' && s.length > 0 && s.length <= 1024
  const permissions = (p: PermissionSet) => p && ['tools', 'resources', 'environments'].every(key => {
    const d = p[key as keyof PermissionSet]
    return d && Array.isArray(d.allow) && Array.isArray(d.deny) && [...d.allow, ...d.deny].every(text)
  })
  return [b.sessionId, b.tenantId, b.actorRef, b.role, b.safetyPolicyVersion].every(text)
    && (b.parentSessionId === undefined || text(b.parentSessionId))
    && Number.isSafeInteger(b.expiresAt) && b.expiresAt > 0
    && Number.isSafeInteger(b.identityVersion) && b.identityVersion > 0
    && Number.isSafeInteger(b.emergencyRevocationEpoch) && b.emergencyRevocationEpoch >= 0
    && (b.revoked === undefined || b.revoked === true) && !!permissions(b.trusted) && !!permissions(b.current)
}
/** Every operand must explicitly allow, and any operand's deny wins. No wildcards or inherited implicit grants. */
export function effectiveAllows(value: string, ...dimensions: (Dimension | undefined)[]): boolean {
  return dimensions.length > 0 && dimensions.every(item => item && Array.isArray(item.allow) && Array.isArray(item.deny)
    && item.allow.includes(value) && !item.deny.includes(value))
}

/** Owns the final local check over durable Session bindings and current security facts. */
export class LocalSafetyGate {
  constructor(private readonly facts: MeshSecurityStore, private readonly lifetime: AbortSignal, private readonly now = () => Date.now()) {}
  /** No verified OS/network boundary has been integrated with business execution yet. No environment flag can bypass this. */
  executionReady(): boolean { return false }
  refusal(sessionId: string, tool: string, resource: string, environment: string, requireIsolation = false): string | undefined {
    try {
      this.assert(sessionId, tool, resource, environment)
      if (requireIsolation && !this.executionReady()) return this.deny(this.facts.binding(sessionId), 'ISOLATION_UNAVAILABLE')
      return undefined
    } catch { return 'Mesh safety denied' }
  }
  assert(sessionId: string, tool: string, resource: string, environment: string): void {
    const chain = this.bindings(sessionId)
    for (const [dimension, value] of [['tools', tool], ['resources', resource], ['environments', environment]] as const) {
      if (!effectiveAllows(value, ...chain.flatMap(binding => [binding.trusted[dimension], binding.current[dimension]]))) return this.deny(chain[0], 'EFFECTIVE_DENY')
    }
  }
  /** Revalidate the complete recovered chain without implying OS readiness or authorizing a tool. */
  bindings(sessionId: string): readonly SafetyBinding[] {
    const seen = new Set<string>(), chain: SafetyBinding[] = []
    let id: string | undefined = sessionId
    while (id !== undefined) {
      if (seen.has(id) || chain.length >= 32) return this.deny(chain[0], 'BINDING_CYCLE')
      seen.add(id)
      let binding: SafetyBinding | undefined
      try { binding = this.facts.binding(id) } catch { return this.deny(chain[0], 'INVALID_BINDING') }
      if (!binding || !validBinding(binding)) return this.deny(chain[0], 'BINDING_UNAVAILABLE')
      chain.push(binding); id = binding.parentSessionId
    }
    const root = chain[0]
    if (!root || this.lifetime.aborted) return this.deny(root, 'OWNER_STOPPED')
    for (const binding of chain) {
      let identity, policy
      try { identity = this.facts.identity(binding.tenantId, binding.actorRef); policy = this.facts.policy(binding.tenantId) }
      catch { return this.deny(root, 'INVALID_SECURITY_FACTS') }
      if (binding.revoked || binding.tenantId !== root.tenantId || !identity || !policy || binding.expiresAt <= this.now() || identity.expiresAt <= this.now()
        || identity.version !== binding.identityVersion || !identity.roles.includes(binding.role)
        || policy.safetyPolicyVersion !== binding.safetyPolicyVersion || policy.emergencyRevocationEpoch !== binding.emergencyRevocationEpoch) return this.deny(root, 'STALE_BINDING')
    }
    return chain
  }
  private deny(binding: SafetyBinding | undefined, reason: string): never {
    try { this.facts.deny(binding?.tenantId ?? 'UNAUTHENTICATED', binding?.actorRef ?? 'UNKNOWN', 'tool-guard', reason, this.now()) }
    finally { throw new Error('Mesh safety denied') }
  }
}
