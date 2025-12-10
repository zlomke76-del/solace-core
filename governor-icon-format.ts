// --------------------------------------------------------------
// Governor Icon Formatting Layer (minimal version)
// --------------------------------------------------------------

import { PacingLevel } from "./types";

export interface GovernorFormattingContext {
  level: PacingLevel;
  isFounder: boolean;
  emotionalDistress: boolean;
  decisionContext: boolean;
}

export function applyGovernorFormatting(
  text: string,
  ctx: GovernorFormattingContext
): string {
  let out = text;

  // Founder-only subtle upgrade: star prefix for level 5
  if (ctx.isFounder && ctx.level === 5) {
    out = `★ ${out}`;
  }

  return out;
}
