// Harmless kernel-boundary experiment. This does not attest a DSH business Worker's execution path.
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node scripts/m0-isolation-probe.mjs <new-evidence-directory>');
mkdirSync(output);
const root = mkdtempSync(join(tmpdir(), 'm0-isolation-'));
const secret = join(root, 'host-only-canary'), readonly = join(root, 'readonly'), work = join(root, 'work');
mkdirSync(readonly); mkdirSync(work); chmodSync(work, 0o777);
writeFileSync(secret, 'Owned harmless host canary\n'); writeFileSync(join(readonly, 'canary'), 'Read-only fixture\n');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const before = { host: hash(secret), readonly: hash(join(readonly, 'canary')) };
const server = createServer(socket => { socket.end('owned-loopback-service'); });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = server.address().port;
const report = { status: 'FAIL', class: 'OFFLINE_OS_FIXTURE', business_worker: 'NOT_RUN', before,
  bwrap_version: spawnSync('/usr/bin/bwrap', ['--version'], { encoding: 'utf8' }).stdout?.trim() };
try {
  const source = `import os,json,socket
checks={}
try:
 open(${JSON.stringify(secret)}).read(); checks['outside_read_denied']=False
except OSError: checks['outside_read_denied']=True
try:
 open('/ro/canary','w').write('changed'); checks['readonly_write_denied']=False
except OSError: checks['readonly_write_denied']=True
try:
 open(${JSON.stringify(secret)},'w').write('changed'); checks['outside_write_denied']=False
except OSError: checks['outside_write_denied']=True
open('/work/allowed','w').write('owned sandbox output')
checks['owned_write_allowed']=True
checks['credential_absent']='M0_FAKE_TOKEN' not in os.environ
checks['net_namespace_isolated']=os.readlink('/proc/self/ns/net')!=${JSON.stringify(readlinkSync('/proc/self/ns/net'))}
checks['pid_namespace_isolated']=os.readlink('/proc/self/ns/pid')!=${JSON.stringify(readlinkSync('/proc/self/ns/pid'))}
s=socket.socket(); s.settimeout(.3)
try:
 s.connect(('127.0.0.1',${port})); checks['owned_host_network_denied']=False
except OSError: checks['owned_host_network_denied']=True
finally: s.close()
print(json.dumps(checks))
raise SystemExit(0 if all(checks.values()) else 1)
`;
  const argv = ['--unshare-all', '--die-with-parent', '--new-session', '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin',
    '--ro-bind', '/usr', '/usr', '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--ro-bind', readonly, '/ro', '--bind', work, '/work', '--chdir', '/work',
    '--', '/usr/bin/python3', '-c', source];
  const result = spawnSync('/usr/bin/bwrap', argv, { env: { M0_FAKE_TOKEN: 'harmless-owned-fixture' }, encoding: 'utf8', timeout: 10000 });
  writeFileSync(join(output, 'stdout.log'), result.stdout ?? ''); writeFileSync(join(output, 'stderr.log'), result.stderr ?? '');
  report.argv = ['/usr/bin/bwrap', ...argv]; report.exit_code = result.status; report.signal = result.signal;
  report.after = { host: hash(secret), readonly: hash(join(readonly, 'canary')) };
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Kernel isolation probe failed; inspect the retained stderr and exit code');
  report.checks = JSON.parse(result.stdout);
  if (JSON.stringify(before) !== JSON.stringify(report.after)) throw new Error('A protected owned target changed');
  report.status = 'PASS';
} catch (error) { report.error = String(error); }
finally {
  await new Promise(resolve => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report)); process.exitCode = report.status === 'PASS' ? 0 : 1;
