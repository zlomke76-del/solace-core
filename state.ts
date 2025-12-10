// --------------------------------------------------------------
// Governor In-Memory State (Minimal Stable Version)
// --------------------------------------------------------------

import { GovernorState, PacingLevel } from "./types";

// Only field allowed in GovernorState:
let _state: GovernorState = {
  level: 3 // Default starting level
};

export function getGovernorState(): GovernorState {
  return _state;
}

export function setGovernorLevel(level: number) {
  const safe = Math.max(0, Math.min(5, level));
  _state.level = safe as PacingLevel;
}
