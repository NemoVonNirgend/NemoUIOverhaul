import { LOG_PREFIX } from '../core/utils.js';
import { GLOBAL_UI_SELECTORS } from './global-ui-shared.js';
import { convertConfiguredTargets } from './global-ui-targets.js';

function setupPanelObserver(ui, leftNavPanel) {
    const convertTargets = () => convertConfiguredTargets(ui);
    ui._convertTargets = convertTargets;
    ui._panelObserver?.disconnect();
    ui._panelObserver = new MutationObserver(convertTargets);
    ui._panelObserver.observe(leftNavPanel, { childList: true, subtree: true });
    convertTargets();
}

export const globalUiLayout = {
    reconcile() {
        this._convertTargets?.();
    },

    initialize() {
        if (this._initialized) return;
        this._initialized = true;
        console.log(`${LOG_PREFIX} Initializing Global UI module...`);

        const attach = leftNavPanel => {
            setupPanelObserver(this, leftNavPanel);
            const stopButton = document.querySelector(GLOBAL_UI_SELECTORS.stopButton);
            if (stopButton && !stopButton.dataset.nemoAnimated) {
                this.initializeStopButtonAnimation();
                stopButton.dataset.nemoAnimated = 'true';
            }
        };

        const existingPanel = document.querySelector(GLOBAL_UI_SELECTORS.leftNavPanel);
        if (existingPanel) {
            attach(existingPanel);
        } else {
            this._bodyObserver = new MutationObserver((mutations, observer) => {
                const leftNavPanel = document.querySelector(GLOBAL_UI_SELECTORS.leftNavPanel);
                if (!leftNavPanel) return;
                observer.disconnect();
                attach(leftNavPanel);
            });
            this._bodyObserver.observe(document.body, { childList: true, subtree: true });
        }

        console.log(`${LOG_PREFIX} Global UI module initialized.`);
    },
};
