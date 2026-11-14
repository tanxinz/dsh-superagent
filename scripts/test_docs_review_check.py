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

    def test_upstream_prompt_example_link_placeholder(self):
        prompt = self.root / "upstream" / "superagent" / "prompts" / "team" / "communication.md"
        prompt.parent.mkdir(parents=True)
        prompt.write_text("Ready: [PR #123](<actual link>)\nGood: [PR #123](<actual link>)\n", encoding="utf-8")
        self.assertEqual(inspect_document(self.root, prompt.relative_to(self.root)), [])

    def test_placeholder_exception_does_not_hide_invalid_links(self):
        # The same symbolic example is invalid in an ordinary documentation file.
        doc = self.write("[bad](<actual link>)\n")
        self.assertTrue(any("unresolved local link" in e for e in inspect_document(self.root, doc)))
        # Ordinary broken paths inside prompt templates must still be checked.
        prompt = self.root / "upstream" / "superagent" / "prompts" / "team" / "communication.md"
        prompt.parent.mkdir(parents=True)
        prompt.write_text("[example](<actual link>)\n[broken](missing.md)\n", encoding="utf-8")
        errors = inspect_document(self.root, prompt.relative_to(self.root))
        self.assertEqual(len(errors), 1)
        self.assertIn("missing.md", errors[0])


    def test_link_like_example_inside_inline_code_is_not_a_link(self):
        rel = self.write("# Example\nThe literal `[PR #123](<actual link>)` is not a Markdown link.\n")
        self.assertEqual(inspect_document(self.root, rel), [])

    def test_multibacktick_inline_code_masks_fake_links(self):
        rel = self.write("``[fake](missing.md) with ` single backtick``\n")
        self.assertEqual(inspect_document(self.root, rel), [])

    def test_inline_code_does_not_hide_broken_links_next_to_it(self):
        rel = self.write("`[fake](missing.md)` but [real](missing.md)\n")
        errors = inspect_document(self.root, rel)
        self.assertEqual(len(errors), 1)
        self.assertIn("missing.md", errors[0])

    def test_unmatched_and_escaped_backticks_do_not_suppress_links(self):
        for data in ("`[real](missing.md)\n", "\\`[real](missing.md)\\`\n"):
            with self.subTest(data=data):
                rel = self.write(data)
                self.assertTrue(any("missing.md" in x for x in inspect_document(self.root, rel)))

if __name__ == "__main__":
    unittest.main()
