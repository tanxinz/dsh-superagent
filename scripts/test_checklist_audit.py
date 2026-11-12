import unittest
from checklist_audit import EXPECTED, audit


def fixture():
    return '\n'.join(f'#### {stage}-{i:02d} Task\n- [ ] **状态：TODO**\n- **前置任务**：无。设计依据：§1。\n'
                     for stage, count in EXPECTED.items() for i in range(1, count + 1))


class ChecklistTests(unittest.TestCase):
    def test_structure_pass_is_not_completion(self):
        result = audit(fixture())
        self.assertEqual(result['structure'], 'PASS')
        self.assertFalse(result['completion_verified'])
        self.assertEqual(sum(x['done_claimed'] for x in result['counts'].values()), 0)

    def test_deleted_or_duplicated_tasks_fail(self):
        for text in [fixture().replace('#### M0-01 ', '#### REMOVED ', 1),
                     fixture() + '\n#### M0-01 Duplicate\n- [ ] **状态：TODO**\n- **前置任务**：无。\n']:
            self.assertEqual(audit(text)['structure'], 'FAIL')

    def test_checkbox_without_done_fails(self):
        result = audit(fixture().replace('- [ ]', '- [x]', 1))
        self.assertTrue(any('disagree' in e for e in result['errors']))

    def test_done_without_evidence_fails(self):
        result = audit(fixture().replace('- [ ] **状态：TODO**', '- [x] **状态：DONE**', 1))
        self.assertTrue(any('evidence' in e for e in result['errors']))

    def test_done_with_open_prerequisite_fails(self):
        text = fixture().replace('- [ ] **状态：TODO**', '- [x] **状态：DONE**\n- **完成证据**：evidence/example.json', 1)
        text = text.replace('前置任务**：无', '前置任务**：M0-02', 1)
        self.assertTrue(any('incomplete prerequisite' in e for e in audit(text)['errors']))

    def test_unknown_prerequisite_and_cycle_fail(self):
        self.assertTrue(any('unknown prerequisite' in e for e in audit(fixture().replace('前置任务**：无', '前置任务**：M0-99', 1))['errors']))
        self.assertTrue(any('dependency cycle' in e for e in audit(fixture().replace('前置任务**：无', '前置任务**：M0-01', 1))['errors']))


if __name__ == '__main__':
    unittest.main()
