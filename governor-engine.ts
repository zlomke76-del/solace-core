// --------------------------------------------------------------
// Governor Engine v2.1 (ASCII-safe, compile-stable)
// Integrates Pacing Engine + Icon Pack (SIP)
// Generates GovernorExtras for the hybrid pipeline.
//
// OUTPUT:
//  - level (0–5)
//  - instructions (icon-aware, pacing-aware)
//  - signals (all parsed behavioral indicators)
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
// Build governor instruction block (icons + pacing)
// --------------------------------------------------------------
function buildInstructions(
  level: number,
  message: string,
  signals: any,
  isFounder: boolean
): string {
  let out = `GOVERNOR_LEVEL: ${level}. Adjust tone, structure, and cadence accordingly.`;

  // Level 0: no icons, sanctuary mode
  if (level === 0) return out;

  let usage = 0;
  const icons = getIconsForLevel(level as any, isFounder);

  // ------------------------------
  // Emotional grounding → Anchor
  // ------------------------------
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

  // ------------------------------
  // Decision context → Compass
  // (FIX: correct field name: decisionContext)
  // ------------------------------
  if (
    signals.decisionContext &&
    shouldUseIcon(level as any, usage) &&
    canUseCompass(level as any, isFounder, signals.decisionContext)
  ) {
    const compass =
      selectIcon(level as any, "COMPASS", isFounder) ||
      selectIcon(level as any, "COMPASS_ASCII", isFounder);

    if (compass) {
      out = `${compass} ${out}`;
      usage++;
    }
  }

  // ------------------------------
  // Structural icons (Levels 2–5)
  // ------------------------------
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
// MAIN GOVERNOR UPDATE (FINAL)
// --------------------------------------------------------------
export function updateGovernor(
  message: string,
  isFounder: boolean = false
): GovernorExtras {
  // 1. previous level
  const prev = getGovernorState().level;

  // 2. parse behavioral signals
  const signals = parseSignals(message);

  // 3. compute transition
  const { nextLevel } = computeTransition(prev, signals, message);

  // 4. persist pacing state
  setGovernorLevel(nextLevel);

  // 5. build pacing + icon instructions
  const instructions = buildInstructions(
    nextLevel,
    message,
    signals,
    isFounder
  );

  // 6. return the FULL GovernorExtras object (FIXED)
  return {
    level: nextLevel,
    instructions,
    signals        // <-- REQUIRED by hybrid, adapter, and route.ts
  };
}
