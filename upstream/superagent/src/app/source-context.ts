/** Scoped runtime context exposed to each Source kind, isolating Sources from direct Store or Engine access. */
import type { EngineForSources, ReceiveResult, Trigger } from '../core/index.ts'
import type { Deployment } from '../deployment.ts'
import type { Commands } from '../infra/commands.ts'
import type { SetupProblem } from '../setup.ts'
import type { SourceContext } from '../sources/host.ts'
import type { SourceRegistry } from '../sources/registry.ts'
import type { Outbox } from './outbox.ts'
import type { Store } from './store.ts'

export interface SourceContextDeps {
  readonly store: Pick<Store, 'atomic' | 'get' | 'set' | 'delete' | 'keys' | 'threads' | 'tickets' | 'triggers' | 'read'>
  readonly outbox: Pick<Outbox, 'send'>
  readonly engine: Pick<EngineForSources, 'bindThread' | 'threadClosed'>
  readonly commands: Commands
  readonly sources: SourceRegistry
  /** Throws when accessed before initial setup completes. */
  readonly deployment: Deployment
  readonly ready: Promise<void>
  configured(): boolean
  /** Setup problem whose `place` matches the Source kind receives it on `context.problem`. */
  readonly setupProblem?: SetupProblem | undefined
  /** Why setup found no Feishu bot even though the Feishu Source names a CLI. */
  readonly feishuProblem?: SetupProblem | undefined
  /** Hands a Trigger to the Engine and schedules the pass that assesses it. */
  receive(trigger: Trigger): ReceiveResult | Promise<ReceiveResult>
}

/**
 * Builds the context for one Source kind. Health reports are restricted to entries declared by the kind and
 * bound to the active registration, becoming no-ops once unregistered.
 */
export function sourceContextOf(deps: SourceContextDeps, kind: { kind: string; health: readonly string[] }, authorize?: () => void): SourceContext {
  const { store } = deps
  const health = deps.sources.healthEntries(kind.health)
  return {
    get deployment() { authorize?.(); return deps.deployment },
    commands: authorize ? deps.commands.withAuthorization(authorize) : deps.commands,
    ready: deps.ready,
    configured: () => { authorize?.(); return deps.configured() },
    get problem() { authorize?.(); return [deps.feishuProblem, deps.setupProblem].find(problem => problem?.place === kind.kind) },
    config: <C extends Record<string, unknown>>(id: string) => {
      authorize?.()
      const instance = deps.sources.instance<C>(id)
      return instance?.enabled ? instance.config : undefined
    },
    receive: trigger => { authorize?.(); return deps.receive(trigger) },
    atomic: work => {
      authorize?.() // Reject and persist the audit before entering a transaction which would roll it back.
      return store.atomic(() => { authorize?.(); return work() })
    },
    state: {
      get: name => { authorize?.(); return store.get(name) },
      set: (name, value) => { authorize?.(); if (value === undefined) store.delete(name); else store.set(name, value) },
      keys: prefix => { authorize?.(); return store.keys(prefix) },
    },
    threads: {
      get: key => { authorize?.(); return store.threads.get(key) },
      subscribed: source => { authorize?.(); return store.read.subscribedThreads(source) },
      describe: (key, description) => { authorize?.(); return store.threads.describe(key, description) },
      patch: (key, meta) => { authorize?.(); store.threads.patchMeta(key, meta) },
    },
    tickets: {
      get: id => { authorize?.(); return store.tickets.get(id) },
      open: () => { authorize?.(); return store.tickets.open() },
      bindThread: (id, thread, own) => { authorize?.(); deps.engine.bindThread(id, thread, own) },
      threadClosed: (thread, outcome, at) => { authorize?.(); deps.engine.threadClosed(thread, outcome, at) },
    },
    triggers: { get: id => { authorize?.(); return store.triggers.get(id) }, latest: thread => { authorize?.(); return store.read.threadTriggers(thread, 1)[0] } },
    notify: message => { authorize?.(); deps.outbox.send(message) },
    report: (entry, value) => {
      authorize?.()
      if (!kind.health.includes(entry)) throw new Error(`The ${kind.kind} Source has no health entry ${entry}`)
      health.get(entry)?.set(value)
    },
  }
}
