import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
import time
from unittest.mock import patch

from ci_record import record_command


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def run_code(self, code, **kwargs):
        return record_command([sys.executable, '-c', code], self.root,
                              self.root / 'evidence', kwargs.get('check_id', 'test'),
                              kwargs.get('timeout', 5))

    def test_success_is_only_command_success_and_hashes_saved_bytes(self):
        (self.root / 'pnpm-lock.yaml').write_text('fixture lock')
        record = self.run_code("print('hello')")
        self.assertEqual(record['status'], 'PASS')
        self.assertEqual(record['m0_exit'], 'BLOCKED')
        self.assertEqual(record['real_session'], 'NOT_RUN')
        self.assertEqual(record['log_sha256'], hashlib.sha256(
            (self.root / 'evidence/test/command.log').read_bytes()).hexdigest())
        self.assertEqual(record, json.loads((self.root / 'evidence/test/result.json').read_text()))

    def test_nonzero_exit_cannot_pass(self):
        record = self.run_code('raise SystemExit(7)')
        self.assertEqual((record['status'], record['exit_code']), ('FAIL', 7))

    def test_signal_cannot_pass(self):
        record = self.run_code('import os, signal; os.kill(os.getpid(), signal.SIGTERM)')
        self.assertEqual((record['status'], record['exit_code']), ('FAIL', -signal.SIGTERM))

    def test_timeout_cannot_pass(self):
        record = self.run_code('import time; time.sleep(10)', timeout=0.05)
        self.assertEqual(record['status'], 'FAIL')
        self.assertTrue(record['timed_out'])

    @unittest.skipUnless(sys.platform == 'linux', 'CI recorder targets Linux process groups')
    def test_cancellation_preserves_redacted_evidence_and_kills_descendants(self):
        recorder = Path(__file__).with_name('ci_record.py').resolve()
        for signum in (signal.SIGINT, signal.SIGTERM):
            with self.subTest(signal=signum):
                marker = self.root / f'ready-{signum}.json'
                check_id = f'cancel-{signum}'
                code = (
                    "import subprocess,sys,os,json,pathlib,time; "
                    "child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)']); "
                    "print(os.environ['FIXTURE_TOKEN'],flush=True); "
                    f"pathlib.Path({str(marker)!r}).write_text(json.dumps([os.getpid(),child.pid])); "
                    "time.sleep(30)"
                )
                proc = subprocess.Popen([
                    sys.executable, str(recorder), '--id', check_id, '--cwd', str(self.root),
                    '--output', str(self.root / 'evidence'), '--', sys.executable, '-c', code,
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    env={**os.environ, 'FIXTURE_TOKEN': 'fixture-secret-value'})
                try:
                    deadline = time.monotonic() + 5
                    while not marker.exists() and proc.poll() is None and time.monotonic() < deadline:
                        time.sleep(.01)
                    self.assertTrue(marker.exists(), 'fixture did not start')
                    pids = json.loads(marker.read_text())
                    proc.send_signal(signum)
                    stdout, stderr = proc.communicate(timeout=5)
                    self.assertEqual(proc.returncode, 1, (stdout, stderr))
                    target = self.root / 'evidence' / check_id
                    record = json.loads((target / 'result.json').read_text())
                    self.assertEqual(record['status'], 'FAIL')
                    self.assertEqual(record['interrupted_signal'], signum)
                    self.assertFalse(record['timed_out'])
                    self.assertNotIn('fixture-secret-value', (target / 'command.log').read_text())
                    self.assertFalse((target / 'command.raw').exists())
                    self.assertEqual(record['log_sha256'], hashlib.sha256(
                        (target / 'command.log').read_bytes()).hexdigest())
                    for pid in pids:
                        stat = Path(f'/proc/{pid}/stat')
                        if stat.exists():
                            self.assertEqual(stat.read_text().rsplit(')', 1)[1].split()[0], 'Z')
                finally:
                    if proc.poll() is None:
                        proc.terminate()
                        proc.communicate(timeout=5)
                    if marker.exists():
                        for pid in json.loads(marker.read_text()):
                            try:
                                os.kill(pid, signal.SIGKILL)
                            except ProcessLookupError:
                                pass

    def test_missing_executable_cannot_pass(self):
        record = record_command([str(self.root / 'missing')], self.root,
                                self.root / 'evidence', 'missing', 5)
        self.assertEqual(record['status'], 'FAIL')
        self.assertIsNone(record['exit_code'])
        self.assertEqual(record['launch_error'], 'FileNotFoundError')

    def test_redaction_happens_before_hash_and_raw_file_is_removed(self):
        with patch.dict(os.environ, {'FIXTURE_TOKEN': 'fixture-secret-value'}):
            record = self.run_code("import os; print(os.environ['FIXTURE_TOKEN']); print('Authorization: Bearer abc123'); print(os.getcwd())")
        text = (self.root / 'evidence/test/command.log').read_text()
        self.assertNotIn('fixture-secret-value', text)
        self.assertNotIn('abc123', text)
        self.assertNotIn(str(self.root), text)
        self.assertFalse((self.root / 'evidence/test/command.raw').exists())
        self.assertEqual(record['log_sha256'], hashlib.sha256(text.encode()).hexdigest())

    def test_attempt_cannot_be_overwritten(self):
        self.run_code("print('original')")
        before = (self.root / 'evidence/test/result.json').read_bytes()
        with self.assertRaises(FileExistsError):
            self.run_code("print('replacement')")
        self.assertEqual((self.root / 'evidence/test/result.json').read_bytes(), before)

    def test_invalid_timeout_and_id_do_not_execute(self):
        for timeout in [0, -1, float('nan'), float('inf')]:
            with self.assertRaises(ValueError):
                self.run_code('raise SystemExit(0)', timeout=timeout)
        with self.assertRaises(ValueError):
            self.run_code('raise SystemExit(0)', check_id='../escape')


if __name__ == '__main__':
    unittest.main()
