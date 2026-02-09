// authority-engine.js
// Canonical Solace Core authority entrypoint (runtime)

export function authorizeExecution(intent) {
  // FAIL CLOSED BY DEFAULT
  if (!intent || !intent.actor || !intent.intent) {
    return {
      decision: "DENY",
      reason: "invalid_or_missing_intent"
    };
  }

  // Hard stop: reliance under pressure
  if (
    intent.intent === "reliance_eligible_output" &&
    intent.context &&
    intent.context.deadline_pressure === true
  ) {
    return {
      decision: "DENY",
      reason: "authority_undefined_under_pressure"
    };
  }

  // Default: deny unless explicitly permitted
  return {
    decision: "DENY",
    reason: "no_positive_authorization"
  };
}
