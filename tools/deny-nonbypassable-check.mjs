/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

// Directories that must never exist in solace-core (product/UX coupling)
const FORBIDDEN_DIRS = [
  "app",
  "pages",
  "components",
  "public",
];

// Paths to ignore in scans
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
]);

// Only scan these extensions for code-level side effects
const SCAN_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
]);

// Forbidden side-effect primitives & libraries.
// This is intentionally strict: Solace Core must remain an authority evaluator, not an executor.
const FORBIDDEN_PATTERNS = [
  // process execution
  /from\s+['"]node:child_process['"]/,
  /from\s+['"]child_process['"]/,
  /require\(\s*['"]child_process['"]\s*\)/,
  /\bexecSync?\s*\(/,
  /\bspawnSync?\s*\(/,
  /\bfork\s*\(/,

  // filesystem writes (reads are less problematic, but we guard writes hard)
  /from\s+['"]node:fs['"]/,
  /from\s+['"]fs['"]/,
  /require\(\s*['"]fs['"]\s*\)/,
  /\bwriteFileSync\b/,
  /\bwriteFile\b/,
  /\bappendFileSync\b/,
  /\bappendFile\b/,
  /\bcreateWriteStream\b/,
  /\brenameSync\b/,
  /\brename\b/,
  /\bunlinkSync\b/,
  /\bunlink\b/,

  // outbound network/tool execution
  /\bfetch\s*\(/,                 // global fetch
  /from\s+['"]node:https['"]/,
  /from\s+['"]https['"]/,
  /from\s+['"]node:http['"]/,
  /from\s+['"]http['"]/,
  /\bhttps\.request\b/,
  /\bhttp\.request\b/,
  /from\s+['"]axios['"]/,
  /from\s+['"]undici['"]/,
  /from\s+['"]node-fetch['"]/,

  // common tool/execution libs (keep Core pure)
  /from\s+['"]@vercel\/blob['"]/,
  /from\s+['"]openai['"]/,
  /from\s+['"]@supabase\/supabase-js['"]/,
];

// Optional: forbid “tool execution” language in code (guardrail against accidental coupling)
const FORBIDDEN_KEYWORDS = [
  "tool execution",
  "executeTool",
  "runTool",
  "orchestrator",
  "workflow",
];

function existsDir(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel)) && fs.statSync(path.join(REPO_ROOT, rel)).isDirectory();
}

function walk(dirAbs, files = []) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dirAbs, e.name);
    if (e.isDirectory()) {
      walk(p, files);
    } else if (e.isFile()) {
      files.push(p);
    }
  }
  return files;
}

function readTextSafe(fileAbs) {
  try {
    return fs.readFileSync(fileAbs, "utf8");
  } catch {
    return "";
  }
}

function rel(fileAbs) {
  return path.relative(REPO_ROOT, fileAbs).replaceAll("\\", "/");
}

function fail(msg) {
  console.error(`\n❌ DENY-NONBYPASSABLE CHECK FAILED\n${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function main() {
  // 1) Hard-stop if product directories exist
  const foundForbiddenDirs = FORBIDDEN_DIRS.filter(existsDir);
  if (foundForbiddenDirs.length) {
    fail(
      `Forbidden directory(ies) present: ${foundForbiddenDirs.join(", ")}\n` +
      `Solace Core must remain headless and external to product/UX surfaces.`
    );
  }
  ok("No forbidden product/UX directories found.");

  // 2) Scan code files for forbidden side-effect primitives
  const allFiles = walk(REPO_ROOT);
  const codeFiles = allFiles.filter((f) => SCAN_EXTS.has(path.extname(f)));

  const hits = [];

  for (const f of codeFiles) {
    const content = readTextSafe(f);
    if (!content) continue;

    for (const rx of FORBIDDEN_PATTERNS) {
      if (rx.test(content)) {
        hits.push({ file: rel(f), pattern: String(rx) });
      }
    }

    // Keyword-level guardrail (lower signal, but useful)
    for (const kw of FORBIDDEN_KEYWORDS) {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        hits.push({ file: rel(f), pattern: `keyword:${kw}` });
      }
    }
  }

  if (hits.length) {
    const sample = hits
      .slice(0, 25)
      .map((h) => `- ${h.file}  (${h.pattern})`)
      .join("\n");

    fail(
      `Detected forbidden side-effect or coupling indicators (showing up to 25):\n${sample}\n\n` +
      `Rule: Solace Core may evaluate authority, but must not contain tool execution, network egress, filesystem writes, or orchestrators.`
    );
  }

  ok("No forbidden side-effect primitives detected in code.");

  // 3) Ensure authority contract files exist (basic integrity)
  const requiredDocs = ["README.md", "AUTHORITY_API.md"];
  const missing = requiredDocs.filter((p) => !fs.existsSync(path.join(REPO_ROOT, p)));
  if (missing.length) {
    fail(`Missing required doc(s): ${missing.join(", ")}`);
  }
  ok("Required authority docs present.");

  console.log("\n✅ DENY non-bypassability guard passed.\n");
}

main();
