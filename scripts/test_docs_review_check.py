"""Unit regression for changed-Markdown check."""
import tempfile
from pathlib import Path
import unittest

from docs_review_check import inspect_document


class DocsReviewCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "docs").mkdir()
        (self.root / "docs" / "existing.md").write_text("# Existing\n", encoding="utf-8")

    def write(self, data):
        (self.root / "docs" / "new.md").write_text(data, encoding="utf-8")
        return Path("docs/new.md")

    def test_valid_relative_links_and_external_urls(self):
        rel = self.write('# New\n[ok](existing.md#intro)\n[external](https://example.org/page)\n')
        self.assertEqual(inspect_document(self.root, rel), [])

    def test_missing_local_link_is_rejected(self):
        rel = self.write('# New\n[missing](nonexistent.md)\n')
        self.assertTrue(any("unresolved local link" in x for x in inspect_document(self.root, rel)))

    def test_unclosed_fence_is_rejected(self):
        rel = self.write('# New\n```python\nprint("foo")\n')
        self.assertTrue(any("unclosed Markdown code fence" in x for x in inspect_document(self.root, rel)))

    def test_links_inside_code_fences_are_data(self):
        rel = self.write('# New\n```text\n[not a link](missing.md)\n```\n')
        self.assertEqual(inspect_document(self.root, rel), [])

    def test_merge_conflict_marker_is_rejected(self):
        rel = self.write('# New\n<<<<<<< HEAD\n')
        self.assertTrue(any("unresolved merge conflict" in x for x in inspect_document(self.root, rel)))

    def test_path_escape_is_rejected(self):
        rel = self.write('# New\n[escape](../../../private.md)\n')
        self.assertTrue(any("unresolved local link" in x for x in inspect_document(self.root, rel)))


if __name__ == "__main__":
    unittest.main()
