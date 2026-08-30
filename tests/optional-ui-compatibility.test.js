import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CHAT_COMPLETION_LAYOUT_OWNERS,
    REASONING_SELECTOR_BINDINGS,
    REASONING_SELECTOR_KINDS,
    ReasoningSelectorBridge,
    detectOptionalUiCapabilities,
} from '../compat/optional-ui-compat.js';

class FakeControl {
    constructor(value = '') {
        this.value = value;
        this.listeners = new Map();
        this.dataset = {};
        this.ownerDocument = { defaultView: { Event: FakeEvent } };
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }

    dispatchEvent(event) {
        event.currentTarget = this;
        for (const handler of this.listeners.get(event.type) ?? []) handler(event);
        return true;
    }
}

class FakeEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.bubbles = Boolean(options.bubbles);
        this.currentTarget = null;
    }
}

function makeRoot(entries = {}) {
    const map = new Map(Object.entries(entries));
    return {
        map,
        body: { dataset: {}, classList: { toggle() {}, remove() {} } },
        querySelector(selector) {
            return map.get(selector) ?? null;
        },
    };
}

function makeGlobal({ chatTabs = false, enabled } = {}) {
    const extensionSettings = {};
    if (enabled !== undefined) extensionSettings.ChatCompletionTabs = { enabled };
    return {
        ChatCompletionTabs: chatTabs ? {} : undefined,
        SillyTavern: {
            getContext: () => ({ extensionSettings }),
        },
    };
}

test('standalone mode keeps Nemo ownership when Chat Completion Tabs is absent', () => {
    const root = makeRoot({ '#main_api': { value: 'openai' } });
    const state = detectOptionalUiCapabilities({ root, globalObject: makeGlobal() });

    assert.equal(state.chatTabsPresent, false);
    assert.equal(state.chatTabsOwnsLayout, false);
    assert.equal(state.chatCompletionLayoutOwner, CHAT_COMPLETION_LAYOUT_OWNERS.NEMO);
});

test('enabled Chat Completion Tabs receives ownership before its delayed DOM mount', () => {
    const root = makeRoot({ '#main_api': { value: 'openai' } });
    const state = detectOptionalUiCapabilities({
        root,
        globalObject: makeGlobal({ chatTabs: true, enabled: true }),
    });

    assert.equal(state.chatTabsActive, false);
    assert.equal(state.chatTabsPending, true);
    assert.equal(state.chatTabsOwnsLayout, true);
    assert.equal(state.chatCompletionLayoutOwner, CHAT_COMPLETION_LAYOUT_OWNERS.RIVELLE);
});

test('an installed but disabled tab extension leaves Nemo in control', () => {
    const root = makeRoot({ '#main_api': { value: 'openai' } });
    const state = detectOptionalUiCapabilities({
        root,
        globalObject: makeGlobal({ chatTabs: true, enabled: false }),
    });

    assert.equal(state.chatTabsPresent, true);
    assert.equal(state.chatTabsEnabled, false);
    assert.equal(state.chatTabsPending, false);
    assert.equal(state.chatCompletionLayoutOwner, CHAT_COMPLETION_LAYOUT_OWNERS.NEMO);
});

test('active Rivelle tabs are detected by actual prompt-manager ownership', () => {
    const promptManager = {};
    const promptsHost = { contains: node => node === promptManager };
    const parametersHost = {};
    const root = makeRoot({
        '#main_api': { value: 'openai' },
        '#completion_prompt_manager': promptManager,
        '#openai-tab-content-prompts': promptsHost,
        '#openai-tab-content-parameters': parametersHost,
        '.openai-tab-buttons': {},
    });
    const state = detectOptionalUiCapabilities({ root, globalObject: makeGlobal({ enabled: true }) });

    assert.equal(state.chatTabsActive, true);
    assert.equal(state.chatTabsPending, false);
    assert.equal(state.chatCompletionLayoutOwner, CHAT_COMPLETION_LAYOUT_OWNERS.RIVELLE);
});

test('Chat Completion Tabs does not claim non-chat-completion APIs while inactive', () => {
    const root = makeRoot({ '#main_api': { value: 'textgenerationwebui' } });
    const state = detectOptionalUiCapabilities({
        root,
        globalObject: makeGlobal({ chatTabs: true, enabled: true }),
    });

    assert.equal(state.chatTabsPending, false);
    assert.equal(state.chatCompletionLayoutOwner, CHAT_COMPLETION_LAYOUT_OWNERS.NEMO);
});

test('Moonlit Echoes is detected from stable runtime markers without importing it', () => {
    const root = makeRoot({
        '#main_api': { value: 'openai' },
        '#moonlit_sidebar_button': {},
    });
    const state = detectOptionalUiCapabilities({ root, globalObject: makeGlobal() });
    assert.equal(state.moonlitPresent, true);
});

test('format templates and model effort remain separate canonical settings', () => {
    const byKey = Object.fromEntries(REASONING_SELECTOR_BINDINGS.map(binding => [binding.key, binding]));
    assert.equal(byKey[REASONING_SELECTOR_KINDS.FORMAT_TEMPLATE].native, '#reasoning_select');
    assert.equal(byKey[REASONING_SELECTOR_KINDS.FORMAT_TEMPLATE].proxy, '#nemo-reasoning-select');
    assert.equal(byKey[REASONING_SELECTOR_KINDS.MODEL_EFFORT].native, '#openai_reasoning_effort');
    assert.equal(byKey[REASONING_SELECTOR_KINDS.MODEL_EFFORT].proxy, '#nemo-openai-reasoning-effort');
    assert.notEqual(
        byKey[REASONING_SELECTOR_KINDS.FORMAT_TEMPLATE].native,
        byKey[REASONING_SELECTOR_KINDS.MODEL_EFFORT].native,
    );
});

test('reasoning bridge synchronizes each proxy only with its native counterpart', () => {
    const nativeFormat = new FakeControl('Think XML');
    const proxyFormat = new FakeControl('Blank');
    const nativeEffort = new FakeControl('high');
    const proxyEffort = new FakeControl('low');
    const root = makeRoot({
        '#reasoning_select': nativeFormat,
        '#nemo-reasoning-select': proxyFormat,
        '#openai_reasoning_effort': nativeEffort,
        '#nemo-openai-reasoning-effort': proxyEffort,
    });
    const bridge = new ReasoningSelectorBridge({ root, EventConstructor: FakeEvent });

    bridge.reconcile();
    assert.equal(proxyFormat.value, 'Think XML');
    assert.equal(proxyEffort.value, 'high');

    proxyFormat.value = 'DeepSeek';
    proxyFormat.dispatchEvent(new FakeEvent('change'));
    assert.equal(nativeFormat.value, 'DeepSeek');
    assert.equal(nativeEffort.value, 'high');

    nativeEffort.value = 'max';
    nativeEffort.dispatchEvent(new FakeEvent('change'));
    assert.equal(proxyEffort.value, 'max');
    assert.equal(proxyFormat.value, 'DeepSeek');

    bridge.destroy();
});

test('reasoning bridge rebinds when SillyTavern replaces a native selector node', () => {
    const oldNative = new FakeControl('low');
    const proxy = new FakeControl('auto');
    const root = makeRoot({
        '#openai_reasoning_effort': oldNative,
        '#nemo-openai-reasoning-effort': proxy,
    });
    const bridge = new ReasoningSelectorBridge({
        root,
        bindings: [REASONING_SELECTOR_BINDINGS.find(binding => binding.key === REASONING_SELECTOR_KINDS.MODEL_EFFORT)],
        EventConstructor: FakeEvent,
    });

    bridge.reconcile();
    assert.equal(proxy.value, 'low');

    const newNative = new FakeControl('high');
    root.map.set('#openai_reasoning_effort', newNative);
    bridge.reconcile();
    assert.equal(proxy.value, 'high');

    oldNative.value = 'min';
    oldNative.dispatchEvent(new FakeEvent('change'));
    assert.equal(proxy.value, 'high');

    newNative.value = 'max';
    newNative.dispatchEvent(new FakeEvent('change'));
    assert.equal(proxy.value, 'max');

    bridge.destroy();
});
