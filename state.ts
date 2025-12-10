// --------------------------------------------------------------
// Governor In-Memory State
// --------------------------------------------------------------

import { GovernorState, PacingLevel } from "./types";

let _state: GovernorState = {
  level: 3 // Default steady-flow pacing
};

export function getGovernorState(): GovernorState {
  return _state;
}

export function setGovernorLevel(level: number) {
  const safe = Math.max(0, Math.min(5, level));
  _state.level = safe as PacingLevel;
}
