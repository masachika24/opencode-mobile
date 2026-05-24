/**
 * JS Syntax Check for OpenCode Mobile UserScript
 *
 * Validates JavaScript syntax of the UserScript using Node.js parser.
 *
 * Usage: node test/syntax-check.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const USERSCRIPT_PATH = path.join(__dirname, "..", "opencode-mobile.user.js");

function main() {
  console.log("=".repeat(60));
  console.log("JS Syntax Check for OpenCode Mobile UserScript");
  console.log("=".repeat(60));

  let content;
  try {
    content = fs.readFileSync(USERSCRIPT_PATH, "utf-8");
    console.log(`[INFO] Read ${USERSCRIPT_PATH} (${content.length} bytes)`);
  } catch (e) {
    console.log(`[FAIL] Cannot read UserScript: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  // Extract the JS portion (between the headers and end)
  // Skip UserScript metadata block
  const jsStart = content.indexOf("(function () {");
  if (jsStart === -1) {
    console.log("[FAIL] Cannot find IIFE in UserScript");
    process.exitCode = 1;
    return;
  }

  const jsCode = content.slice(jsStart);

  // Try parsing with new Function (same as eval but safer)
  let errors = [];

  try {
    new vm.Script(jsCode, { filename: "opencode-mobile.user.js" });
    console.log("[PASS] JavaScript syntax is valid.");
    console.log("[PASS] Script parses successfully with Node.js vm.Script.");

    // Additional checks
    const checks = [
      {
        name: "Contains 'use strict'",
        test: () => jsCode.includes("'use strict'"),
      },
      {
        name: "No console.log in production",
        test: () => {
          const debugMatch = content.match(/const DEBUG = (true|false);/);
          if (debugMatch && debugMatch[1] === "true") {
            console.log("[INFO] DEBUG mode is ON — console.log calls expected.");
            return true; // Not an error
          }
          return !jsCode.includes("console.log");
        },
      },
    ];

    for (const check of checks) {
      const result = check.test();
      if (result) {
        console.log(`[PASS] ${check.name}`);
      } else {
        console.log(`[WARN] ${check.name}`);
      }
    }
  } catch (e) {
    console.log(`[FAIL] Syntax error: ${e.message}`);
    if (e.stack) {
      const stackLine = e.stack.split("\n")[1];
      console.log(`[FAIL] ${stackLine.trim()}`);
    }
    process.exitCode = 1;
  }
}

main();
