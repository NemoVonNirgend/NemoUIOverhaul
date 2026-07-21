import { NemoGlobalUI } from './ui/global-ui.js';
import { UserSettingsTabs } from './ui/user-settings-tabs.js';
import { NemoWorldInfoUI } from './features/world-info/world-info-ui.js';
import { ExtensionsTabOverhaul } from './ui/extensions-tab-overhaul.js';
import { animatedBackgrounds } from './features/backgrounds/animated-backgrounds-module.js';
import { backgroundUIEnhancements } from './features/backgrounds/background-ui-enhancements.js';
import { backgroundOrganizer } from './features/backgrounds/background-organizer.js';
import { ModelSelector } from './features/connection/model-selector.js';
import { TextCompletionSelector } from './features/connection/textcomp-selector.js';

async function initialize() {
    document.body.classList.add(
        'nemo-ui-overhaul-enabled',
        'nemo-extensions-overhaul-enabled',
        'nemo-animated-backgrounds-enabled',
        'nemo-lorebook-overhaul-enabled',
    );
    NemoGlobalUI.initialize();
    UserSettingsTabs.initialize();
    NemoWorldInfoUI.initialize();
    ExtensionsTabOverhaul.initialize();
    await animatedBackgrounds.initialize();
    animatedBackgrounds.addSettingsToUI();
    await backgroundUIEnhancements.initialize();
    await backgroundOrganizer.initialize();
    setTimeout(() => {
        ModelSelector.initialize();
        TextCompletionSelector.initialize();
    }, 1500);
}

window.NemoUIOverhaul = Object.freeze({ NemoGlobalUI, NemoWorldInfoUI, ExtensionsTabOverhaul });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void initialize(), { once: true });
else void initialize();
