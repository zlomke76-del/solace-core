// ---------------------------------------------------------------
// GOVERNOR ENGINE (v3 - Pure Logic, Non-Icon, ASCII-Safe)
// ---------------------------------------------------------------
// Responsibilities:
// - Parse heuristic signals from raw user message
// - Compute next governor pacing level (0–5)
// - Provide sanitized instruction text (no icons, no unicode >255)
// - Maintain internal state for pacing smoothing
//
// NO UI, NO ICONS, NO PIPELINE FORMATTING.
// applyGovernorFormatting handles visible output.
// ---------------------------------------------------------------


// -------------------------
// Internal State
// -------------------------
let CURRENT_LEVEL = 1; // steady default


// ---------------------------------------------------------------
// ASCII Sanitizer (local copy for governor safety)
// ---------------------------------------------------------------
function sanitizeASCII(input: string): string {
  if (!input) return "";

  const rep: Record<string, string> = {
    "—": "-", "–": "-", "•": "*",
    "“": "\"", "”": "\"",
    "‘": "'", "’": "'", "…": "..."
  };

  let out = input;
  for (const k in rep) out = out.split(k).join(rep[k]);

  return out
    .split("")
    .map((c) => (c.charCodeAt(0) > 255 ? "?" : c))
    .join("");
}


// ---------------------------------------------------------------
// SIGNAL PARSER — Extract behavioral cues
// ---------------------------------------------------------------
function parseSignals(message: string) {
  const text = (message || "").toLowerCase();

  // crude emotional cues
  const distressWords = ["tired", "sad", "lost", "overwhelmed", "panic", "hurt"];
  const decisionWords = ["should i", "do i", "choose", "decide", "what now"];

  const emotionalValence =
    distressWords.some((w) => text.includes(w)) ? 0.2 : 0.6;

  const decisionPoint =
    decisionWords.some((w) => text.includes(w));

  const fatigue =
    text.includes("exhausted") || text.includes("burned out") ? 0.8 : 0.3;

  return {
    emotionalValence,
    decisionPoint,
    fatigue
  };
}


// ---------------------------------------------------------------
// TRANSITION LOGIC — How pacing level evolves
// ---------------------------------------------------------------
function computeNextLevel(prev: number, signals: any) {
  let next = prev;

  // If user shows distress → slow pacing
  if (signals.emotionalValence < 0.35) {
    next = Math.max(1, prev - 1);
  }

  // If user is in decision-mode → increase firmness/structure
  if (signals.decisionPoint) {
    next = Math.min(4, prev + 1);
  }

  // If user appears energized (“not distressed” + “not fatigued”) → can increase pacing mildly
  if (signals.emotionalValence > 0.55 && signals.fatigue < 0.5) {
    next = Math.min(5, prev + 1);
  }

  // smoothing — never jump more than 1 level
  if (Math.abs(next - prev) > 1) {
    next = prev + (next > prev ? 1 : -1);
  }

  return next;
}


// ---------------------------------------------------------------
// INSTRUCTION BUILDER — applies ONLY logic, not formatting
// ---------------------------------------------------------------
function buildInstructions(level: number, signals: any): string {
  let base =
    `GOVERNOR_LEVEL: ${level}. Adjust tone and pacing accordingly.`;

  if (signals.emotionalValence < 0.35) {
    base += " User may be distressed — slow pacing, increase reassurance.";
  }

  if (signals.decisionPoint) {
    base += " User is at a decision point — increase clarity and structure.";
  }

  if (signals.fatigue > 0.6) {
    base += " User appears fatigued — simplify and reduce cognitive load.";
  }

  return sanitizeASCII(base);
}


// ---------------------------------------------------------------
// MAIN EXPORT — updateGovernor()
// ---------------------------------------------------------------
export function updateGovernor(message: string) {
  const signals = parseSignals(message);
  const nextLevel = computeNextLevel(CURRENT_LEVEL, signals);

  // persist
  CURRENT_LEVEL = nextLevel;

  const instructions = buildInstructions(nextLevel, signals);

  return {
    level: nextLevel,
    instructions,
    signals
  };
}
