#!/usr/bin/env node

/**
 * Deny Non-Bypassable (Side-Effect Guard)
 *
 * This guard enforces that the Solace Core authority kernel
 * contains no execution, orchestration, or side-effect surfaces.
 *
 * IMPORTANT:
 * Governance tooling (including this file) is explicitly excluded
 * from evaluation. Only the governed system is scanned.
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

/**
 * Directories that are explicitly OUT OF SCOPE for non-bypassability checks.
 * These contain governance tooling, not governed logic.
 */
const EXCLUDED_DIRS = new Set([
  ".git",
  ".github",
  "tools",          // ← critical: excludes this guard itself
  "examples",
]);

/**
 * File extensions that are scanned.
 */
const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".js",
  ".mjs",
]);

/**
 * Forbidden indicators inside Solace Core.
 */
const FORBIDDEN_PATTERNS = [
  /node:fs/,
  /node:http/,
  /node:https/,
  /fetch\s*\(/,
  /axios/,
  /executeTool/i,
  /runTool/i,
  /orchestrator/i,
  /workflow/i,
];

/**
 * Recursively walk the repository, excluding governance tooling.
 */
function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile()) {
      if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

let violations = [];

for (const file of walk(REPO_ROOT)) {
  const contents = fs.readFileSync(file, "utf8");

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(contents)) {
      violations.push({
        file: path.relative(REPO_ROOT, file),
        pattern: pattern.toString(),
      });
    }
  }
}

if (violations.length > 0) {
  console.error("❌ DENY-NONBYPASSABLE CHECK FAILED");
  console.error("Detected forbidden side-effect indicators:\n");

  for (const v of violations.slice(0, 25)) {
    console.error(`- ${v.file} (${v.pattern})`);
  }

  console.error(`
Rule:
Solace Core may evaluate authority,
but must not contain execution, orchestration,
network egress, or filesystem side effects.
`);

  process.exit(1);
}

console.log("✅ DENY-NONBYPASSABLE CHECK PASSED");
process.exit(0);
