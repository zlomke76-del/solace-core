// authority-engine.js
// Canonical Solace Core authority engine
// FAIL-CLOSED, TIME-BOUND, CRYPTOGRAPHIC

import crypto from "crypto";

const SHARED_SECRET = process.env.SOLACE_SHARED_SECRET || "solace-demo-secret";

// ------------------------------------------------------------
// Types (implicit, runtime enforced)
// ------------------------------------------------------------

export function authorizeExecution(intent) {
  // -----------------------------------------
  // FAIL CLOSED: structural validation
  // -----------------------------------------
  if (!intent || !intent.actor || !intent.actor.id || !intent.intent) {
    return {
      decision: "DENY",
      reason: "invalid_or_missing_intent"
    };
  }

  // -----------------------------------------
  // Hard stop: reliance under pressure
  // -----------------------------------------
  if (
    intent.intent === "reliance_eligible_output" &&
    intent.context?.deadline_pressure === true
  ) {
    return {
      decision: "DENY",
      reason: "authority_undefined_under_pressure"
    };
  }

  // -----------------------------------------
  // Explicit authorization required
  // -----------------------------------------
  if (!intent.acceptance) {
    return {
      decision: "DENY",
      reason: "missing_explicit_acceptance"
    };
  }

  const { issuedAt, expiresAt, signature } = intent.acceptance;

  if (!issuedAt || !expiresAt || !signature) {
    return {
      decision: "DENY",
      reason: "malformed_acceptance"
    };
  }

  const now = new Date();
  const issued = new Date(issuedAt);
  const expires = new Date(expiresAt);

  if (isNaN(issued) || isNaN(expires)) {
    return {
      decision: "DENY",
      reason: "invalid_acceptance_timestamps"
    };
  }

  if (now < issued || now > expires) {
    return {
      decision: "DENY",
      reason: "authorization_expired"
    };
  }

  // -----------------------------------------
  // Recompute HMAC
  // -----------------------------------------
  const payload = JSON.stringify({
    actor: intent.actor.id,
    intent: intent.intent,
    issuedAt,
    expiresAt
  });

  const expectedSignature = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== signature) {
    return {
      decision: "DENY",
      reason: "invalid_cryptographic_acceptance"
    };
  }

  // -----------------------------------------
  // PERMIT (time-bound)
  // -----------------------------------------
  return {
    decision: "PERMIT",
    permitId: crypto.randomUUID(),
    expiresAt
  };
}
