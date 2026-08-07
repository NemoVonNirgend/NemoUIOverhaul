#!/usr/bin/env python3
"""Remove prompt-workstation CSS from NemoUIOverhaul.

NemoPresetExt 6.0 owns prompt management, prompt archives, preset/character
navigation, directives, and their three visual modes. This utility removes only
selectors belonging to those surfaces while preserving unrelated selectors from
mixed selector lists and keeping the rest of the large stylesheet intact.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import tinycss2

ROOT = Path(__file__).resolve().parents[1]
STYLESHEET = ROOT / "styles.css"
REPORT = ROOT / "prompt-css-removal-report.json"

GROUPING_AT_RULES = {
    "container",
    "document",
    "layer",
    "media",
    "scope",
    "starting-style",
    "supports",
}

# Specific Nemo prompt-workstation selector fingerprints. All matching happens
# against selector preludes only, never comments or declaration values.
PROMPT_MARKERS = tuple(marker.lower() for marker in (
    "#completion_prompt_manager",
    ".completion_prompt_manager",
    ".prompt-manager-",
    ".prompt_manager_",
    ".nemo-engine-section",
    ".nemo-sub-section",
    ".nemo-section-content",
    ".nemo-section-header",
    ".nemo-section-master-toggle",
    ".nemo-section-progress",
    ".nemo-enabled-count",
    ".nemo-right-controls-wrapper",
    ".nemo-preset-navigator",
    ".nemo-prompt-navigator",
    ".nemo-character-manager",
    ".nemo-preset-selector-wrapper",
    ".nemo-favorites-container",
    ".nemo-favorite-preset",
    ".nemo-preset-enhancer-",
    ".nemo-category-tray",
    ".nemo-tray-",
    ".nemo-prompt-",
    ".nemo-archive-",
    ".nemo-folder-",
    ".nemo-directive-",
    ".nemo-trigger-",
    ".nemo-triggers-",
    ".nemo-var-resolved",
    ".nemo-macro-",
    ".nemo-start-reply-",
    ".nemo-top-level-drop-zone",
    ".nemo-dropdown-theme-",
    ".nemo-status-message",
    ".nemo-search-controls",
    ".nemo-search-divider",
    ".navigator-",
    "#navigator-",
    ".char-manager-",
    "#char-manager-",
    ".prompt-navigator-",
    "#prompt-navigator-",
    "#nemopreset",
    "#nemosearchandstatuswrapper",
    "#nemosearch",
    "#nemoreasoningsection",
    "#nemo-preset-ext-settings",
))

# These generic class names came from the extracted preset/character navigators.
# They are token-matched so similarly named classes such as .background-grid-item
# are not removed.
GENERIC_PROMPT_SELECTOR_PATTERNS = tuple(re.compile(pattern, re.IGNORECASE) for pattern in (
    r"(?<![\w-])\.grid-item(?![\w-])",
    r"(?<![\w-])\.list-item(?![\w-])",
    r"(?<![\w-])\.view-mode-grid(?![\w-])",
    r"(?<![\w-])\.view-mode-list(?![\w-])",
    r"(?<![\w-])\.nemo-item-menu-btn(?![\w-])",
    r"(?<![\w-])\.navigator-empty-state(?![\w-])",
    r"(?<![\w-])\.char-manager-empty-state(?![\w-])",
))


@dataclass
class CleanupStats:
    removed_rules: int = 0
    changed_mixed_rules: int = 0
    removed_selectors: list[str] = field(default_factory=list)
    retained_selectors: int = 0
    emptied_at_rules: int = 0

    def to_json(self) -> dict[str, object]:
        return {
            "removed_rules": self.removed_rules,
            "changed_mixed_rules": self.changed_mixed_rules,
            "removed_selector_count": len(self.removed_selectors),
            "retained_selectors": self.retained_selectors,
            "emptied_at_rules": self.emptied_at_rules,
            "removed_selectors": sorted(set(self.removed_selectors)),
        }


def selector_is_prompt_owned(selector: str) -> bool:
    normalized = selector.lower()
    if any(marker in normalized for marker in PROMPT_MARKERS):
        return True
    return any(pattern.search(selector) for pattern in GENERIC_PROMPT_SELECTOR_PATTERNS)


def split_selector_tokens(tokens: Iterable[object]) -> list[list[object]]:
    groups: list[list[object]] = []
    current: list[object] = []
    for token in tokens:
        if getattr(token, "type", None) == "literal" and getattr(token, "value", None) == ",":
            groups.append(current)
            current = []
        else:
            current.append(token)
    groups.append(current)
    return groups


def serialize_selector_group(tokens: list[object]) -> str:
    return tinycss2.serialize(tokens).strip()


def has_substantive_rule(rules: Iterable[object]) -> bool:
    return any(getattr(rule, "type", None) not in {"whitespace", "comment"} for rule in rules)


def clean_rule_list(rules: list[object], stats: CleanupStats) -> list[object]:
    cleaned: list[object] = []

    for rule in rules:
        rule_type = getattr(rule, "type", None)

        if rule_type == "qualified-rule":
            groups = split_selector_tokens(rule.prelude)
            kept: list[str] = []
            removed: list[str] = []
            for group in groups:
                selector = serialize_selector_group(group)
                if not selector:
                    continue
                if selector_is_prompt_owned(selector):
                    removed.append(selector)
                else:
                    kept.append(selector)

            if removed:
                stats.removed_selectors.extend(removed)
            if not kept:
                stats.removed_rules += 1
                continue
            if removed:
                stats.changed_mixed_rules += 1
                rule.prelude = tinycss2.parse_component_value_list(",\n".join(kept))
            stats.retained_selectors += len(kept)
            cleaned.append(rule)
            continue

        if (
            rule_type == "at-rule"
            and getattr(rule, "content", None) is not None
            and getattr(rule, "lower_at_keyword", "") in GROUPING_AT_RULES
        ):
            nested = tinycss2.parse_rule_list(
                rule.content,
                skip_comments=False,
                skip_whitespace=False,
            )
            nested_cleaned = clean_rule_list(nested, stats)
            if not has_substantive_rule(nested_cleaned):
                stats.emptied_at_rules += 1
                continue
            rule.content = tinycss2.parse_component_value_list(tinycss2.serialize(nested_cleaned))
            cleaned.append(rule)
            continue

        cleaned.append(rule)

    return cleaned


def collect_prompt_selectors(rules: list[object]) -> list[str]:
    found: list[str] = []
    for rule in rules:
        rule_type = getattr(rule, "type", None)
        if rule_type == "qualified-rule":
            for group in split_selector_tokens(rule.prelude):
                selector = serialize_selector_group(group)
                if selector and selector_is_prompt_owned(selector):
                    found.append(selector)
        elif (
            rule_type == "at-rule"
            and getattr(rule, "content", None) is not None
            and getattr(rule, "lower_at_keyword", "") in GROUPING_AT_RULES
        ):
            nested = tinycss2.parse_rule_list(
                rule.content,
                skip_comments=False,
                skip_whitespace=False,
            )
            found.extend(collect_prompt_selectors(nested))
    return found


def parse_stylesheet(text: str) -> list[object]:
    return tinycss2.parse_stylesheet(text, skip_comments=False, skip_whitespace=False)


def clean_stylesheet(text: str) -> tuple[str, CleanupStats]:
    stats = CleanupStats()
    rules = parse_stylesheet(text)
    cleaned_rules = clean_rule_list(rules, stats)
    cleaned = tinycss2.serialize(cleaned_rules)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    if not cleaned.endswith("\n"):
        cleaned += "\n"
    remaining = collect_prompt_selectors(parse_stylesheet(cleaned))
    if remaining:
        preview = "\n".join(sorted(set(remaining))[:30])
        raise SystemExit(f"Prompt-owned selectors remain after cleanup:\n{preview}")
    return cleaned, stats


def validate_current_stylesheet() -> None:
    text = STYLESHEET.read_text(encoding="utf-8")
    remaining = collect_prompt_selectors(parse_stylesheet(text))
    if remaining:
        preview = "\n".join(sorted(set(remaining))[:30])
        raise SystemExit(f"NemoUIOverhaul still owns prompt selectors:\n{preview}")
    print("Prompt ownership validation passed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Validate without changing files")
    parser.add_argument("--write", action="store_true", help="Rewrite styles.css in place")
    args = parser.parse_args()

    if args.check:
        validate_current_stylesheet()
        return
    if not args.write:
        parser.error("choose --write or --check")

    original = STYLESHEET.read_text(encoding="utf-8")
    cleaned, stats = clean_stylesheet(original)
    REPORT.write_text(json.dumps(stats.to_json(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if cleaned == original:
        print("styles.css already excludes prompt-workstation selectors.")
        return

    STYLESHEET.write_text(cleaned, encoding="utf-8", newline="\n")
    print(
        "Removed prompt UI ownership: "
        f"{stats.removed_rules} complete rules, "
        f"{stats.changed_mixed_rules} mixed rules, "
        f"{len(stats.removed_selectors)} selectors."
    )


if __name__ == "__main__":
    main()
