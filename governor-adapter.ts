// --------------------------------------------------------------
// Governor Adapter (ASCII-safe, production-stable)
// Clean interface for route.ts and hybrid.ts.
// Ensures:
//  * ASCII sanitation
//  * Stable return shape
//  * Fault-tolerant governor calls
//  * Logging for diagnostics (optional)
// --------------------------------------------------------------

import { GovernorExtras } from "./types";
import { updateGovernor } from "./governor-engine";

// --------------------------------------------------------------
// ASCII Sanitizer
// --------------------------------------------------------------
function sanitizeASCII(input: string): string {
  if (!input) return "";

  const rep: Record<string, string> = {
    "—": "-", "–": "-", "•": "*",
    "“": "\"", "”": "\"",
    "‘": "'", "’": "'", "…": "..."
  };

  let out = input;
  for (const k in rep) out = out.split(k).join(rep[k]);

  return out
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}

// --------------------------------------------------------------
// applyGovernor
// Safely processes a message through the pacing engine.
//
// Always returns a complete GovernorExtras object:
// {
//   level: number,
//   instructions: string,
//   signals?: any
// }
// --------------------------------------------------------------
export function applyGovernor(message: string): GovernorExtras {
  const cleanMessage = sanitizeASCII(message || "");

  try {
    const gov = updateGovernor(cleanMessage);

    // Ensure stable shape (defensive programming)
    return {
      level: typeof gov.level === "number" ? gov.level : 3,
      instructions: sanitizeASCII(gov.instructions || "GOVERNOR_LEVEL: 3"),
      signals: gov.signals || {}
    };
  } catch (err) {
    console.error("[GovernorAdapter] Governor error:", err);

    // Fail-safe default (mid-level neutral pacing)
    return {
      level: 3,
      instructions: "GOVERNOR_LEVEL: 3",
      signals: {}
    };
  }
}
