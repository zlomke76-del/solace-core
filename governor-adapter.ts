// --------------------------------------------------------------
// Governor Adapter (ASCII-safe)
// Clean interface for route.ts and hybrid.ts.
// --------------------------------------------------------------

import { GovernorExtras, GovernorSignals } from "./types";
import { updateGovernor } from "./governor-engine";

// --------------------------------------------------------------
// Default safe signal block — must match GovernorSignals exactly
// --------------------------------------------------------------
const EMPTY_SIGNALS: GovernorSignals = {
  emotionalValence: 0.5,   // neutral midpoint
  intentClarity: 0.5,      // neutral midpoint
  fatigue: 0,              // none detected
  urgency: 0,              // no urgency
  decisionPoint: false     // not a decision scenario
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

      instructions: sanitizeASCII(
        gov.instructions || "GOVERNOR_LEVEL: 3"
      ),

      // GovernorSignals must match exact shape
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
