/** Probes repository and account CLIs, configures the worker execution environment and command shims, and tracks setup readiness. */
import type { Context } from '@deepseek-ai/cordis'
import { UserError } from '../core/index.ts'
import { SETUP_FIELDS, resolveDeployment, resolveFeishuBot, workerProbe, type Deployment, type Machine } from '../deployment.ts'
import { agentVariables, applyEnvironment, verifyEnvironment, withoutDirectory, workerBin, writeEnvironment } from '../infra/environment.ts'
import type { Settings, SettingsBlock } from '../policy.ts'
import { SetupError, type SetupProblem } from '../setup.ts'

export interface SetupHost {
  readonly context: Context
  readonly machine: Machine
  readonly lifetime: AbortSignal
  restart(): void
}

const setupFields = (settings: Settings) =>
  JSON.stringify(Object.entries(SETUP_FIELDS).map(([id, keys]) => keys.map(key => settings.sources[id]?.config[key] ?? '')))
export const setupChanged = (before: Settings, after: Settings): boolean => setupFields(before) !== setupFields(after)

/**
 * Resolves the target repository, GitHub account, and optional Feishu bot by probing CLIs, then writes and applies the isolated git and shim environment used by worker processes.
 * `Runtime` runs it at startup to gate orchestration readiness, while `Settings` uses it to validate account changes, update blocked command shims, and schedule restarts.
 */
export class Setup {
  private resolved?: Deployment
  private loadedSetupFields?: string
  private dispatchedSetupFields?: string
  /** Mutual exclusion for existing environment file I/O, not a work queue or persistent scheduler. */
  private environmentWrite?: Promise<void>
  problem?: SetupProblem
  feishuProblem?: SetupProblem
  /** PATH with the worker shim directory removed so the host's own CLI calls invoke the real binaries. */
  private readonly path: string
  /** Environment variables pointing agent subprocesses at the isolated git config and command shims. */
  private readonly variables: Record<string, string | undefined>
  private restoreEnvironment?: () => void
  constructor(private readonly host: SetupHost) {
    this.path = withoutDirectory(process.env.PATH ?? '', workerBin(host.machine.stateDir))
    this.variables = agentVariables(host.machine.stateDir)
  }
  /** Host command environment with agent git variables applied and the worker shim directory excluded from PATH. */
  get commandEnvironment(): Record<string, string | undefined> { return { ...this.variables, PATH: this.path } }
  get deployment(): Deployment {
    if (!this.resolved) throw new Error(`dsh-superagent is waiting for setup: ${this.problem?.detail ?? 'setup has not run'}`)
    return this.resolved
  }
  configured(): boolean { return this.resolved !== undefined }
  /** A cancelled restart remains pending; an already dispatched restart need not be scheduled again. */
  needsRestart(settings: Settings): boolean {
    const seen = this.dispatchedSetupFields ?? this.loadedSetupFields
    return seen !== undefined && seen !== setupFields(settings)
  }
  /** Resolve deployment accounts and apply the worker environment, recording `SetupError` failures in `problem`/`feishuProblem` and rethrowing unexpected errors. */
  async run(settings: Settings): Promise<boolean> {
    this.loadedSetupFields = setupFields(settings)
    try { this.resolved = await this.resolve(settings); return true }
    catch (error) {
      if (!(error instanceof SetupError)) throw error
      this.problem = error.problem
      return false
    }
  }
  /** Trigger a restart to re-run setup, refusing if setup and Feishu are already healthy so running assignments are not interrupted. */
  check(authorize?: () => void): void {
    this.host.lifetime.throwIfAborted(); authorize?.()
    if (this.configured() && !this.feishuProblem) throw new UserError('setupComplete')
    this.restart(authorize)
  }
  /** Defer the restart to the next macrotask so the current HTTP or tool caller receives its response first. */
  restart(authorize?: () => void, settings?: Settings): void {
    this.host.lifetime.throwIfAborted(); authorize?.()
    const fields = settings && setupFields(settings)
    setTimeout(() => {
      try { this.host.lifetime.throwIfAborted(); authorize?.() }
      catch { return } // Revoked/dead requests cannot restart the Runtime after returning a response.
      this.host.restart()
      if (fields !== undefined) this.dispatchedSetupFields = fields
    }, 0)
  }
  /** Verify account CLIs for a modified source block before saving, ignoring setup errors belonging to other blocks. */
  async checkAccounts(block: SettingsBlock, settings: Settings, authorize?: () => void): Promise<void> {
    const { machine } = this.host
    const check = block === 'source:feishu' ? resolveFeishuBot(machine, settings.sources.feishu?.config, this.probe(authorize))
      : resolveDeployment(machine, settings.sources.github?.config, this.probe(authorize))
    await check.catch((error: unknown) => { if (!(error instanceof SetupError) || error.place === block.slice(7)) throw error })
  }
  async blockCommands(blocked: readonly string[], authorize?: () => void): Promise<void> {
    const check = () => { this.host.lifetime.throwIfAborted(); authorize?.() }
    check()
    while (this.environmentWrite) { await this.environmentWrite.catch(() => {}); check() }
    check()
    if (!this.resolved) return
    const writing = writeEnvironment(this.resolved, blocked, check)
    this.environmentWrite = writing
    try { await writing } finally { if (this.environmentWrite === writing) this.environmentWrite = undefined }
  }
  /** Drain admitted file I/O before the Runtime closes its Store and releases the state-directory lock. */
  async idle(): Promise<void> { while (this.environmentWrite) await this.environmentWrite.catch(() => {}) }
  restore(): void { this.restoreEnvironment?.(); this.restoreEnvironment = undefined }
  /** Probes CLIs the way worker shells run them, using `stateDir` as `cwd` since it exists even before the repository clone is valid. */
  private probe(authorize?: () => void) {
    const { context, machine, lifetime } = this.host
    const probe = workerProbe(context.subprocess, machine.stateDir, machine.stateDir, lifetime)
    return (argv: string[]) => { lifetime.throwIfAborted(); authorize?.(); return probe(argv) }
  }
  private async resolve(settings: Settings): Promise<Deployment> {
    const { context, machine, lifetime } = this.host
    const probe = this.probe()
    const deployment = await resolveDeployment(machine, settings.sources.github?.config, probe)
    const feishu = await resolveFeishuBot(machine, settings.sources.feishu?.config, probe).catch((error: unknown) => {
      if (!(error instanceof SetupError)) throw error
      this.feishuProblem = error.problem
      context.logger.warn('dsh-superagent leaves Feishu out: %s', error.message)
      return undefined
    })
    const resolved = { ...deployment, ...(feishu ? { feishu } : {}) }
    const machineProblem = (error: unknown): never => {
      if (error instanceof SetupError) throw error
      throw new SetupError('environmentFailed', { output: error instanceof Error ? error.message : String(error) })
    }
    await writeEnvironment(resolved, settings.executor.blockedCommands, () => lifetime.throwIfAborted()).catch(machineProblem)
    this.restoreEnvironment = applyEnvironment(this.variables, machine.stateDir, this.path)
    await verifyEnvironment(resolved, context.subprocess, lifetime).catch((error: unknown) => {
      this.restore()
      machineProblem(error)
    })
    return resolved
  }
}
