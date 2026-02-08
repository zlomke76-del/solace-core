// ---------------------------------------------------------------
// GOVERNOR ADAPTER (SAFE FOR HYBRID PIPELINE)
// Minimal, isolated, ASCII-safe governor injector.
// No icons. No >255 chars. No cyclical dependencies.
// ---------------------------------------------------------------

import { updateGovernor } from "@/lib/solace/governor/governor-engine";

// Full ASCII sanitizer identical to sanitize.ts (duplicated intentionally
// to keep this adapter self-contained and dependency-stable).
function sanitizeASCII(input: string): string {
  if (!input) return "";

  const rep: Record<string, string> = {
    "—": "-", "–": "-", "•": "*",
    "“": "\"", "”": "\"",
    "‘": "'", "’": "'", "…": "..."
  };

  let out = input;
  for (const k in rep) out = out.split(k).join(rep[k]);

  // Replace >255 Unicode chars with '?'
  return out
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}

// ---------------------------------------------------------------
// applyGovernor(message)
// Injects governor metadata and sanitized instructions.
// Used exclusively by hybrid.ts
// ---------------------------------------------------------------
export function applyGovernor(message: string) {
  const gov = updateGovernor(message);

  return {
    level: gov.level,
    // Instructions ALWAYS sanitized before reaching hybrid pipeline
    instructions: sanitizeASCII(gov.instructions || "")
  };
}
