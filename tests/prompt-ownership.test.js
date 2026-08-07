import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

const PROMPT_SELECTOR_MARKERS = [
    '#completion_prompt_manager',
    '.completion_prompt_manager',
    '.nemo-engine-section',
    '.nemo-category-tray',
    '.nemo-tray-',
    '.nemo-prompt-',
    '.nemo-archive-',
    '.nemo-preset-navigator',
    '.nemo-prompt-navigator',
    '.nemo-character-manager',
    '#nemo-preset-ext-settings',
    '#nemoReasoningSection',
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('manifest and documentation define the post-prompt ownership release', () => {
    assert.equal(manifest.version, '1.2.1');
    assert.ok(readme.includes('does **not** style or initialize prompt-workstation surfaces'));
    assert.ok(readme.includes('NemoPresetExt 6.0 owns'));
});

test('runtime remains a broad UI extension without prompt-workstation imports', () => {
    for (const expected of [
        'NemoGlobalUI',
        'UserSettingsTabs',
        'NemoWorldInfoUI',
        'ExtensionsTabOverhaul',
        'animatedBackgrounds',
        'ModelSelector',
        'TextCompletionSelector',
    ]) {
        assert.match(index, new RegExp(expected));
    }
    for (const forbidden of ['NemoPresetManager', 'NemoCharacterManager', 'initPresetNavigatorForApi']) {
        assert.doesNotMatch(index, new RegExp(forbidden));
    }
});

test('stylesheet no longer contains direct prompt-workstation selectors', () => {
    const uncommented = styles.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const marker of PROMPT_SELECTOR_MARKERS) {
        const selectorPattern = new RegExp(`${escapeRegex(marker)}[^{}]*\\{`, 'i');
        assert.doesNotMatch(uncommented, selectorPattern, marker);
    }
});
