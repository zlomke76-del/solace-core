// ------------------------------------------------------------
// Governor Icon Formatting Layer (SIP Integration)
// Lives in: /lib/solace/governor/governor-icon-format.ts
//
// Responsibilities:
// - Apply icon formatting based on Governor pacing level
// - Enforce icon usage limits
// - Use Anchor only when emotionally grounding
// - Use Compass only for directional / decision contexts
// - Ensure founder-only icons stay restricted
// ------------------------------------------------------------

import {
  getIconsForLevel,
  shouldUseIcon,
  selectIcon,
  canUseAnchor,
  canUseCompass,
  formatWithIcon,
  PacingLevel,
} from "@/lib/solace/icon-pack";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface GovernorFormattingContext {
  level: PacingLevel;          // Pacing level (0–5)
  isFounder: boolean;          // Founder unlock
  emotionalDistress: boolean;  // Anchor permission
  decisionContext: boolean;    // Compass permission
  usageCounter?: number;       // Track icons used in this response
}

// ------------------------------------------------------------
// CORE FORMATTING FUNCTION
// ------------------------------------------------------------

export function applyGovernorFormatting(
  text: string,
  ctx: GovernorFormattingContext
): string {
  let output = text.trim();
  let usage = 0;

  const icons = getIconsForLevel(ctx.level, ctx.isFounder);

  // ------------------------------------------------------------
  // 1. ANCHOR — only when grounding emotional distress
  // ------------------------------------------------------------
  if (
    ctx.emotionalDistress &&
    shouldUseIcon(ctx.level, usage) &&
    canUseAnchor(ctx.level, ctx.emotionalDistress)
  ) {
    const anchor = selectIcon(ctx.level, "ANCHOR", ctx.isFounder);
    if (anchor) {
      output = formatWithIcon(anchor, output);
      usage++;
    }
  }

  // ------------------------------------------------------------
  // 2. COMPASS — only when giving direction / decisions
  // ------------------------------------------------------------
  else if (
    ctx.decisionContext &&
    shouldUseIcon(ctx.level, usage) &&
    canUseCompass(ctx.level, ctx.isFounder, ctx.decisionContext)
  ) {
    const compass =
      selectIcon(ctx.level, "COMPASS", ctx.isFounder) ||
      selectIcon(ctx.level, "COMPASS_ASCII", ctx.isFounder);

    if (compass) {
      output = formatWithIcon(compass, output);
      usage++;
    }
  }

  // ------------------------------------------------------------
  // 3. STRUCTURAL ICONS — clarity only, never decoration
  // ------------------------------------------------------------
  const lines = output.split("\n");

  if (lines.length > 1) {
    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (!shouldUseIcon(ctx.level, usage)) return line;

      let structuralIcon = "";

      if (ctx.level === 2) structuralIcon = icons["ARROW"] || "";
      if (ctx.level === 3) structuralIcon = icons["DOUBLE_ARROW"] || "";
      if (ctx.level === 4) structuralIcon = icons["FAST_ARROW"] || "";
      if (ctx.level === 5)
        structuralIcon = icons["STAR"] || icons["DOUBLE_ARROW"] || "";

      if (structuralIcon) {
        usage++;
        return formatWithIcon(structuralIcon, trimmed);
      }

      return line;
    });

    output = newLines.join("\n");
  }

  // ------------------------------------------------------------
  // 4. CLEANUP — prevents messy spacing
  // ------------------------------------------------------------
  output = output.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");

  return output;
}
