// Test-only observer for an isolated, unconfigured profile. No credentials or business input.
import { setTimeout as delay } from 'node:timers/promises';

const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export async function apply(ctx, config) {
  const { PermissionPresetService } = await import(config.providerModule);
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
    setImmediate(() => { void cycle(previous, runtime).then(
      value => process.stdout.write('M0_DEPENDENCY_CYCLE ' + JSON.stringify(value) + '\n'),
      error => process.stdout.write('M0_DEPENDENCY_CYCLE ' + JSON.stringify({ status: 'FAIL', error: String(error) }) + '\n'),
    ); });
  });
  async function cycle(previous, runtime) {
    previous.assertReady();
    const registered = ctx.registry.get(PermissionPresetService);
    if (!registered || registered.fibers.length !== 1) throw new Error('Expected exactly one native permission provider');
    const [provider] = registered.fibers;
    const parent = provider.parent;
    const savedConfig = { presets: provider.config.presets, defaultPreset: provider.config.defaultPreset.get() };
    const beforePresets = canonical(savedConfig.presets);
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
    let staleRuntimeRefused = false;
    try { runtime.receive(null); } catch (error) {
      staleRuntimeRefused = /CognitiveMesh unavailable|Orchestrator is stopping/.test(String(error));
    }
    const providerCount = ctx.registry.get(PermissionPresetService)?.fibers.length;
    const presetsUnchanged = canonical(ctx.get('permissionPresets').presets) === beforePresets;
    if (!staleRuntimeRefused || providerCount !== 1 || !presetsUnchanged) throw new Error('Restoration check: ' + JSON.stringify({ staleRuntimeRefused, providerCount, presetsUnchanged }));
    return { status: 'PASS', provider: '@deepseek-ai/dsh-permission-presets', retainedRefused,
      intakeRefused, staleRefused, staleRuntimeRefused, providerCount, presetsUnchanged, lifetimeAborted: runtime.lifetime.aborted, reloaded: true,
      configuredProfile: false, businessWorker: 'NOT_RUN', realModelSession: 'NOT_RUN' };
  }
}
