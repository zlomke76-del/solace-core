// authority-engine.js
// Canonical Solace Core authority engine
// FAIL-CLOSED, TIME-BOUND, CRYPTOGRAPHIC, REPLAY-RESISTANT

import crypto from "crypto";

// Shared secret for HMAC acceptance verification
// NOTE: set this in your shell before running:
//   $env:SOLACE_SHARED_SECRET="solace-demo-secret"
const SHARED_SECRET = process.env.SOLACE_SHARED_SECRET || "solace-demo-secret";

// Max allowable acceptance window (defense-in-depth)
const MAX_ACCEPTANCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// In-memory replay guard: prevents reusing the same acceptance to mint multiple permits.
// (Server stores this module singleton in-process; for multi-instance, you'd externalize.)
const SEEN_ACCEPTANCE_IDS = new Map(); // acceptanceId -> expiresAtEpochMs

function nowIso() {
  return new Date().toISOString();
}

function safeEqualHex(aHex, bHex) {
  try {
    const a = Buffer.from(String(aHex || ""), "hex");
    const b = Buffer.from(String(bHex || ""), "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function computeExpectedSignature({ actorId, intent, issuedAt, expiresAt }) {
  // IMPORTANT: canonical payload order must match what the client signs.
  // Payload MUST be exactly:
  // {"actor":"...","intent":"...","issuedAt":"...","expiresAt":"..."}
  const payload = JSON.stringify({
    actor: actorId,
    intent,
    issuedAt,
    expiresAt
  });

  const expected = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(payload)
    .digest("hex");

  return { payload, expected };
}

function cleanupSeenAcceptance() {
  const now = Date.now();
  for (const [id, exp] of SEEN_ACCEPTANCE_IDS.entries()) {
    if (typeof exp !== "number" || exp <= now) SEEN_ACCEPTANCE_IDS.delete(id);
  }
}

function makeAcceptanceId({ actorId, intent, issuedAt, expiresAt, signature }) {
  // Acceptance replay key: deterministic, tied to signed content.
  const material = `${actorId}|${intent}|${issuedAt}|${expiresAt}|${signature}`;
  return crypto.createHash("sha256").update(material).digest("hex");
}

// ------------------------------------------------------------
// authorizeExecution(intent)
// Returns:
//  - DENY (with reason), or
//  - PERMIT (with permitId, jti, expiresAt)
// ------------------------------------------------------------
export function authorizeExecution(intent) {
  cleanupSeenAcceptance();

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
  // Explicit cryptographic acceptance required
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

  if (Number.isNaN(issued.getTime()) || Number.isNaN(expires.getTime())) {
    return {
      decision: "DENY",
      reason: "invalid_acceptance_timestamps"
    };
  }

  // Must be valid now
  if (now < issued || now > expires) {
    return {
      decision: "DENY",
      reason: "authorization_expired"
    };
  }

  // Defense-in-depth: cap window
  const windowMs = expires.getTime() - issued.getTime();
  if (windowMs <= 0 || windowMs > MAX_ACCEPTANCE_WINDOW_MS) {
    return {
      decision: "DENY",
      reason: "invalid_acceptance_window"
    };
  }

  // -----------------------------------------
  // Verify HMAC signature
  // -----------------------------------------
  const actorId = intent.actor.id;
  const { expected } = computeExpectedSignature({
    actorId,
    intent: intent.intent,
    issuedAt,
    expiresAt
  });

  if (!safeEqualHex(expected, signature)) {
    return {
      decision: "DENY",
      reason: "invalid_cryptographic_acceptance"
    };
  }

  // -----------------------------------------
  // Prevent acceptance replay (minting multiple permits)
  // -----------------------------------------
  const acceptanceId = makeAcceptanceId({
    actorId,
    intent: intent.intent,
    issuedAt,
    expiresAt,
    signature
  });

  if (SEEN_ACCEPTANCE_IDS.has(acceptanceId)) {
    return {
      decision: "DENY",
      reason: "acceptance_replay_detected"
    };
  }

  SEEN_ACCEPTANCE_IDS.set(acceptanceId, expires.getTime());

  // -----------------------------------------
  // PERMIT (time-bound) + jti (token identifier)
  // -----------------------------------------
  return {
    decision: "PERMIT",
    permitId: crypto.randomUUID(),
    jti: crypto.randomUUID(),
    expiresAt
  };
}

// Expose for tests/debug (optional)
export function _debugAcceptancePayload(actorId, intent, issuedAt, expiresAt) {
  const { payload, expected } = computeExpectedSignature({
    actorId,
    intent,
    issuedAt,
    expiresAt
  });
  return { generatedAt: nowIso(), payload, expected };
}