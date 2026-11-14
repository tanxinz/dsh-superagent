/** Trusted, synchronous delivery and recovery of bounded Session safety facts. */
import { MeshAccessDenied, type TrustedIdentityAuthority } from './auth.ts'
import { LocalSafetyGate, type PermissionSet, type SafetyBinding } from './safety.ts'
import type { MeshSecurityStore } from './security-store.ts'

export interface ManagedSessionTarget { readonly permissions: PermissionSet; readonly parentSessionId?: string }

/** Targets and scopes come only from the Runtime's managed Session registry, never request JSON. */
export class SessionBindingAuthority {
  constructor(private readonly identities: TrustedIdentityAuthority, private readonly facts: MeshSecurityStore,
    private readonly gate: LocalSafetyGate, private readonly target: (id: string) => ManagedSessionTarget | undefined,
    private readonly now = () => Date.now()) {}

  issue(context: unknown, sessionId: string): SafetyBinding {
    const trusted = this.identities.require(context, 'admin')
    try {
      return this.facts.atomic(() => {
        this.identities.require(context, 'admin')
        const target = this.target(sessionId)
        if (!target) throw new MeshAccessDenied()
        const existing = this.facts.binding(sessionId)
        if (existing) {
          this.restore(context, sessionId)
          if (existing.actorRef !== trusted.actorRef || existing.parentSessionId !== target.parentSessionId
            || JSON.stringify(existing.trusted) !== JSON.stringify(target.permissions)) throw new MeshAccessDenied()
          return existing // no silent renewal, reparenting or widening on restart/retry
        }
        const identity = this.facts.identity(trusted.tenantId, trusted.actorRef)!
        const policy = this.facts.policy(trusted.tenantId)!
        const parents = target.parentSessionId === undefined ? [] : this.gate.bindings(target.parentSessionId)
        if (parents.some(parent => parent.tenantId !== trusted.tenantId || parent.sessionId === sessionId)) throw new MeshAccessDenied()
        const narrow = (key: keyof PermissionSet) => {
          const operands = [target.permissions[key], ...parents.flatMap(p => [p.trusted[key], p.current[key]])]
          const deny = [...new Set(operands.flatMap(d => d.deny))]
          return { allow: target.permissions[key].allow.filter(value => operands.every(d => d.allow.includes(value)) && !deny.includes(value)), deny }
        }
        const permissions: PermissionSet = { tools: narrow('tools'), resources: narrow('resources'), environments: narrow('environments') }
        const binding: SafetyBinding = { sessionId, tenantId: trusted.tenantId, actorRef: trusted.actorRef, role: 'admin',
          ...(target.parentSessionId === undefined ? {} : { parentSessionId: target.parentSessionId }),
          expiresAt: Math.min(this.now() + 15 * 60_000, identity.expiresAt, ...parents.map(p => p.expiresAt)),
          identityVersion: identity.version, safetyPolicyVersion: policy.safetyPolicyVersion,
          emergencyRevocationEpoch: policy.emergencyRevocationEpoch, trusted: target.permissions, current: permissions }
        this.facts.bind(binding)
        return this.restore(context, sessionId)
      })
    } catch { return this.denied(trusted.tenantId, trusted.actorRef, trusted.requestId) }
  }

  restore(context: unknown, sessionId: string): SafetyBinding {
    const trusted = this.identities.require(context, 'admin')
    try {
      const target = this.target(sessionId), binding = this.facts.binding(sessionId)
      if (!target || !binding || binding.tenantId !== trusted.tenantId || binding.parentSessionId !== target.parentSessionId
        || JSON.stringify(binding.trusted) !== JSON.stringify(target.permissions)) throw new MeshAccessDenied()
      this.gate.bindings(sessionId)
      return binding
    } catch { return this.denied(trusted.tenantId, trusted.actorRef, trusted.requestId) }
  }

  revoke(context: unknown, sessionId: string): void {
    const trusted = this.identities.require(context, 'admin')
    try { this.facts.revokeBinding(trusted.tenantId, sessionId) }
    catch { return this.denied(trusted.tenantId, trusted.actorRef, trusted.requestId) }
  }

  private denied(tenantId: string, actorRef: string, requestId: string): never {
    try { this.facts.deny(tenantId, actorRef, requestId, 'SESSION_BINDING_DENIED', this.now()) }
    finally { throw new MeshAccessDenied() }
  }
}
