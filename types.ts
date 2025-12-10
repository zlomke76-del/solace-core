// --------------------------------------------------------------
// Governor Types (FINAL VERSION)
// Defines the data returned by the pacing engine.
// --------------------------------------------------------------

export interface GovernorSignals {
  // All raw behavioral signals parsed from the message
  pace?: number;
  cognitiveLoad?: number;
  intentClarity?: number;
  emotionalValence?: number;

  // High-level interpretation signals
  emotionalDistress?: boolean;
  decisionContext?: boolean;
  momentumLow?: boolean;

  // Any additional internal signal the engine may produce
  [key: string]: any;
}

export interface GovernorExtras {
  level: number;            // Governor pacing level 0–5
  instructions: string;     // A+ instruction block injected into hybrid pipeline
  signals: GovernorSignals; // Parsed signals used by formatting & diagnostics
}
