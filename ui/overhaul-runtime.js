import { NemoGlobalUI } from './global-ui.js';
import { NemoWorldInfoUI } from '../features/world-info/world-info-ui.js';
import { ExtensionsTabOverhaul } from './extensions-tab-overhaul.js';
import {
    cleanupOptionalUiCompatibility,
    getOptionalUiCompatibilityState,
    initializeOptionalUiCompatibility,
    refreshOptionalUiCompatibility,
} from '../compat/optional-ui-compat.js';
import {
    cleanupAstraProjectaCompatibility,
    getAstraProjectaCompatibilityState,
    initializeAstraProjectaCompatibility,
    refreshAstraProjectaCompatibility,
} from '../compat/astra-projecta-compat.js';
import {
    cleanupUiOverhaulFeatures,
    getUiOverhaulFeatureState,
    syncUiOverhaulFeatures,
} from './overhaul-feature-runtime.js';
import { getSettings } from './overhaul-settings.js';
import { observeSettings } from './overhaul-settings-panel.js';

let initialized = false;
let currentSettings = null;

function combinedCompatibilityState() {
    const optional = getOptionalUiCompatibilityState() ?? {};
    const astra = getAstraProjectaCompatibilityState() ?? {};
    return Object.freeze({
        ...optional,
        ...astra,
        features: getUiOverhaulFeatureState(),
    });
}

function syncForAstra(state) {
    if (!currentSettings) return;
    void syncUiOverhaulFeatures({
        settings: currentSettings,
        suspended: Boolean(state?.astraActive),
    });
}

export async function initializeUiOverhaul() {
    if (initialized) return combinedCompatibilityState();
    initialized = true;
    currentSettings = getSettings();
    observeSettings(currentSettings);
    document.body.classList.add('nemo-ui-overhaul-enabled');

    initializeOptionalUiCompatibility({
        settings: currentSettings,
        onChange: () => {
            if (!getUiOverhaulFeatureState().suspended) NemoGlobalUI.reconcile();
        },
    });

    const astraState = initializeAstraProjectaCompatibility({
        settings: currentSettings,
        onChange: syncForAstra,
    });
    await syncUiOverhaulFeatures({
        settings: currentSettings,
        suspended: Boolean(astraState?.astraActive),
    });
    return combinedCompatibilityState();
}

export async function refreshUiOverhaulCompatibility() {
    const settings = currentSettings ?? getSettings();
    currentSettings = settings;
    refreshOptionalUiCompatibility(settings);
    const astraState = refreshAstraProjectaCompatibility(settings);
    await syncUiOverhaulFeatures({
        settings,
        suspended: Boolean(astraState?.astraActive),
    });
    return combinedCompatibilityState();
}

export async function cleanupUiOverhaul() {
    await cleanupUiOverhaulFeatures();
    cleanupAstraProjectaCompatibility();
    cleanupOptionalUiCompatibility();
    document.body.classList.remove('nemo-ui-overhaul-enabled');
    currentSettings = null;
    initialized = false;
}

export function publishUiOverhaulApi() {
    window.NemoUIOverhaul = Object.freeze({
        NemoGlobalUI,
        NemoWorldInfoUI,
        ExtensionsTabOverhaul,
        getSettings,
        getCompatibilityState: combinedCompatibilityState,
        refreshCompatibility: refreshUiOverhaulCompatibility,
        cleanupCompatibility: cleanupUiOverhaul,
    });
}
