import { eventSource, event_types } from '../../../../../script.js';

const lifecycle = {
    installedOn: null,
    root: null,
    globalObject: null,
    moveRecords: [],
    movedNodes: new WeakSet(),
    abortController: null,
    apiSourceHandler: null,
    apiChangeTimer: null,
    advancedFormattingDisplay: null,
    advancedFormattingElement: null,
    userSettingsDisplay: null,
    chatTruncationNode: null,
};

function query(selector) {
    return lifecycle.root?.querySelector?.(selector) ?? null;
}

function queryAll(selector) {
    return Array.from(lifecycle.root?.querySelectorAll?.(selector) ?? []);
}

function recordMove(node) {
    if (!node?.parentNode || lifecycle.movedNodes.has(node)) return;
    lifecycle.movedNodes.add(node);
    lifecycle.moveRecords.push({
        node,
        parent: node.parentNode,
        nextSibling: node.nextSibling,
    });
}

function recordChildren(parent) {
    if (!parent?.childNodes) return;
    Array.from(parent.childNodes).forEach(recordMove);
}

function captureNativeLayout() {
    lifecycle.moveRecords = [];
    lifecycle.movedNodes = new WeakSet();

    const userSettingsContent = query('#user-settings-block-content');
    lifecycle.userSettingsDisplay = userSettingsContent?.style?.display ?? null;
    recordChildren(userSettingsContent);

    const firstColumn = query('[name="UserSettingsFirstColumn"]');
    const secondColumn = query('[name="UserSettingsSecondColumn"]');
    const thirdColumn = query('[name="UserSettingsThirdColumn"]');
    const uiPresetBlock = firstColumn?.querySelector?.('#UI-presets-block');
    const themeElements = firstColumn?.querySelector?.('[name="themeElements"]');
    const customCssBlock = secondColumn?.querySelector?.('#CustomCSS-block');
    const characterToggles = secondColumn?.querySelector?.('[name="CharacterHandlingToggles"]');
    const miscellaneousToggles = secondColumn?.querySelector?.('[name="MiscellaneousToggles"]');
    const powerUserOptions = thirdColumn?.querySelector?.('#power-user-option-checkboxes');

    for (const node of [
        uiPresetBlock,
        themeElements,
        customCssBlock,
        characterToggles,
        miscellaneousToggles,
        powerUserOptions,
    ]) recordMove(node);

    const presetHeader = uiPresetBlock?.querySelector?.('h4');
    const presetButtonContainer = presetHeader?.querySelector?.('.flex-container');
    recordChildren(presetButtonContainer);
    recordMove(presetHeader?.querySelector?.('#ui_preset_import_file'));

    const contextSettings = query('#ContextSettings');
    const instructSettings = query('#InstructSettingsColumn');
    const systemPrompt = query('#SystemPromptColumn');
    for (const column of [contextSettings, instructSettings, systemPrompt]) {
        recordMove(column);
        recordChildren(column);
    }

    const advancedFormattingButton = query('#advanced-formatting-button');
    const advancedFormatting = query('#AdvancedFormatting');
    lifecycle.advancedFormattingElement = advancedFormattingButton ?? advancedFormatting?.parentElement ?? null;
    lifecycle.advancedFormattingDisplay = lifecycle.advancedFormattingElement?.style?.display ?? null;
}

function restoreNativeLayout() {
    for (const { node, parent, nextSibling } of lifecycle.moveRecords.slice().reverse()) {
        if (!node || !parent?.insertBefore) continue;
        const anchor = nextSibling?.parentNode === parent ? nextSibling : null;
        parent.insertBefore(node, anchor);
    }
    lifecycle.moveRecords = [];
    lifecycle.movedNodes = new WeakSet();

    if (lifecycle.advancedFormattingElement && lifecycle.advancedFormattingDisplay !== null) {
        lifecycle.advancedFormattingElement.style.display = lifecycle.advancedFormattingDisplay;
    }
    lifecycle.advancedFormattingElement = null;
    lifecycle.advancedFormattingDisplay = null;

    const userSettingsContent = query('#user-settings-block-content');
    if (userSettingsContent && lifecycle.userSettingsDisplay !== null) {
        userSettingsContent.style.display = lifecycle.userSettingsDisplay;
    }
    lifecycle.userSettingsDisplay = null;
}

function removeManagedUi() {
    for (const selector of [
        '.nemo-user-settings-tabs',
        '.nemo-user-settings-search',
        '#nemo-search-results',
        '#nemo-cc-checkboxes-in-reasoning',
        '#nemo-cc-checkbox-stash',
        '.nemo-user-settings-tab-content',
        '.nemo-ui-theme-main-content',
    ]) {
        queryAll(selector).forEach(element => element.remove?.());
    }
}

function listenerOptions() {
    return lifecycle.abortController?.signal
        ? { signal: lifecycle.abortController.signal }
        : undefined;
}

function cleanupManagedListeners() {
    lifecycle.abortController?.abort?.();
    lifecycle.abortController = null;

    if (lifecycle.apiSourceHandler) {
        eventSource.removeListener(
            event_types.CHATCOMPLETION_SOURCE_CHANGED,
            lifecycle.apiSourceHandler,
        );
    }
    lifecycle.apiSourceHandler = null;

    const clearTimer = lifecycle.globalObject?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer(lifecycle.apiChangeTimer);
    lifecycle.apiChangeTimer = null;

    const truncation = lifecycle.chatTruncationNode;
    if (truncation?.value === 'Unlimited') truncation.value = '0';
    truncation?.removeAttribute?.('data-original-value');
    if (truncation?.style) truncation.style.color = '';
    lifecycle.chatTruncationNode = null;
}

function beginManagedLifecycle() {
    cleanupManagedListeners();
    if (lifecycle.moveRecords.length) restoreNativeLayout();
    removeManagedUi();
    captureNativeLayout();

    const AbortControllerType = lifecycle.globalObject?.AbortController ?? globalThis.AbortController;
    lifecycle.abortController = typeof AbortControllerType === 'function'
        ? new AbortControllerType()
        : null;
}

function installManagedApiListeners(tabs) {
    const setTimer = lifecycle.globalObject?.setTimeout ?? globalThis.setTimeout;
    const clearTimer = lifecycle.globalObject?.clearTimeout ?? globalThis.clearTimeout;

    lifecycle.apiSourceHandler = () => {
        clearTimer(lifecycle.apiChangeTimer);
        lifecycle.apiChangeTimer = setTimer(() => {
            lifecycle.apiChangeTimer = null;
            const isChatCompletion = tabs._detectCCMode();
            if (isChatCompletion !== tabs._isCCMode) {
                tabs._isCCMode = isChatCompletion;
                tabs._applyCCMode(isChatCompletion, false);
            }
        }, 200);
    };
    eventSource.on(
        event_types.CHATCOMPLETION_SOURCE_CHANGED,
        lifecycle.apiSourceHandler,
    );

    const mainApiSelect = query('#main_api');
    mainApiSelect?.addEventListener?.('change', () => {
        const isChatCompletion = mainApiSelect.value === 'openai';
        if (isChatCompletion !== tabs._isCCMode) {
            tabs._isCCMode = isChatCompletion;
            tabs._applyCCMode(isChatCompletion, false);
        }
    }, listenerOptions());
}

function installManagedTabHandlers(tabs) {
    queryAll('.nemo-user-settings-tab').forEach(tab => {
        tab.addEventListener?.('click', event => {
            tabs.switchTab(event.currentTarget?.getAttribute?.('data-tab'));
        }, listenerOptions());
    });
}

function installManagedCustomInputs() {
    const truncation = query('#chat_truncation_counter');
    if (!truncation) return;
    lifecycle.chatTruncationNode = truncation;

    const updateDisplay = () => {
        if (truncation.value === '0') {
            truncation.setAttribute('data-original-value', '0');
            truncation.value = 'Unlimited';
            truncation.style.color = 'var(--nemo-primary-accent, #4a9eff)';
        } else if (truncation.hasAttribute('data-original-value')) {
            truncation.removeAttribute('data-original-value');
            truncation.style.color = '';
        }
    };
    const handleFocus = () => {
        if (truncation.value === 'Unlimited') {
            truncation.value = '0';
            truncation.style.color = '';
        }
    };

    updateDisplay();
    truncation.addEventListener('input', updateDisplay, listenerOptions());
    truncation.addEventListener('focus', handleFocus, listenerOptions());
    truncation.addEventListener('blur', updateDisplay, listenerOptions());
}

function bindSearchInput(tabs, input) {
    if (!input) return;
    const handleSearch = () => {
        const value = input.value ?? '';
        if (!value || value.length < 2) tabs.clearSearchFilter();
        else tabs.applySearchFilter(value);
    };
    input.addEventListener?.('input', handleSearch, listenerOptions());
    input.addEventListener?.('keyup', event => {
        if (event.key === 'Enter') handleSearch();
    }, listenerOptions());
}

function installManagedSearch(tabs) {
    const userSettingsBlock = query('#user-settings-block');
    if (!userSettingsBlock) return;
    const input = userSettingsBlock.querySelector?.(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]',
    );
    if (input) bindSearchInput(tabs, input);
    else tabs.createSearchInput();
}

function createManagedSearchInput(tabs) {
    const userSettingsBlock = query('#user-settings-block');
    const tabNavigation = query('.nemo-user-settings-tabs');
    if (!userSettingsBlock || !tabNavigation || query('#nemo-user-settings-search')) return;

    const container = lifecycle.root.createElement('div');
    container.className = 'nemo-user-settings-search';
    container.innerHTML = `
        <div class="flex-container alignItemsCenter" style="margin-bottom: 15px; gap: 10px;">
            <i class="fa-solid fa-search" style="color: var(--nemo-text-color); opacity: 0.7;"></i>
            <input type="search" id="nemo-user-settings-search"
                   placeholder="Search settings..."
                   style="flex: 1; padding: 8px 12px; border: 1px solid var(--nemo-border-color);
                          border-radius: 4px; background: var(--nemo-tertiary-bg);
                          color: var(--nemo-text-color); font-size: 14px;">
        </div>`;
    userSettingsBlock.insertBefore(container, tabNavigation);
    bindSearchInput(tabs, query('#nemo-user-settings-search'));
}

export function installUserSettingsTabsLifecycle(
    tabs,
    {
        root = globalThis.document,
        globalObject = globalThis,
    } = {},
) {
    if (!tabs || lifecycle.installedOn === tabs) return tabs;

    lifecycle.installedOn = tabs;
    lifecycle.root = root;
    lifecycle.globalObject = globalObject;
    const originalCreate = tabs.createTabbedInterface;
    const originalCleanup = tabs.cleanup;

    tabs.createTabbedInterface = function(...args) {
        beginManagedLifecycle();
        return originalCreate.apply(this, args);
    };
    tabs._listenForApiChanges = function() {
        installManagedApiListeners(this);
    };
    tabs.addTabHandlers = function() {
        installManagedTabHandlers(this);
    };
    tabs.addCustomInputHandlers = function() {
        installManagedCustomInputs();
    };
    tabs.addSearchHandler = function() {
        installManagedSearch(this);
    };
    tabs.createSearchInput = function() {
        createManagedSearchInput(this);
    };
    tabs.destroy = function() {
        clearInterval(this._pollForContentInterval);
        clearTimeout(this._initializeTimeout);
        this._pollForContentInterval = null;
        this._initializeTimeout = null;

        cleanupManagedListeners();
        restoreNativeLayout();
        removeManagedUi();
        originalCleanup.call(this);

        this.initialized = false;
        this.activeTab = 'ui-theme';
        this._isCCMode = false;
        this._ccCheckboxStash = null;
    };

    return tabs;
}
