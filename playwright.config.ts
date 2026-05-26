import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for OpenCode Mobile UserScript E2E tests.
 *
 * Target:      opencode-mobile.user.js
 * Base URL:    http://localhost:4000 (overridable via BASE_URL env)
 * Test dir:    ./tests/e2e/
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

export default defineConfig({
  testDir: './tests/e2e',
  // Android tests (mobile-android-emulator.spec.ts) require ADB and will
  // auto-skip when no Android device is available. Run with:
  //   npm run test:e2e:android
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Inject UserScript CSS/JS from the project root
  },

  // Use Chromium for ALL projects (we only install chromium, not webkit/firefox).
  // iOS device presets default to WebKit, so we override browserName everywhere.
  projects: [
    {
      name: 'iPhone SE',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        userAgent: devices['iPhone SE'].userAgent,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iPhone 14 Pro',
      use: {
        browserName: 'chromium',
        viewport: { width: 393, height: 852 },
        userAgent: devices['iPhone 14 Pro'].userAgent,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Pixel 7',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        userAgent: devices['Pixel 7'].userAgent,
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iPad Mini',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        userAgent: devices['iPad Mini'].userAgent,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Desktop (regression)',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },

    // ==========================================================================
    // Android Emulator / Real Device (ADB required)
    //
    // This project runs Android-specific tests using Playwright's _android API.
    // It connects to a real Android device or emulator via ADB.
    //
    // Prerequisites:
    //   - ADB installed and in PATH
    //   - Android device/emulator connected (verified via `adb devices`)
    //   - Chrome browser installed on the device
    //
    // Tests auto-skip if no Android device is detected.
    //
    // Run separately:
    //   npx playwright test tests/e2e/mobile-android-emulator.spec.ts
    // or:
    //   npm run test:e2e:android
    // ==========================================================================
    {
      name: 'Android Emulator',
      use: {
        browserName: 'chromium', // Fallback for non-Android tests in the file
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        userAgent: devices['Pixel 7'].userAgent,
      },
    },
  ],

  // Web server config — only used when running against the real OpenCode server
  // Not configured automatically since OpenCode may not be available.
  // Set OPENCODE_SERVER_AVAILABLE=true to assume the server is running.
});
