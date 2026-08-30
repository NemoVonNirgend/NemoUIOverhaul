import { NemoGlobalUI } from './global-ui.js';
import { UserSettingsTabs } from './user-settings-tabs.js';
import { installUserSettingsTabsLifecycle } from './user-settings-tabs-lifecycle.js';
import { NemoWorldInfoUI } from '../features/world-info/world-info-ui.js';
import { ExtensionsTabOverhaul } from './extensions-tab-overhaul.js';
import { animatedBackgrounds } from '../features/backgrounds/animated-backgrounds-module.js';
import { backgroundUIEnhancements } from '../features/backgrounds/background-ui-enhancements.js';
import { backgroundOrganizer } from '../features/backgrounds/background-organizer.js';
import { ModelSelector } from '../features/connection/model-selector.js';
import { TextCompletionSelector } from '../features/connection/textcomp-selector.js';
import { applyTheme, initializeThemes } from './theme-manager.js';
import { applyResponsiveOptions } from './overhaul-settings.js';

installUserSettingsTabsLifecycle(UserSettingsTabs);

const runtime = {
    settings: null,
    mounted: false,
    desiredSuspended: false,
    transition: Promise.resolve(),
    modelTimer: null,
    generation: 0,
};

function setFeatureClasses(settings, active) {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('nemo-ui-overhaul-structural-active', active);
    body.classList.toggle('nemo-extensions-overhaul-enabled', active && Boolean(settings?.extensionTab));
    body.classList.toggle('nemo-animated-backgrounds-enabled', active && Boolean(settings?.animatedBackgrounds));
    body.classList.toggle('nemo-lorebook-overhaul-enabled', active && Boolean(settings?.lorebookUi));
}

function clearModelTimer() {
    clearTimeout(runtime.modelTimer);
    runtime.modelTimer = null;
}

function removeModelSelectorFallbacks() {
    document.getElementById('nemo-selector-reenable-wrap')?.remove();
    document.getElementById('nemo-selector-reenable-btn')?.remove();
}

async function suspendStructuralFeatures() {
    const settings = runtime.settings ?? {};
    runtime.mounted = false;
    clearModelTimer();

    try { TextCompletionSelector.destroy(); } catch (_) { /* best-effort teardown */ }
    try { ModelSelector.destroy(); } catch (_) { /* best-effort teardown */ }
    removeModelSelectorFallbacks();

    try { backgroundOrganizer.destroy(); } catch (_) { /* best-effort teardown */ }
    try { backgroundUIEnhancements.destroy(); } catch (_) { /* best-effort teardown */ }
    try { animatedBackgrounds.destroy(); } catch (_) { /* best-effort teardown */ }
    try { ExtensionsTabOverhaul.cleanup(); } catch (_) { /* best-effort teardown */ }
    try { NemoWorldInfoUI.destroy(); } catch (_) { /* best-effort teardown */ }
    try { UserSettingsTabs.destroy?.(); } catch (_) { /* best-effort teardown */ }
    try { NemoGlobalUI.destroy(); } catch (_) { /* best-effort teardown */ }

    applyResponsiveOptions(settings, { enabled: false });
    await applyTheme('none');
    setFeatureClasses(settings, false);
    document.body.dataset.nemoUiStructuralState = 'suspended';
}

async function mountStructuralFeatures() {
    if (runtime.mounted || runtime.desiredSuspended) return;
    const settings = runtime.settings ?? {};
    const generation = ++runtime.generation;

    setFeatureClasses(settings, true);
    document.body.dataset.nemoUiStructuralState = 'mounting';
    applyResponsiveOptions(settings, { enabled: true });
    await initializeThemes();
    if (runtime.desiredSuspended || generation !== runtime.generation) return;

    try {
        if (settings.connectionPanel) NemoGlobalUI.initialize();
        if (settings.settingsTabs) UserSettingsTabs.initialize();
        if (settings.lorebookUi) NemoWorldInfoUI.initialize();
        if (settings.extensionTab) ExtensionsTabOverhaul.initialize();
        if (settings.animatedBackgrounds) {
            await animatedBackgrounds.initialize();
            if (runtime.desiredSuspended || generation !== runtime.generation) return;
            animatedBackgrounds.addSettingsToUI();
            await backgroundUIEnhancements.initialize();
            await backgroundOrganizer.initialize();
        }

        runtime.mounted = true;
        document.body.dataset.nemoUiStructuralState = 'active';

        if (settings.modelSelector) {
            runtime.modelTimer = setTimeout(() => {
                runtime.modelTimer = null;
                if (!runtime.mounted || runtime.desiredSuspended) return;
                ModelSelector.initialize();
                TextCompletionSelector.initialize();
            }, 1500);
        }
    } catch (error) {
        await suspendStructuralFeatures();
        throw error;
    }
}

export function syncUiOverhaulFeatures({
    settings = runtime.settings,
    suspended = runtime.desiredSuspended,
} = {}) {
    runtime.settings = settings ?? runtime.settings ?? {};
    runtime.desiredSuspended = Boolean(suspended);
    if (runtime.desiredSuspended) runtime.generation++;

    runtime.transition = runtime.transition
        .catch(() => undefined)
        .then(async () => {
            if (runtime.desiredSuspended) await suspendStructuralFeatures();
            else await mountStructuralFeatures();
            return getUiOverhaulFeatureState();
        });
    return runtime.transition;
}

export function getUiOverhaulFeatureState() {
    return Object.freeze({
        mounted: runtime.mounted,
        suspended: runtime.desiredSuspended,
        structuralState: document.body?.dataset?.nemoUiStructuralState ?? 'unknown',
    });
}

export async function cleanupUiOverhaulFeatures() {
    runtime.desiredSuspended = true;
    runtime.generation++;
    await syncUiOverhaulFeatures({ suspended: true });
    if (document.body?.dataset) delete document.body.dataset.nemoUiStructuralState;
}
