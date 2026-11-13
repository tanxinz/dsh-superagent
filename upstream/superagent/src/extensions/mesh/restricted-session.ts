/** Applies a verifiable, fail-closed native permission preset to managed Sessions. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-permission-presets'

export const RESTRICTED_PRESET = 'read-only'

/** Tracks effective permissions rather than trusting a preset label or prompt. */
export class RestrictedSessions {
  private readonly bound = new Set<string>()
  constructor(private readonly ctx: Context, private readonly lifetime: AbortSignal) {}
  apply(agent: Agent): void {
    if (this.lifetime.aborted) throw new Error('Restricted Session owner stopped')
    this.checkDefinition()
    // A previously bound Session whose effective permissions changed must stop, not silently repair and continue.
    if (this.bound.has(agent.id)) { this.assert(agent); return }
    this.ctx.permissionPresets.set(agent.session, RESTRICTED_PRESET)
    this.assert(agent)
    this.bound.add(agent.id)
  }
  assert(agent: Agent): void {
    if (this.lifetime.aborted) throw new Error('Restricted Session owner stopped')
    this.checkDefinition()
    if (this.ctx.permissionPresets.current(agent.session) !== RESTRICTED_PRESET) throw new Error('Restricted Session permission override refused')
  }
  refusal(agent: Agent): string | undefined {
    try { this.assert(agent); return undefined } catch (error) { return `Session permission denied: ${String(error)}` }
  }
  private checkDefinition(): void {
    const preset = this.ctx.permissionPresets.resolve(RESTRICTED_PRESET)
    if (preset.sandbox !== 'read-only' || preset.approval !== 'ask') throw new Error('Restricted Session preset definition is unsafe')
  }
}
