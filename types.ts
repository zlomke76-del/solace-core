// --------------------------------------------------------------
// Governor Types (FINAL, ASCII-safe)
// --------------------------------------------------------------

// Governor pacing levels: 0–5
export type GovernorLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Internal governor runtime state
export interface GovernorState {
  level: GovernorLevel;
}

// Output returned by updateGovernor()
export interface GovernorExtras {
  level: GovernorLevel;
  instructions: string;
  
  // Optional: raw behavioral signals from parser
  signals?: {
    emotionalDistress?: boolean;
    decisionContext?: boolean;
    urgency?: boolean;
    slowdown?: boolean;
    accelerate?: boolean;
    // add any other signals as needed
  };
}
