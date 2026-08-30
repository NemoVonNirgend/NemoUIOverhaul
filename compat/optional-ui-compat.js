const CHAT_TABS_SELECTORS = Object.freeze({
    buttons: '.openai-tab-buttons',
    promptsHost: '#openai-tab-content-prompts',
    parametersHost: '#openai-tab-content-parameters',
    promptManager: '#completion_prompt_manager',
});

const MOONLIT_SELECTORS = Object.freeze([
    '#moonlit_sidebar_button',
    '#moonlit_echoes_popout',
    '#SillyTavernMoonlitEchoesTheme-drawer',
    'link[href*="SillyTavern-MoonlitEchoesTheme"]',
]);

export const CHAT_COMPLETION_LAYOUT_OWNERS = Object.freeze({
    NEMO: 'nemo',
    RIVELLE: 'rivelle',
});

export const REASONING_SELECTOR_KINDS = Object.freeze({
    FORMAT_TEMPLATE: 'format-template',
    MODEL_EFFORT: 'model-effort',
});

export const REASONING_SELECTOR_BINDINGS = Object.freeze([
    {
        key: REASONING_SELECTOR_KINDS.FORMAT_TEMPLATE,
        native: '#reasoning_select',
        proxy: '#nemo-reasoning-select',
        property: 'value',
        event: 'change',
        nativeLabel: 'Reasoning format template',
        proxyLabel: 'Reasoning format template',
        description: 'Controls the prefix, suffix, separator, and parsing format. It is independent of model reasoning effort.',
    },
    {
        key: REASONING_SELECTOR_KINDS.MODEL_EFFORT,
        native: '#openai_reasoning_effort',
        proxy: '#nemo-openai-reasoning-effort',
        property: 'value',
        event: 'change',
        nativeLabel: 'Model reasoning effort',
        proxyLabel: 'Model reasoning effort',
        description: 'Controls how much reasoning the provider requests from the model. It is independent of the reasoning format template.',
    },
]);

const runtime = {
    initialized: false,
    root: null,
    globalObject: null,
    settings: null,
    observer: null,
    bridge: null,
    reconcileTimer: null,
    changeHandler: null,
    pageHideHandler: null,
    onChange: null,
    current: null,
};

function query(root, selector) {
    return root?.querySelector?.(selector) ?? null;
}

function readExtensionSettings(globalObject) {
    try {
        return globalObject?.SillyTavern?.getContext?.()?.extensionSettings ?? {};
    } catch {
        return {};
    }
}

function readMainApi(root) {
    const selector = query(root, '#main_api');
    return selector?.value ?? '';
}

function contains(parent, child) {
    return Boolean(parent && child && typeof parent.contains === 'function' && parent.contains(child));
}

export function detectOptionalUiCapabilities({
    root = globalThis.document,
    globalObject = globalThis,
} = {}) {
    const extensionSettings = readExtensionSettings(globalObject);
    const tabButtons = query(root, CHAT_TABS_SELECTORS.buttons);
    const promptsHost = query(root, CHAT_TABS_SELECTORS.promptsHost);
    const parametersHost = query(root, CHAT_TABS_SELECTORS.parametersHost);
    const promptManager = query(root, CHAT_TABS_SELECTORS.promptManager);
    const mainApi = readMainApi(root);

    const chatTabsPresent = Boolean(
        globalObject?.ChatCompletionTabs
        || tabButtons
        || promptsHost
        || parametersHost
    );
    const chatTabsEnabled = chatTabsPresent
        && extensionSettings.ChatCompletionTabs?.enabled !== false;
    const chatTabsActive = Boolean(
        chatTabsPresent
        && promptsHost
        && parametersHost
        && contains(promptsHost, promptManager)
    );
    const chatTabsPending = Boolean(
        chatTabsPresent
        && chatTabsEnabled
        && mainApi === 'openai'
        && !chatTabsActive
    );
    const chatTabsOwnsLayout = chatTabsActive || chatTabsPending;
    const moonlitPresent = Boolean(
        extensionSettings.SillyTavernMoonlitEchoesTheme
        || MOONLIT_SELECTORS.some(selector => query(root, selector))
    );
    const companionReasoningBridgePresent = Boolean(
        globalObject?.NemoPromptTools?.getCompatibilityState
        || root?.body?.dataset?.nemoReasoningOwner
    );

    return Object.freeze({
        mainApi,
        chatTabsPresent,
        chatTabsEnabled,
        chatTabsActive,
        chatTabsPending,
        chatTabsOwnsLayout,
        chatCompletionLayoutOwner: chatTabsOwnsLayout
            ? CHAT_COMPLETION_LAYOUT_OWNERS.RIVELLE
            : CHAT_COMPLETION_LAYOUT_OWNERS.NEMO,
        moonlitPresent,
        companionReasoningBridgePresent,
        tabButtons,
        promptsHost,
        parametersHost,
        promptManager,
    });
}

function compactState(state) {
    if (!state) return null;
    return Object.freeze({
        mainApi: state.mainApi,
        chatTabsPresent: state.chatTabsPresent,
        chatTabsEnabled: state.chatTabsEnabled,
        chatTabsActive: state.chatTabsActive,
        chatTabsPending: state.chatTabsPending,
        chatCompletionLayoutOwner: state.chatCompletionLayoutOwner,
        moonlitPresent: state.moonlitPresent,
        companionReasoningBridgePresent: state.companionReasoningBridgePresent,
    });
}

function statesDiffer(previous, next) {
    if (!previous || !next) return previous !== next;
    return previous.mainApi !== next.mainApi
        || previous.chatTabsPresent !== next.chatTabsPresent
        || previous.chatTabsEnabled !== next.chatTabsEnabled
        || previous.chatTabsActive !== next.chatTabsActive
        || previous.chatTabsPending !== next.chatTabsPending
        || previous.chatCompletionLayoutOwner !== next.chatCompletionLayoutOwner
        || previous.moonlitPresent !== next.moonlitPresent
        || previous.companionReasoningBridgePresent !== next.companionReasoningBridgePresent;
}

function publishMarkers(root, state, settings) {
    const body = root?.body;
    if (!body?.dataset || !state) return;

    body.dataset.nemoUiChatTabs = state.chatTabsActive
        ? 'active'
        : state.chatTabsPending
            ? 'pending'
            : 'inactive';
    body.dataset.nemoUiChatCompletionOwner = state.chatCompletionLayoutOwner;
    body.dataset.nemoUiMoonlit = state.moonlitPresent ? 'true' : 'false';
    body.classList?.toggle?.(
        'nemo-ui-hide-lorebook-presets',
        settings?.lorebookPresetControls === false,
    );
}

function clearMarkers(root) {
    const body = root?.body;
    if (!body?.dataset) return;
    delete body.dataset.nemoUiChatTabs;
    delete body.dataset.nemoUiChatCompletionOwner;
    delete body.dataset.nemoUiMoonlit;
    body.classList?.remove?.('nemo-ui-hide-lorebook-presets');
}

function ensureStylesheet(root) {
    if (!root?.head || !root?.createElement) return;
    if (query(root, '#nemo-optional-ui-compat-styles')) return;

    const link = root.createElement('link');
    link.id = 'nemo-optional-ui-compat-styles';
    link.rel = 'stylesheet';
    link.href = 'scripts/extensions/third-party/NemoUIOverhaul/compat/optional-ui-compat.css';
    root.head.appendChild(link);
}

function restoreClarifiedLabels(root) {
    root?.querySelectorAll?.('[data-nemo-ui-original-label]').forEach(element => {
        element.textContent = element.dataset.nemoUiOriginalLabel;
        delete element.dataset.nemoUiOriginalLabel;
    });
    root?.querySelectorAll?.('.nemo-ui-reasoning-selector-label').forEach(element => element.remove());
    root?.querySelectorAll?.('.nemo-ui-reasoning-selector-row').forEach(element => {
        element.classList?.remove?.('nemo-ui-reasoning-selector-row');
    });
    root?.querySelectorAll?.('[data-nemo-ui-reasoning-kind]').forEach(element => {
        delete element.dataset.nemoUiReasoningKind;
    });
}

function setVisibleLabelText(root, selector, text) {
    const label = query(root, selector);
    if (!label) return;
    if (!label.dataset.nemoUiOriginalLabel) {
        label.dataset.nemoUiOriginalLabel = label.textContent?.trim?.() ?? '';
    }
    if (label.textContent !== text) label.textContent = text;
}

function ensureFormatTemplateLabel(root, selector) {
    const select = query(root, selector);
    const parent = select?.parentElement;
    if (!select || !parent?.insertBefore) return;

    parent.classList?.add?.('nemo-ui-reasoning-selector-row');
    const existing = parent.querySelector?.(
        `.nemo-ui-reasoning-selector-label[data-nemo-ui-label-for="${select.id}"]`,
    );
    if (existing) return;

    const label = root.createElement?.('label');
    if (!label) return;
    label.className = 'nemo-ui-reasoning-selector-label';
    label.htmlFor = select.id;
    label.dataset.nemoUiLabelFor = select.id;
    label.textContent = 'Reasoning format template';
    parent.insertBefore(label, select);
}

function annotateReasoningSelectors(root) {
    for (const binding of REASONING_SELECTOR_BINDINGS) {
        for (const selector of [binding.native, binding.proxy]) {
            const node = query(root, selector);
            if (!node) continue;
            node.dataset.nemoUiReasoningKind = binding.key;
            node.setAttribute?.(
                'aria-label',
                selector === binding.native ? binding.nativeLabel : binding.proxyLabel,
            );
            node.setAttribute?.('title', binding.description);
        }
    }

    setVisibleLabelText(
        root,
        'label[for="openai_reasoning_effort"] span',
        'Model Reasoning Effort',
    );
    setVisibleLabelText(
        root,
        'label[for="nemo-openai-reasoning-effort"] span',
        'Model Reasoning Effort',
    );
    ensureFormatTemplateLabel(root, '#reasoning_select');
    ensureFormatTemplateLabel(root, '#nemo-reasoning-select');
}

export class ReasoningSelectorBridge {
    constructor({
        root = globalThis.document,
        bindings = REASONING_SELECTOR_BINDINGS,
        EventConstructor = globalThis.Event,
    } = {}) {
        this.root = root;
        this.bindings = bindings;
        this.EventConstructor = EventConstructor;
        this.records = new Map();
        this.syncing = new Set();
    }

    reconcile() {
        for (const binding of this.bindings) this.#reconcileBinding(binding);
    }

    #reconcileBinding(binding) {
        const nativeNode = query(this.root, binding.native);
        const proxyNode = query(this.root, binding.proxy);
        const previous = this.records.get(binding.key);

        if (previous?.nativeNode === nativeNode && previous?.proxyNode === proxyNode) {
            this.#copy(nativeNode, proxyNode, binding);
            return;
        }

        this.#cleanup(previous);
        const record = { nativeNode, proxyNode, removers: [] };
        this.records.set(binding.key, record);

        if (!nativeNode || !proxyNode || nativeNode === proxyNode) return;
        this.#copy(nativeNode, proxyNode, binding);

        const onProxyChange = () => {
            if (this.syncing.has(binding.key)) return;
            const currentNative = query(this.root, binding.native);
            const currentProxy = query(this.root, binding.proxy);
            if (!currentNative || !currentProxy || currentNative === currentProxy) return;

            this.syncing.add(binding.key);
            try {
                const changed = this.#copy(currentProxy, currentNative, binding);
                if (changed) this.#dispatch(currentNative, binding.event);
            } finally {
                this.syncing.delete(binding.key);
            }
        };

        const onNativeChange = event => {
            if (this.syncing.has(binding.key)) return;
            const currentProxy = query(this.root, binding.proxy);
            const source = event?.currentTarget ?? query(this.root, binding.native);
            this.#copy(source, currentProxy, binding);
        };

        record.removers.push(this.#listen(proxyNode, binding.event, onProxyChange));
        record.removers.push(this.#listen(nativeNode, binding.event, onNativeChange));
    }

    #copy(source, target, binding) {
        if (!source || !target) return false;
        const property = binding.property ?? 'value';
        if (target[property] === source[property]) return false;
        target[property] = source[property];
        return true;
    }

    #listen(node, eventName, handler) {
        if (!node?.addEventListener) return () => {};
        node.addEventListener(eventName, handler);
        return () => node.removeEventListener?.(eventName, handler);
    }

    #dispatch(node, eventName) {
        if (!node?.dispatchEvent || !eventName) return;
        const EventType = node.ownerDocument?.defaultView?.Event ?? this.EventConstructor;
        if (typeof EventType === 'function') {
            node.dispatchEvent(new EventType(eventName, { bubbles: true }));
        }
    }

    #cleanup(record) {
        for (const remove of record?.removers ?? []) {
            try {
                remove();
            } catch {
                // Detached controls may already have discarded their listeners.
            }
        }
    }

    destroy() {
        for (const record of this.records.values()) this.#cleanup(record);
        this.records.clear();
        this.syncing.clear();
    }
}

function scheduleReconcile() {
    const setTimer = runtime.globalObject?.setTimeout ?? globalThis.setTimeout;
    const clearTimer = runtime.globalObject?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer(runtime.reconcileTimer);
    runtime.reconcileTimer = setTimer(() => {
        runtime.reconcileTimer = null;
        refreshOptionalUiCompatibility();
    }, 50);
}

export function refreshOptionalUiCompatibility(settings = runtime.settings) {
    if (!runtime.initialized) return null;
    runtime.settings = settings ?? runtime.settings;

    ensureStylesheet(runtime.root);
    const next = detectOptionalUiCapabilities({
        root: runtime.root,
        globalObject: runtime.globalObject,
    });
    publishMarkers(runtime.root, next, runtime.settings);
    if (next.companionReasoningBridgePresent) runtime.bridge?.destroy();
    else runtime.bridge?.reconcile();
    annotateReasoningSelectors(runtime.root);

    const previous = runtime.current;
    runtime.current = next;
    if (statesDiffer(previous, next)) runtime.onChange?.(compactState(next), compactState(previous));
    return compactState(next);
}

export function initializeOptionalUiCompatibility({
    root = globalThis.document,
    globalObject = globalThis,
    settings = null,
    onChange = null,
} = {}) {
    cleanupOptionalUiCompatibility();

    runtime.initialized = true;
    runtime.root = root;
    runtime.globalObject = globalObject;
    runtime.settings = settings;
    runtime.onChange = onChange;
    runtime.bridge = new ReasoningSelectorBridge({
        root,
        EventConstructor: globalObject?.Event,
    });

    ensureStylesheet(root);

    const MutationObserverType = globalObject?.MutationObserver;
    if (typeof MutationObserverType === 'function' && root?.body) {
        runtime.observer = new MutationObserverType(scheduleReconcile);
        runtime.observer.observe(root.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });
    }

    runtime.changeHandler = event => {
        const id = event?.target?.id;
        if (
            id === 'main_api'
            || id === 'ChatCompletionTabs-enabled'
            || id === 'reasoning_select'
            || id === 'nemo-reasoning-select'
            || id === 'openai_reasoning_effort'
            || id === 'nemo-openai-reasoning-effort'
        ) {
            scheduleReconcile();
        }
    };
    root?.addEventListener?.('change', runtime.changeHandler, true);

    runtime.pageHideHandler = cleanupOptionalUiCompatibility;
    globalObject?.addEventListener?.('pagehide', runtime.pageHideHandler, { once: true });

    return refreshOptionalUiCompatibility(settings);
}

export function getOptionalUiCompatibilityState() {
    return compactState(runtime.current);
}

export function cleanupOptionalUiCompatibility() {
    const clearTimer = runtime.globalObject?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer(runtime.reconcileTimer);
    runtime.reconcileTimer = null;

    runtime.observer?.disconnect?.();
    runtime.observer = null;
    runtime.bridge?.destroy();
    runtime.bridge = null;

    if (runtime.changeHandler) {
        runtime.root?.removeEventListener?.('change', runtime.changeHandler, true);
    }
    if (runtime.pageHideHandler) {
        runtime.globalObject?.removeEventListener?.('pagehide', runtime.pageHideHandler);
    }

    restoreClarifiedLabels(runtime.root);
    clearMarkers(runtime.root);
    query(runtime.root, '#nemo-optional-ui-compat-styles')?.remove?.();

    runtime.initialized = false;
    runtime.root = null;
    runtime.globalObject = null;
    runtime.settings = null;
    runtime.changeHandler = null;
    runtime.pageHideHandler = null;
    runtime.onChange = null;
    runtime.current = null;
}
