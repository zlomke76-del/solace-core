// --------------------------------------------------------------
// Governor Types (Minimal Stable Version)
// --------------------------------------------------------------

export type PacingLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Signals computed from the message
export interface GovernorSignals {
  emotionalValence: number;    // -1 to +1 sentiment
  intentClarity: number;       // how clear the user's ask is (0–1)
  fatigue: number;             // signs of overwhelm (0–1)
  decisionPoint: boolean;      // true when message implies choice/decision
}

export interface GovernorExtras {
  level: PacingLevel;
  instructions: string;
  signals?: GovernorSignals;
}

// Internal pacing state (held in-memory per server instance)
export interface GovernorState {
  level: PacingLevel;
}
