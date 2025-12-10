// --------------------------------------------------------------
// Governor State Registry (ASCII-safe)
// Persistent in-memory pacing tracker for Solace runtime.
// --------------------------------------------------------------

export type GovernorState = {
  level: number;        // 0–5
  lastMessage: string;  // last raw user message
  momentum: number;     // rolling measure of progress
  overload: number;     // rolling CLS (cognitive load)
  valence: number;      // emotional tone -5 → +5
  lastUpdate: number;   // timestamp
};

// --------------------------------------------------------------
// DEFAULT STATE
// --------------------------------------------------------------
const defaultState: GovernorState = {
  level: 3,         // neutral productive flow
  lastMessage: "",
  momentum: 0,
  overload: 0,
  valence: 0,
  lastUpdate: Date.now()
};

// --------------------------------------------------------------
// SINGLETON STATE STORE
// --------------------------------------------------------------
let GOVERNOR: GovernorState = { ...defaultState };

// --------------------------------------------------------------
// RESET (for testing / operator override)
// --------------------------------------------------------------
export function resetGovernor() {
  GOVERNOR = { ...defaultState };
  return GOVERNOR;
}

// --------------------------------------------------------------
// READ CURRENT STATE
// --------------------------------------------------------------
export function getGovernorState(): GovernorState {
  return GOVERNOR;
}

// --------------------------------------------------------------
// WRITE / UPDATE STATE
// --------------------------------------------------------------
export function setGovernorState(next: Partial<GovernorState>) {
  GOVERNOR = {
    ...GOVERNOR,
    ...next,
    lastUpdate: Date.now()
  };
  return GOVERNOR;
}

