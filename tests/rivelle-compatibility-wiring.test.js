import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = [
    '../index.js',
    '../ui/overhaul-settings.js',
    '../ui/overhaul-settings-panel.js',
    '../ui/overhaul-runtime.js',
].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const globalUi = [
    'global-ui.js',
    'global-ui-core.js',
    'global-ui-groups.js',
    'global-ui-layout.js',
    'global-ui-lifecycle.js',
    'global-ui-shared.js',
    'global-ui-targets.js',
].map(file => readFileSync(new URL(`../ui/${file}`, import.meta.url), 'utf8')).join('\n');
const compatibility = readFileSync(new URL('../compat/optional-ui-compat.js', import.meta.url), 'utf8');
const compatibilityCss = readFileSync(new URL('../compat/optional-ui-compat.css', import.meta.url), 'utf8');
const worldInfoTemplate = readFileSync(new URL('../features/world-info/world-info-ui.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('lorebook preset controls have an immediate, non-destructive visibility setting', () => {
    assert.match(index, /lorebookPresetControls:\s*true/);
    assert.match(index, /Show lorebook preset controls/);
    assert.match(index, /Saved presets and active lorebooks are unchanged/);
    assert.match(index, /refreshOptionalUiCompatibility\(settings\)/);
    assert.match(worldInfoTemplate, /class="nemo-world-info-preset-section"/);
    assert.match(compatibilityCss, /body\.nemo-ui-hide-lorebook-presets \.nemo-world-info-preset-section/);
});

test('Chat Completion Tabs receives its own nodes while Nemo retains standalone fallback', () => {
    assert.match(globalUi, /detectOptionalUiCapabilities/);
    assert.match(globalUi, /capabilities\.chatTabsOwnsLayout/);
    assert.match(globalUi, /releaseConvertedDrawer\(config\.id, config\.selector\)/);
    assert.match(globalUi, /releaseStandalonePromptManager\(\)/);
    assert.match(globalUi, /nemoStandalone/);
    assert.doesNotMatch(globalUi, /ChatCompletionTabs\.(?:openAITabManager|refreshTabs|setEnabled)/);
});

test('compatibility is capability-based and declares no third-party dependency', () => {
    assert.match(compatibility, /\.openai-tab-buttons/);
    assert.match(compatibility, /#openai-tab-content-prompts/);
    assert.match(compatibility, /#openai-tab-content-parameters/);
    assert.match(compatibility, /#moonlit_sidebar_button/);
    assert.doesNotMatch(compatibility, /from\s+['"][^'"]*(?:ChatCompletionTabs|MoonlitEchoes)/);
    assert.deepEqual(manifest.requires ?? [], []);
    assert.deepEqual(manifest.optional ?? [], []);
});

test('reasoning selectors are clarified but never cross-synchronized', () => {
    assert.match(compatibility, /FORMAT_TEMPLATE:\s*'format-template'/);
    assert.match(compatibility, /MODEL_EFFORT:\s*'model-effort'/);
    assert.match(compatibility, /native:\s*'#reasoning_select'[\s\S]*proxy:\s*'#nemo-reasoning-select'/);
    assert.match(compatibility, /native:\s*'#openai_reasoning_effort'[\s\S]*proxy:\s*'#nemo-openai-reasoning-effort'/);
    assert.doesNotMatch(compatibility, /native:\s*'#reasoning_select'[\s\S]{0,160}proxy:\s*'#nemo-openai-reasoning-effort'/);
    assert.doesNotMatch(compatibility, /native:\s*'#openai_reasoning_effort'[\s\S]{0,160}proxy:\s*'#nemo-reasoning-select'/);
    assert.match(compatibility, /Reasoning format template/);
    assert.match(compatibility, /Model Reasoning Effort/);
});

test('Moonlit and tab layout fixes remain narrowly scoped', () => {
    assert.match(compatibilityCss, /body\[data-nemo-ui-moonlit='true'\]/);
    assert.match(compatibilityCss, /body\[data-nemo-ui-chat-completion-owner='rivelle'\]/);
    assert.doesNotMatch(compatibilityCss, /^\s*(?:h[1-6]|select|\.drawer-content|\.inline-drawer-header)\s*\{/m);
});
