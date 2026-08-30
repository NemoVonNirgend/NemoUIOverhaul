import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';

export const UI_OVERHAUL_DEFAULTS = Object.freeze({
    connectionPanel: true,
    settingsTabs: true,
    lorebookUi: true,
    lorebookPresetControls: true,
    extensionTab: true,
    animatedBackgrounds: true,
    modelSelector: true,
    widePanels: false,
    mobileEnhancements: true,
    uiTheme: 'none',
});

export function getSettings() {
    if (!extension_settings.NemoUIOverhaul) {
        const legacy = extension_settings.NemoPresetExt ?? {};
        extension_settings.NemoUIOverhaul = {
            connectionPanel: legacy.enableConnectionPanelOverhaul ?? UI_OVERHAUL_DEFAULTS.connectionPanel,
            settingsTabs: legacy.enableTabOverhauls ?? UI_OVERHAUL_DEFAULTS.settingsTabs,
            lorebookUi: legacy.enableLorebookOverhaul ?? UI_OVERHAUL_DEFAULTS.lorebookUi,
            lorebookPresetControls: legacy.lorebookPresetControls
                ?? legacy.showLorebookPresetSelector
                ?? UI_OVERHAUL_DEFAULTS.lorebookPresetControls,
            extensionTab: legacy.nemoEnableExtensionsTabOverhaul ?? UI_OVERHAUL_DEFAULTS.extensionTab,
            animatedBackgrounds: legacy.enableAnimatedBackgrounds ?? UI_OVERHAUL_DEFAULTS.animatedBackgrounds,
            modelSelector: legacy.enableModelSelector ?? UI_OVERHAUL_DEFAULTS.modelSelector,
            widePanels: legacy.nemoEnableWidePanels ?? UI_OVERHAUL_DEFAULTS.widePanels,
            mobileEnhancements: legacy.enableMobileEnhancements ?? UI_OVERHAUL_DEFAULTS.mobileEnhancements,
            uiTheme: legacy.uiTheme ?? UI_OVERHAUL_DEFAULTS.uiTheme,
        };
        saveSettingsDebounced();
    }
    const settings = extension_settings.NemoUIOverhaul;
    for (const [key, value] of Object.entries(UI_OVERHAUL_DEFAULTS)) settings[key] ??= value;
    return settings;
}

export function applyResponsiveOptions(settings) {
    document.getElementById('nemo-wide-panels-styles')?.remove();
    if (settings.widePanels) {
        const style = document.createElement('style');
        style.id = 'nemo-wide-panels-styles';
        style.textContent = '@media (min-width: 769px) { #right-nav-panel { width: 50vw !important; right: 0 !important; left: auto !important; } #left-nav-panel { width: 50vw !important; left: 0 !important; } }';
        document.head.appendChild(style);
    }
    document.body.classList.toggle(
        'nemo-mobile-enhanced',
        settings.mobileEnhancements && window.matchMedia('(pointer: coarse)').matches,
    );
}
