/** M0 bridge lifecycle owned by the existing SuperAgent plugin fiber. */
import type { Context } from '@deepseek-ai/cordis'

const installed = new WeakSet<object>()

/** Register one bridge per active fiber; this does not register a domain service or start work. */
export function installMeshM0(ctx: Context): void {
  ctx.fiber.assertActive()
  if (installed.has(ctx.fiber)) return
  ctx.effect(() => {
    ctx.logger.info('[cognitive-mesh] m0 bridge installed')
    installed.add(ctx.fiber)
    return () => {
      installed.delete(ctx.fiber)
      ctx.logger.info('[cognitive-mesh] m0 bridge disposed')
    }
  }, 'cognitive-mesh:m0-bridge')
}
