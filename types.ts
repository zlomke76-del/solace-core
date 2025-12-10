// --------------------------------------------------------------
// Governor Types (v2) — FINAL, aligned with parser + engine
// --------------------------------------------------------------

// 0–5 pacing scale
export type PacingLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Signals extracted from user messages
export interface GovernorSignals {
  cognitiveLoad: number;        // 0–1
  intentClarity: number;        // 0–1
  emotionalValence: number;     // 0–1 (0 = negative, 1 = positive)
  fatigue: number;              // 0–1
  decisionPoint: boolean;       // clear "next step?" moment
}

// Internal governor state
export interface GovernorState {
  level: PacingLevel;
}

// Output of updateGovernor()
export interface GovernorExtras {
  level: PacingLevel;
  instructions: string;
  signals?: GovernorSignals;
}
