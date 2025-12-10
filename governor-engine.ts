// --------------------------------------------------------------
// Governor Engine v2.0 (ASCII-safe)
// Integrates Pacing Engine + Icon Pack (SIP)
// Generates GovernorExtras for the hybrid pipeline
//
// OUTPUT:
//  - level (0–5)
//  - instructions (icon-aware, pacing-aware)
// --------------------------------------------------------------

import { parseSignals } from "./signal-parser";
import { computeTransition } from "./transitions";
import { getGovernorState, setGovernorLevel } from "./governor-state";
import { GovernorExtras } from "./types";

import {
  getIconsForLevel,
  selectIcon,
  shouldUseIcon,
  canUseAnchor,
  canUseCompass,
} from "@/lib/solace/icon-pack";

// --------------------------------------------------------------
// Build governor instruction block with icon formatting
// --------------------------------------------------------------
function buildInstructions(
  level: number,
  message: string,
  signals: any,
  isFounder: boolean
): string {
  let out = `GOVERNOR_LEVEL: ${level}. Adjust tone, structure, and cadence accordingly.`;

  // No icons in Level 0 (Sanctuary)
  if (level === 0) return out;

  let usage = 0;
  const icons = getIconsForLevel(level as any, isFounder);

  // Emotional grounding → Anchor
  if (
    signals.emotionalDistress &&
    shouldUseIcon(level as any, usage) &&
    canUseAnchor(level as any, signals.emotionalDistress)
  ) {
    const anchor = selectIcon(level as any, "ANCHOR", isFounder);
    if (anchor) {
      out = `${anchor} ${out}`;
      usage++;
    }
  }

  // Decision-making context → Compass
  if (
    signals.decisionPoint &&
    shouldUseIcon(level as any, usage) &&
    canUseCompass(level as any, isFounder, signals.decisionPoint)
  ) {
    const compass =
      selectIcon(level as any, "COMPASS", isFounder) ||
      selectIcon(level as any, "COMPASS_ASCII", isFounder);

    if (compass) {
      out = `${compass} ${out}`;
      usage++;
    }
  }

  // Structural clarity icons (Level 2+)
  if (level >= 2 && shouldUseIcon(level as any, usage)) {
    let structural = "";

    if (level === 2) structural = icons["ARROW"];
    if (level === 3) structural = icons["DOUBLE_ARROW"];
    if (level === 4) structural = icons["FAST_ARROW"];
    if (level === 5) structural = icons["STAR"] || icons["DOUBLE_ARROW"];

    if (structural) {
      out = `${structural} ${out}`;
    }
  }

  return out;
}

// --------------------------------------------------------------
// MAIN GOVERNOR UPDATE
// --------------------------------------------------------------
export function updateGovernor(
  message: string,
  isFounder: boolean = false
): GovernorExtras {
  // 1. Previous level
  const prev = getGovernorState().level;

  // 2. Parse message for signals (pace, load, emotion, intent, etc.)
  const signals = parseSignals(message);

  // 3. Compute pacing transition
  const { nextLevel } = computeTransition(prev, signals, message);

  // 4. Save governor state
  setGovernorLevel(nextLevel);

  // 5. Build pacing + icon-aware instructions
  const instructions = buildInstructions(
    nextLevel,
    message,
    signals,
    isFounder
  );

  // 6. Return final governor extras
  return {
    level: nextLevel,
    instructions
  };
}

