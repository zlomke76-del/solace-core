// --------------------------------------------------------------
// Governor Transition Logic (Minimal Stable Rules)
// --------------------------------------------------------------

import { GovernorSignals, PacingLevel } from "./types";

export function computeTransition(
  prev: PacingLevel,
  signals: GovernorSignals,
  message: string
): { nextLevel: PacingLevel } {

  let next = prev;

  // If user seems overwhelmed → slow pacing
  if (signals.fatigue > 0.6) next = 1;

  // If decision required → increase clarity pacing
  if (signals.decisionPoint) next = 3;

  // If sentiment strongly positive → allow higher momentum
  if (signals.emotionalValence > 0.4) next = 4;

  // Normalize safe bounds
  if (next < 0) next = 0;
  if (next > 5) next = 5;

  return { nextLevel: next as PacingLevel };
}
