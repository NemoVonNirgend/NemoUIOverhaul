#!/usr/bin/env python3
"""Repair mojibake in NemoUIOverhaul and retire the temporary CSS shim.

The stylesheet was saved after one or more UTF-8/Windows-1252 decoding
round-trips. This script restores the intended Unicode, converts every
non-ASCII pseudo-element glyph to an ASCII CSS escape, validates the result,
and removes the temporary runtime override once the source stylesheet is clean.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from ftfy import TextFixerConfig, fix_text

ROOT = Path(__file__).resolve().parents[1]
STYLESHEET = ROOT / "styles.css"
INDEX = ROOT / "index.js"
MANIFEST = ROOT / "manifest.json"
ENCODING_SHIM = ROOT / "encoding-fixes.css"

# Known multi-pass corruption found in the extracted stylesheet. ftfy repairs
# these too, but explicit replacements make the important UI glyphs deterministic.
KNOWN_MOJIBAKE = {
    "Ã¢Ëœâ€¦": "★",
    "Ã¢Å“â€œ": "✓",
    "Ã¢â€“Â¶": "▶",
    "Ã°Å¸â€œÂ\x81": "📁",
    "Ã°Å¸â€œâ€š": "📂",
    "Ã¢â€\x9dâ€\x9dÃ¢â€\x9dâ‚¬": "└─",
    "Ã°Å¸â€œÅ’": "📌",
    "Ã¢Å¡Â\xa0Ã¯Â¸Â\x8f": "⚠️",
    "Ã¢â‚¬Â¢": "•",
    "Ãƒâ€”": "×",
}

# These byte-decoding fingerprints should never survive the repair. The list is
# intentionally specific so legitimate non-English text is not rejected.
MOJIBAKE_MARKERS = (
    "Ã¢",
    "Ã°",
    "Ãƒ",
    "Â\x",
    "â€",
    "â€“",
    "â€”",
    "â€¦",
    "â€¢",
    "ðŸ",
    "ï¸",
)

CONTENT_DECLARATION = re.compile(
    r"(?P<prefix>\bcontent\s*:\s*)(?P<quote>['\"])(?P<value>.*?)(?P=quote)(?P<suffix>\s*;)",
    re.DOTALL,
)

ENCODING_LOADER = re.compile(
    r"\nfunction ensureEncodingFixStyles\(\) \{.*?\n\}\n",
    re.DOTALL,
)

FTFY_CONFIG = TextFixerConfig(
    unescape_html=False,
    remove_terminal_escapes=False,
    fix_encoding=True,
    restore_byte_a0=True,
    replace_lossy_sequences=True,
    decode_inconsistent_utf8=True,
    fix_c1_controls=True,
    fix_latin_ligatures=False,
    fix_character_width=False,
    uncurl_quotes=False,
    fix_line_breaks=False,
    fix_surrogates=True,
    remove_control_chars=False,
    normalization="NFC",
    explain=False,
)


def replace_known_mojibake(text: str) -> str:
    for broken, repaired in KNOWN_MOJIBAKE.items():
        text = text.replace(broken, repaired)
    return text


def repair_encoding(text: str) -> str:
    text = replace_known_mojibake(text)
    for _ in range(5):
        repaired = fix_text(text, config=FTFY_CONFIG)
        repaired = replace_known_mojibake(repaired)
        if repaired == text:
            break
        text = repaired
    return unicodedata.normalize("NFC", text)


def escape_non_ascii_css_content(match: re.Match[str]) -> str:
    """Make pseudo-element glyphs immune to future encoding round-trips."""
    value = match.group("value")
    escaped: list[str] = []
    for character in value:
        codepoint = ord(character)
        if codepoint < 0x80:
            escaped.append(character)
        else:
            escaped.append(f"\\{codepoint:X} ")
    return (
        f"{match.group('prefix')}{match.group('quote')}"
        f"{''.join(escaped)}{match.group('quote')}{match.group('suffix')}"
    )


def validate_balanced_css(text: str) -> None:
    """Check braces, strings, and comments without rejecting modern CSS syntax."""
    depth = 0
    quote: str | None = None
    escaped = False
    in_comment = False
    index = 0

    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ""

        if in_comment:
            if char == "*" and next_char == "/":
                in_comment = False
                index += 2
                continue
            index += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            index += 1
            continue

        if char == "/" and next_char == "*":
            in_comment = True
            index += 2
            continue
        if char in ("'", '"'):
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth < 0:
                raise SystemExit("CSS validation failed: unmatched closing brace")
        index += 1

    if in_comment:
        raise SystemExit("CSS validation failed: unterminated comment")
    if quote:
        raise SystemExit("CSS validation failed: unterminated string")
    if depth:
        raise SystemExit(f"CSS validation failed: {depth} unmatched opening brace(s)")


def validate_repaired_stylesheet(text: str) -> None:
    remaining = [marker for marker in MOJIBAKE_MARKERS if marker in text]
    if remaining:
        raise SystemExit(f"Mojibake markers remain: {remaining}")

    c1_controls = sorted({ord(char) for char in text if 0x80 <= ord(char) <= 0x9F})
    if c1_controls:
        formatted = ", ".join(f"U+{codepoint:04X}" for codepoint in c1_controls)
        raise SystemExit(f"C1 control characters remain: {formatted}")

    # Regression checks for every user-visible glyph that was visibly corrupted.
    required_escapes = {
        "favorite star": r"\2605 ",
        "selection check": r"\2713 ",
        "disclosure triangle": r"\25B6 ",
        "closed folder": r"\1F4C1 ",
        "open folder": r"\1F4C2 ",
        "nested branch": r"\2514 \2500 ",
        "pin": r"\1F4CC ",
        "warning": r"\26A0 \FE0F ",
        "list bullet": r"\2022 ",
    }
    missing = [name for name, escape in required_escapes.items() if escape not in text]
    if missing:
        raise SystemExit(f"Expected repaired CSS glyphs are missing: {missing}")

    validate_balanced_css(text)


def repair_stylesheet() -> bool:
    original = STYLESHEET.read_text(encoding="utf-8")
    repaired = repair_encoding(original)
    repaired = CONTENT_DECLARATION.sub(escape_non_ascii_css_content, repaired)
    repaired = repaired.replace("\r\n", "\n").replace("\r", "\n")
    if not repaired.endswith("\n"):
        repaired += "\n"

    validate_repaired_stylesheet(repaired)
    if repaired == original:
        print("styles.css is already clean")
        return False

    STYLESHEET.write_text(repaired, encoding="utf-8", newline="\n")
    print("Repaired styles.css")
    return True


def retire_encoding_shim() -> bool:
    changed = False
    index_text = INDEX.read_text(encoding="utf-8")
    repaired_index = ENCODING_LOADER.sub("\n", index_text)
    repaired_index = repaired_index.replace("    ensureEncodingFixStyles();\n", "")
    if "ensureEncodingFixStyles" in repaired_index or "encoding-fixes.css" in repaired_index:
        raise SystemExit("Could not fully remove the temporary encoding shim loader")
    if repaired_index != index_text:
        INDEX.write_text(repaired_index, encoding="utf-8", newline="\n")
        print("Removed encoding shim loader from index.js")
        changed = True

    if ENCODING_SHIM.exists():
        ENCODING_SHIM.unlink()
        print("Removed encoding-fixes.css")
        changed = True

    for trigger in (ROOT / ".github").glob("repair-stylesheet.trigger*"):
        trigger.unlink()
        print(f"Removed temporary trigger: {trigger.relative_to(ROOT)}")
        changed = True

    return changed


def bump_patch_version() -> bool:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("version") != "1.1.0":
        return False
    data["version"] = "1.1.1"
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Bumped Nemo UI Overhaul to 1.1.1")
    return True


def main() -> None:
    changed = repair_stylesheet()
    changed = retire_encoding_shim() or changed
    changed = bump_patch_version() or changed
    print("Repair complete." if changed else "Repository already repaired.")


if __name__ == "__main__":
    main()
