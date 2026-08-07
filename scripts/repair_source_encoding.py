#!/usr/bin/env python3
"""Repair mojibake in runtime source files while preserving ASCII-safe CSS glyphs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from ftfy import fix_text

ROOT = Path(__file__).resolve().parents[1]
TARGET_SUFFIXES = {'.js', '.css', '.html', '.md'}
SKIP_PARTS = {'.git', '.github', 'node_modules', 'tests', 'scripts'}
MOJIBAKE_MARKERS = ('Ã¢', 'Ã°', 'Ãƒ', 'Â ', 'Â ', 'â€', 'â€“', 'â€”', 'â„¢', 'ðŸ', '\ufffd')
C1_PATTERN = re.compile(r'[\u0080-\u009f]')
CONTENT_PATTERN = re.compile(r"(content\s*:\s*)(['\"])(.*?)(\2)(\s*;)", re.IGNORECASE)


def iter_targets():
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TARGET_SUFFIXES:
            continue
        relative = path.relative_to(ROOT)
        if any(part in SKIP_PARTS for part in relative.parts):
            continue
        yield path


def repair_text(text: str) -> str:
    current = text
    for _ in range(5):
        repaired = fix_text(current)
        if repaired == current:
            break
        current = repaired
    return current


def escape_css_content_literals(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        content = match.group(3)
        escaped = ''.join(
            char if ord(char) < 128 else f'\\{ord(char):X} '
            for char in content
        )
        return f'{match.group(1)}{match.group(2)}{escaped}{match.group(4)}{match.group(5)}'

    return CONTENT_PATTERN.sub(replace, text)


def suspicious(text: str) -> list[str]:
    found = [marker for marker in MOJIBAKE_MARKERS if marker in text]
    controls = sorted({hex(ord(char)) for char in C1_PATTERN.findall(text)})
    if controls:
        found.append(f'C1 controls: {controls}')
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path, default=ROOT / 'source-encoding-repair-report.json')
    args = parser.parse_args()
    if args.check == args.write:
        parser.error('choose exactly one of --check or --write')

    changes = []
    failures = []
    scanned = 0

    for path in iter_targets():
        scanned += 1
        original = path.read_text(encoding='utf-8')
        repaired = repair_text(original)
        if path.suffix.lower() == '.css':
            repaired = escape_css_content_literals(repaired)
        issues = suspicious(repaired)
        if issues:
            failures.append({'path': str(path.relative_to(ROOT)), 'issues': issues})
        if repaired != original:
            changes.append({
                'path': str(path.relative_to(ROOT)),
                'before_bytes': len(original.encode('utf-8')),
                'after_bytes': len(repaired.encode('utf-8')),
            })
            if args.write:
                path.write_text(repaired, encoding='utf-8', newline='\n')

    payload = {
        'scanned_files': scanned,
        'changed_files': changes,
        'remaining_issues': failures,
    }
    args.report.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    if failures:
        raise SystemExit('Encoding markers remain:\n' + '\n'.join(
            f"{item['path']}: {item['issues']}" for item in failures
        ))
    if args.check and changes:
        raise SystemExit('Files still need encoding repair:\n' + '\n'.join(item['path'] for item in changes))

    print(f"Scanned {scanned} files; repaired {len(changes)} files.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
