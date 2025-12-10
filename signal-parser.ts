// --------------------------------------------------------------
// Governor Signal Parser (Minimal Stable Version)
// --------------------------------------------------------------

import { GovernorSignals } from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Basic sentiment proxy
function computeEmotionalValence(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  if (lower.includes("tired") || lower.includes("overwhelm")) return -0.6;
  if (lower.includes("angry") || lower.includes("frustrated")) return -0.5;
  if (lower.includes("love") || lower.includes("great")) return 0.5;
  return 0;
}

function computeIntentClarity(text: string): number {
  if (!text) return 0.5;
  return text.length < 12 ? 0.4 : 0.8;
}

function computeFatigue(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("exhaust") || lower.includes("too much")) return 0.8;
  return 0.1;
}

function computeDecisionPoint(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("should i") ||
    lower.includes("option") ||
    lower.includes("decision")
  );
}

export function parseSignals(message: string): GovernorSignals {
  return {
    emotionalValence: computeEmotionalValence(message),
    intentClarity: computeIntentClarity(message),
    fatigue: clamp01(computeFatigue(message)),
    decisionPoint: computeDecisionPoint(message)
  };
}
