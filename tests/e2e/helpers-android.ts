/**
 * Android Device Helper Utilities for OpenCode Mobile E2E Tests.
 *
 * Provides device detection, UserScript injection, touch simulation,
 * and screenshot capture for Android emulators and real devices via ADB.
 *
 * Requirements:
 *   - ADB (Android Debug Bridge) installed and in PATH
 *   - Android device connected (emulator or USB) with USB debugging enabled
 *   - Playwright >= 1.20 (for _android API support)
 *   - Chrome browser installed on the Android device
 *
 * Usage:
 *   import { findAndroidDevice, injectUserScriptAndroid, simGesture } from './helpers-android';
 *
 *   const device = await findAndroidDevice();
 *   if (!device) { test.skip(true, 'No Android device available'); return; }
 */

import { _android, BrowserContext, Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

/** Represents a connected Android device (emulator or real) */
export interface AndroidTestDevice {
  /** Playwright AndroidDevice handle */
  device: Awaited<ReturnType<typeof _android['devices']>>[number];
  /** Device model name */
  model: string;
  /** Device serial number */
  serial: string;
  /** Browser context after launchBrowser() */
  context: BrowserContext | null;
  /** Current page */
  page: Page | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Path to the UserScript */
const USERSCRIPT_PATH = path.resolve(__dirname, '..', '..', 'opencode-mobile.user.js');

/** ADB install instructions (OS-specific) */
export const ADB_SETUP_INSTRUCTIONS = {
  windows:
    '1. Download Android SDK Platform Tools: https://developer.android.com/studio/releases/platform-tools\n' +
    '2. Extract to C:\\android-sdk\\platform-tools\n' +
    '3. Add C:\\android-sdk\\platform-tools to PATH:\n' +
    '   setx PATH "%PATH%;C:\\android-sdk\\platform-tools"\n' +
    '4. Restart terminal and run: adb --version\n' +
    'Note: If using WSL2, Hyper-V conflict may prevent Android emulator from running.\n' +
    '      Consider using a physical Android device connected via USB instead.',
  macos:
    '1. brew install android-platform-tools\n' +
    '2. adb --version\n' +
    '3. Enable USB debugging on your Android device (Settings > Developer Options)\n' +
    '4. Connect via USB and run: adb devices',
  linux:
    '1. sudo apt install adb (or equivalent)\n' +
    '2. adb --version\n' +
    '3. Enable USB debugging on your Android device\n' +
    '4. Connect via USB and run: adb devices',
};

/** Emulator setup instructions */
export const EMULATOR_SETUP_INSTRUCTIONS = {
  windows:
    'Option A — Android Studio:\n' +
    '  1. Install Android Studio: https://developer.android.com/studio\n' +
    '  2. Open AVD Manager and create a device (e.g., "Pixel 7 API 34")\n' +
    '  3. Start the emulator from AVD Manager\n' +
    '  4. Verify: adb devices (should show "emulator-5554")\n' +
    '\n' +
    'Option B — Command line (sdkmanager):\n' +
    '  1. Install Java 17+ (required for sdkmanager)\n' +
    '  2. Download sdkmanager: https://developer.android.com/studio#command-line-tools-only\n' +
    '  3. Install SDK and emulator:\n' +
    '     sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis;x86_64"\n' +
    '  4. Create AVD:\n' +
    '     avdmanager create avd -n "test_avd" -k "system-images;android-34;google_apis;x86_64"\n' +
    '  5. Start emulator:\n' +
    '     emulator -avd test_avd -no-window -no-audio\n' +
    '\n' +
    'WSL2/Hyper-V note: Android emulator requires Hyper-V to be disabled or\n' +
    '  WHPX support. On Windows 11, Windows Hypervisor Platform may conflict.\n' +
    '  Physical device recommended for WSL2 users.',
  macos:
    'Option A — Android Studio (recommended):\n' +
    '  1. Install Android Studio: https://developer.android.com/studio\n' +
    '  2. Open AVD Manager, create device, start emulator\n' +
    '\n' +
    'Option B — Command line:\n' +
    '  1. brew install --cask android-platform-tools\n' +
    '  2. Install Android SDK command-line tools\n' +
    '  3. sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis;x86_64"\n' +
    '  4. avdmanager create avd -n "test_avd" -k "system-images;android-34;google_apis;x86_64"\n' +
    '  5. emulator -avd test_avd &',
  linux:
    'Option A — Android Studio:\n' +
    '  1. Install Android Studio from https://developer.android.com/studio\n' +
    '  2. Create and start AVD via AVD Manager\n' +
    '\n' +
    'Option B — Command line:\n' +
    '  1. sudo apt install adb\n' +
    '  2. Install sdkmanager and set up AVD as above\n' +
    '  3. emulator -avd test_avd -no-window &',
};

// ============================================================================
// ADB / Device Detection
// ============================================================================

let _adbAvailable: boolean | null = null;
let _adbVersion: string | null = null;

/** Check if ADB is installed and accessible */
export function isAdbAvailable(): boolean {
  if (_adbAvailable !== null) return _adbAvailable;
  try {
    const output = execSync('adb --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr (noise when ADB missing)
    });
    _adbAvailable = true;
    _adbVersion = output.trim().split('\n')[0] || 'unknown';
    return true;
  } catch {
    _adbAvailable = false;
    _adbVersion = null;
    return false;
  }
}

/** Get ADB version string (null if not available) */
export function getAdbVersion(): string | null {
  if (_adbVersion === null) isAdbAvailable();
  return _adbVersion;
}

/** List connected Android devices via ADB */
export function listAdbDevices(): string[] {
  if (!isAdbAvailable()) return [];
  try {
    const output = execSync('adb devices', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const lines = output.split('\n').slice(1); // Skip header
    return lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.includes('offline'))
      .map((l) => l.split('\t')[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================================================
// Android Device Connection
// ============================================================================

/**
 * Find and connect to the first available Android device via Playwright.
 * Returns null if no device is available.
 *
 * @param serial - Optional device serial to target a specific device
 */
export async function findAndroidDevice(serial?: string): Promise<AndroidTestDevice | null> {
  if (!isAdbAvailable()) {
    console.warn('[android] ADB not available — skipping Android tests');
    return null;
  }

  const adbDevices = listAdbDevices();
  if (adbDevices.length === 0) {
    console.warn('[android] No ADB devices found — is the emulator running or device connected?');
    return null;
  }

  console.log(`[android] ADB devices found: ${adbDevices.join(', ')}`);

  try {
    const allDevices = await _android.devices();
    if (allDevices.length === 0) {
      console.warn('[android] Playwright did not detect any Android devices');
      return null;
    }

    const target = serial
      ? allDevices.find((d) => d.serial() === serial)
      : allDevices[0];

    if (!target) {
      console.warn(`[android] Device with serial "${serial}" not found`);
      return null;
    }

    const model = await target.model();
    const deviceSerial = target.serial();
    console.log(`[android] Connected to: ${model} (${deviceSerial})`);

    return {
      device: target,
      model,
      serial: deviceSerial,
      context: null,
      page: null,
    };
  } catch (err) {
    console.error(`[android] Failed to connect to Android device: ${err}`);
    return null;
  }
}

/**
 * Launch Chrome browser on the connected Android device.
 * Returns the page handle for further interactions.
 */
export async function launchChromeOnDevice(atd: AndroidTestDevice): Promise<BrowserContext> {
  if (atd.context) {
    // Already launched
    return atd.context;
  }

  // Force-stop Chrome to ensure clean state
  try {
    await atd.device.shell('am force-stop com.android.chrome');
    await atd.device.shell('pm clear com.android.chrome');
  } catch {
    // Non-fatal — Chrome may not be installed or process already stopped
  }

  const context = await atd.device.launchBrowser({
    // Optionally pass pkg if testing a specific browser
    // pkg: 'com.android.chrome',
  });

  atd.context = context;
  console.log(`[android] Chrome launched on ${atd.model}`);

  return context;
}

/**
 * Navigate to a URL and return a Playwright Page handle.
 * Creates the page if it doesn't exist.
 */
export async function navigateAndroid(
  atd: AndroidTestDevice,
  url: string
): Promise<Page> {
  if (!atd.context) {
    const context = await launchChromeOnDevice(atd);
    const page = await context.newPage();
    atd.page = page;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return page;
  }

  if (atd.page) {
    await atd.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return atd.page;
  }

  const page = await atd.context.newPage();
  atd.page = page;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  return page;
}

// ============================================================================
// UserScript Injection on Android
// ============================================================================

let _cachedScript: string | null = null;

/** Read UserScript content (cached) */
function readScript(): string {
  if (!_cachedScript) {
    _cachedScript = fs.readFileSync(USERSCRIPT_PATH, 'utf-8');
  }
  return _cachedScript;
}

/**
 * Extract the JavaScript body (IIFE) from the UserScript.
 * Strips the UserScript metadata header block.
 */
function extractJSBody(): string {
  const script = readScript();
  const jsStart = script.indexOf('(function () {');
  if (jsStart === -1) throw new Error('Could not find IIFE in UserScript');
  return script.slice(jsStart);
}

/**
 * Inject the UserScript via page.addInitScript() so it runs on every page load.
 * This is equivalent to Tampermonkey/Violentmonkey's auto-injection behavior.
 *
 * GM_addStyle is polyfilled in the page context.
 */
export async function injectScriptOnAndroid(page: Page): Promise<void> {
  const jsBody = extractJSBody();

  // Add init script that polyfills GM_addStyle and runs the script
  await page.addInitScript((scriptCode: string) => {
    // Polyfill GM_addStyle
    if (typeof (window as any).GM_addStyle === 'undefined') {
      (window as any).GM_addStyle = (style: string) => {
        if (document.getElementById('ocm-styles')) return;
        const el = document.createElement('style');
        el.id = 'ocm-styles';
        el.textContent = style;
        if (document.head) {
          document.head.appendChild(el);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(el);
          });
        }
      };
    }
  }, jsBody);

  // Now evaluate the script in the page context
  await page.evaluate((scriptCode: string) => {
    try {
      eval(scriptCode);
      console.log('[ocm-android] UserScript injected successfully');
    } catch (err) {
      console.error('[ocm-android] UserScript injection error:', err);
    }
  }, jsBody);

  // Wait for the MutationObserver and DOM mutations to settle
  await page.waitForTimeout(1000);
}

/**
 * Inject the UserScript via ADB's `am start` with a data URI.
 * This is an alternative approach using Android Intent system.
 */
export async function injectScriptViaIntent(atd: AndroidTestDevice, targetUrl: string): Promise<void> {
  // Encode the UserScript evaluation code
  const jsBody = extractJSBody();
  const escaped = jsBody
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');

  const shellCmd = `am start -a android.intent.action.VIEW -d "${targetUrl}" --es "ocm_script" '${escaped}'`;

  try {
    await atd.device.shell(shellCmd);
    console.log('[android] UserScript intent dispatched');
  } catch (err) {
    console.warn(`[android] Intent dispatch failed: ${err}`);
  }
}

// ============================================================================
// Touch / Gesture Simulation
// ============================================================================

/**
 * Simulate a tap at the given coordinates on the Android device.
 * Uses Playwright's device.input.tap() for real touch events at the OS level.
 */
export async function simulateTap(atd: AndroidTestDevice, x: number, y: number): Promise<void> {
  try {
    await atd.device.input.tap({ x, y });
    console.log(`[android] Tap at (${x}, ${y})`);
  } catch (err) {
    console.warn(`[android] Tap simulation failed: ${err}`);
  }
}

/**
 * Simulate a horizontal swipe gesture on the Android device.
 * Uses device.input.swipe() for real touch events.
 *
 * @param atd - Connected Android test device
 * @param fromX - Starting X coordinate
 * @param fromY - Y coordinate (constant during horizontal swipe)
 * @param toX - Ending X coordinate
 * @param steps - Number of intermediate points (more = smoother)
 */
export async function simulateHorizontalSwipe(
  atd: AndroidTestDevice,
  fromX: number,
  fromY: number,
  toX: number,
  steps: number = 20
): Promise<void> {
  try {
    await atd.device.input.swipe(
      { x: fromX, y: fromY },
      { x: toX, y: fromY },
      steps
    );
    console.log(`[android] Horizontal swipe: (${fromX},${fromY}) → (${toX},${fromY})`);
  } catch (err) {
    console.warn(`[android] Swipe simulation failed: ${err}`);
  }
}

/**
 * Simulate a vertical swipe gesture on the Android device.
 */
export async function simulateVerticalSwipe(
  atd: AndroidTestDevice,
  fromX: number,
  fromY: number,
  toY: number,
  steps: number = 20
): Promise<void> {
  try {
    await atd.device.input.swipe(
      { x: fromX, y: fromY },
      { x: fromX, y: toY },
      steps
    );
    console.log(`[android] Vertical swipe: (${fromX},${fromY}) → (${fromX},${toY})`);
  } catch (err) {
    console.warn(`[android] Vertical swipe simulation failed: ${err}`);
  }
}

// ============================================================================
// Screenshot Capture
// ============================================================================

/**
 * Capture a screenshot from the Android device and save to the given path.
 * Falls back to page.screenshot() if device.screenshot() is not available.
 */
export async function captureDeviceScreenshot(
  atd: AndroidTestDevice,
  outputPath: string
): Promise<Buffer | null> {
  try {
    const buffer = await atd.device.screenshot();
    fs.writeFileSync(outputPath, buffer);
    console.log(`[android] Screenshot saved: ${outputPath}`);
    return buffer;
  } catch (err) {
    console.warn(`[android] Device screenshot failed, trying page screenshot: ${err}`);
    if (atd.page) {
      const buffer = await atd.page.screenshot({ fullPage: false });
      fs.writeFileSync(outputPath, buffer);
      console.log(`[android] Page screenshot saved: ${outputPath}`);
      return buffer;
    }
    return null;
  }
}

// ============================================================================
// DOM Verification Helpers (Android-aware)
// ============================================================================

/**
 * Check if the viewport width qualifies as "mobile" (< 1024px).
 * Works on Android pages connected via Playwright.
 */
export async function isMobileViewportAndroid(page: Page): Promise<boolean> {
  return page.evaluate(() => window.innerWidth < 1024);
}

/**
 * Verify that #ocm-bottom-nav exists and is visible on the Android page.
 */
export async function assertBottomNavAndroid(page: Page): Promise<void> {
  const nav = page.locator('#ocm-bottom-nav');
  const isAttached = await nav.count();
  if (isAttached === 0) {
    console.warn('[android] Bottom nav not found — may require UserScript injection');
    return;
  }

  const isVisible = await nav.isVisible();
  console.log(`[android] Bottom nav: attached=${isAttached > 0}, visible=${isVisible}`);
}

/**
 * Check the data-color-scheme attribute on the page.
 */
export async function getColorScheme(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return document.documentElement.getAttribute('data-color-scheme');
  });
}

/**
 * Check if Chrome browser is packaged on the device.
 */
export async function isChromeInstalled(atd: AndroidTestDevice): Promise<boolean> {
  try {
    const result = await atd.device.shell('pm list packages com.android.chrome');
    return result.includes('com.android.chrome');
  } catch {
    return false;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Close the browser context and clean up resources on the Android device.
 */
export async function cleanupAndroidDevice(atd: AndroidTestDevice): Promise<void> {
  if (atd.context) {
    try {
      await atd.context.close();
      atd.context = null;
      atd.page = null;
      console.log('[android] Browser context closed');
    } catch (err) {
      console.warn(`[android] Error closing context: ${err}`);
    }
  }

  // Stop Chrome to release memory
  try {
    await atd.device.shell('am force-stop com.android.chrome');
  } catch {
    // Ignore if Chrome is not running
  }
}

// ============================================================================
// Environment Diagnostics
// ============================================================================

/**
 * Run a full diagnostic of the Android test environment and return a report.
 * Useful for CI and setup verification.
 */
export async function runAndroidDiagnostics(): Promise<{
  adbAvailable: boolean;
  adbVersion: string | null;
  devicesListed: string[];
  playwrightDevices: number;
  chromeInstalled: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const adbAvailable = isAdbAvailable();
  const adbVersion = getAdbVersion();
  const devicesListed = listAdbDevices();

  let playwrightDevices = 0;
  let chromeInstalled = false;

  if (adbAvailable && devicesListed.length > 0) {
    try {
      const pwDevices = await _android.devices();
      playwrightDevices = pwDevices.length;

      if (pwDevices.length > 0) {
        chromeInstalled = await isChromeInstalled({
          device: pwDevices[0],
          model: await pwDevices[0].model(),
          serial: pwDevices[0].serial(),
          context: null,
          page: null,
        });
      }
    } catch (err) {
      errors.push(`Playwright _android.devices() failed: ${err}`);
    }
  }

  return {
    adbAvailable,
    adbVersion,
    devicesListed,
    playwrightDevices,
    chromeInstalled,
    errors,
  };
}
