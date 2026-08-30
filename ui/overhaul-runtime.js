import { NemoGlobalUI } from './global-ui.js';
import { UserSettingsTabs } from './user-settings-tabs.js';
import { NemoWorldInfoUI } from '../features/world-info/world-info-ui.js';
import { ExtensionsTabOverhaul } from './extensions-tab-overhaul.js';
import { animatedBackgrounds } from '../features/backgrounds/animated-backgrounds-module.js';
import { backgroundUIEnhancements } from '../features/backgrounds/background-ui-enhancements.js';
import { backgroundOrganizer } from '../features/backgrounds/background-organizer.js';
import { ModelSelector } from '../features/connection/model-selector.js';
import { TextCompletionSelector } from '../features/connection/textcomp-selector.js';
import { initializeThemes } from './theme-manager.js';
import {
    cleanupOptionalUiCompatibility,
    getOptionalUiCompatibilityState,
    initializeOptionalUiCompatibility,
    refreshOptionalUiCompatibility,
} from '../compat/optional-ui-compat.js';
import { applyResponsiveOptions, getSettings } from './overhaul-settings.js';
import { observeSettings } from './overhaul-settings-panel.js';

export async function initializeUiOverhaul() {
    const settings = getSettings();
    observeSettings(settings);
    await initializeThemes();
    document.body.classList.add('nemo-ui-overhaul-enabled');
    document.body.classList.toggle('nemo-extensions-overhaul-enabled', settings.extensionTab);
    document.body.classList.toggle('nemo-animated-backgrounds-enabled', settings.animatedBackgrounds);
    document.body.classList.toggle('nemo-lorebook-overhaul-enabled', settings.lorebookUi);
    applyResponsiveOptions(settings);

    initializeOptionalUiCompatibility({
        settings,
        onChange: () => NemoGlobalUI.reconcile(),
    });

    if (settings.connectionPanel) NemoGlobalUI.initialize();
    if (settings.settingsTabs) UserSettingsTabs.initialize();
    if (settings.lorebookUi) NemoWorldInfoUI.initialize();
    if (settings.extensionTab) ExtensionsTabOverhaul.initialize();
    if (settings.animatedBackgrounds) {
        await animatedBackgrounds.initialize();
        animatedBackgrounds.addSettingsToUI();
        await backgroundUIEnhancements.initialize();
        await backgroundOrganizer.initialize();
    }
    if (settings.modelSelector) {
        setTimeout(() => {
            ModelSelector.initialize();
            TextCompletionSelector.initialize();
        }, 1500);
    }
}

export function publishUiOverhaulApi() {
    window.NemoUIOverhaul = Object.freeze({
        NemoGlobalUI,
        NemoWorldInfoUI,
        ExtensionsTabOverhaul,
        getSettings,
        getCompatibilityState: getOptionalUiCompatibilityState,
        refreshCompatibility: () => refreshOptionalUiCompatibility(getSettings()),
        cleanupCompatibility: cleanupOptionalUiCompatibility,
    });
}
