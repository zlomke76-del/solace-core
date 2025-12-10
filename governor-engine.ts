// --------------------------------------------------------------
// GOVERNOR ENGINE — ASCII-SAFE CORE (v3)
// No emoji, no Unicode >255, no UI icons.
// Pure signal → level → instruction pipeline.
// --------------------------------------------------------------

import { parseSignals } from "./signal-parser";
import { computeTransition } from "./transitions";
import { getGovernorState, setGovernorLevel } from "./state";
import { GovernorExtras, PacingLevel } from "./types";

// --------------------------------------------------------------
// ASCII-SAFE SYMBOLS (UI icons applied elsewhere)
// --------------------------------------------------------------
const SYMBOLS = {
  ANCHOR: "[ANCHOR]",
  COMPASS: "[COMPASS]",
  ARROW: "->",
  STAR: "*"
};

// --------------------------------------------------------------
// sanitizeString — prevent ANY >255 codepoints
// --------------------------------------------------------------
function sanitizeASCII(str: string): string {
  if (!str) return "";
  return str
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}

// --------------------------------------------------------------
// buildInstructions — produces the governor block sent ONLY
// to the ARBITER (unless you explicitly override).
// --------------------------------------------------------------
function buildInstructions(level: PacingLevel, signals: any): string {
  let out = `GOVERNOR_LEVEL: ${level}. Adjust tone and pacing.`.trim();

  // emotional fatigue → anchor
  if (signals.fatigue > 0.6) {
    out = `${SYMBOLS.ANCHOR} ${out}`;
  }

  // decision point → compass
  if (signals.decisionPoint) {
    out = `${SYMBOLS.COMPASS} ${out}`;
  }

  // mild pacing cues
  if (level >= 2 && level <= 4) {
    out = `${SYMBOLS.ARROW} ${out}`;
  }

  // high pacing, high clarity
  if (level === 5) {
    out = `${SYMBOLS.STAR} ${out}`;
  }

  return sanitizeASCII(out);
}

// --------------------------------------------------------------
// updateGovernor
// This is the ONLY exported function.
// --------------------------------------------------------------
export function updateGovernor(message: string): GovernorExtras {
  const previousLevel = getGovernorState().level;

  // 1. Extract behavioral / emotional signals
  const signals = parseSignals(message);

  // 2. Decide whether to raise / lower / hold pacing
  const { nextLevel } = computeTransition(previousLevel, signals, message);

  // 3. Persist global governor state
  setGovernorLevel(nextLevel);

  // 4. Produce sanitized instruction text
  const instructions = buildInstructions(nextLevel, signals);

  return {
    level: nextLevel,
    instructions,
    signals
  };
}
