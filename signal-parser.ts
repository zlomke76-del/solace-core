// --------------------------------------------------------------
// Signal Parser (v2) — aligned with GovernorSignals
// --------------------------------------------------------------

import { GovernorSignals } from "./types";

// --------------------------------------------------------------
// Utility scoring helpers
// --------------------------------------------------------------
function containsAny(str: string, arr: string[]): boolean {
  const lower = str.toLowerCase();
  return arr.some(x => lower.includes(x));
}

function scoreRange(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

// --------------------------------------------------------------
// Individual signal extractors
// --------------------------------------------------------------

// Cognitive load = length + complexity
function computeCognitiveLoad(message: string): number {
  const len = message.length;
  const punctuation = (message.match(/[.,;:!?]/g) || []).length;

  // Blend length + punctuation density
  return Math.min(1, (len / 400) * 0.6 + (punctuation / 20) * 0.4);
}

// Intent clarity = directness of asks or commands
function computeIntentClarity(message: string): number {
  const directives = ["do this", "fix", "send", "now", "why", "how", "what"];
  const hasDirective = containsAny(message, directives);
  return hasDirective ? 1 : 0.3;
}

// Emotional valence = negative sentiment heuristic
function computeEmotionalValence(message: string): number {
  const negativeWords = ["tired", "upset", "angry", "annoyed", "frustrated"];
  const positiveWords = ["great", "good", "love", "nice", "amazing"];

  let score = 0.5;

  if (containsAny(message, negativeWords)) score -= 0.3;
  if (containsAny(message, positiveWords)) score += 0.3;

  return Math.max(0, Math.min(1, score));
}

// Fatigue = repeated "again", "still", "why", "stuck"
function computeFatigue(message: string): number {
  const fatigueWords = ["again", "still", "why", "nothing", "stuck"];
  return containsAny(message, fatigueWords) ? 0.7 : 0.1;
}

// Decision point = major transition moment
function computeDecisionPoint(message: string): boolean {
  const triggers = [
    "next step",
    "what now",
    "do we continue",
    "switch",
    "change direction",
    "move forward",
    "should we"
  ];
  return containsAny(message, triggers);
}

// --------------------------------------------------------------
// MAIN SIGNAL PARSER (v2)
// --------------------------------------------------------------
export function parseSignals(message: string): GovernorSignals {
  return {
    cognitiveLoad: computeCognitiveLoad(message),
    intentClarity: computeIntentClarity(message),
    emotionalValence: computeEmotionalValence(message),
    fatigue: computeFatigue(message),
    decisionPoint: computeDecisionPoint(message)
  };
}
