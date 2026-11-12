"""Run one trusted CI command without a shell; preserve failures and evidence."""
import argparse
import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import time


def redact(text, cwd):
    text = text.replace(str(Path(cwd).resolve()), '<cwd>')
    for name, value in os.environ.items():
        if re.search(r'(TOKEN|API_KEY|PASSWORD|SECRET)$', name, re.I) and len(value) >= 8:
            text = text.replace(value, '<redacted>')
    text = re.sub(r'gh[pousr]_[A-Za-z0-9_]+', '<redacted>', text)
    return re.sub(r'(?i)(authorization\s*[:=]\s*(?:bearer|token)\s+)\S+', r'\1<redacted>', text)


def source_sha(cwd):
    result = subprocess.run(['git', '-C', str(cwd), 'rev-parse', 'HEAD'],
                            capture_output=True, text=True, timeout=10)
    sha = result.stdout.strip()
    return sha if result.returncode == 0 and re.fullmatch(r'[0-9a-f]{40}', sha) else None


def record_command(command, cwd, output, check_id, timeout):
    if not command or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', check_id):
        raise ValueError('Invalid command or check ID')
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('Timeout must be finite and positive')
    cwd = Path(cwd).resolve(strict=True)
    target = Path(output) / check_id
    target.mkdir(parents=True, exist_ok=False)  # never silently overwrite an attempt
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    start = time.monotonic()
    code, error, timed_out = None, None, False
    raw = target / 'command.raw'
    with raw.open('wb') as log:
        try:
            child = subprocess.Popen(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT,
                                     start_new_session=True)
            try:
                code = child.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                # CI targets Linux. Stop descendants too, not only the package-manager parent.
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                code = child.wait()
        except OSError as exc:
            error = exc.__class__.__name__
            log.write(str(exc).encode('utf-8', errors='replace'))
    cleaned = redact(raw.read_text(errors='replace'), cwd)
    logfile = target / 'command.log'
    logfile.write_text(cleaned, encoding='utf-8')
    raw.unlink()
    record = {
        'schema_version': 1, 'check_id': check_id, 'mode': 'OFFLINE_BUILD_OR_TEST',
        'started_at': started, 'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'duration_seconds': round(time.monotonic() - start, 3),
        'command': [redact(arg, cwd) for arg in command],
        'source_commit': source_sha(cwd),
        'exit_code': code, 'timed_out': timed_out, 'launch_error': error,
        'status': 'PASS' if code == 0 and not timed_out and error is None else 'FAIL',
        'log': 'command.log', 'log_sha256': hashlib.sha256(logfile.read_bytes()).hexdigest(),
        'lockfile_sha256': hashlib.sha256((cwd / 'pnpm-lock.yaml').read_bytes()).hexdigest()
            if (cwd / 'pnpm-lock.yaml').is_file() else None,
        'online_sdk': 'NOT_RUN', 'real_session': 'NOT_RUN', 'm0_exit': 'BLOCKED',
    }
    (target / 'result.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', required=True)
    parser.add_argument('--cwd', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--timeout', type=float, default=1800)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    record = record_command(command, args.cwd, args.output, args.id, args.timeout)
    print(json.dumps({'check_id': args.id, 'status': record['status'], 'exit_code': record['exit_code']}))
    return 0 if record['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
