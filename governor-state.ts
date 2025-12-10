// --------------------------------------------------------------
// Governor State Manager (ASCII-safe)
// Maintains Solace's current pacing level across requests.
// In production you may replace this with Redis or KV storage.
// --------------------------------------------------------------

import { GovernorState, GovernorLevel } from "./types";

// Simple in-memory store (per server instance)
let _state: GovernorState = {
  level: 3,         // Default = productive flow
  lastUpdated: Date.now()
};

// --------------------------------------------------------------
// Get current governor state
// --------------------------------------------------------------
export function getGovernorState(): GovernorState {
  return _state;
}

// --------------------------------------------------------------
// Set new governor level
// --------------------------------------------------------------
export function setGovernorLevel(level: GovernorLevel) {
  _state = {
    level,
    lastUpdated: Date.now()
  };
}

// --------------------------------------------------------------
// Reset governor state (useful for debugging or new sessions)
// --------------------------------------------------------------
export function resetGovernor() {
  _state = {
    level: 3,
    lastUpdated: Date.now()
  };
}
