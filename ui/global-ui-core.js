export const globalUiCore = {
    _initialized: false,
    _bodyObserver: null,
    _panelObserver: null,
    _visibilityObservers: new Map(),
    _moveRecords: [],
    _createdElements: new Set(),
    _stopButton: null,
    _generationHandlers: null,
    _convertTargets: null,

    _recordMove(element) {
        if (!element?.parentNode || this._moveRecords.some(record => record.element === element)) return;
        this._moveRecords.push({
            element,
            parent: element.parentNode,
            nextSibling: element.nextSibling,
        });
    },

    _forgetMove(element) {
        if (!element) return;
        this._moveRecords = this._moveRecords.filter(record => record.element !== element);
    },

    _restoreMoves() {
        for (const { element, parent, nextSibling } of this._moveRecords.reverse()) {
            if (!element || !parent?.isConnected) continue;
            const anchor = nextSibling?.parentNode === parent ? nextSibling : null;
            parent.insertBefore(element, anchor);
        }
        this._moveRecords.length = 0;
    },

    _disconnectVisibilityObserver(element) {
        const observer = this._visibilityObservers.get(element);
        observer?.disconnect();
        this._visibilityObservers.delete(element);
    },

    releaseConvertedDrawer(uniqueId, targetSelector) {
        const drawer = document.getElementById(`nemo-drawer-${uniqueId}`);
        const target = targetSelector ? document.querySelector(targetSelector) : null;

        if (drawer) {
            const content = drawer.querySelector(':scope > .inline-drawer-content');
            const nestedTarget = content?.firstElementChild;
            if (nestedTarget && drawer.parentNode) {
                drawer.parentNode.insertBefore(nestedTarget, drawer);
            }
            drawer.remove();
            this._createdElements.delete(drawer);
        }

        if (target) {
            this._disconnectVisibilityObserver(target);
            this._forgetMove(target);
        }
    },

    releaseStandalonePromptManager() {
        const promptManager = document.querySelector('#completion_prompt_manager');
        if (!promptManager) return;
        delete promptManager.dataset.nemoStandalone;
        this._forgetMove(promptManager);
    },

    convertToInlineDrawer(target, title, isOpenByDefault = false, uniqueId = null) {
        const targetElement = typeof target === 'string'
            ? document.querySelector(target)
            : target;
        if (!targetElement || targetElement.closest('.nemo-converted-drawer')) return;
        if (uniqueId && document.getElementById(`nemo-drawer-${uniqueId}`)) return;

        const drawer = document.createElement('div');
        drawer.className = 'inline-drawer wide100p nemo-converted-drawer';
        if (uniqueId) drawer.id = `nemo-drawer-${uniqueId}`;

        const drawerToggle = document.createElement('div');
        drawerToggle.className = 'inline-drawer-toggle inline-drawer-header interactable';
        drawerToggle.tabIndex = 0;
        drawerToggle.innerHTML = `<b>${title}</b><div class="inline-drawer-icon fa-solid fa-chevron-down ${isOpenByDefault ? 'up' : 'down'}"></div>`;

        const drawerContent = document.createElement('div');
        drawerContent.className = 'inline-drawer-content';
        if (!isOpenByDefault) drawerContent.style.display = 'none';

        this._recordMove(targetElement);
        targetElement.parentNode.insertBefore(drawer, targetElement);
        drawerContent.appendChild(targetElement);

        drawer.appendChild(drawerToggle);
        drawer.appendChild(drawerContent);
        this._createdElements.add(drawer);

        const syncVisibility = () => {
            const hidden = targetElement.style.display === 'none'
                || targetElement.classList.contains('displayNone');
            drawer.style.display = hidden ? 'none' : '';
        };
        const visibilityObserver = new MutationObserver(syncVisibility);
        visibilityObserver.observe(targetElement, { attributes: true, attributeFilter: ['style', 'class'] });
        this._visibilityObservers.set(targetElement, visibilityObserver);
        syncVisibility();
    },

    findTargetWithDescendant(rootSelector, candidateSelector, descendantSelector, directChildren = false) {
        const root = document.querySelector(rootSelector);
        if (!root) return null;

        const candidates = directChildren
            ? Array.from(root.children).filter(element => element.matches(candidateSelector))
            : Array.from(root.querySelectorAll(candidateSelector));

        return candidates.find(element => element.querySelector(descendantSelector)) || null;
    },

    findInlineDrawerByHeading(container, heading) {
        return Array.from(container.querySelectorAll('.inline-drawer')).find(drawer => {
            const titleElement = drawer.querySelector('.inline-drawer-header b');
            return titleElement?.textContent.trim() === heading;
        }) ?? null;
    },
};
