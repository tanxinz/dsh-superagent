/** Native Cordis service, consumed by Runtime before startup and at admission. */
import { MeshAccessDenied, type TrustedIdentityAuthority } from './auth.ts'
import { Service, type Context } from '@deepseek-ai/cordis'
import { MESH_DEPENDENCIES, type MeshHealth } from './contracts.ts'
import type { SessionBindingAuthority } from './session-bindings.ts'

declare module '@deepseek-ai/cordis' { interface Context { cognitiveMesh: CognitiveMeshService } }

/** Read-only readiness capability bound to its provider fiber and Runtime lifetime. */
export class CognitiveMeshService extends Service {
  readonly securityStatus: (credential: string, hasIdentityClaims?: boolean) => ReturnType<TrustedIdentityAuthority['securityStatus']>
  readonly health: () => MeshHealth
  readonly assertReady: () => void
  readonly sessionBinding: (credential: string, sessionId: string, operation: 'issue' | 'restore' | 'revoke') => unknown
  readonly authorizeRequest: (credential: string, hasIdentityClaims?: boolean) => {
    check(hasIdentityClaims?: boolean): ReturnType<TrustedIdentityAuthority['securityStatus']>
    sessionBinding(sessionId: string, operation: 'issue' | 'restore' | 'revoke'): unknown
  }
  constructor(ctx: Context, config: { lifetime?: AbortSignal; authority?: TrustedIdentityAuthority; bindings?: SessionBindingAuthority } = {}) {
    super(ctx, 'cognitiveMesh')
    this.health = () => {
      const missing: string[] = MESH_DEPENDENCIES.filter(name => !ctx.get(name))
      try { ctx.fiber.assertActive() } catch { missing.push('owning-fiber') }
      if (config.lifetime?.aborted) missing.push('runtime-lifetime')
      return Object.freeze({ state: missing.length ? 'blocked' : 'ready', missing: Object.freeze(missing) })
    }
    this.authorizeRequest = (credential, hasIdentityClaims) => {
      this.assertReady()
      if (!config.authority) throw new MeshAccessDenied()
      const authority = config.authority, context = authority.authenticate(credential)
      const check = (claims = false) => { this.assertReady(); return authority.securityStatus(context, claims) }
      check(hasIdentityClaims)
      return Object.freeze({ check, sessionBinding: (sessionId: string, operation: 'issue' | 'restore' | 'revoke') => {
        check()
        if (!config.bindings) throw new MeshAccessDenied()
        if (operation === 'revoke') { config.bindings.revoke(context, sessionId); return { revoked: true } }
        if (operation !== 'issue' && operation !== 'restore') throw new MeshAccessDenied()
        return config.bindings[operation](context, sessionId)
      } })
    }
    this.securityStatus = (credential, claims) => this.authorizeRequest(credential, claims).check()
    this.sessionBinding = (credential, sessionId, operation) => this.authorizeRequest(credential).sessionBinding(sessionId, operation)
    this.assertReady = () => {
      const health = this.health()
      if (health.state !== 'ready') throw new Error(`CognitiveMesh unavailable: ${health.missing.join(', ')}`)
    }
  }
}
