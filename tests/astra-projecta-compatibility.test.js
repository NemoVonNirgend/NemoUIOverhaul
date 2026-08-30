import assert from 'node:assert/strict';
import test from 'node:test';
import {
    STRUCTURAL_UI_OWNERS,
    clearAstraProjectaMarkers,
    detectAstraProjectaCapabilities,
    publishAstraProjectaMarkers,
} from '../compat/astra-projecta-compat.js';

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        contains: value => values.has(value),
        toggle(value, force) {
            const enabled = force === undefined ? !values.has(value) : Boolean(force);
            if (enabled) values.add(value);
            else values.delete(value);
            return enabled;
        },
        remove: value => values.delete(value),
        has: value => values.has(value),
    };
}

function createRoot({ classes = [], selectors = [], portedDrawerCount = 0 } = {}) {
    const selectorSet = new Set(selectors);
    const notice = {
        hidden: true,
        textContent: '',
        dataset: {},
        removeAttribute(name) {
            if (name === 'data-state') delete this.dataset.state;
        },
    };
    const body = {
        dataset: {},
        classList: createClassList(classes),
    };
    return {
        body,
        notice,
        querySelector(selector) {
            if (selector === '#nemo-ui-external-compat-status') return notice;
            return selectorSet.has(selector) ? { selector } : null;
        },
        querySelectorAll(selector) {
            if (selector.includes('astra-projecta-native-drawer')) {
                return Array.from({ length: portedDrawerCount }, () => ({}));
            }
            return [];
        },
    };
}

function createGlobal(extensionSettings = {}, runtime = null) {
    return {
        __astraProjectaRuntime: runtime,
        SillyTavern: {
            getContext: () => ({ extensionSettings }),
        },
    };
}

test('Astra is absent when no runtime, settings, roots, or ported drawers exist', () => {
    const state = detectAstraProjectaCapabilities({
        root: createRoot(),
        globalObject: createGlobal(),
    });
    assert.equal(state.astraPresent, false);
    assert.equal(state.astraActive, false);
    assert.equal(state.structuralUiOwner, STRUCTURAL_UI_OWNERS.NEMO);
});

test('an installed but inactive Astra runtime leaves structural ownership with Nemo', () => {
    const state = detectAstraProjectaCapabilities({
        root: createRoot(),
        globalObject: createGlobal({ astra_projecta: { layout_mode_preference: 'force-desktop' } }),
    });
    assert.equal(state.astraPresent, true);
    assert.equal(state.astraActive, false);
    assert.equal(state.structuralUiOwner, STRUCTURAL_UI_OWNERS.NEMO);
});

test('Astra mobile body class transfers structural ownership to Astra', () => {
    const state = detectAstraProjectaCapabilities({
        root: createRoot({ classes: ['astra-projecta-mobile-layout'] }),
        globalObject: createGlobal(),
    });
    assert.equal(state.astraActive, true);
    assert.equal(state.astraMobileClassActive, true);
    assert.equal(state.structuralUiOwner, STRUCTURAL_UI_OWNERS.ASTRA);
});

test('ported drawers keep Nemo suspended through Astra teardown transitions', () => {
    const state = detectAstraProjectaCapabilities({
        root: createRoot({ portedDrawerCount: 2 }),
        globalObject: createGlobal(),
    });
    assert.equal(state.astraActive, true);
    assert.equal(state.portedDrawerCount, 2);
    assert.equal(state.structuralUiOwner, STRUCTURAL_UI_OWNERS.ASTRA);
});

test('published markers expose ownership and are fully reversible', () => {
    const root = createRoot();
    const active = {
        astraPresent: true,
        astraActive: true,
        structuralUiOwner: STRUCTURAL_UI_OWNERS.ASTRA,
    };
    publishAstraProjectaMarkers(active, root);
    assert.equal(root.body.dataset.nemoUiAstra, 'active');
    assert.equal(root.body.dataset.nemoUiStructuralOwner, 'astra');
    assert.equal(root.body.classList.has('nemo-ui-suspended-for-astra'), true);
    assert.equal(root.notice.hidden, false);
    assert.match(root.notice.textContent, /temporarily paused/i);

    clearAstraProjectaMarkers(root);
    assert.equal(root.body.dataset.nemoUiAstra, undefined);
    assert.equal(root.body.dataset.nemoUiStructuralOwner, undefined);
    assert.equal(root.body.classList.has('nemo-ui-suspended-for-astra'), false);
    assert.equal(root.notice.hidden, true);
});
