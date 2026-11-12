import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { compareExactPeer, inspectManifests, summarize } from './m0-preflight.mjs';

test('exact prerelease peer rejects a newer stable provider', () => {
  assert.equal(compareExactPeer('4.0.5-alpha.1', '4.1.0'), 'MISMATCH');
  assert.equal(compareExactPeer('3.18.5-alpha.1', '3.19.0'), 'MISMATCH');
});
test('matching exact versions do not imply range verification', () => {
  assert.equal(compareExactPeer('4.0.5-alpha.1', '4.0.5-alpha.1'), 'MATCH');
  assert.equal(compareExactPeer('^4.0.5-alpha.1', '4.1.0'), 'UNTESTED');
});
test('missing or malformed package versions fail closed', () => {
  assert.throws(() => compareExactPeer(undefined, '4.1.0'));
  assert.throws(() => compareExactPeer('4.1.0', undefined));
  assert.throws(() => compareExactPeer('4.1.0', 'latest'));
});
const ready = { unixSocket: { status: 'PASS' }, nodeApiHeaders: 'PRESENT', nativeTypeScript: true };
test('even successful preflight never declares a build or M0 passed', () => {
  const report = summarize({ declarationCompatibility: 'EXACT_PEERS_MATCH_ONLY' }, ready);
  assert.equal(report.preflight, 'CANDIDATE');
  assert.equal(report.fullBuild, 'NOT_RUN');
  assert.equal(report.fullTests, 'NOT_RUN');
  assert.equal(report.runtimeCompatibility, 'UNTESTED');
  assert.equal(report.m0Exit, 'BLOCKED');
});
test('each environmental prerequisite and unverified declaration blocks readiness', () => {
  for (const environment of [
    { ...ready, unixSocket: { status: 'BLOCKED', code: 'EPERM' } },
    { ...ready, nodeApiHeaders: 'MISSING' },
    { ...ready, nativeTypeScript: false },
  ]) assert.equal(summarize({ declarationCompatibility: 'EXACT_PEERS_MATCH_ONLY' }, environment).preflight, 'BLOCKED');
  for (const state of ['MISMATCH', 'UNTESTED']) {
    assert.equal(summarize({ declarationCompatibility: state }, ready).preflight, 'BLOCKED');
  }
});
test('manifest reader checks package identity and fingerprints actual input bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'm0-manifest-'));
  const write = (path, value) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(value));
  };
  try {
    assert.throws(() => inspectManifests(root), { code: 'ENOENT' });
    write('upstream/superagent/package.json', { name: 'dsh-superagent', peerDependencies: {
      '@deepseek-ai/cordis': '4.0.5-alpha.1', '@deepseek-ai/schemastery': '3.18.5-alpha.1',
    } });
    write('upstream/harness/package.json', { name: '@deepseek-ai/dsh-root', version: '0.2.2-rc.2' });
    write('upstream/harness/vendor/cordis/package.json', { name: '@deepseek-ai/cordis', version: '4.1.0' });
    write('upstream/harness/vendor/schemastery/package.json', { name: '@deepseek-ai/schemastery', version: '3.19.0' });
    const before = inspectManifests(root);
    assert.equal(before.declarationCompatibility, 'MISMATCH');
    assert.equal(Object.keys(before.manifests_sha256).length, 4);
    write('upstream/harness/vendor/cordis/package.json', { name: '@deepseek-ai/cordis', version: '4.0.5-alpha.1' });
    assert.notDeepEqual(inspectManifests(root).manifests_sha256, before.manifests_sha256);
    write('upstream/harness/vendor/cordis/package.json', { name: 'wrong-package', version: '4.0.5-alpha.1' });
    assert.throws(() => inspectManifests(root), /Unexpected package identity/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
