import { saveSettings, saveSettingsDebounced } from '../../../../../script.js';
import { setTheme } from './theme-manager.js';
import { refreshOptionalUiCompatibility } from '../compat/optional-ui-compat.js';
import { applyResponsiveOptions } from './overhaul-settings.js';

const SETTINGS_LABELS = Object.freeze({
    connectionPanel: 'Connection panel overhaul',
    settingsTabs: 'Settings tab overhaul',
    lorebookUi: 'Lorebook UI and quick access',
    lorebookPresetControls: 'Show lorebook preset controls',
    extensionTab: 'Extension tab overhaul',
    animatedBackgrounds: 'Animated backgrounds',
    modelSelector: 'Enhanced model selector',
    widePanels: 'Wide navigation panels',
    mobileEnhancements: 'Mobile UI enhancements',
});

function mountSettings(settings) {
    if (document.getElementById('nemo-ui-overhaul-settings')) return true;
    const container = document.getElementById('extensions_settings') ?? document.getElementById('extensions_settings2');
    if (!container) return false;

    const host = document.createElement('div');
    host.id = 'nemo-ui-overhaul-settings';
    host.className = 'extension_container';
    host.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header"><b>Nemo UI Overhaul</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
            <div class="inline-drawer-content">
                <p class="notes">Most feature switches apply after reload. Theme, responsive options, and lorebook preset visibility apply immediately.</p>
                ${Object.entries(SETTINGS_LABELS).map(([key, label]) => `<label class="checkbox_label"><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}><span>${label}</span></label>`).join('')}
                <small class="notes">Hiding lorebook preset controls removes only the preset selector and its management buttons. Saved presets and active lorebooks are unchanged.</small>
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
        if (input.dataset.setting === 'widePanels' || input.dataset.setting === 'mobileEnhancements') {
            applyResponsiveOptions(settings);
        }
        if (input.dataset.setting === 'lorebookPresetControls') {
            refreshOptionalUiCompatibility(settings);
        }
    });
    container.appendChild(host);
    return true;
}

export function observeSettings(settings) {
    mountSettings(settings);
    const observer = new MutationObserver(() => mountSettings(settings));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
