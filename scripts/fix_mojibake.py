#!/usr/bin/env python3
"""Repair mojibake in NemoUIOverhaul stylesheets and harden CSS glyphs."""

from __future__ import annotations

import re
from pathlib import Path

from ftfy import fix_text

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / "styles.css"]

# Decorative pseudo-element glyphs are rewritten as ASCII CSS escapes.
CSS_GLYPH_ESCAPES = {
    "★": r"\2605 ",
    "✓": r"\2713 ",
    "▶": r"\25B6 ",
    "📁": r"\1F4C1 ",
    "📂": r"\1F4C2 ",
    "📌": r"\1F4CC ",
    "⚠️": r"\26A0\FE0F ",
    "⚠": r"\26A0 ",
    "└─": r"\2514\2500 ",
}

SUSPICIOUS = re.compile(r"(?:Ã.|Â.|â[\x80-\u024f]|ð[\x80-\u024f]|ƒ.|Å.|Ë.)")
CONTENT_DECLARATION = re.compile(
    r"(?P<prefix>\bcontent\s*:\s*)(?P<quote>['\"])(?P<value>.*?)(?P=quote)(?P<suffix>\s*;)",
    re.DOTALL,
)


def escape_css_content(match: re.Match[str]) -> str:
    value = match.group("value")
    for glyph, escaped in CSS_GLYPH_ESCAPES.items():
        value = value.replace(glyph, escaped)
    return f"{match.group('prefix')}{match.group('quote')}{value}{match.group('quote')}{match.group('suffix')}"


def repair(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    repaired = fix_text(original, uncurl_quotes=False)
    repaired = CONTENT_DECLARATION.sub(escape_css_content, repaired)

    suspicious = sorted(set(SUSPICIOUS.findall(repaired)))
    if suspicious:
        preview = ", ".join(repr(item) for item in suspicious[:20])
        raise SystemExit(f"Suspicious mojibake remains in {path}: {preview}")

    if repaired == original:
        print(f"No changes needed: {path.relative_to(ROOT)}")
        return False

    path.write_text(repaired, encoding="utf-8", newline="\n")
    print(f"Repaired: {path.relative_to(ROOT)}")
    return True


def main() -> None:
    changed = any(repair(path) for path in TARGETS)
    print("Stylesheet repair complete." if changed else "Stylesheets already clean.")


if __name__ == "__main__":
    main()
