// --------------------------------------------------------------
// Governor Types (FINAL)
// Ensures consistency across governor-engine, signal-parser,
// transitions, icon formatter, and route.ts usage.
// --------------------------------------------------------------

// 0–5 pacing levels
export type PacingLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Signals detected from user message
export interface GovernorSignals {
  emotionalDistress: boolean;     // user expresses overwhelm, fear, sadness
  urgency: number;                // 0–1 normalized (fast pacing requests)
  fatigue: number;                // 0–1 (low energy, burnout signals)
  decisionPoint: boolean;         // user asking for direction/clarity
  frustration: boolean;           // irritation, anger, negative friction
  positiveTone: boolean;          // gratitude, good mood, uplift
}

// Internal governor state
export interface GovernorState {
  level: PacingLevel;
  lastUpdated: number;            // timestamp for pacing cooldowns
}

// Output returned to hybrid pipeline and chat route
export interface GovernorExtras {
  level: PacingLevel;             // new pacing level after transition
  instructions: string;           // pacing + icon block
  signals?: GovernorSignals;      // full diagnostic signals (optional)
}
