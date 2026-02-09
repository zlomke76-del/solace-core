// authority-engine.js
// Canonical Solace Core authority entrypoint (runtime)

import crypto from "crypto";

/**
 * CONFIG
 * In real deployments this comes from env vars or secure storage.
 */
const AUTHORITY_SHARED_SECRET = "solace-demo-secret";

/**
 * Types (documented implicitly)
 *
 * AuthorityDecision:
 *  - PERMIT: time-bound, explicit
 *  - DENY: fail-closed
 *  - ESCALATE: reserved
 */

export function authorizeExecution(intent) {
  // -------------------------
  // FAIL CLOSED BY DEFAULT
  // -------------------------
  if (!intent || !intent.actor || !intent.intent) {
    return {
      decision: "DENY",
      reason: "invalid_or_missing_intent"
    };
  }

  // -------------------------
  // Hard stop: reliance under pressure
  // -------------------------
  if (
    intent.intent === "reliance_eligible_output" &&
    intent.context?.deadline_pressure === true
  ) {
    return {
      decision: "DENY",
      reason: "authority_undefined_under_pressure"
    };
  }

  // -------------------------
  // Explicit PERMIT path
  // Requires cryptographic acceptance
  // -------------------------
  if (intent.intent === "explicitly_authorized_action") {
    const { acceptance } = intent;

    if (!acceptance) {
      return {
        decision: "DENY",
        reason: "missing_acceptance"
      };
    }

    const { signature, issuedAt, expiresAt } = acceptance;

    if (!signature || !issuedAt || !expiresAt) {
      return {
        decision: "DENY",
        reason: "invalid_acceptance_payload"
      };
    }

    const now = Date.now();
    if (now > Date.parse(expiresAt)) {
      return {
        decision: "DENY",
        reason: "authorization_expired"
      };
    }

    // Reconstruct signed payload
    const payload = JSON.stringify({
      actor: intent.actor.id,
      intent: intent.intent,
      issuedAt,
      expiresAt
    });

    const expectedSignature = crypto
      .createHmac("sha256", AUTHORITY_SHARED_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== signature) {
      return {
        decision: "DENY",
        reason: "invalid_signature"
      };
    }

    // -------------------------
    // PERMIT (time-bound)
    // -------------------------
    return {
      decision: "PERMIT",
      permitId: crypto.randomUUID(),
      expiresAt
    };
  }

  // -------------------------
  // Default: deny unless explicitly permitted
  // -------------------------
  return {
    decision: "DENY",
    reason: "no_positive_authorization"
  };
}
