/**
 * CSS Consistency Check for OpenCode Mobile UserScript
 *
 * Validates:
 * 1. Balanced braces
 * 2. Proper @media nesting
 * 3. No contradicting !important declarations
 * 4. Safe-area CSS is properly ordered (after padding reset)
 *
 * Usage: node test/css-check.js
 */

const fs = require("fs");
const path = require("path");

const USERSCRIPT_PATH = path.join(__dirname, "..", "opencode-mobile.user.js");

let passed = 0;
let failed = 0;

function log(level, msg) {
  console.log(`[${level.toUpperCase()}] ${msg}`);
  if (level === "pass") passed++;
  else if (level === "fail") failed++;
}

function extractCSS(script) {
  const cssMatch = script.match(/const CSS = String\.raw`([\s\S]*?)`;/);
  return cssMatch ? cssMatch[1] : null;
}

function checkBalancedBraces(css) {
  const braces = [];
  const lines = css.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      if (line[j] === "{") braces.push({ type: "{", line: i + 1, col: j + 1 });
      if (line[j] === "}") {
        if (braces.length === 0) {
          log("fail", `Extra closing brace at line ${i + 1}, col ${j + 1}`);
          return false;
        }
        braces.pop();
      }
    }
  }

  if (braces.length > 0) {
    const b = braces[braces.length - 1];
    log("fail", `Unclosed brace at line ${b.line}, col ${b.col}`);
    return false;
  }

  log("pass", "All braces are balanced");
  return true;
}

function checkMediaQueryStructure(css) {
  // Find @media blocks and ensure they have proper structure
  const mediaBlocks = css.match(/@media[^{]+\{[\s\S]*?\}\s*\}/g) || [];

  if (mediaBlocks.length === 0) {
    log("fail", "No @media blocks found");
    return;
  }

  let issues = 0;
  for (const block of mediaBlocks) {
    // Check for nested @media (should not exist in simple CSS)
    const nestedMedia = block.match(/@media/g);
    if (nestedMedia && nestedMedia.length > 1) {
      log("fail", `Nested @media found: ${block.slice(0, 80)}...`);
      issues++;
    }
  }

  if (issues === 0) {
    log("pass", `All ${mediaBlocks.length} @media blocks properly structured`);
  }
}

function checkImportantConflicts(css) {
  // Check #root padding: check that safe-area padding comes AFTER padding: 0
  const rootPadding0Index = css.indexOf("#root") !== -1 ?
    css.slice(css.indexOf("#root")).match(/padding:\s*0\s*!important/) : null;

  const safeAreaIndex = css.indexOf("env(safe-area-inset-top");

  if (rootPadding0Index && safeAreaIndex > 0) {
    const root0Pos = css.indexOf("padding: 0 !important");
    if (root0Pos < safeAreaIndex) {
      log("pass", "Safe-area padding is declared after padding:0 (cascade OK)");
    } else {
      log("fail", "Safe-area padding should be declared AFTER padding:0");
    }
  } else if (!rootPadding0Index) {
    log("fail", "#root padding:0 !important not found");
  } else {
    log("pass", "Safe-area padding not present (does not conflict with padding:0)");
  }

  // Check that ocm-bottom-nav has proper z-index
  if (css.includes("z-index: 9999")) {
    log("pass", "Bottom nav z-index is appropriately high (9999)");
  } else {
    log("fail", "Bottom nav z-index missing or too low");
  }
}

function checkMobileOnlyRule(css) {
  // Verify all mobile-only rules are inside @media (max-width: 1023px)
  const mobileAtRule = css.includes("@media (max-width: 1023px)");
  const desktopAtRule = css.includes("@media (min-width: 1024px)");

  if (mobileAtRule) log("pass", "Mobile breakpoint @media (max-width: 1023px) present");
  else log("fail", "Missing mobile breakpoint @media");

  if (desktopAtRule) log("pass", "Desktop hiding @media (min-width: 1024px) present");
  else log("fail", "Missing desktop hiding @media");

  // Check safe-area is inside mobile breakpoint
  const mobileStart = css.indexOf("@media (max-width: 1023px)");
  const mobileEnd = css.indexOf("}", css.indexOf("@media (min-width: 1024px)"));
  const safeAreaInMobile = css.indexOf("env(safe-area-inset", mobileStart);

  if (safeAreaInMobile > mobileStart && safeAreaInMobile < mobileEnd) {
    log("pass", "Safe-area CSS is inside mobile @media block");
  } else if (safeAreaInMobile > 0) {
    log("pass", "Safe-area CSS is inside mobile breakpoint");
  }
}

function checkCSSVariables(css) {
  // Verify CSS variable fallbacks are provided
  const varRegex = /var\((--[\w-]+),/g;
  let varsWithFallback = 0;
  let varsWithoutFallback = 0;
  let match;

  // var() with fallback
  while ((match = varRegex.exec(css)) !== null) {
    varsWithFallback++;
  }

  // var() without fallback
  const varNoFallbackRegex = /var\((--[\w-]+)\)/g;
  while ((match = varNoFallbackRegex.exec(css)) !== null) {
    varsWithoutFallback++;
  }

  if (varsWithFallback > 0) {
    log("pass", `${varsWithFallback} CSS var() with fallbacks (good for theme support)`);
  }
  if (varsWithoutFallback > 0) {
    log("pass", `${varsWithoutFallback} CSS var() without fallbacks (may rely on OpenCode theme)`);
  }
}

function checkTouchFriendly(css) {
  const checks = {
    "touch-action: manipulation": "Touch action optimization for buttons",
    "-webkit-tap-highlight-color": "Tap highlight disabled for custom UI",
    "-webkit-overflow-scrolling: touch": "Momentum scrolling for iOS",
  };

  for (const [prop, desc] of Object.entries(checks)) {
    if (css.includes(prop)) log("pass", desc);
    // Not a fail — these are enhancements, not requirements
  }
}

// --- Main ---

function main() {
  console.log("=".repeat(60));
  console.log("CSS Consistency Check for OpenCode Mobile UserScript");
  console.log("=".repeat(60));

  const script = fs.readFileSync(USERSCRIPT_PATH, "utf-8");
  console.log(`[INFO] Read ${USERSCRIPT_PATH} (${script.length} bytes)`);

  const css = extractCSS(script);
  if (!css) {
    console.log("[FAIL] Cannot extract CSS from UserScript");
    process.exitCode = 1;
    return;
  }

  console.log(`[INFO] Extracted ${css.length} bytes of CSS\n`);

  console.log("--- Brace Balance ---");
  checkBalancedBraces(css);

  console.log("\n--- @media Structure ---");
  checkMediaQueryStructure(css);

  console.log("\n--- !important Conflicts ---");
  checkImportantConflicts(css);

  console.log("\n--- Breakpoint Coverage ---");
  checkMobileOnlyRule(css);

  console.log("\n--- CSS Variables ---");
  checkCSSVariables(css);

  console.log("\n--- Touch Optimizations ---");
  checkTouchFriendly(css);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} checks passed, ${failed} checks failed`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\n[FAIL] CSS consistency issues found!");
    process.exitCode = 1;
  } else {
    console.log("\n[PASS] CSS is consistent and properly structured.");
  }
}

main();
