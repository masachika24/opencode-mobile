// ==UserScript==
// @name         OpenCode Mobile Optimizer
// @namespace    https://github.com/opencode-mobile
// @version      1.5.2
// @description  Optimizes OpenCode Web UI (localhost:4000) for mobile devices
// @author       opencode-mobile
// @match        http://localhost:4000/*
// @match        http://*.ts.net:4000/*
// @include      http://100.*:4000/*
// @include      http://10.*:4000/*
// @include      http://172.*:4000/*
// @include      http://192.168.*:4000/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = true;
    const log = (...args) => DEBUG && console.log('[OCM]', ...args);

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    // ================================================================
    // SECTION 1: Mobile Detection
    // ================================================================

    const isMobile = () => window.innerWidth < 1024;

    // ================================================================
    // SECTION 2: CSS Injection
    // ================================================================

    const CSS = String.raw`
/* == OpenCode Mobile Optimizer CSS == */

@media (max-width: 1023px) {
    /* --- FR-01: Viewport height stabilization --- */
    html, body {
        height: 100%;
        overflow-x: hidden;
    }

    /* --- FR-01, FR-02: Root element fixes --- */
    #root {
        height: 100% !important;
        min-height: 100vh !important;
        padding: 0 !important;
    }

    /* --- FR-03: Session item tap target enlargement --- */
    .group\/session {
        min-height: 4rem !important;          /* 64px, up from 56px */
        padding-top: 0.75rem !important;
        padding-bottom: 0.75rem !important;
    }

    .group\/workspace {
        min-height: 3.5rem !important;        /* 56px */
        padding-top: 0.625rem !important;
        padding-bottom: 0.625rem !important;
    }

    /* --- FR-03: Action buttons always visible on mobile (override hover) --- */
    .group\/session .opacity-0,
    .group\/workspace .opacity-0,
    .group\/session button.opacity-0,
    .group\/workspace button.opacity-0 {
        opacity: 1 !important;
        pointer-events: auto !important;
    }


    /* --- FR-05: Truncate long session names in header --- */
    /* Target the session title text in the top bar */
    .flex.items-center.gap-3.min-w-0 h1,
    .flex.items-center.gap-3.min-w-0 span[class*="truncate"],
    h1.text-lg {
        max-width: 60vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--font-size-base, 14px) !important;
    }

    /* --- FR-04: Bottom navigation bar styles --- */
    #ocm-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        display: flex;
        justify-content: space-around;
        align-items: center;
        height: 3.5rem;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: var(--color-surface-base, #ffffff);
        border-top: 1px solid var(--color-border-weak-base, #e5e5e5);
        box-sizing: border-box;
    }

    #ocm-bottom-nav button {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
        height: 100%;
        border: none;
        background: transparent;
        color: var(--color-text-weak-base, #888888);
        font-family: var(--font-family-sans, system-ui, -apple-system, sans-serif);
        font-size: var(--font-size-small, 11px);
        line-height: 1;
        cursor: pointer;
        pointer-events: auto !important;
        touch-action: manipulation;
        padding: 2px 0 0 0;
        -webkit-tap-highlight-color: transparent;
        transition: color 0.15s ease;
    }

    #ocm-bottom-nav button svg {
        width: 1.25rem;
        height: 1.25rem;
        margin-bottom: 1px;
        stroke: currentColor;
        pointer-events: none !important;
    }

    #ocm-bottom-nav button.ocm-active {
        color: var(--color-accent-base, #0066cc);
    }

    /* --- FR-05: File chips container --- */
    #ocm-file-chips {
        display: none;                         /* hidden until files detected */
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        gap: 6px;
        padding: 6px 8px;
        background: var(--color-background-base, #f8f8f8);
        border-bottom: 1px solid var(--color-border-weak-base, #e5e5e5);
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }
    #ocm-file-chips::-webkit-scrollbar {
        display: none;
    }

    #ocm-file-chips .ocm-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 9999px;
        background: var(--color-surface-base, #ffffff);
        border: 1px solid var(--color-border-weak-base, #dddddd);
        font-family: var(--font-family-sans, system-ui, sans-serif);
        font-size: var(--font-size-small, 12px);
        color: var(--color-text-base, #333333);
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        text-overflow: ellipsis;
        overflow: hidden;
        max-width: 150px;
    }

    #ocm-file-chips .ocm-chip.ocm-active {
        background: var(--color-accent-base, #0066cc);
        color: #ffffff;
        border-color: var(--color-accent-base, #0066cc);
    }

    #ocm-file-chips .ocm-chip .ocm-chip-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: inherit;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 2px;
        flex-shrink: 0;
        opacity: 0.5;
    }
    #ocm-file-chips .ocm-chip .ocm-chip-close:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.2);
    }

    /* --- FR-08: Safe area insets for notched devices --- */
    #root {
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-left: env(safe-area-inset-left, 0px) !important;
        padding-right: env(safe-area-inset-right, 0px) !important;
        padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px)) !important;
    }

}

/* Desktop: hide mobile-only elements */
@media (min-width: 1024px) {
    #ocm-bottom-nav,
    #ocm-file-chips {
        display: none !important;
    }
}
`;

    function injectCSS() {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(CSS);
        } else if (document.head) {
            const style = document.createElement('style');
            style.id = 'ocm-styles';
            style.textContent = CSS;
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                const style = document.createElement('style');
                style.id = 'ocm-styles';
                style.textContent = CSS;
                document.head.appendChild(style);
            });
        }
    }

    // ================================================================
    // SECTION 3: DOM Manipulation — Bottom Navigation Bar
    // ================================================================

    function createBottomNav() {
        if (document.getElementById('ocm-bottom-nav')) return;
        if (!document.getElementById('root')) {
            setTimeout(createBottomNav, 200);
            return;
        }

        const root = document.getElementById('root');

        const nav = document.createElement('nav');
        nav.id = 'ocm-bottom-nav';

        const sessionSVG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
        const editorSVG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
        const settingsSVG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

        function setNavActive(activeBtn) {
            nav.querySelectorAll('button').forEach(function (b) {
                b.classList.remove('ocm-active');
            });
            activeBtn.classList.add('ocm-active');
        }

        // Sessions button
        const sessionBtn = document.createElement('button');
        sessionBtn.id = 'ocm-nav-sessions';
        sessionBtn.title = 'Sessions';
        sessionBtn.setAttribute('aria-label', 'Open session list');
        sessionBtn.innerHTML = sessionSVG + '<span>Sessions</span>';
        sessionBtn.onclick = function () {
            const menuBtn = document.querySelector('[data-component="icon-button"][data-icon="menu"]')
                         || document.querySelector('button[aria-label="Toggle menu"]');
            if (!menuBtn) { setNavActive(this); return; }
            const menuExpanded = menuBtn.getAttribute('aria-expanded');
            if (menuExpanded !== 'true') {
                menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
            setNavActive(this);
            log('nav: sessions clicked');
        };

        // Editor button
        const editorBtn = document.createElement('button');
        editorBtn.id = 'ocm-nav-editor';
        editorBtn.title = 'Editor';
        editorBtn.setAttribute('aria-label', 'Go to editor');
        editorBtn.className = 'ocm-active';
        editorBtn.innerHTML = editorSVG + '<span>Editor</span>';
        editorBtn.onclick = function () {
            const menuBtn = document.querySelector('[data-component="icon-button"][data-icon="menu"]')
                         || document.querySelector('button[aria-label="Toggle menu"]');
            const menuExpanded = menuBtn ? menuBtn.getAttribute('aria-expanded') : null;
            if (menuExpanded === 'true' && menuBtn) {
                menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }

            const promptInput = document.querySelector('[data-component="prompt-input"]') ||
                                document.querySelector('[role="textbox"][contenteditable="true"]');
            if (promptInput) promptInput.focus();
            setNavActive(this);
            log('nav: editor clicked (focus prompt)');
        };

        // Settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'ocm-nav-settings';
        settingsBtn.title = 'Settings';
        settingsBtn.setAttribute('aria-label', 'Open settings');
        settingsBtn.innerHTML = settingsSVG + '<span>Settings</span>';
        settingsBtn.onclick = function () {
            const trigger = document.querySelector('[data-component="icon-button"][data-icon="settings-gear"]')
                         || document.querySelector('button[aria-label="Settings"]');
            if (trigger) trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            setNavActive(this);
            log('nav: settings clicked');
        };

        nav.appendChild(sessionBtn);
        nav.appendChild(editorBtn);
        nav.appendChild(settingsBtn);
        document.body.appendChild(nav);

        log('nav created with inline onclick handlers');
    }

    // ================================================================
    // SECTION 4: DOM Manipulation — File Chips
    // ================================================================

    function ensureFileChipsContainer() {
        if (document.getElementById('ocm-file-chips')) return;
        if (!document.getElementById('root')) return;

        const chips = document.createElement('div');
        chips.id = 'ocm-file-chips';

        const root = document.getElementById('root');
        if (!root) return;

        // Try to insert at top of main content area
        const mainArea = root.querySelector('.size-full, .overflow-x-hidden');
        if (mainArea) {
            mainArea.insertBefore(chips, mainArea.firstChild);
        }
    }

    function refreshFileChips() {
        if (!isMobile()) return;
        const container = document.getElementById('ocm-file-chips');
        if (!container) return;

        // Scan for file tab indicators: elements with role="tab" or known data attributes
        const tabSelectors = [
            '[role="tab"]',
            '[data-tab]',
            '[data-file-tab]',
            '.file-tab',
            '[aria-selected]',
            '[data-active-tab]'
        ];

        let tabs = [];
        for (const sel of tabSelectors) {
            const found = document.querySelectorAll(sel);
            if (found.length > 0) {
                tabs = Array.from(found);
                break;
            }
        }

        if (tabs.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'flex';
        // Avoid re-rendering identical content
        const currentText = Array.from(container.querySelectorAll('.ocm-chip')).map(c => c.textContent).join('|');
        const newText = tabs.map(t => t.textContent.trim()).join('|');
        if (currentText === newText) return;

        container.innerHTML = '';

        tabs.forEach((tab) => {
            const name = (tab.textContent || '').trim().slice(0, 30) || 'untitled';
            const isActive = tab.classList.contains('active') ||
                             tab.getAttribute('aria-selected') === 'true' ||
                             tab.getAttribute('data-active') === 'true' ||
                             tab.getAttribute('data-active-tab') === 'true';

            const chip = document.createElement('span');
            chip.className = 'ocm-chip' + (isActive ? ' ocm-active' : '');
            chip.textContent = name;
            chip.title = name;

            if (isActive) {
                const scrollToChip = () => {
                    if (chip.isConnected) {
                        chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                };
                setTimeout(scrollToChip, 150);
            }

            chip.addEventListener('click', () => tab.click());

            const closeBtn = document.createElement('button');
            closeBtn.className = 'ocm-chip-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = 'Close ' + name;
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Try to find the close button within the tab element
                const innerClose = tab.querySelector('[data-close], .close-btn, button[aria-label*="close" i], button[aria-label*="Close" i], [class*="close"]');
                if (innerClose) {
                    innerClose.click();
                }
                // Refresh after a short delay to let React update the DOM
                setTimeout(refreshFileChips, 200);
            });
            chip.appendChild(closeBtn);

            container.appendChild(chip);
        });
    }

    // ================================================================
    // SECTION 5: DOM Manipulation — Auto-Scroll to Active Session
    // ================================================================

    function scrollToActiveSession() {
        if (!isMobile()) return;

        // Look for active session in sidebar panel
        const activeSession = document.querySelector(
            '.group\\/session[data-active], ' +
            '.group\\/session.active, ' +
            '.group\\/session[aria-current="page"], ' +
            '.group\\/session[aria-current="true"]'
        );

        if (activeSession && activeSession.isConnected) {
            activeSession.scrollIntoView({ behavior: 'smooth', block: 'center' });
            log('Auto-scrolled to active session');
        }
    }

    // ================================================================
    // SECTION 6: DOM Manipulation — Swipe Gesture Support
    // ================================================================

    function setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let tracking = false;

        document.addEventListener('touchstart', (e) => {
            if (!isMobile()) return;
            if (e.touches.length !== 1) { tracking = false; return; }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            tracking = true;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!tracking || !isMobile()) return;
            if (e.touches.length === 1) {
                currentX = e.touches[0].clientX;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!tracking || !isMobile()) return;
            tracking = false;

            const deltaX = currentX - startX;
            const deltaY = Math.abs((e.changedTouches[0] || {}).clientY - startY || 0);
            const threshold = window.innerWidth * 0.3;

            // Ignore vertical swipes or too-short horizontal swipes
            if (Math.abs(deltaX) < deltaY) return;
            if (Math.abs(deltaX) < threshold) return;

            const sidebarPanel = document.querySelector(
                '[class*="fixed"][class*="top-10"][class*="bottom-0"][class*="left-0"][class*="z-50"]'
            );
            if (!sidebarPanel) return;

            const isOpen = sidebarPanel.classList.contains('translate-x-0');
            const isClosed = sidebarPanel.classList.contains('-translate-x-full');

            if (deltaX > 0 && (isClosed || !isOpen) && startX < 40) {
                const menuBtn = document.querySelector('[data-component="icon-button"][data-icon="menu"]')
                             || document.querySelector('button[aria-label="Toggle menu"]');
                if (menuBtn) {
                    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    log('Swipe: opening sidebar');
                }
            } else if (deltaX < 0 && isOpen) {
                const menuBtn = document.querySelector('[data-component="icon-button"][data-icon="menu"]')
                             || document.querySelector('button[aria-label="Toggle menu"]');
                if (menuBtn) {
                    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    log('Swipe: closing sidebar via toggle');
                }
            }

            currentX = 0;
        });
    }

    // ================================================================
    // SECTION 7: DOM Observer (MutationObserver)
    // ================================================================

    let observerTimer = null;

    function setupObserver() {
        if (!document.body) {
            // Retry: body may not exist yet at document-start
            const checkBody = setInterval(() => {
                if (document.body) {
                    clearInterval(checkBody);
                    setupObserver();
                }
            }, 50);
            return;
        }

        const observer = new MutationObserver(() => {
            if (!isMobile()) return;
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                ensureFileChipsContainer();
                refreshFileChips();
                scrollToActiveSession();
            }, 250);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-active', 'aria-current', 'aria-selected', 'data-active-tab']
        });
    }

    // ================================================================
    // SECTION 8: Resize Handler (mobile ↔ desktop transitions)
    // ================================================================

    let wasMobile = isMobile();

    window.addEventListener('resize', () => {
        const nowMobile = isMobile();
        if (nowMobile === wasMobile) return;
        wasMobile = nowMobile;

        if (nowMobile) {
            // Switched to mobile
            createBottomNav();
            ensureFileChipsContainer();
            refreshFileChips();
            scrollToActiveSession();
        } else {
            // Switched to desktop — remove injected elements
            const nav = document.getElementById('ocm-bottom-nav');
            const chips = document.getElementById('ocm-file-chips');
            if (nav) nav.remove();
            if (chips) chips.remove();
            // #root の下部パディングをリセット
            const rootEl = document.getElementById('root');
            if (rootEl) rootEl.style.paddingBottom = '';
        }
    });

    // ================================================================
    // SECTION 9: Initialization
    // ================================================================

    function init() {
        injectCSS();
        setupSwipeGestures();

        // Wait for DOM readiness
        function onReady() {
            setupObserver();
            createBottomNav();
            ensureFileChipsContainer();

            // Delayed initial refresh to let React render
            setTimeout(() => {
                if (isMobile()) {
                    refreshFileChips();
                    scrollToActiveSession();
                }
            }, 1200);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    init();
})();
