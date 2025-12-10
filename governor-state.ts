// --------------------------------------------------------------
// Governor State Store (In-memory, per server instance)
// --------------------------------------------------------------

import { GovernorState, PacingLevel } from "./types";

// Default governor state
let _state: GovernorState = {
  level: 3,               // Start in productive flow
  lastUpdated: Date.now()
};

// --------------------------------------------------------------
// Accessor
// --------------------------------------------------------------
export function getGovernorState(): GovernorState {
  return _state;
}

// --------------------------------------------------------------
// Mutator
// --------------------------------------------------------------
export function setGovernorLevel(level: PacingLevel) {
  _state = {
    level,
    lastUpdated: Date.now()
  };
}
