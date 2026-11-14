/** Runtime-issued identities; structural TypeScript objects never confer authority. */
import { randomUUID } from 'node:crypto'
import type { MeshSecurityStore, IdentityGrant, SafetyPolicy } from './security-store.ts'

export interface TrustedCommandContext { readonly tenantId: string; readonly actorRef: string; readonly requestId: string; readonly roles: readonly string[] }
export type TrustedRequestContext = TrustedCommandContext
export type IdentityVerifier = (credential: string) => { tenantId: string; actorRef: string } | undefined
interface Issued { identity: IdentityGrant; policy: SafetyPolicy }
/** Same public response for missing, forged, expired, cross-scope or revoked identities. */
export class MeshAccessDenied extends Error { constructor() { super('Access denied') } }

/** Owned by the trusted Runtime; independent issuers cannot mint interchangeable contexts. */
export class TrustedIdentityAuthority {
  private readonly issued = new WeakMap<object, Issued>()
  constructor(private readonly facts: MeshSecurityStore, private readonly verify: IdentityVerifier,
    private readonly lifetime: AbortSignal, private readonly now = () => Date.now()) {}
  authenticate(credential: unknown): TrustedRequestContext {
    if (this.lifetime.aborted) return this.denied(undefined, 'OWNER_STOPPED')
    let principal: ReturnType<IdentityVerifier>
    try { principal = typeof credential === 'string' && credential.length > 0 && credential.length <= 4096 ? this.verify(credential) : undefined }
    catch { return this.denied(undefined, 'AUTHENTICATION') }
    let grant: IdentityGrant | undefined, policy: SafetyPolicy | undefined
    try { grant = principal && this.facts.identity(principal.tenantId, principal.actorRef); policy = principal && this.facts.policy(principal.tenantId) }
    catch { return this.denied(undefined, 'INVALID_SECURITY_FACTS') }
    if (this.lifetime.aborted || !grant || !policy || grant.expiresAt <= this.now()) return this.denied(undefined, 'AUTHENTICATION')
    const context = Object.freeze({ tenantId: grant.tenantId, actorRef: grant.actorRef, requestId: randomUUID(), roles: Object.freeze([...grant.roles]) })
    this.issued.set(context, { identity: grant, policy })
    return context
  }
  require(context: unknown, role: string): TrustedRequestContext {
    const known = context !== null && typeof context === 'object' ? this.issued.get(context) : undefined
    if (!known) return this.denied(undefined, 'UNTRUSTED_CONTEXT')
    let current: IdentityGrant | undefined, policy: SafetyPolicy | undefined
    try { current = this.facts.identity(known.identity.tenantId, known.identity.actorRef); policy = this.facts.policy(known.identity.tenantId) }
    catch { return this.denied(context as TrustedRequestContext, 'INVALID_SECURITY_FACTS') }
    if (this.lifetime.aborted || !current || !policy || current.expiresAt <= this.now() || current.version !== known.identity.version
      || policy.safetyPolicyVersion !== known.policy.safetyPolicyVersion || policy.emergencyRevocationEpoch !== known.policy.emergencyRevocationEpoch
      || !current.roles.includes(role)) return this.denied(context as TrustedRequestContext, 'AUTHORIZATION')
    return context as TrustedRequestContext
  }
  readIdentity(context: unknown, actorRef: string): IdentityGrant | undefined {
    const trusted = this.require(context, 'admin')
    return this.facts.identity(trusted.tenantId, actorRef)
  }
  securityStatus(context: unknown, hasIdentityClaims = false): { tenantId: string; actorRef: string; requestId: string; policy: SafetyPolicy } {
    const trusted = this.require(context, 'admin')
    if (hasIdentityClaims) return this.denied(trusted, 'UNTRUSTED_IDENTITY_CLAIMS')
    const policy = this.facts.policy(trusted.tenantId)
    if (!policy) return this.denied(trusted, 'POLICY_UNAVAILABLE')
    return { tenantId: trusted.tenantId, actorRef: trusted.actorRef, requestId: trusted.requestId, policy }
  }
  private denied(context: TrustedRequestContext | undefined, reason: string): never {
    // Failure to write the audit still denies; no token or user-supplied identity is recorded.
    try { this.facts.deny(context?.tenantId ?? 'UNAUTHENTICATED', context?.actorRef ?? 'UNKNOWN', context?.requestId ?? randomUUID(), reason, this.now()) }
    finally { throw new MeshAccessDenied() }
  }
}
