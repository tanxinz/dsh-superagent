/** Native Cordis service, consumed by Runtime before startup and at admission. */
import { Service, type Context } from '@deepseek-ai/cordis'
import { MESH_DEPENDENCIES, type MeshHealth } from './contracts.ts'

declare module '@deepseek-ai/cordis' { interface Context { cognitiveMesh: CognitiveMeshService } }

/** Read-only readiness capability bound to its provider fiber and Runtime lifetime. */
export class CognitiveMeshService extends Service {
  readonly health: () => MeshHealth
  readonly assertReady: () => void
  constructor(ctx: Context, config: { lifetime?: AbortSignal } = {}) {
    super(ctx, 'cognitiveMesh')
    this.health = () => {
      const missing: string[] = MESH_DEPENDENCIES.filter(name => !ctx.get(name))
      try { ctx.fiber.assertActive() } catch { missing.push('owning-fiber') }
      if (config.lifetime?.aborted) missing.push('runtime-lifetime')
      return Object.freeze({ state: missing.length ? 'blocked' : 'ready', missing: Object.freeze(missing) })
    }
    this.assertReady = () => {
      const health = this.health()
      if (health.state !== 'ready') throw new Error(`CognitiveMesh unavailable: ${health.missing.join(', ')}`)
    }
  }
}
