import { saveSettings, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { NemoGlobalUI } from './ui/global-ui.js';
import { UserSettingsTabs } from './ui/user-settings-tabs.js';
import { NemoWorldInfoUI } from './features/world-info/world-info-ui.js';
import { ExtensionsTabOverhaul } from './ui/extensions-tab-overhaul.js';
import { animatedBackgrounds } from './features/backgrounds/animated-backgrounds-module.js';
import { backgroundUIEnhancements } from './features/backgrounds/background-ui-enhancements.js';
import { backgroundOrganizer } from './features/backgrounds/background-organizer.js';
import { ModelSelector } from './features/connection/model-selector.js';
import { TextCompletionSelector } from './features/connection/textcomp-selector.js';
import { initializeThemes, setTheme } from './ui/theme-manager.js';

const DEFAULTS = Object.freeze({
    connectionPanel: true,
    settingsTabs: true,
    lorebookUi: true,
    extensionTab: true,
    animatedBackgrounds: true,
    modelSelector: true,
    widePanels: false,
    mobileEnhancements: true,
    uiTheme: 'none',
});

function getSettings() {
    if (!extension_settings.NemoUIOverhaul) {
        const legacy = extension_settings.NemoPresetExt ?? {};
        extension_settings.NemoUIOverhaul = {
            connectionPanel: legacy.enableConnectionPanelOverhaul ?? DEFAULTS.connectionPanel,
            settingsTabs: legacy.enableTabOverhauls ?? DEFAULTS.settingsTabs,
            lorebookUi: legacy.enableLorebookOverhaul ?? DEFAULTS.lorebookUi,
            extensionTab: legacy.nemoEnableExtensionsTabOverhaul ?? DEFAULTS.extensionTab,
            animatedBackgrounds: legacy.enableAnimatedBackgrounds ?? DEFAULTS.animatedBackgrounds,
            modelSelector: legacy.enableModelSelector ?? DEFAULTS.modelSelector,
            widePanels: legacy.nemoEnableWidePanels ?? DEFAULTS.widePanels,
            mobileEnhancements: legacy.enableMobileEnhancements ?? DEFAULTS.mobileEnhancements,
            uiTheme: legacy.uiTheme ?? DEFAULTS.uiTheme,
        };
        saveSettingsDebounced();
    }
    const settings = extension_settings.NemoUIOverhaul;
    for (const [key, value] of Object.entries(DEFAULTS)) settings[key] ??= value;
    return settings;
}

function applyResponsiveOptions(settings) {
    document.getElementById('nemo-wide-panels-styles')?.remove();
    if (settings.widePanels) {
        const style = document.createElement('style');
        style.id = 'nemo-wide-panels-styles';
        style.textContent = '@media (min-width: 769px) { #right-nav-panel { width: 50vw !important; right: 0 !important; left: auto !important; } #left-nav-panel { width: 50vw !important; left: 0 !important; } }';
        document.head.appendChild(style);
    }
    document.body.classList.toggle('nemo-mobile-enhanced', settings.mobileEnhancements && window.matchMedia('(pointer: coarse)').matches);
}

function mountSettings(settings) {
    if (document.getElementById('nemo-ui-overhaul-settings')) return true;
    const container = document.getElementById('extensions_settings') ?? document.getElementById('extensions_settings2');
    if (!container) return false;
    const labels = {
        connectionPanel: 'Connection panel overhaul',
        settingsTabs: 'Settings tab overhaul',
        lorebookUi: 'Lorebook UI and quick access',
        extensionTab: 'Extension tab overhaul',
        animatedBackgrounds: 'Animated backgrounds',
        modelSelector: 'Enhanced model selector',
        widePanels: 'Wide navigation panels',
        mobileEnhancements: 'Mobile UI enhancements',
    };
    const host = document.createElement('div');
    host.id = 'nemo-ui-overhaul-settings';
    host.className = 'extension_container';
    host.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header"><b>Nemo UI Overhaul</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
            <div class="inline-drawer-content">
                <p class="notes">Feature switches apply after reload. Theme changes apply immediately.</p>
                ${Object.entries(labels).map(([key, label]) => `<label class="checkbox_label"><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}><span>${label}</span></label>`).join('')}
                <label for="nemo-ui-theme">Interface theme</label>
                <select id="nemo-ui-theme" class="text_pole" data-setting="uiTheme">
                    ${['none', 'win98', 'discord', 'cyberpunk', 'nemotavern'].map(value => `<option value="${value}" ${settings.uiTheme === value ? 'selected' : ''}>${value === 'none' ? 'SillyTavern default' : value}</option>`).join('')}
                </select>
            </div>
        </div>`;
    host.addEventListener('change', event => {
        const input = event.target.closest('[data-setting]');
        if (!input) return;
        settings[input.dataset.setting] = input.type === 'checkbox' ? input.checked : input.value;
        saveSettingsDebounced();
        void saveSettings();
        if (input.dataset.setting === 'uiTheme') setTheme(input.value);
        if (input.dataset.setting === 'widePanels' || input.dataset.setting === 'mobileEnhancements') applyResponsiveOptions(settings);
    });
    container.appendChild(host);
    return true;
}

function observeSettings(settings) {
    mountSettings(settings);
    const observer = new MutationObserver(() => mountSettings(settings));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

async function initialize() {
    const settings = getSettings();
    observeSettings(settings);
    await initializeThemes();
    document.body.classList.add('nemo-ui-overhaul-enabled');
    document.body.classList.toggle('nemo-extensions-overhaul-enabled', settings.extensionTab);
    document.body.classList.toggle('nemo-animated-backgrounds-enabled', settings.animatedBackgrounds);
    document.body.classList.toggle('nemo-lorebook-overhaul-enabled', settings.lorebookUi);
    applyResponsiveOptions(settings);
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

window.NemoUIOverhaul = Object.freeze({ NemoGlobalUI, NemoWorldInfoUI, ExtensionsTabOverhaul, getSettings });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void initialize(), { once: true });
else void initialize();
