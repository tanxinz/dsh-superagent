"""Check checklist structure and dependency claims; never certify implementation."""
import argparse
import json
from pathlib import Path
import re

EXPECTED = {'M0': 14, 'M1': 14, 'M2': 28, 'M3': 14, 'M4': 14, 'M5': 16}
DEFAULT = 'docs/SuperAgent_Harness_Development_Checklist_V1.0_20261112.md'


def audit(text):
    headings = list(re.finditer(r'^#### (M[0-5]-\d{2}) ([^\n]+)$', text, re.M))
    tasks, errors = {}, []
    for index, heading in enumerate(headings):
        task_id = heading[1]
        if task_id in tasks:
            errors.append(f'{task_id}: duplicate task')
            continue
        block = text[heading.end():headings[index + 1].start() if index + 1 < len(headings) else len(text)]
        state = re.search(r'^- \[([ xX])\] \*\*状态：([A-Z_]+)\*\*', block, re.M)
        prerequisites = re.search(r'^- \*\*前置任务\*\*：([^\n]+)', block, re.M)
        if not state or not prerequisites:
            errors.append(f'{task_id}: missing state or prerequisites')
            continue
        status = state[2]
        if status not in {'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE'}:
            errors.append(f'{task_id}: unknown state {status}')
        checked = state[1].lower() == 'x'
        if checked != (status == 'DONE'):
            errors.append(f'{task_id}: checkbox and status disagree')
        depends = re.findall(r'M[0-5]-\d{2}', prerequisites[1].split('设计依据')[0])
        if status == 'DONE' and not re.search(r'^- \*\*完成证据\*\*：\S+', block, re.M):
            errors.append(f'{task_id}: DONE requires an explicit completion evidence reference')
        tasks[task_id] = {'title': heading[2], 'status': status, 'depends_on': depends}
    expected_ids = {f'{stage}-{i:02d}' for stage, count in EXPECTED.items() for i in range(1, count + 1)}
    if set(tasks) != expected_ids:
        errors.append('Task IDs must exactly match the frozen 100-task inventory')
    visiting, visited = set(), set()

    def visit(task_id):
        if task_id in visiting:
            errors.append(f'{task_id}: dependency cycle')
            return
        if task_id in visited:
            return
        visiting.add(task_id)
        task = tasks[task_id]
        for dep in task['depends_on']:
            if dep not in tasks:
                errors.append(f'{task_id}: unknown prerequisite {dep}')
                continue
            if task['status'] == 'DONE' and tasks[dep]['status'] != 'DONE':
                errors.append(f'{task_id}: incomplete prerequisite {dep}')
            visit(dep)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in tasks:
        visit(task_id)
    return {
        'structure': 'PASS' if not errors else 'FAIL', 'errors': errors,
        'completion_verified': False,
        'counts': {stage: {
            'total': sum(key.startswith(stage + '-') for key in tasks),
            'done_claimed': sum(key.startswith(stage + '-') and task['status'] == 'DONE' for key, task in tasks.items()),
        } for stage in EXPECTED},
        'tasks': tasks,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checklist', default=DEFAULT)
    parser.add_argument('--require-stage', choices=list(EXPECTED))
    args = parser.parse_args()
    report = audit(Path(args.checklist).read_text())
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report['errors']:
        return 1
    if args.require_stage and report['counts'][args.require_stage]['done_claimed'] != EXPECTED[args.require_stage]:
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
