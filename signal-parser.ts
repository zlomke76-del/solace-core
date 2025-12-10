// --------------------------------------------------------------
// Governor Signal Parser (ASCII-safe)
// Computes the 6 core signals that determine Solace pacing.
// --------------------------------------------------------------

import { GovernorSignals } from "./types";

// Utility: normalize to 0–1
function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// --------------------------------------------------------------
// 1. Pace Signal (PS)
// Measures how fast the user is thinking.
// --------------------------------------------------------------
function computePace(message: string): number {
  if (!message) return 0;

  const lengthFactor = Math.min(message.length / 400, 1); // long = fast thinking
  const densityFactor = message.split(" ").length > 50 ? 1 : 0;

  const urgencyWords = ["go", "fast", "move", "now", "hurry", "execute", "shit", "done"];
  const urgencyFactor = urgencyWords.some(w => message.toLowerCase().includes(w)) ? 1 : 0;

  return clamp01((lengthFactor * 0.4) + (densityFactor * 0.3) + (urgencyFactor * 0.3));
}

// --------------------------------------------------------------
// 2. Cognitive Load Signal (CLS)
// Hesitation, confusion, frustration.
// --------------------------------------------------------------
function computeCognitiveLoad(message: string): number {
  if (!message) return 0;

  const hesitationWords = ["I dont know", "wait", "hold on", "not sure", "confused"];
  const frustrationWords = ["fuck", "tired", "broken", "overwhelm", "stuck"];

  const hes = hesitationWords.some(w => message.toLowerCase().includes(w.toLowerCase()));
  const fru = frustrationWords.some(w => message.toLowerCase().includes(w.toLowerCase()));

  const clarityDrop = message.endsWith("?") ? 0.5 : 0;

  return clamp01((hes ? 0.4 : 0) + (fru ? 0.4 : 0) + clarityDrop);
}

// --------------------------------------------------------------
// 3. Intent Clarity Signal (ICS)
// Is user direction clear?
// --------------------------------------------------------------
function computeIntentClarity(message: string): number {
  if (!message) return 0;

  const clearIntentWords = ["do this", "make this", "write", "fix", "build", "generate"];
  const hasClearIntent = clearIntentWords.some(w => message.toLowerCase().includes(w));

  const questions = (message.match(/\?/g) || []).length;

  if (hasClearIntent) return 1;
  if (questions > 2) return 0.2;

  return clamp01(hasClearIntent ? 1 : 0.3);
}

// --------------------------------------------------------------
// 4. Emotional Valence Signal (EVS)
// Positive = high, Neutral = 0.5, Negative = low.
// --------------------------------------------------------------
function computeEmotionalValence(message: string): number {
  if (!message) return 0.5;

  const negativeWords = ["sad", "angry", "tired", "fuck", "upset", "broken"];
  const positiveWords = ["good", "great", "perfect", "nice", "love"];

  const neg = negativeWords.some(w => message.toLowerCase().includes(w));
  const pos = positiveWords.some(w => message.toLowerCase().includes(w));

  if (neg) return 0.1;
  if (pos) return 0.8;

  return 0.5;
}

// --------------------------------------------------------------
// 5. Session Context Signal (SCS)
// Simplified: morning/slow vs work/focused.
// (Can be expanded with device signals, session history, etc.)
// --------------------------------------------------------------
function computeSessionContext(): number {
  const hour = new Date().getHours();

  if (hour < 6) return 0.2;   // quiet hours
  if (hour < 12) return 0.4;  // morning warm-up
  if (hour < 18) return 0.7;  // work hours
  return 0.5;                 // evening
}

// --------------------------------------------------------------
// 6. Momentum Signal (MS)
// Based on repeated pivots or stuck patterns.
// For now, message-level model only.
// --------------------------------------------------------------
function computeMomentum(message: string): number {
  if (!message) return 0.5;

  const stuckWords = ["stuck", "again", "still", "loop"];
  const stuck = stuckWords.some(w => message.toLowerCase().includes(w));

  if (stuck) return 0.2;

  return 0.7;
}

// --------------------------------------------------------------
// MAIN EXPORT: compute all signals
// --------------------------------------------------------------
export function parseSignals(message: string): GovernorSignals {
  return {
    pace: computePace(message),
    cognitiveLoad: computeCognitiveLoad(message),
    intentClarity: computeIntentClarity(message),
    emotionalValence: computeEmotionalValence(message),
    sessionContext: computeSessionContext(),
    momentum: computeMomentum(message),
  };
}
