// --------------------------------------------------------------
// Governor Adapter (ASCII-safe)
// --------------------------------------------------------------

import { GovernorExtras, GovernorSignals } from "./types";
import { updateGovernor } from "./governor-engine";

const EMPTY_SIGNALS: GovernorSignals = {
  emotionalValence: 0,
  intentClarity: 0.5,
  fatigue: 0,
  decisionPoint: false
};

function sanitizeASCII(input: string): string {
  if (!input) return "";
  const rep: Record<string, string> = {
    "—": "-", "–": "-", "•": "*",
    "“": "\"", "”": "\"",
    "‘": "'", "’": "'", "…": "..."
  };
  let out = input;
  for (const k in rep) out = out.split(k).join(rep[k]);
  return out
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}

export function applyGovernor(message: string): GovernorExtras {
  try {
    const gov = updateGovernor(message);

    return {
      level: gov.level,
      instructions: sanitizeASCII(gov.instructions),
      signals: gov.signals ?? EMPTY_SIGNALS
    };
  } catch (err) {
    console.error("[GovernorAdapter] Failed:", err);
    return {
      level: 3,
      instructions: "GOVERNOR_LEVEL: 3",
      signals: EMPTY_SIGNALS
    };
  }
}
