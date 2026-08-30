import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('README version matches the manifest', () => {
    assert.ok(readme.includes(`**Version:** ${manifest.version}`));
});

test('README documents optional fallback compatibility and selector semantics', () => {
    for (const expected of [
        'NemoUIOverhaul remains a complete standalone extension',
        'Chat Completion Tabs',
        'Moonlit Echoes',
        'window.NemoUIOverhaul?.getCompatibilityState?.()',
        'Reasoning format template',
        'Model Reasoning Effort',
        'They are intentionally independent',
        'Show lorebook preset controls',
        'does not delete saved lorebook presets',
    ]) {
        assert.ok(readme.includes(expected), `Missing documentation: ${expected}`);
    }
});
