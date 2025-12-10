// --------------------------------------------------------------
// Governor Types — FINAL, CONSISTENT ACROSS ENGINE
// --------------------------------------------------------------

// --------------------------------------------------------------
// Pacing Levels (0–5)
// --------------------------------------------------------------
export type PacingLevel = 0 | 1 | 2 | 3 | 4 | 5;

// --------------------------------------------------------------
// Parsed signal structure from message analysis
// --------------------------------------------------------------
export interface GovernorSignals {
  emotionalDistress: boolean;   // true if user is upset, overloaded, etc.
  urgency: number;              // 0–1
  fatigue: number;              // 0–1
  decisionPoint: boolean;       // true if user is making a choice / fork
  positiveMomentum: number;     // 0–1 (flow, clarity)
  negativeMomentum: number;     // 0–1 (friction, frustration)
}

// --------------------------------------------------------------
// State stored in-memory on the server
// --------------------------------------------------------------
export interface GovernorState {
  level: PacingLevel;
  lastUpdated: number;
}

// --------------------------------------------------------------
// Output of governor engine passed into Hybrid Pipeline
// --------------------------------------------------------------
export interface GovernorExtras {
  level: PacingLevel;
  instructions: string;
  signals?: GovernorSignals;
}
