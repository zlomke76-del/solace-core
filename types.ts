// --------------------------------------------------------------
// Governor Types (ASCII-safe)
// Solace Behavioral Governor — Core Type Definitions
// --------------------------------------------------------------

export type GovernorSignals = {
  pace: number;            // Pace Signal (PS)
  cognitiveLoad: number;   // Cognitive Load Signal (CLS)
  intentClarity: number;   // Intent Clarity Signal (ICS)
  emotionalValence: number;// Emotional Valence Signal (EVS)
  sessionContext: number;  // Session Context Signal (SCS)
  momentum: number;        // Momentum Signal (MS)
};

export type GovernorLevel =
  0 | 1 | 2 | 3 | 4 | 5;

export type GovernorState = {
  level: GovernorLevel;
  lastUpdated: number;
};

export type GovernorTransitionResult = {
  nextLevel: GovernorLevel;
  reason: string;
};

export type GovernorExtras = {
  level: GovernorLevel;
  instructions: string; // A+ format
};
