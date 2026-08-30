import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = [
    '../index.js',
    '../ui/overhaul-settings.js',
    '../ui/overhaul-settings-panel.js',
    '../ui/overhaul-runtime.js',
].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');

test('owns persistent settings and gates UI feature groups', () => {
    assert.match(source, /extension_settings\.NemoUIOverhaul/);
    for (const key of [
        'connectionPanel',
        'settingsTabs',
        'lorebookUi',
        'extensionTab',
        'animatedBackgrounds',
        'modelSelector',
    ]) {
        assert.match(source, new RegExp(`settings\\.${key}`));
    }
    assert.match(source, /lorebookPresetControls:\s*true/);
    assert.match(source, /input\.dataset\.setting === 'lorebookPresetControls'/);
    assert.match(source, /data-setting="\$\{key\}"/);
    assert.match(source, /data-setting="uiTheme"/);
    assert.match(source, /saveSettingsDebounced/);
    assert.match(source, /new MutationObserver/);
    assert.match(source, /nemo-ui-overhaul-settings/);
});

test('publishes optional compatibility diagnostics without declaring dependencies', () => {
    assert.match(source, /initializeOptionalUiCompatibility/);
    assert.match(source, /getCompatibilityState:\s*getOptionalUiCompatibilityState/);
    assert.match(source, /refreshCompatibility/);
    assert.match(source, /cleanupCompatibility/);
});
