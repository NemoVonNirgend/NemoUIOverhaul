import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
test('owns persistent settings and gates UI feature groups', () => {
    assert.match(source, /extension_settings\.NemoUIOverhaul/);
    for (const key of ['connectionPanel', 'settingsTabs', 'lorebookUi', 'extensionTab', 'animatedBackgrounds', 'modelSelector']) {
        assert.match(source, new RegExp(`settings\\.${key}`));
    }
    assert.match(source, /data-setting="\$\{key\}"/);
    assert.match(source, /data-setting="uiTheme"/);
    assert.match(source, /saveSettingsDebounced/);
    assert.match(source, /new MutationObserver/);
    assert.match(source, /nemo-ui-overhaul-settings/);
});
