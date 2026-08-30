import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const astra = readFileSync(new URL('../compat/astra-projecta-compat.js', import.meta.url), 'utf8');
const astraCss = readFileSync(new URL('../compat/astra-projecta-compat.css', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../ui/overhaul-runtime.js', import.meta.url), 'utf8');
const features = readFileSync(new URL('../ui/overhaul-feature-runtime.js', import.meta.url), 'utf8');
const lifecycle = readFileSync(new URL('../ui/user-settings-tabs-lifecycle.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../ui/overhaul-settings.js', import.meta.url), 'utf8');
const settingsPanel = readFileSync(new URL('../ui/overhaul-settings-panel.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('Astra detection follows its live mobile and native-drawer ownership markers', () => {
    assert.match(astra, /astra-projecta-mobile-layout/);
    assert.match(astra, /data-astra-projecta-native-drawer-source/);
    assert.match(astra, /astra-projecta-native-drawer-ported/);
    assert.match(astra, /__astraProjectaRuntime/);
    assert.match(astra, /astra_projecta/);
    assert.match(astra, /structuralUiOwner/);
});

test('runtime suspends and resumes the structural feature lifecycle from Astra state', () => {
    assert.match(runtime, /initializeAstraProjectaCompatibility/);
    assert.match(runtime, /suspended:\s*Boolean\(astraState\?\.astraActive\)/);
    assert.match(runtime, /syncForAstra/);
    assert.match(runtime, /combinedCompatibilityState/);
    assert.match(runtime, /features:\s*getUiOverhaulFeatureState\(\)/);
});

test('every overlapping UI module has an explicit reversible teardown', () => {
    for (const teardown of [
        'TextCompletionSelector.destroy()',
        'ModelSelector.destroy()',
        'backgroundOrganizer.destroy()',
        'backgroundUIEnhancements.destroy()',
        'animatedBackgrounds.destroy()',
        'ExtensionsTabOverhaul.cleanup()',
        'NemoWorldInfoUI.destroy()',
        'UserSettingsTabs.destroy?.()',
        'NemoGlobalUI.destroy()',
        "applyTheme('none')",
        'applyResponsiveOptions(settings, { enabled: false })',
    ]) {
        assert.ok(features.includes(teardown), `Missing teardown: ${teardown}`);
    }
    for (const initializer of [
        'initializeThemes()',
        'NemoGlobalUI.initialize()',
        'UserSettingsTabs.initialize()',
        'NemoWorldInfoUI.initialize()',
        'ExtensionsTabOverhaul.initialize()',
        'animatedBackgrounds.initialize()',
        'ModelSelector.initialize()',
        'TextCompletionSelector.initialize()',
    ]) {
        assert.ok(features.includes(initializer), `Missing resume path: ${initializer}`);
    }
});

test('settings tabs preserve exact native parents and detach managed listeners', () => {
    assert.match(lifecycle, /moveRecords/);
    assert.match(lifecycle, /nextSibling/);
    assert.match(lifecycle, /parent\.insertBefore\(node, anchor\)/);
    assert.match(lifecycle, /eventSource\.removeListener/);
    assert.match(lifecycle, /abortController\?\.abort/);
    assert.match(lifecycle, /advancedFormattingDisplay/);
    assert.match(lifecycle, /UserSettingsTabsLifecycle|installUserSettingsTabsLifecycle/);
});

test('responsive settings cannot reactivate wide or mobile overrides while Astra owns the shell', () => {
    assert.match(settings, /enabled = true/);
    assert.match(settings, /if \(!enabled\) return/);
    assert.match(settingsPanel, /nemoUiStructuralOwner !== 'astra'/);
    assert.match(settingsPanel, /nemo-ui-external-compat-status/);
});

test('compatibility remains dependency-free and CSS is narrowly scoped', () => {
    assert.deepEqual(manifest.requires ?? [], []);
    assert.deepEqual(manifest.optional ?? [], []);
    assert.doesNotMatch(astra, /from\s+['"][^'"]*(?:AstraProjecta|RivelleDays)/);
    assert.match(astraCss, /body\[data-nemo-ui-astra='active'\]/);
    assert.doesNotMatch(astraCss, /^\s*(?:body|html|h[1-6]|select|\.drawer-content|\.inline-drawer-header)\s*\{/m);
});
