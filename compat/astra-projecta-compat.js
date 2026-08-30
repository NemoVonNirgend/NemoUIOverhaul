const ASTRA_SETTINGS_KEY = 'astra_projecta';
const ASTRA_RUNTIME_KEY = '__astraProjectaRuntime';
const ASTRA_MOBILE_BODY_CLASS = 'astra-projecta-mobile-layout';
const ASTRA_PORTED_DRAWER_SELECTOR = [
    '[data-astra-projecta-native-drawer-source]',
    '.astra-projecta-native-drawer-ported',
].join(', ');
const ASTRA_ROOT_SELECTORS = Object.freeze([
    '#astra-projecta-root',
    '[data-astra-projecta-ui-root]',
    '#astra-sillytavern-interface-panel-host',
]);
const STYLE_ID = 'nemo-astra-projecta-compat-styles';

export const STRUCTURAL_UI_OWNERS = Object.freeze({
    NEMO: 'nemo',
    ASTRA: 'astra',
});

const runtime = {
    initialized: false,
    root: null,
    globalObject: null,
    settings: null,
    current: null,
    observer: null,
    reconcileTimer: null,
    pageHideHandler: null,
    onChange: null,
};

function query(root, selector) {
    try {
        return root?.querySelector?.(selector) ?? null;
    } catch {
        return null;
    }
}

function queryCount(root, selector) {
    try {
        return root?.querySelectorAll?.(selector)?.length ?? 0;
    } catch {
        return 0;
    }
}

function readExtensionSettings(globalObject) {
    try {
        return globalObject?.SillyTavern?.getContext?.()?.extensionSettings ?? {};
    } catch {
        return {};
    }
}

function compactState(state) {
    if (!state) return null;
    return Object.freeze({
        astraPresent: state.astraPresent,
        astraActive: state.astraActive,
        astraRuntimePresent: state.astraRuntimePresent,
        astraRootPresent: state.astraRootPresent,
        astraMobileClassActive: state.astraMobileClassActive,
        portedDrawerCount: state.portedDrawerCount,
        structuralUiOwner: state.structuralUiOwner,
    });
}

function statesDiffer(previous, next) {
    return !previous
        || previous.astraPresent !== next.astraPresent
        || previous.astraActive !== next.astraActive
        || previous.portedDrawerCount !== next.portedDrawerCount
        || previous.structuralUiOwner !== next.structuralUiOwner;
}

function ensureStylesheet(root) {
    if (!root?.head || query(root, `#${STYLE_ID}`)) return;
    const link = root.createElement?.('link');
    if (!link) return;
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = new URL('./astra-projecta-compat.css', import.meta.url).href;
    root.head.appendChild(link);
}

function updateSettingsNotice(root, state) {
    const notice = query(root, '#nemo-ui-external-compat-status');
    if (!notice) return;

    if (!state.astraPresent) {
        notice.hidden = true;
        notice.textContent = '';
        notice.removeAttribute?.('data-state');
        return;
    }

    notice.hidden = false;
    notice.dataset.state = state.astraActive ? 'suspended' : 'available';
    notice.textContent = state.astraActive
        ? 'AstraProjecta mobile mode is active. Nemo structural UI features are temporarily paused without changing their saved settings and return automatically when Astra releases the native interface.'
        : 'AstraProjecta is installed but is not currently using its mobile shell. Nemo UI Overhaul remains active.';
}

export function detectAstraProjectaCapabilities({
    root = globalThis.document,
    globalObject = globalThis,
} = {}) {
    const body = root?.body;
    const extensionSettings = readExtensionSettings(globalObject);
    const astraRuntimePresent = Boolean(globalObject?.[ASTRA_RUNTIME_KEY]);
    const astraRootPresent = ASTRA_ROOT_SELECTORS.some(selector => Boolean(query(root, selector)));
    const astraSettingsPresent = Object.prototype.hasOwnProperty.call(extensionSettings, ASTRA_SETTINGS_KEY);
    const astraMobileClassActive = Boolean(body?.classList?.contains?.(ASTRA_MOBILE_BODY_CLASS));
    const portedDrawerCount = queryCount(root, ASTRA_PORTED_DRAWER_SELECTOR);
    const astraActive = astraMobileClassActive || portedDrawerCount > 0;
    const astraPresent = astraRuntimePresent
        || astraRootPresent
        || astraSettingsPresent
        || astraActive;

    return Object.freeze({
        astraPresent,
        astraActive,
        astraRuntimePresent,
        astraRootPresent,
        astraSettingsPresent,
        astraMobileClassActive,
        portedDrawerCount,
        structuralUiOwner: astraActive
            ? STRUCTURAL_UI_OWNERS.ASTRA
            : STRUCTURAL_UI_OWNERS.NEMO,
    });
}

export function publishAstraProjectaMarkers(
    state,
    root = globalThis.document,
) {
    const body = root?.body;
    if (!body?.dataset || !state) return;

    body.dataset.nemoUiAstra = state.astraActive
        ? 'active'
        : state.astraPresent
            ? 'inactive'
            : 'absent';
    body.dataset.nemoUiStructuralOwner = state.structuralUiOwner;
    body.classList?.toggle?.('nemo-ui-suspended-for-astra', state.astraActive);
    updateSettingsNotice(root, state);
}

export function clearAstraProjectaMarkers(root = globalThis.document) {
    const body = root?.body;
    if (body?.dataset) {
        delete body.dataset.nemoUiAstra;
        delete body.dataset.nemoUiStructuralOwner;
    }
    body?.classList?.remove?.('nemo-ui-suspended-for-astra');
    const notice = query(root, '#nemo-ui-external-compat-status');
    if (notice) {
        notice.hidden = true;
        notice.textContent = '';
        notice.removeAttribute?.('data-state');
    }
}

function scheduleReconcile() {
    const setTimer = runtime.globalObject?.setTimeout ?? globalThis.setTimeout;
    const clearTimer = runtime.globalObject?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer(runtime.reconcileTimer);
    runtime.reconcileTimer = setTimer(() => {
        runtime.reconcileTimer = null;
        refreshAstraProjectaCompatibility();
    }, 50);
}

export function refreshAstraProjectaCompatibility(
    settings = runtime.settings,
    { notify = true } = {},
) {
    if (!runtime.initialized) return null;
    runtime.settings = settings ?? runtime.settings;
    ensureStylesheet(runtime.root);

    const next = detectAstraProjectaCapabilities({
        root: runtime.root,
        globalObject: runtime.globalObject,
    });
    publishAstraProjectaMarkers(next, runtime.root);

    const previous = runtime.current;
    runtime.current = next;
    if (notify && statesDiffer(previous, next)) {
        runtime.onChange?.(compactState(next), compactState(previous));
    }
    return compactState(next);
}

export function initializeAstraProjectaCompatibility({
    root = globalThis.document,
    globalObject = globalThis,
    settings = null,
    onChange = null,
} = {}) {
    cleanupAstraProjectaCompatibility();

    runtime.initialized = true;
    runtime.root = root;
    runtime.globalObject = globalObject;
    runtime.settings = settings;
    runtime.onChange = onChange;
    ensureStylesheet(root);

    const MutationObserverType = globalObject?.MutationObserver;
    if (typeof MutationObserverType === 'function' && root?.body) {
        runtime.observer = new MutationObserverType(scheduleReconcile);
        runtime.observer.observe(root.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-astra-projecta-native-drawer-source'],
        });
    }

    runtime.pageHideHandler = cleanupAstraProjectaCompatibility;
    globalObject?.addEventListener?.('pagehide', runtime.pageHideHandler, { once: true });

    return refreshAstraProjectaCompatibility(settings, { notify: false });
}

export function getAstraProjectaCompatibilityState() {
    return compactState(runtime.current);
}

export function cleanupAstraProjectaCompatibility() {
    const clearTimer = runtime.globalObject?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer(runtime.reconcileTimer);
    runtime.reconcileTimer = null;
    runtime.observer?.disconnect?.();
    runtime.observer = null;

    if (runtime.pageHideHandler) {
        runtime.globalObject?.removeEventListener?.('pagehide', runtime.pageHideHandler);
    }

    clearAstraProjectaMarkers(runtime.root);
    query(runtime.root, `#${STYLE_ID}`)?.remove?.();

    runtime.initialized = false;
    runtime.root = null;
    runtime.globalObject = null;
    runtime.settings = null;
    runtime.current = null;
    runtime.pageHideHandler = null;
    runtime.onChange = null;
}

export const ASTRA_PROJECTA_COMPATIBILITY_SELECTORS = Object.freeze({
    mobileBodyClass: ASTRA_MOBILE_BODY_CLASS,
    portedDrawer: ASTRA_PORTED_DRAWER_SELECTOR,
    roots: ASTRA_ROOT_SELECTORS,
});
