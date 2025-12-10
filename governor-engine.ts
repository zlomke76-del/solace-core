// --------------------------------------------------------------
// Governor Engine v2 (Minimal Icon Pack Integration)
// --------------------------------------------------------------

import { parseSignals } from "./signal-parser";
import { computeTransition } from "./transitions";
import { getGovernorState, setGovernorLevel } from "./state";
import { GovernorExtras, PacingLevel } from "./types";

// Simple, stable, minimal icon pack
const ICONS = {
  ANCHOR: "⚓",
  COMPASS: "🧭",
  ARROW: "→",
  DOUBLE_ARROW: "⇒",
  FAST_ARROW: "➤",
  STAR: "★"
};

/**
 * Build governor instructions WITHOUT exposing:
 * - level numbers
 * - internal state
 * - “Governor” wording
 *
 * Only behavioral cues + optional icons based on signals.
 */
function buildInstructions(level: PacingLevel, signals: any): string {
  let parts: string[] = [];

  // Emotional stabilizer
  if (signals.fatigue > 0.6) {
    parts.push(`${ICONS.ANCHOR} Steady the pace and keep tone grounded.`);
  }

  // Decision point
  if (signals.decisionPoint) {
    parts.push(`${ICONS.COMPASS} Highlight choices and clarify tradeoffs.`);
  }

  // Pacing logic (0–5 mapped silently)
  if (level <= 1) {
    parts.push(`Keep responses gentle, simple, and patient.`);
  }
  else if (level === 2) {
    parts.push(`${ICONS.ARROW} Keep structure light and supportive.`);
  }
  else if (level === 3) {
    parts.push(`${ICONS.ARROW} Maintain balanced pace and clarity.`);
  }
  else if (level === 4) {
    parts.push(`${ICONS.DOUBLE_ARROW} Increase focus and tighten structure.`);
  }
  else if (level >= 5) {
    parts.push(`${ICONS.STAR} Move decisively with crisp, efficient guidance.`);
  }

  // Join into one instruction block
  return parts.join(" ");
}

// --------------------------------------------------------------
// Main update
// --------------------------------------------------------------
export function updateGovernor(message: string): GovernorExtras {
  const prev = getGovernorState().level;

  const signals = parseSignals(message);
  const { nextLevel } = computeTransition(prev, signals, message);

  setGovernorLevel(nextLevel);

  return {
    level: nextLevel,
    instructions: buildInstructions(nextLevel, signals),
    signals
  };
}
