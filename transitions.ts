// --------------------------------------------------------------
// Governor Transitions (ASCII-safe)
// Implements Solace pacing level transitions (0-5).
// All rules from Phase 1 are encoded here.
// --------------------------------------------------------------

import { GovernorSignals, GovernorLevel, GovernorTransitionResult } from "./types";

// Utility: clamp 0-5
function clampLevel(n: number): GovernorLevel {
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n as GovernorLevel;
}

// --------------------------------------------------------------
// Detect explicit user "push" phrases (Rule 5)
// --------------------------------------------------------------
function userPushes(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();

  const triggers = [
    "lets go",
    "move",
    "fast",
    "execute",
    "get shit done",
    "go go go",
    "push",
    "speed",
    "hurry"
  ];

  return triggers.some(t => m.includes(t));
}

// --------------------------------------------------------------
// Emotional distress → drop level (Rule 2)
// --------------------------------------------------------------
function distressOverride(signals: GovernorSignals): boolean {
  return signals.emotionalValence < 0.25;
}

// --------------------------------------------------------------
// Cognitive overload → simplify (Rule 3)
// --------------------------------------------------------------
function overload(signals: GovernorSignals): boolean {
  return signals.cognitiveLoad > 0.7;
}

// --------------------------------------------------------------
// Momentum low → add structure (Rule 4)
// --------------------------------------------------------------
function needsStructure(signals: GovernorSignals): boolean {
  return signals.momentum < 0.3;
}

// --------------------------------------------------------------
// Compute recommended base level from aggregated signals
// --------------------------------------------------------------
function computeBaseLevel(s: GovernorSignals): GovernorLevel {
  // Weighted heuristics:
  // - high pace + clarity → higher levels
  // - high cognitive load → lower levels
  // - emotionalValence adjusts but does not determine

  const score =
    (s.pace * 1.0) +
    (s.intentClarity * 0.8) +
    (s.momentum * 0.6) +
    (s.sessionContext * 0.3) -
    (s.cognitiveLoad * 1.2);

  // Map score to levels 0–5
  if (score > 2.5) return 5;
  if (score > 1.8) return 4;
  if (score > 1.0) return 3;
  if (score > 0.4) return 2;
  if (score > 0.1) return 1;

  return 0;
}

// --------------------------------------------------------------
// MAIN TRANSITION FUNCTION
// --------------------------------------------------------------
export function computeTransition(
  prev: GovernorLevel,
  signals: GovernorSignals,
  message: string
): GovernorTransitionResult {

  // 1. If user explicitly pushes → escalate one level
  if (userPushes(message)) {
    const lvl = clampLevel(prev + 1);
    return {
      nextLevel: lvl,
      reason: "User push override"
    };
  }

  // 2. Emotional distress → slow down
  if (distressOverride(signals)) {
    const lvl = clampLevel(prev - 1);
    return {
      nextLevel: lvl,
      reason: "Emotional distress override"
    };
  }

  // 3. Cognitive overload → slow down / simplify
  if (overload(signals)) {
    const lvl = clampLevel(prev - 1);
    return {
      nextLevel: lvl,
      reason: "Cognitive overload"
    };
  }

  // 4. Low momentum → increase structure (to Level 2 minimum)
  if (needsStructure(signals)) {
    const lvl = Math.max(prev, 2) as GovernorLevel;
    return {
      nextLevel: lvl,
      reason: "Momentum low"
    };
  }

  // 5. Otherwise compute base signal-driven change
  const baseLevel = computeBaseLevel(signals);

  // 6. Never jump more than 1 level unless pushed (Rule 1)
  let next = baseLevel;

  if (Math.abs(next - prev) > 1) {
    next = prev + (next > prev ? 1 : -1);
  }

  return {
    nextLevel: clampLevel(next),
    reason: "Signal-based transition"
  };
}
