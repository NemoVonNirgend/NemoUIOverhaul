export const globalUiGroups = {
    moveNestedPromptDrawers() {
        const openaiSettingsDrawer = document.getElementById('nemo-drawer-openai_chat_settings');
        if (!openaiSettingsDrawer) return;

        const openaiSettingsContent = openaiSettingsDrawer.querySelector('.inline-drawer-content');
        if (!openaiSettingsContent) return;

        const quickPromptsDrawer = this.findInlineDrawerByHeading(openaiSettingsContent, 'Quick Prompts Edit');
        const utilityPromptsDrawer = this.findInlineDrawerByHeading(openaiSettingsContent, 'Utility Prompts');

        if (quickPromptsDrawer) {
            this._recordMove(quickPromptsDrawer);
            openaiSettingsDrawer.parentNode.insertBefore(quickPromptsDrawer, openaiSettingsDrawer.nextSibling);
        }
        if (utilityPromptsDrawer) {
            this._recordMove(utilityPromptsDrawer);
            openaiSettingsDrawer.parentNode.insertBefore(utilityPromptsDrawer, openaiSettingsDrawer.nextSibling);
        }
    },

    groupNemoExtensions() {
        const nemoExtensions = [
            'NemoUIOverhaul',
            'Nemo Rewrite',
            'Prose Polisher (Regex + AI)',
            'Mood Music Settings',
            'Qvink Memory',
            'LoreManager',
            'Chat History Super Manager',
        ];
        const extensionsContainer = document.querySelector('#extensions_settings');
        if (!extensionsContainer) return;

        let nemoSuiteDrawer = document.getElementById('nemo-suite-drawer');
        if (!nemoSuiteDrawer) {
            nemoSuiteDrawer = document.createElement('div');
            nemoSuiteDrawer.id = 'nemo-suite-drawer';
            nemoSuiteDrawer.className = 'inline-drawer wide100p nemo-converted-drawer';
            nemoSuiteDrawer.innerHTML = `
                <div class="inline-drawer-toggle inline-drawer-header interactable" tabindex="0">
                    <b>Nemo Suite</b>
                    <div class="inline-drawer-icon fa-solid fa-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="display: none;"></div>
            `;
            extensionsContainer.prepend(nemoSuiteDrawer);
            this._createdElements.add(nemoSuiteDrawer);
        }

        const nemoSuiteContent = nemoSuiteDrawer.querySelector('.inline-drawer-content');
        const nemoPresetSettings = document.getElementById('nemo-preset-ext-settings-host');
        if (nemoPresetSettings && nemoPresetSettings.parentElement !== nemoSuiteContent) {
            this._recordMove(nemoPresetSettings);
            nemoSuiteContent.appendChild(nemoPresetSettings);
        }

        const allDrawers = Array.from(extensionsContainer.querySelectorAll(':scope > .inline-drawer'));
        allDrawers.forEach(drawer => {
            const titleElement = drawer.querySelector('.inline-drawer-header b');
            if (titleElement && nemoExtensions.includes(titleElement.textContent.trim())) {
                if (drawer.id !== 'nemo-suite-drawer') {
                    this._recordMove(drawer);
                    nemoSuiteContent.appendChild(drawer);
                }
            }
        });
    },
};
