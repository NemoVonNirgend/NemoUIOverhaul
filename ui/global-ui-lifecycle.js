import { eventSource, event_types } from '../../../../../script.js';
import { GLOBAL_UI_SELECTORS } from './global-ui-shared.js';

export const globalUiLifecycle = {
    initializeStopButtonAnimation() {
        const stopButton = document.querySelector(GLOBAL_UI_SELECTORS.stopButton);
        if (!stopButton || this._generationHandlers) return;
        const started = () => stopButton.classList.add('nemo-generating-animation');
        const stopped = () => stopButton.classList.remove('nemo-generating-animation');
        eventSource.on(event_types.GENERATION_STARTED, started);
        eventSource.on(event_types.GENERATION_ENDED, stopped);
        eventSource.on(event_types.GENERATION_STOPPED, stopped);
        this._stopButton = stopButton;
        this._generationHandlers = { started, stopped };
    },

    destroy() {
        this._bodyObserver?.disconnect();
        this._panelObserver?.disconnect();
        this._bodyObserver = null;
        this._panelObserver = null;
        this._convertTargets = null;
        for (const observer of this._visibilityObservers.values()) observer.disconnect();
        this._visibilityObservers.clear();

        if (this._generationHandlers) {
            const { started, stopped } = this._generationHandlers;
            eventSource.removeListener(event_types.GENERATION_STARTED, started);
            eventSource.removeListener(event_types.GENERATION_ENDED, stopped);
            eventSource.removeListener(event_types.GENERATION_STOPPED, stopped);
        }
        if (this._stopButton) {
            this._stopButton.classList.remove('nemo-generating-animation');
            delete this._stopButton.dataset.nemoAnimated;
        }
        this._stopButton = null;
        this._generationHandlers = null;

        document.querySelectorAll('[data-nemo-standalone]').forEach(element => {
            delete element.dataset.nemoStandalone;
        });
        document.querySelectorAll('[data-nemo-grouped]').forEach(element => {
            delete element.dataset.nemoGrouped;
        });

        this._restoreMoves();
        for (const element of this._createdElements) element.remove();
        this._createdElements.clear();
        this._initialized = false;
    },
};
