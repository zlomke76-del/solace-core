// --------------------------------------------------------------
// Governor Engine (ASCII-safe)
// Computes pacing level from message → updates state → returns extras.
// --------------------------------------------------------------

import { getGovernorState, setGovernorState } from "./state";
import { GovernorExtras } from "./types";

// --------------------------------------------------------------
// UTIL: clamp to range
// --------------------------------------------------------------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// --------------------------------------------------------------
// 1. SIGNAL EXTRACTORS
// --------------------------------------------------------------
function extractPaceSignal(text: string): number {
  let score = 0;

  const fastWords = [
    "go", "move", "fast", "quick", "now",
    "execute", "let's go", "get shit done", "speed"
  ];

  const length = text.length;

  if (length > 200) score += 1;
  if (length > 500) score += 1;

  const dense = text.split(" ").length < length / 5;
  if (dense) score += 1;

  for (const w of fastWords) {
    if (text.toLowerCase().includes(w)) score += 2;
  }

  return clamp(score, 0, 5);
}

function extractCognitiveLoad(text: string): number {
  let score = 0;

  const signals = [
    "I don't know",
    "wait",
    "hold on",
    "I'm stuck",
    "I'm confused",
    "what do I do",
    "this is too much"
  ];

  for (const s of signals) {
    if (text.toLowerCase().includes(s.toLowerCase())) score += 2;
  }

  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks > 2) score += 1;

  return clamp(score, 0, 5);
}

function extractIntentClarity(text: string): number {
  if (text.toLowerCase().includes("here is what I want".toLowerCase())) return 5;

  let clarity = 0;

  const directiveWords = ["here's the goal", "I want", "please do", "my target is"];
  for (const w of directiveWords) {
    if (text.toLowerCase().includes(w)) clarity += 2;
  }

  if (text.length < 80) clarity += 1;

  return clamp(clarity, 0, 5);
}

function extractValence(text: string): number {
  const negative = ["frustrated", "angry", "upset", "tired", "fuck"];
  const positive = ["thank you", "good", "perfect", "nice", "love"];

  let v = 0;

  for (const n of negative) {
    if (text.toLowerCase().includes(n)) v -= 2;
  }
  for (const p of positive) {
    if (text.toLowerCase().includes(p)) v += 1;
  }

  return clamp(v, -5, 5);
}

function extractMomentum(text: string): number {
  const pivots = (text.match(/(but|however|wait)/gi) || []).length;
  return clamp(3 - pivots, 0, 5);
}

// --------------------------------------------------------------
// 2. CORE GOVERNOR UPDATE ENGINE
// --------------------------------------------------------------
export function updateGovernor(message: string): GovernorExtras {
  const state = getGovernorState();

  const pace = extractPaceSignal(message);
  const load = extractCognitiveLoad(message);
  const clarity = extractIntentClarity(message);
  const valence = extractValence(message);
  const momentum = extractMomentum(message);

  // ------------------------------------------------------------
  // COMPUTE TARGET LEVEL
  // ------------------------------------------------------------

  let target = state.level;

  // Rule: Distress dominates
  if (valence < -2 || load > 3) {
    target = state.level - 1;
  }

  // Rule: high pace + clarity
  if (pace >= 3 && clarity >= 2 && load <= 2) {
    target = state.level + 1;
  }

  // Rule: user explicitly pushes fast
  const lowerMsg = message.toLowerCase();
  const fastTriggers = ["go", "go go", "move", "faster", "let's go", "get shit done"];
  if (fastTriggers.some((t) => lowerMsg.includes(t))) {
    target = state.level + 1;
  }

  // Rule: stuck → structure
  if (momentum <= 1) {
    target = Math.max(target, 2);
  }

  // Rule: rest drift
  if (pace <= 1 && valence >= 0) {
    target = Math.min(target, 3);
  }

  // Hard limits
  target = clamp(target, 0, 5);

  // Rule: never jump more than 1 level
  if (Math.abs(target - state.level) > 1) {
    target = state.level + Math.sign(target - state.level);
  }

  // Update global state
  setGovernorState({
    level: target,
    lastMessage: message,
    momentum,
    overload: load,
    valence
  });

  // ------------------------------------------------------------
  // OUTPUT EXTRAS FOR HYBRID PIPELINE
  // ------------------------------------------------------------
  return {
    governorLevel: target,
    pacingInstruction: governorToInstruction(target)
  };
}

// --------------------------------------------------------------
// 3. BEHAVIOR MAP PER LEVEL
// --------------------------------------------------------------
function governorToInstruction(level: number): string {
  switch (level) {
    case 0:
      return "Reflective. Slow pace. Gentle. Minimal prompting.";
    case 1:
      return "Warm conversational. Soft options. No pressure.";
    case 2:
      return "Guided clarity. Ask short questions. Rebuild thread.";
    case 3:
      return "Normal productive flow. Balanced structure.";
    case 4:
      return "Accelerated progress. Crisp steps. Fast execution.";
    case 5:
      return "High-intensity GSD. Rapid sequencing. Zero drift.";
    default:
      return "Normal productive flow.";
  }
}
