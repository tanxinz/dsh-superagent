// Read-only, dependency-free diagnostics. This is not a build or M0 exit gate.
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const peerPaths = {
  '@deepseek-ai/cordis': 'upstream/harness/vendor/cordis/package.json',
  '@deepseek-ai/schemastery': 'upstream/harness/vendor/schemastery/package.json',
};
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function compareExactPeer(required, actual) {
  if (typeof required !== 'string' || typeof actual !== 'string' || !exactVersion.test(actual)) {
    throw new Error('Missing or invalid peer version');
  }
  // Do not implement an incomplete semver range resolver or silently accept a changed contract.
  if (!exactVersion.test(required)) return 'UNTESTED';
  return required === actual ? 'MATCH' : 'MISMATCH';
}

export function inspectManifests(root) {
  const files = {};
  function read(path, name) {
    const bytes = readFileSync(join(root, path));
    const manifest = JSON.parse(bytes.toString('utf8'));
    if (manifest.name !== name) throw new Error(`Unexpected package identity: ${path}`);
    files[path] = createHash('sha256').update(bytes).digest('hex');
    return manifest;
  }
  const superagent = read('upstream/superagent/package.json', 'dsh-superagent');
  const harness = read('upstream/harness/package.json', '@deepseek-ai/dsh-root');
  const exactPeers = Object.entries(peerPaths).map(([name, path]) => {
    const manifest = read(path, name);
    const required = superagent.peerDependencies?.[name];
    return { name, required, actual: manifest.version, status: compareExactPeer(required, manifest.version) };
  });
  return {
    manifests_sha256: files,
    declaredPackageManagers: { superagent: superagent.packageManager, harness: harness.packageManager },
    dsh: { required: superagent.engines?.dsh, actual: harness.version, status: 'UNTESTED' },
    exactPeers,
    declarationCompatibility: exactPeers.some(x => x.status === 'MISMATCH')
      ? 'MISMATCH' : exactPeers.every(x => x.status === 'MATCH') ? 'EXACT_PEERS_MATCH_ONLY' : 'UNTESTED',
  };
}

export async function probeUnixSocket() {
  if (process.platform === 'win32') return { status: 'NOT_APPLICABLE' };
  const directory = mkdtempSync(join(tmpdir(), 'dsh-m0-'));
  const server = createServer();
  try {
    return await new Promise(resolveResult => {
      server.once('error', error => resolveResult({ status: 'BLOCKED', code: error.code ?? 'UNKNOWN' }));
      server.listen(join(directory, 'probe.sock'), () => server.close(() => resolveResult({ status: 'PASS' })));
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function summarize(manifests, environment) {
  const blocked = manifests.declarationCompatibility !== 'EXACT_PEERS_MATCH_ONLY'
    || environment.unixSocket.status !== 'PASS' || environment.nodeApiHeaders !== 'PRESENT'
    || environment.nativeTypeScript !== true;
  return {
    ...manifests,
    environment,
    preflight: blocked ? 'BLOCKED' : 'CANDIDATE',
    fullBuild: 'NOT_RUN',
    fullTests: 'NOT_RUN',
    runtimeCompatibility: 'UNTESTED',
    m0Exit: 'BLOCKED',
  };
}

export async function main(root) {
  const manifests = inspectManifests(root);
  const environment = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    nativeTypeScript: Boolean(process.features.typescript),
    nodeApiHeaders: existsSync(resolve(dirname(process.execPath), '../include/node/node_api.h')) ? 'PRESENT' : 'MISSING',
    unixSocket: await probeUnixSocket(),
  };
  return summarize(manifests, environment);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/m0-preflight.mjs');
    const report = await main(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.preflight === 'BLOCKED' ? 2 : 0;
  } catch (error) {
    // Do not emit absolute working paths or environmental values from filesystem errors.
    console.log(JSON.stringify({ preflight: 'ERROR', code: error.code ?? 'INVALID_INPUT', m0Exit: 'BLOCKED' }));
    process.exitCode = 1;
  }
}
