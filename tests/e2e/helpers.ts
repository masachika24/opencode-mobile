/**
 * E2E test helpers for OpenCode Mobile UserScript.
 *
 * Provides utilities for injecting the UserScript into Playwright pages,
 * verifying mobile-specific DOM modifications, and simulating user interactions.
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Constants
// ============================================================================

/** Path to the UserScript relative to project root */
const USERSCRIPT_PATH = path.resolve(__dirname, '..', '..', 'opencode-mobile.user.js');

/** Mobile breakpoint — matches isMobile() in the UserScript */
export const MOBILE_BREAKPOINT = 1024;

/** Mobile viewports under the breakpoint */
export const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 812 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'Pixel 7', width: 412, height: 915 },
];

/** Tablet viewport (under breakpoint but larger) */
export const TABLET_VIEWPORT = { name: 'iPad Mini', width: 768, height: 1024 };

/** Desktop viewport (above breakpoint — regression) */
export const DESKTOP_VIEWPORT = { name: 'Desktop', width: 1280, height: 720 };

// ============================================================================
// UserScript content extraction
// ============================================================================

let _cachedScript: string | null = null;

/** Read the UserScript file content (cached) */
export function readUserScript(): string {
  if (!_cachedScript) {
    _cachedScript = fs.readFileSync(USERSCRIPT_PATH, 'utf-8');
  }
  return _cachedScript;
}

/** Extract the CSS portion from the UserScript */
export function extractCSS(): string {
  const script = readUserScript();
  const match = script.match(/const CSS = String\.raw`([\s\S]*?)`;/);
  if (!match) throw new Error('Could not extract CSS from UserScript');
  return match[1];
}

/** Extract the JavaScript body (excluding UserScript metadata header) */
export function extractJS(): string {
  const script = readUserScript();
  const jsStart = script.indexOf('(function () {');
  if (jsStart === -1) throw new Error('Could not find IIFE in UserScript');
  return script.slice(jsStart);
}

// ============================================================================
// DOM injection helpers
// ============================================================================

/**
 * Inject the UserScript's CSS into the page as a <style> tag with id="ocm-styles".
 * This simulates what the UserScript does via GM_addStyle / document.createElement('style').
 */
export async function injectCSS(page: Page): Promise<void> {
  const css = extractCSS();
  // Use page.evaluate to create a style tag with proper id attribute.
  // page.addStyleTag() does not support custom attributes like `id`.
  await page.evaluate((cssContent: string) => {
    // Avoid duplicate injection
    if (document.getElementById('ocm-styles')) return;
    const style = document.createElement('style');
    style.id = 'ocm-styles';
    style.textContent = cssContent;
    document.head.appendChild(style);
  }, css);
}

/**
 * Inject the UserScript's JavaScript into the page via page.evaluate().
 * This runs the IIFE in the page context, triggering all DOM mutations
 * (bottom nav creation, file chips, swipe setup, MutationObserver, etc.).
 *
 * NOTE: GM_addStyle is polyfilled before injection so the CSS path works.
 */
export async function injectUserScript(page: Page): Promise<void> {
  const css = extractCSS();
  const js = extractJS();

  // Polyfill GM_addStyle for pages where it's not natively available.
  // Also ensure document.head exists (setContent may not have it yet).
  await page.evaluate((cssContent: string) => {
    // Polyfill GM_addStyle if not available (e.g., outside Tampermonkey)
    if (typeof (window as any).GM_addStyle === 'undefined') {
      (window as any).GM_addStyle = (style: string) => {
        // Check if already injected to avoid duplicates
        if (document.getElementById('ocm-styles')) return;
        const el = document.createElement('style');
        el.id = 'ocm-styles';
        el.textContent = style;
        document.head.appendChild(el);
      };
    }
    // Ensure document.body exists (may be null on blank pages)
    if (!document.body) {
      const body = document.createElement('body');
      document.documentElement.appendChild(body);
    }
  }, css);

  // Now evaluate the UserScript IIFE
  // We wrap in an IIFE to avoid leaking variables into the test scope
  await page.evaluate((scriptCode: string) => {
    // Execute the UserScript's IIFE
    eval(scriptCode);
  }, js);

  // Give the MutationObserver and timeouts a moment to fire
  await page.waitForTimeout(500);
}

/**
 * Set up a mock OpenCode-like page with essential DOM elements needed for testing.
 * This allows E2E tests to run without a real OpenCode server.
 *
 * @param page - Playwright page
 * @param options.darkMode - Set data-color-scheme="dark" on html
 * @param options.withSessions - Include mock session elements
 * @param options.withSidebar - Include mock sidebar panel
 */
export async function setupMockOpenCodePage(
  page: Page,
  options: { darkMode?: boolean; withSessions?: boolean; withSidebar?: boolean } = {}
): Promise<void> {
  const { darkMode = false, withSessions = true, withSidebar = true } = options;

  const schemeAttr = darkMode ? ' data-color-scheme="dark"' : '';

  let sessionsHTML = '';
  if (withSessions) {
    sessionsHTML = `
    <div style="margin-top: 20px; padding: 8px;">
      <div class="group/session" data-active="true" style="padding:12px;min-height:56px;border:1px solid #ddd;margin:4px 0;">
        Session 1 (Active)
      </div>
      <div class="group/session" style="padding:12px;min-height:56px;border:1px solid #ddd;margin:4px 0;">
        Session 2
      </div>
      <div class="group/session" style="padding:12px;min-height:56px;border:1px solid #ddd;margin:4px 0;">
        Session 3
      </div>
      <div class="group/workspace" style="padding:12px;min-height:56px;border:1px solid #ddd;margin:4px 0;">
        Workspace 1
      </div>
    </div>`;
  }

  let sidebarHTML = '';
  if (withSidebar) {
    sidebarHTML = `
    <div class="fixed top-10 bottom-0 left-0 z-50 -translate-x-full"
         style="position:fixed;top:40px;bottom:0;left:0;width:280px;background:#f0f0f0;z-index:50;transform:translateX(-100%);transition:transform 0.3s;">
      Sidebar Panel
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html${schemeAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenCode Mock Page</title>
</head>
<body>
  <div id="__next" data-reactroot="">
    <header style="height:40px;background:#e0e0e0;display:flex;align-items:center;padding:0 16px;">
      <button aria-label="Toggle menu" data-component="icon-button" data-icon="menu" style="margin-right:8px;">☰</button>
      <button aria-label="Settings" data-component="icon-button" data-icon="settings-gear">⚙</button>
      <span class="flex items-center gap-3 min-w-0" style="margin-left:8px;">
        <h1 class="text-lg">OpenCode Session Title</h1>
      </span>
    </header>
    <div id="root" style="padding:16px;min-height:100vh;background:var(--color-background-base, #ffffff);">
      <div style="padding:20px;">
        <div data-component="prompt-input" role="textbox" contenteditable="true"
             style="border:1px solid #ccc;min-height:100px;padding:12px;border-radius:8px;"
             aria-label="Prompt input">
          Type your prompt here...
        </div>
      </div>
      ${sessionsHTML}
    </div>
    ${sidebarHTML}
  </div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
}

/** Minimum mock page for basic CSS/JS tests (no sessions/sidebar) */
export async function setupMinimalMockPage(page: Page, darkMode = false): Promise<void> {
  const schemeAttr = darkMode ? ' data-color-scheme="dark"' : '';
  const html = `<!DOCTYPE html>
<html${schemeAttr}>
<head><meta charset="utf-8"></head>
<body>
  <div id="root" style="padding: 16px; height: auto;">
    <div>Content</div>
  </div>
</body>
</html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
}

// ============================================================================
// Assertion helpers
// ============================================================================

/**
 * Verify that the bottom navigation bar (#ocm-bottom-nav) exists and is visible.
 * Returns the element handle for further assertions, or null.
 */
export async function assertBottomNavVisible(page: Page): Promise<void> {
  const nav = page.locator('#ocm-bottom-nav');
  await expect(nav).toBeAttached({ timeout: 3000 });
  await expect(nav).toBeVisible();

  // Check the three buttons exist
  await expect(nav.locator('button#ocm-nav-sessions')).toBeAttached();
  await expect(nav.locator('button#ocm-nav-editor')).toBeAttached();
  await expect(nav.locator('button#ocm-nav-settings')).toBeAttached();
}

/** Verify bottom nav is NOT present (desktop mode) */
export async function assertBottomNavHidden(page: Page): Promise<void> {
  const nav = page.locator('#ocm-bottom-nav');
  await expect(nav).not.toBeAttached({ timeout: 3000 });
}

/** Check that #root has no padding (TC-02) */
export async function assertRootNoPadding(page: Page): Promise<void> {
  const root = page.locator('#root');
  const padding = await root.evaluate((el: HTMLElement) => {
    const style = window.getComputedStyle(el);
    return {
      top: style.paddingTop,
      right: style.paddingRight,
      bottom: style.paddingBottom,
      left: style.paddingLeft,
    };
  });
  // On mobile viewports with our CSS injected, padding should be 0px
  // (Note: safe-area-inset may override padding-top/left/right/bottom so we check equality)
  expect(padding.top).toBe('0px');
  expect(padding.right).toBe('0px');
  expect(padding.left).toBe('0px');
  // padding-bottom may be non-zero due to safe-area calculation
}

/** Verify session items meet minimum tap target (TC-03) */
export async function assertSessionTapTarget(page: Page): Promise<void> {
  const sessions = page.locator('.group\\/session');
  const count = await sessions.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const minHeight = await sessions.nth(i).evaluate((el: HTMLElement) => {
      return parseFloat(window.getComputedStyle(el).minHeight);
    });
    expect(minHeight).toBeGreaterThanOrEqual(44);
  }
}

/** Get the count of console errors matching a pattern (TC-09) */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

/** Toggle dark mode by setting data-color-scheme on html (TC-07) */
export async function setDarkMode(page: Page, dark: boolean): Promise<void> {
  if (dark) {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-color-scheme', 'dark');
    });
  } else {
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-color-scheme');
    });
  }
}

/** Check if mobile optimization is active based on viewport width */
export async function isMobileViewport(page: Page): Promise<boolean> {
  return page.evaluate(() => window.innerWidth < 1024);
}

/** Wait for UserScript observer to complete initial processing */
export async function waitForUserScriptInit(page: Page, ms = 1500): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Check if localhost:4000 (OpenCode server) is reachable.
 * Returns true if the server responds.
 */
export async function isOpenCodeServerAvailable(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('http://localhost:4000', {
      timeout: 3000,
    });
    return response.ok();
  } catch {
    return false;
  }
}
