// lib/solace/governor/governor-icon-format.ts
//--------------------------------------------------------------
// GOVERNOR FORMATTING — FINAL ARBITER OUTPUT ONLY
// Emoji usage rules per mode B
//--------------------------------------------------------------

export function applyGovernorFormatting(
  text: string,
  opts: {
    level: number;           // pacing 0–5
    isFounder: boolean;
    emotionalDistress: boolean;
    decisionContext: boolean;
  }
): string {
  if (!text) return "";

  let out = text;

  // Rule: Emojis allowed but controlled
  const allowEmoji = !opts.emotionalDistress && !opts.decisionContext;

  if (!allowEmoji) {
    // Strip emojis for high-stakes or distress states
    out = out.replace(
      /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}]/gu,
      ""
    );
    return out;
  }

  // If emoji allowed:
  // Add subtle Balancer icon ONLY IF it fits (aligned with Solace persona)
  if (opts.level <= 2) {
    // light touch (low pacing)
    if (!out.includes("⚖")) {
      out = `⚖️ ${out}`;
    }
  }

  // Higher pacing (3–5): keep emojis minimal
  if (opts.level >= 3) {
    out = out.replace(/😀|😊|😂|😍|🔥|✨/g, ""); // remove noisy emoji
  }

  return out;
}
