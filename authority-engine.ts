// authority-engine.ts
// Canonical Solace Core authority entrypoint

export type AuthorityDecision =
  | { decision: "PERMIT"; permitId: string; expiresAt: string }
  | { decision: "DENY"; reason: string }
  | { decision: "ESCALATE"; reason: string };

export type ExecutionIntent = {
  actor: {
    id: string;
    role?: string;
  };
  intent: string;
  scope?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: string;
};

export function authorizeExecution(
  intent: ExecutionIntent
): AuthorityDecision {
  // FAIL CLOSED BY DEFAULT
  if (!intent || !intent.actor || !intent.intent) {
    return {
      decision: "DENY",
      reason: "invalid_or_missing_intent"
    };
  }

  // Example hard stop: reliance under pressure
  if (
    intent.intent === "reliance_eligible_output" &&
    intent.context?.deadline_pressure === true
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
