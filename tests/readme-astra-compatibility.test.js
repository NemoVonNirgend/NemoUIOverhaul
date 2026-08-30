import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('README and manifest identify the Astra compatibility release', () => {
    assert.equal(manifest.version, '1.2.3');
    assert.ok(readme.includes(`**Version:** ${manifest.version}`));
    for (const expected of [
        'AstraProjecta mobile mode',
        'structural-owner handoff',
        'preserving every saved Nemo setting',
        'restores its standalone structural UI automatically',
        'portedDrawerCount',
        'structuralUiOwner',
    ]) {
        assert.ok(readme.includes(expected), `Missing Astra documentation: ${expected}`);
    }
});

test('README continues to promise standalone behavior without a dependency', () => {
    assert.match(readme, /AstraProjecta (?:are|is) not dependencies/);
    assert.match(readme, /No Rivelle UI extension/);
    assert.match(readme, /Nemo remains fully active/);
});
