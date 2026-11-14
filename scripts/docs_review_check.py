"""Validate changed Markdown documents without making network requests.

This is a documentation gate only, not a substitute for independent design review.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit


LINK_RE = re.compile(r"(?<!!)\[[^\]\n]*\]\(([^)\n]+)\)")
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
CONFLICT_RE = re.compile(r"^(?:<{7}|={7}|>{7})(?:\s|$)")


def inspect_document(root: Path, relative: Path) -> list[str]:
    root = root.resolve()
    source = (root / relative).resolve()
    if not source.is_relative_to(root) or not source.is_file():
        return [f"{relative}: document is missing or outside repository"]
    failures: list[str] = []
    opened: str | None = None
    for line_num, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
        marker = FENCE_RE.match(line)
        if marker:
            seq = marker.group(1)
            if opened is None:
                opened = seq
            elif seq[0] == opened[0] and len(seq) >= len(opened):
                opened = None
            continue
        if opened is not None:
            continue
        if CONFLICT_RE.match(line):
            failures.append(f"{relative}:{line_num}: unresolved merge conflict")
        for found in LINK_RE.finditer(line):
            raw = found.group(1).strip()
            # Markdown link titles: (path "label").
            value = raw[1:].split(">", 1)[0] if raw.startswith("<") else raw.split(" ", 1)[0]
            # The imported upstream communication prompt uses this literal
            # destination as an example, not a repository file reference.
            # Keep the exception exact and scoped to upstream prompt templates.
            if relative.parts[:3] == ("upstream", "superagent", "prompts") and raw == "<actual link>":
                continue
            if not value or value.startswith("#"):
                continue
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc or value.startswith("//"):
                continue
            target_path = unquote(parsed.path)
            if not target_path:
                continue
            target = (source.parent / target_path).resolve()
            if not target.is_relative_to(root) or not target.exists():
                failures.append(f"{relative}:{line_num}: unresolved local link {value!r}")
    if opened is not None:
        failures.append(f"{relative}: unclosed Markdown code fence")
    return failures


def changed_markdown(root: Path, base_sha: str | None) -> list[Path]:
    if base_sha:
        if not re.fullmatch(r"[0-9a-fA-F]{40}", base_sha):
            raise ValueError("Expected a full, immutable 40-character base commit SHA")
        command = ["git", "diff", "--name-only", "--diff-filter=ACMR", base_sha, "HEAD"]
    else:
        command = ["git", "diff", "--name-only", "--diff-filter=ACMR", "HEAD^", "HEAD"]
    result = subprocess.run(command, cwd=root, capture_output=True, text=True, check=True)
    return sorted({Path(line) for line in result.stdout.splitlines() if line.endswith(".md")})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-sha", default=os.environ.get("DOCS_BASE_SHA") or None)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    selected = changed_markdown(root, args.base_sha)
    errors: list[str] = []
    for relative in selected:
        errors.extend(inspect_document(root, relative))
    print(f"Markdown files checked: {len(selected)}")
    for error in errors:
        print("ERROR:", error)
    print("Markdown local-link, conflict marker and code-fence checks:", "FAIL" if errors else "PASS")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
