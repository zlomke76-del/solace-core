// --------------------------------------------------------------
// Governor Adapter (ASCII-safe)
// Clean interface for route.ts and hybrid.ts.
// --------------------------------------------------------------

import { GovernorExtras, GovernorSignals } from "./types";
import { updateGovernor } from "./governor-engine";

// --------------------------------------------------------------
// Default safe signal block so TypeScript always has full shape
// --------------------------------------------------------------
const EMPTY_SIGNALS: GovernorSignals = {
  emotionalDistress: false,
  urgency: 0,
  fatigue: 0,
  decisionPoint: false,
  positiveMomentum: 0,
  negativeMomentum: 0
};

// --------------------------------------------------------------
// ASCII clean
// --------------------------------------------------------------
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

// --------------------------------------------------------------
// Apply governor logic to a message and return full safe extras
// --------------------------------------------------------------
export function applyGovernor(message: string): GovernorExtras {
  try {
    const gov = updateGovernor(message);

    return {
      level: typeof gov.level === "number" ? gov.level : 3,
      instructions: sanitizeASCII(gov.instructions || "GOVERNOR_LEVEL: 3"),
      signals: gov.signals || EMPTY_SIGNALS
    };
  } catch (err) {
    console.error("[GovernorAdapter] Governor error:", err);

    return {
      level: 3,
      instructions: "GOVERNOR_LEVEL: 3",
      signals: EMPTY_SIGNALS
    };
  }
}
