// Test-only observer for temporary native profiles. Optional account replies are an owned CLI Fixture, never real credentials.
import { setTimeout as delay } from 'node:timers/promises';

const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export async function apply(ctx, config) {
  const { PermissionPresetService } = await import(config.providerModule);
  const { Context } = await import(config.cordisModule);
  const permissionScope = ctx[Context.isolate].permissionPresets;
  const providers = () => [...(ctx.registry.get(PermissionPresetService)?.fibers ?? [])]
    .filter(fiber => fiber.uid !== null && fiber.ctx[Context.isolate].permissionPresets === permissionScope
      && fiber.store?.permissionPresets?.fiber === fiber);
  let started = false;
  ctx.logger.exporter({ export(message) {
    const text = String(message.args[0]);
    if (text.startsWith('[cognitive-mesh]')) process.stdout.write(text + '\n');
  } });
  ctx.inject(['cognitiveMesh', 'orchestrator', 'permissionPresets'], child => {
    if (started) return;
    started = true;
    const previous = child.cognitiveMesh, runtime = child.orchestrator;
    // Schedule outside the injected fiber: removing its dependency unloads that fiber.
    setImmediate(() => { void (async () => {
      await runtime.ready;
      if (config.fixtureCli && !runtime.configured()) {
        const settings = runtime.store.settings();
        runtime.store.saveSettings({ ...settings, paused: true, sources: { github: { enabled: false, config: { repository: 'fixture/m0', cli: config.fixtureCli } } },
          eval: { ...settings.eval, model: null }, executor: { ...settings.executor, model: null } });
        started = false; runtime.checkSetup(); return {status: 'CONFIGURING'};
      }
      return cycle(previous, runtime);
    })().then(
      value => process.stdout.write((value.status === 'CONFIGURING' ? 'M0_FIXTURE_CONFIG ' : 'M0_DEPENDENCY_CYCLE ') + JSON.stringify(value) + '\n'),
      error => process.stdout.write('M0_DEPENDENCY_CYCLE ' + JSON.stringify({ status: 'FAIL', error: String(error) }) + '\n'),
    ); });
  });
  async function cycle(previous, runtime) {
    previous.assertReady();
    let configuredSession;
    if (config.fixtureCli) {
      if (!runtime.configured() || runtime.health.runtime.state !== 'paused') throw new Error('Configured fixture did not enter its safety hold');
      const id = runtime.masterId;
      const first = await runtime.sessions.ensure(id, runtime.machine.stateDir, 'M0 fixture main', 'orchestrator');
      const second = await runtime.sessions.ensure(id, runtime.machine.stateDir, 'M0 fixture role switch', 'worker');
      const service = ctx.get('permissionPresets');
      if (first !== second || service.current(first.session) !== 'read-only') throw new Error('Real Session permissions or same-ID resolution changed');
      let entered = 0;
      const release = first.ctx.tools.register({ name: 'm0_owned_probe', description: 'Harmless owned counter', parameters: {type:'object',properties:{}},
        output:{schema:{type:'number'},render:()=>[]}, execute:async()=>++entered });
      const result = await first.ctx.tools.execute({ callId:'m0-profile-tool-denial',name:'m0_owned_probe',arguments:{},agent:first,signal:new AbortController().signal });
      release();
      if (!result.isError || entered !== 0) throw new Error('Final tool guard did not stop execution');
      service.set(first.session, 'danger-full-access');
      let overrideRefused = false;
      try { await runtime.sessions.ensure(id,runtime.machine.stateDir,'M0 fixture override','orchestrator'); } catch { overrideRefused = true; }
      service.set(first.session,'read-only');
      if (!overrideRefused) throw new Error('Broad Session override was accepted');
      runtime.effects.enqueue('m0-owned-fixture','persisted',{fixture:true});
      await ctx.get('sessionPersistence').flush();
      configuredSession = { id, preset:service.current(first.session), sameId:true, roleSwitchRestricted:true, overrideRefused, toolBodyEntries:entered, nativeToolDenied:result.isError, modelRequest:first.session.requestHeader() ? 'UNEXPECTED' : 'NOT_RUN' };
      if (configuredSession.modelRequest !== 'NOT_RUN') throw new Error('Unexpected model request');
    }
    const owned = providers();
    if (owned.length !== 1) throw new Error('Expected one permission provider in the current isolation scope');
    const [provider] = owned;
    const parent = provider.parent;
    const savedConfig = { presets: provider.config.presets, defaultPreset: provider.config.defaultPreset.get() };
    const catalog = service => Object.fromEntries(service.names.map(name => [name, service.resolve(name)]));
    const beforePresets = canonical(catalog(ctx.get('permissionPresets')));
    await provider.dispose();
    if (ctx.get('cognitiveMesh')) throw new Error('Mesh was still published after dependency disposal');
    let retainedRefused = false, intakeRefused = false;
    try { previous.assertReady(); } catch (error) { retainedRefused = String(error).includes('CognitiveMesh unavailable'); }
    // Invalid input is intentional: readiness must reject it before any domain parsing or write.
    try { runtime.receive(null); } catch (error) { intakeRefused = String(error).includes('CognitiveMesh unavailable'); }
    if (!retainedRefused || !intakeRefused || !runtime.lifetime.aborted) throw new Error('Old Runtime/service stayed usable');
    await parent.plugin(PermissionPresetService, savedConfig);
    const deadline = Date.now() + 10000;
    let restored;
    while (Date.now() < deadline) {
      const current = ctx.get('cognitiveMesh');
      if (current && current !== previous && current.health().state === 'ready') { restored = current; break; }
      await delay(25);
    }
    if (!restored) throw new Error('Native dependency restoration did not reload Mesh');
    let staleRefused = false;
    try { previous.assertReady(); } catch (error) { staleRefused = String(error).includes('CognitiveMesh unavailable'); }
    if (!staleRefused) throw new Error('A stale handle became usable after reload');
    restored.assertReady();
    if (configuredSession) {
      const next = ctx.get('orchestrator'); await next.ready;
      const agent = await next.sessions.ensure(next.masterId,next.machine.stateDir,'M0 restored fixture','orchestrator');
      if (next.masterId !== configuredSession.id || ctx.get('permissionPresets').current(agent.session) !== 'read-only') throw new Error('Restored native Session lost its restriction');
      const row = next.store.db.prepare("SELECT kind,key FROM effect WHERE kind='m0-owned-fixture' AND key='persisted'").get();
      if (!row) throw new Error('Durable fixture Effect was lost on dependency reload');
      configuredSession = {...configuredSession, restoredRestricted:true, persistedEffectRetained:true, automaticProcessing:'BLOCKED_ISOLATION'};
    }
    let staleRuntimeRefused = false;
    try { runtime.receive(null); } catch (error) {
      staleRuntimeRefused = /CognitiveMesh unavailable|Orchestrator is stopping/.test(String(error));
    }
    // A second real provider in a different scope is legal, and must not be counted as a duplicate.
    const isolated = await parent.isolate('permissionPresets').plugin(PermissionPresetService, savedConfig);
    const globalProviderCount = ctx.registry.get(PermissionPresetService)?.fibers.length;
    const providerCount = providers().length;
    const presetsUnchanged = canonical(catalog(ctx.get('permissionPresets'))) === beforePresets;
    await isolated.dispose();
    if (!staleRuntimeRefused || providerCount !== 1 || globalProviderCount < 2 || !presetsUnchanged) throw new Error('Restoration check: ' + JSON.stringify({ staleRuntimeRefused, providerCount, globalProviderCount, presetsUnchanged }));
    return { status: 'PASS', provider: '@deepseek-ai/dsh-permission-presets', retainedRefused,
      intakeRefused, staleRefused, staleRuntimeRefused, providerCount, globalProviderCount, presetsUnchanged, lifetimeAborted: runtime.lifetime.aborted, reloaded: true,
      configuredProfile: !!config.fixtureCli, configuredSession, account: config.fixtureCli ? 'FIXTURE_CLI_NOT_REAL_GITHUB' : 'UNCONFIGURED', businessWorker: 'NOT_RUN', realModelSession: 'NOT_RUN' };
  }
}
