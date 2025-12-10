// --------------------------------------------------------------
// Governor Engine (ASCII-safe)
// Applies signal parsing, transition rules, and updates state.
// Produces GovernorExtras for the hybrid pipeline.
// --------------------------------------------------------------

import { parseSignals } from "./signal-parser";
import { computeTransition } from "./transitions";
import { getGovernorState, setGovernorLevel } from "./governor-state";
import { GovernorExtras } from "./types";

// --------------------------------------------------------------
// Build the A+ instruction block
// --------------------------------------------------------------
function buildInstructions(level: number): string {
  return `GOVERNOR_LEVEL: ${level}. Adjust tone, structure, and cadence accordingly.`;
}

// --------------------------------------------------------------
// Main governor update function
// --------------------------------------------------------------
export function updateGovernor(message: string): GovernorExtras {
  // 1. Get previous level
  const prev = getGovernorState().level;

  // 2. Parse behavioral signals from message
  const signals = parseSignals(message);

  // 3. Compute transition
  const { nextLevel } = computeTransition(prev, signals, message);

  // 4. Update internal state
  setGovernorLevel(nextLevel);

  // 5. Produce extras for model prompts
  return {
    level: nextLevel,
    instructions: buildInstructions(nextLevel)
  };
}
