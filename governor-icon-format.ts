// --------------------------------------------------------------
// GOVERNOR ICON FORMATTER — UI-LAYER ONLY (ASCII SAFE)
// Icons are applied AFTER the model returns text.
// Never passed into model prompts or upstream layers.
// --------------------------------------------------------------

import { PacingLevel } from "./types";

// ASCII-SAFE ICONS (UI can replace these visually client-side)
const ICONS = {
  ANCHOR: "[ANCHOR]",       // calm / grounding
  COMPASS: "[COMPASS]",     // guidance / decision point
  ARROW: "->",              // pacing / forward motion
  STAR: "[HIGH]"            // highest clarity / directive
};

// --------------------------------------------------------------
// sanitizeASCII — ensures outgoing text cannot contain >255 chars
// --------------------------------------------------------------
function sanitizeASCII(str: string): string {
  if (!str) return "";
  return str
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}

// --------------------------------------------------------------
// applyGovernorFormatting
// - Called once in route.ts AFTER pipeline completion.
// - The ONLY place icons appear.
// - Purely cosmetic; pipeline behavior unaffected.
// --------------------------------------------------------------
export function applyGovernorFormatting(
  text: string,
  opts: {
    level: PacingLevel;
    isFounder: boolean;
    emotionalDistress: boolean;
    decisionContext: boolean;
  }
): string {
  let out = text || "";

  // icons are prefixed to the message to influence "feel"
  const prefix: string[] = [];

  // emotional distress → grounding anchor
  if (opts.emotionalDistress) {
    prefix.push(ICONS.ANCHOR);
  }

  // decision context → compass indicator
  if (opts.decisionContext) {
    prefix.push(ICONS.COMPASS);
  }

  // pacing level indicators
  if (opts.level >= 2 && opts.level <= 4) {
    prefix.push(ICONS.ARROW);
  }

  if (opts.level === 5) {
    prefix.push(ICONS.STAR);
  }

  // founder mode: add mild stability signal
  if (opts.isFounder) {
    prefix.push("[FND]");
  }

  // collapse into a single line, if any icons exist
  if (prefix.length > 0) {
    out = `${prefix.join(" ")} ${out}`;
  }

  return sanitizeASCII(out);
}
