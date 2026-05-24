/**
 * Selector Validation Test for OpenCode Mobile UserScript
 *
 * Validates that key CSS/JS selectors in the UserScript target
 * real elements in the OpenCode v1.14.33 source code.
 *
 * Usage: node test/selector-validate.js
 */

const fs = require("fs");
const path = require("path");

const OPENCODE_SRC =
  process.env.OPENCODE_SRC ||
  "C:\\Users\\nakam\\AppData\\Local\\Temp\\opencode\\packages\\app\\src";
const USERSCRIPT_PATH = path.join(__dirname, "..", "opencode-mobile.user.js");

let passed = 0;
let failed = 0;

function log(level, msg) {
  const prefix = { pass: "PASS", fail: "FAIL" }[level] || "INFO";
  console.log(`[${prefix}] ${msg}`);
}

function readAllSourceFiles(dir) {
  const files = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) walk(fullPath);
      } else if (entry.isFile() && /\.(tsx?|jsx?|html|css)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function searchAll(content, searchTerm) {
  return content.includes(searchTerm);
}

function validateSelector(label, searchTerm, sourceFiles) {
  let found = false;
  let foundIn = "";

  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      if (searchAll(content, searchTerm)) {
        found = true;
        foundIn = path.relative(OPENCODE_SRC, file);
        break;
      }
    } catch (_) {
      // skip unreadable
    }
  }

  if (found) {
    passed++;
    log("pass", `${label} → "${searchTerm}" found in ${foundIn}`);
  } else {
    failed++;
    log("fail", `${label} → "${searchTerm}" NOT FOUND in source`);
  }
}

function main() {
  console.log("=".repeat(60));
  console.log("Selector Validation Test for OpenCode Mobile UserScript");
  console.log("=".repeat(60));

  if (!fs.existsSync(OPENCODE_SRC)) {
    console.log(`[WARN] OpenCode source not found: ${OPENCODE_SRC}`);
    console.log("[WARN] Set OPENCODE_SRC env var or pass --opencode-src <path>");
    console.log("[WARN] Skipping validation.");
    return;
  }

  const sourceFiles = readAllSourceFiles(OPENCODE_SRC);
  console.log(`[INFO] OpenCode source: ${OPENCODE_SRC}`);
  console.log(`[INFO] Source files: ${sourceFiles.length}\n`);

  // --- Key selectors that MUST exist in OpenCode source ---

  console.log("--- Button Selectors ---");
  validateSelector(
    'Sessions: button[aria-label="Toggle menu"]',
    "Toggle menu",
    sourceFiles
  );
  validateSelector(
    "Editor: [data-component=\"prompt-input\"]",
    "data-component=\"prompt-input\"",
    sourceFiles
  );
  validateSelector(
    'Settings: button[aria-label="Settings"]',
    'aria-label={props.settingsLabel()}',
    sourceFiles
  );

  console.log("\n--- Sidebar/Session Selectors ---");
  validateSelector(
    "Session items: group/session class",
    "group/session",
    sourceFiles
  );
  validateSelector(
    "Workspace items: group/workspace class",
    "group/workspace",
    sourceFiles
  );

  console.log("\n--- Mobile Sidebar Panel Selectors ---");
  validateSelector(
    "Sidebar panel: fixed position",
    "fixed top-10 bottom-0 left-0 z-50",
    sourceFiles
  );
  validateSelector(
    "Sidebar translate: translate-x-0",
    "translate-x-0",
    sourceFiles
  );
  validateSelector(
    "Sidebar translate: -translate-x-full",
    "-translate-x-full",
    sourceFiles
  );

  console.log("\n--- Editor/Content Selectors ---");
  validateSelector(
    "Editor: contenteditable=true",
    'contenteditable="true"',
    sourceFiles
  );

  console.log("\n--- Swipe Gesture Selectors ---");
  validateSelector(
    "Swipe: aria-expanded on menu button",
    "aria-expanded={layout.mobileSidebar.opened()}",
    sourceFiles
  );

  console.log("\n--- CSS Variables (design tokens with fallbacks) ---");
  console.log("[INFO] CSS variables (--color-*-base) use fallback values.");
  console.log("[INFO] They adapt if OpenCode defines them, use #hex fallback otherwise.");
  console.log("[INFO] This is intentional — no exact source match needed.");

  // --- Summary ---
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\n[FAIL] Some selectors may not match OpenCode source.");
    console.log("[INFO] If selectors changed in OpenCode, update opencode-mobile.user.js");
    process.exitCode = 1;
  } else {
    console.log("\n[PASS] All key selectors verified against OpenCode v1.14.33 source.");
  }
}

main();
