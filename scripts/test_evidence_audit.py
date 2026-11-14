import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from evidence_audit import audit


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.target = self.root / 'harness-test'
        self.target.mkdir()
        (self.target / 'command.log').write_text('full log\n')
        self.record = {
            'schema_version': 2, 'check_id': 'harness-test', 'source_commit': 'a' * 40,
            'log': 'command.log', 'log_sha256': hashlib.sha256(b'full log\n').hexdigest(),
            'exit_code': 0, 'timed_out': False, 'launch_error': None,
            'interrupted_signal': None, 'status': 'PASS', 'm0_exit': 'BLOCKED',
            'command': ['npm', 'exec', '--yes', '--package=pnpm@11.28.5', '--', 'pnpm', 'test'],
        }

    def tearDown(self):
        self.temp.cleanup()

    def inspect(self, **kwargs):
        (self.target / 'result.json').write_text(json.dumps(self.record))
        return audit(self.root, **kwargs)

    def test_full_command_pass_is_not_stage_acceptance(self):
        result = self.inspect(required=['harness-test'], source='a' * 40)
        self.assertEqual(result['evidence_integrity'], 'PASS')
        self.assertTrue(result['required_commands_pass'])
        self.assertEqual(result['m0_exit'], 'BLOCKED')

    def test_legacy_failed_log_is_valid_evidence_but_not_command_pass(self):
        self.record.update(schema_version=1, status='FAIL', exit_code=-9, timed_out=True)
        self.record.pop('interrupted_signal')
        result = self.inspect(required=['harness-test'])
        self.assertEqual(result['evidence_integrity'], 'PASS')
        self.assertFalse(result['required_commands_pass'])

    def test_original_artifact_archive_is_checked_without_extracting_or_rewriting(self):
        self.inspect()
        archive = self.root / 'artifact.zip'
        with zipfile.ZipFile(archive, 'w') as out:
            for path in self.target.iterdir():
                out.write(path, path.relative_to(self.root))
        result = audit(archive, required=['harness-test'], source='a' * 40)
        self.assertEqual(result['evidence_integrity'], 'PASS')
        self.assertTrue(result['required_commands_pass'])

    def test_missing_full_log_and_changed_bytes_fail(self):
        for data in (None, b'excerpt'):
            if data is None:
                (self.target / 'command.log').unlink()
            else:
                (self.target / 'command.log').write_bytes(data)
            self.assertEqual(self.inspect()['evidence_integrity'], 'FAIL')

    def test_focused_command_cannot_be_claimed_as_full(self):
        self.record['command'] += ['packages/example/tests/focused.spec.ts']
        self.assertEqual(self.inspect()['evidence_integrity'], 'FAIL')

    def test_cancellation_cannot_claim_pass_even_after_zero_exit(self):
        self.record['interrupted_signal'] = 15
        self.assertEqual(self.inspect()['evidence_integrity'], 'FAIL')

    def test_missing_checks_wrong_source_and_invalid_json_fail(self):
        self.assertEqual(self.inspect(required=['harness-build'])['evidence_integrity'], 'FAIL')
        self.assertEqual(self.inspect(source='b' * 40)['evidence_integrity'], 'FAIL')
        (self.target / 'result.json').write_text('{')
        self.assertEqual(audit(self.root)['evidence_integrity'], 'FAIL')


if __name__ == '__main__':
    unittest.main()
