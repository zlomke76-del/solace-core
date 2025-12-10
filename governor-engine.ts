// --------------------------------------------------------------
// Governor Engine v2 (Minimal Icon Pack Integration)
// --------------------------------------------------------------

import { parseSignals } from "./signal-parser";
import { computeTransition } from "./transitions";
import { getGovernorState, setGovernorLevel } from "./governor-state";
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

function buildInstructions(level: PacingLevel, signals: any): string {
  let out = `GOVERNOR_LEVEL: ${level}. Adjust tone, structure, and cadence accordingly.`;

  // Emotional support → anchor
  if (signals.fatigue > 0.6) {
    out = `${ICONS.ANCHOR} ${out}`;
  }

  // Decision → compass
  if (signals.decisionPoint) {
    out = `${ICONS.COMPASS} ${out}`;
  }

  // Structural pacing
  if (level >= 2 && level <= 4) {
    out = `${ICONS.ARROW} ${out}`;
  }
  if (level === 5) {
    out = `${ICONS.STAR} ${out}`;
  }

  return out;
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
