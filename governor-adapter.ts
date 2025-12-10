// --------------------------------------------------------------
// Governor Adapter (ASCII-safe)
// Clean interface for route.ts and hybrid.ts.
// --------------------------------------------------------------

import { GovernorExtras } from "./types";
import { updateGovernor } from "./governor-engine";

// --------------------------------------------------------------
// Apply governor logic to a message and return instructions.
// --------------------------------------------------------------
export function applyGovernor(message: string): GovernorExtras {
  return updateGovernor(message);
}
