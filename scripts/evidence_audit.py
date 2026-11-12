"""Verify saved command evidence; this never grants M0 acceptance."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile


def audit(root, required=(), source=None):
    root = Path(root)
    if root.is_file():
        with zipfile.ZipFile(root) as archive:
            names = archive.namelist()
            if len(names) != len(set(names)):
                raise ValueError('duplicate archive entry')
            records = [(name, archive.read(name),
                        archive.read(name.replace('result.json', 'command.log'))
                        if name.replace('result.json', 'command.log') in names else None)
                       for name in names if name.count('/') == 1 and name.endswith('/result.json')]
    else:
        records = [(str(path), path.read_bytes(),
                    path.with_name('command.log').read_bytes()
                    if path.with_name('command.log').is_file() else None)
                   for path in sorted(root.glob('*/result.json'))]
    errors, checks = [], {}
    for name, record_bytes, log_bytes in records:
        check_id = Path(name).parent.name
        try:
            record = json.loads(record_bytes)
            if record.get('check_id') != check_id:
                raise ValueError('check_id does not match directory')
            if record.get('schema_version') not in (1, 2):
                raise ValueError('unknown evidence schema')
            if record.get('log') != 'command.log':
                raise ValueError('expected full command.log')
            if log_bytes is None:
                raise ValueError('missing full command.log')
            if hashlib.sha256(log_bytes).hexdigest() != record.get('log_sha256'):
                raise ValueError('log hash mismatch')
            if source is not None and record.get('source_commit') != source:
                raise ValueError('source commit mismatch')
            success = (type(record.get('exit_code')) is int and record['exit_code'] == 0
                       and record.get('timed_out') is False
                       and record.get('launch_error') is None
                       and record.get('interrupted_signal') is None)
            expected = 'PASS' if success else 'FAIL'
            if record.get('status') != expected:
                raise ValueError('status contradicts exit, timeout, error or interruption')
            if record.get('m0_exit') != 'BLOCKED':
                raise ValueError('command evidence cannot grant M0 acceptance')
            if check_id == 'harness-test' and record.get('command') != [
                'npm', 'exec', '--yes', '--package=pnpm@11.28.5', '--', 'pnpm', 'test',
            ]:
                raise ValueError('harness-test must use the original full test command')
            checks[check_id] = expected
        except (OSError, ValueError, TypeError, AttributeError) as exc:
            errors.append({'check_id': check_id, 'error': str(exc)})
    for check_id in required:
        if check_id not in checks:
            errors.append({'check_id': check_id, 'error': 'missing or invalid evidence; NOT_RUN/UNKNOWN'})
    if not checks:
        errors.append({'error': 'no valid evidence'})
    return {
        'evidence_integrity': 'FAIL' if errors else 'PASS',
        'checks': checks, 'errors': errors,
        'required_commands_pass': bool(required) and all(checks.get(c) == 'PASS' for c in required),
        'm0_exit': 'BLOCKED', 'real_session': 'NOT_RUN',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root')
    parser.add_argument('--require', action='append', default=[])
    parser.add_argument('--source')
    parser.add_argument('--output')
    args = parser.parse_args()
    report = audit(args.root, args.require, args.source)
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        # Keep prior attempts immutable, just as the command recorder does.
        with Path(args.output).open('x') as out:
            out.write(text)
    print(text, end='')
    return 0 if report['evidence_integrity'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
