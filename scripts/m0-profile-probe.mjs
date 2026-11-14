// Isolated profile/configuration probe. Only supplies an explicitly labelled CLI account Fixture in configured mode; no model keys or business input.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const [cliArg, bundleArg, outputArg, mode] = process.argv.slice(2);
if (!cliArg || !bundleArg || !outputArg || !['--dump-only', '--boot-unconfigured', '--boot-service-dependency-cycle', '--boot-configured-fixture'].includes(mode)) {
  throw new Error('Usage: node scripts/m0-profile-probe.mjs <dsh/lib/bin.js> <bundle> <new-output-directory> --dump-only|--boot-unconfigured|--boot-service-dependency-cycle|--boot-configured-fixture');
}
const configuredMode = mode === '--boot-configured-fixture';
const dependencyMode = mode === '--boot-service-dependency-cycle' || configuredMode;
const cli = resolve(cliArg), bundle = resolve(bundleArg), output = resolve(outputArg);
mkdirSync(output); // Never replace another attempt.
const home = mkdtempSync(join(tmpdir(), 'm0-dsh-profile-'));
const profile = join(home, 'profiles', 'm0-probe');
const env = { PATH: process.env.PATH, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', DSH_MESH_ADMIN_TOKEN: randomBytes(32).toString('hex') };
const report = { mode, status: 'FAIL', config_tree: 'NOT_RUN', boot: 'NOT_RUN',
  business_worker: 'NOT_RUN', real_model_session: 'NOT_RUN', m0_exit: 'BLOCKED', cycles: [] };
const save = (name, value) => writeFileSync(join(output, name), value);
const json = (name, value) => save(name, JSON.stringify(value, null, 2) + '\n');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
function run(id, args) {
  const result = spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', timeout: 30000, maxBuffer: 2_000_000 });
  save(`${id}.stdout.log`, result.stdout ?? '');
  save(`${id}.stderr.log`, result.stderr ?? '');
  if (result.error || result.status !== 0) throw new Error(`${id} failed: ${result.error?.message ?? result.status}`);
  return result.stdout;
}
async function port() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected loopback TCP address');
  const number = address.port;
  await new Promise((yes, no) => server.close(error => error ? no(error) : yes()));
  return number;
}
async function boot(number, index) {
  const file = join(output, `boot-${index}.log`), raw = join(home, `boot-${index}.raw`), fd = openSync(raw, 'wx');
  const child = spawn(process.execPath, [cli, '--profile', 'm0-probe', '--no-open'], { env, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  const closed = once(child, 'close');
  let state, dependencyCycle, forced = false;
  try {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) {
      try {
        const response = await fetch(`http://127.0.0.1:${number}/orchestrator/api/state`,
          { headers: { 'x-orchestrator-request': '1', authorization: `Bearer ${env.DSH_MESH_ADMIN_TOKEN}` }, signal: AbortSignal.timeout(500) });
        if (response.ok) {
          const value = await response.json();
          if (value.health?.runtime?.state === 'paused' && (configuredMode ? value.setup?.accounts?.repository === 'fixture/m0' : value.setup?.problem?.code === 'repositoryUnset')) {
            if (dependencyMode) {
              const match = readFileSync(raw, 'utf8').match(/^M0_DEPENDENCY_CYCLE (.+)$/m);
              if (!match) { await delay(100); continue; }
              dependencyCycle = JSON.parse(match[1]);
            }
            state = value; break;
          }
        }
      } catch { /* The owned loopback server is not ready yet. */ }
      await delay(200);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    const timer = setTimeout(() => { forced = true; child.kill('SIGKILL'); }, 10000);
    try { await closed; } finally { clearTimeout(timer); }
  }
  const text = readFileSync(raw, 'utf8').replace(/([?&]token=)[^\s&]+/g, '$1<redacted>');
  writeFileSync(file, text);
  const cycle = { index, state, dependencyCycle, forced, exit_code: child.exitCode, signal: child.signalCode,
    installed: text.split('[cognitive-mesh] m0 bridge installed').length - 1,
    disposed: text.split('[cognitive-mesh] m0 bridge disposed').length - 1, log_sha256: hash(file) };
  report.cycles.push(cycle);
  json(`boot-${index}.json`, cycle);
  const expectedBridges = configuredMode ? (index === 1 ? 3 : 2) : (dependencyMode ? 2 : 1);
  if (!state || state.health?.runtime?.state !== 'paused' || (configuredMode ? state.setup?.accounts?.repository !== 'fixture/m0' : state.setup?.problem?.code !== 'repositoryUnset')
      || state.load?.running !== 0 || state.load?.queued !== 0 || (!configuredMode && state.setup?.accounts !== null)
      || forced || child.exitCode !== 0 || cycle.installed !== expectedBridges || cycle.disposed !== expectedBridges || (dependencyMode && dependencyCycle?.status !== 'PASS')) throw new Error(`unconfigured profile cycle ${index} failed`);
}
try {
  const version = run('cli-version', ['--version']).trim();
  if (version !== '0.2.1-alpha.2') throw new Error(`Unexpected CLI release: ${version}`);
  const manifest = JSON.parse(readFileSync(join(bundle, 'package.json'), 'utf8'));
  if (manifest.name !== 'dsh-superagent') throw new Error('Unexpected bundle identity');
  const require = createRequire(join(dirname(dirname(cli)), 'package.json'));
  report.peers = Object.keys(manifest.peerDependencies).map(name => {
    const path = require.resolve(`${name}/package.json`);
    const actual = JSON.parse(readFileSync(path, 'utf8')).version;
    const reference = manifest.devDependencies[name];
    return { name, actual, reference, exact_reference_match: actual === reference, manifest_sha256: hash(path) };
  });
  json('peers.json', report.peers);
  if (report.peers.some(peer => !peer.exact_reference_match)) throw new Error('CLI packages do not match the bundle locked reference versions');
  report.bundle_manifest_sha256 = hash(join(bundle, 'package.json'));
  report.bundle_patch_sha256 = hash(join(bundle, 'cordis.patch.yml'));
  report.built_entry_sha256 = hash(join(bundle, 'lib/index.js'));
  run('initialize', ['--profile', 'm0-probe', '--from-default-profile', 'web', '--dump-config']);
  const file = join(profile, 'package.json'), packageJson = JSON.parse(readFileSync(file, 'utf8'));
  packageJson.dsh.profile.bundles.unshift('m0-probe-log');
  packageJson.dsh.profile.bundles.push('dsh-superagent');
  writeFileSync(file, JSON.stringify(packageJson, null, 2) + '\n');
  mkdirSync(join(profile, 'node_modules'), { recursive: true });
  symlinkSync(bundle, join(profile, 'node_modules/dsh-superagent'), 'dir');
  // The Web profile does not export info logs to stdout. Observe only bridge lifecycle messages.
  const observer = join(profile, 'node_modules/m0-probe-log');
  mkdirSync(observer);
  writeFileSync(join(observer, 'package.json'), JSON.stringify({ name: 'm0-probe-log', type: 'module', main: 'index.js',
    dsh: { bundle: { patch: './cordis.patch.yml' } } }));
  writeFileSync(join(observer, 'cordis.patch.yml'), '- insert:\n    - id: m0-probe-log\n      name: m0-probe-log\n');
  writeFileSync(join(observer, 'index.js'), `export function apply(ctx) {
    ctx.logger.exporter({ export(message) {
      const text = String(message.args[0]);
      if (text.startsWith('[cognitive-mesh]')) process.stdout.write(text + '\\n');
    } });
  }\n`);
  if (dependencyMode) {
    // Import only the provider package's public export and the repository's test fixture.
    const providerEntry = require.resolve('@deepseek-ai/dsh-permission-presets');
    report.dependency_provider_entry_sha256 = hash(providerEntry);
    report.dependency_observer_sha256 = hash(fileURLToPath(new URL('./fixtures/m0-profile-runtime/mesh-dependency-observer.mjs', import.meta.url)));
    const providerModule = pathToFileURL(providerEntry).href;
    const cordisModule = pathToFileURL(require.resolve('@deepseek-ai/cordis')).href;
    const helper = pathToFileURL(fileURLToPath(new URL('./fixtures/m0-profile-runtime/mesh-dependency-observer.mjs', import.meta.url))).href;
    writeFileSync(join(observer, 'index.js'), `export { apply } from ${JSON.stringify(helper)};\n`);
    let fixtureConfig = '';
    if (configuredMode) {
      // Owned, ephemeral management credential for the native lifecycle observer; never copied to output artifacts.
      const credentialFile = join(home, 'fixture-management-credential');
      writeFileSync(credentialFile, env.DSH_MESH_ADMIN_TOKEN, { mode: 0o600 });
      const fixtureCli = join(home, 'fixture-gh');
      writeFileSync(fixtureCli, '#!' + process.execPath + '\nconst args=process.argv.slice(2);\nif(args.join(" ")==="api user") console.log(JSON.stringify({login:"m0-fixture",id:7}));\nelse if(args[0]==="api"&&args[1]==="repos/fixture/m0") console.log(JSON.stringify({name:"fixture/m0",push:true}));\nelse process.exit(70);\n', {mode:0o755});
      report.configured_account = 'FIXTURE_CLI_NOT_REAL_GITHUB';
      report.fixture_cli_sha256 = hash(fixtureCli);
      fixtureConfig = '        fixtureCli: ' + JSON.stringify(fixtureCli) + '\n'
        + '        credentialFile: ' + JSON.stringify(credentialFile) + '\n';
    }
    writeFileSync(join(observer, 'cordis.patch.yml'), '- insert:\n    - id: m0-probe-log\n      name: m0-probe-log\n      config:\n        providerModule: ' + JSON.stringify(providerModule) + '\n        cordisModule: ' + JSON.stringify(cordisModule) + '\n' + fixtureConfig);
  }
  const number = mode !== '--dump-only' ? await port() : 3082;
  const patch = `- id: webserver\n  config:\n    host: 127.0.0.1\n    port: ${number}\n- id: dsh-superagent\n  config:\n    stateDir: ${join(home, 'state')}\n- id: dsh-superagent-github\n  disabled: true\n`;
  writeFileSync(join(profile, 'cordis.patch.yml'), patch);
  save('profile.patch.yml', patch);
  json('profile.package.json', packageJson);
  const tree = run('config-dump', ['--profile', 'm0-probe', '--dump-config']);
  if ([...tree.matchAll(/^\s*-?\s*id:\s*dsh-superagent\s*$/gm)].length !== 1) throw new Error('Expected one original SuperAgent entry');
  if (readFileSync(join(output, 'config-dump.stderr.log'), 'utf8').includes('skipping profile bundle')) throw new Error('Bundle was skipped');
  report.config_tree = 'PASS';
  report.config_tree_sha256 = hash(join(output, 'config-dump.stdout.log'));
  if (mode !== '--dump-only') {
    report.boot = 'FAIL';
    await boot(number, 1);
    await boot(number, 2);
    report.boot = 'PASS';
  }
  report.status = 'PASS';
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  rmSync(home, { recursive: true, force: true });
  json('profile-probe.json', report);
}
console.log(JSON.stringify(report));
process.exitCode = report.status === 'PASS' ? 0 : 1;
