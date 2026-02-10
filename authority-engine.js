// authority-engine.js
// Canonical Solace Core authority engine
// FAIL-CLOSED, TIME-BOUND, CRYPTOGRAPHIC, REPLAY-RESISTANT
//
// Contract:
// - Input: execution intent (who, what action, context, acceptance)
// - Output: { decision: "PERMIT"|"DENY"|"ESCALATE", ... }
//
// Key principles:
// - No subjective judgments
// - No disclaimers
// - No “user decides” language
// - If authority cannot be resolved deterministically → ESCALATE (or DENY if required)
// - If no PERMIT is issued, execution must not proceed

import crypto from "crypto";

// ---------------------------------------------------------------------
// Crypto configuration
// ---------------------------------------------------------------------
//
// Preferred: ed25519 (public keys registered server-side; client signs payload)
// Optional fallback: HMAC shared secret (for quick local demos / legacy clients)
//
// Public key registry (JSON):
//   SOLACE_ACTOR_PUBKEYS_JSON='{"phala-runtime":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"}'
//
// HMAC secret (legacy/demo):
//   SOLACE_SHARED_SECRET="solace-demo-secret"
//
const SHARED_SECRET = process.env.SOLACE_SHARED_SECRET || "solace-demo-secret";

let ACTOR_PUBKEYS = null;
function getActorPubKeys() {
  if (ACTOR_PUBKEYS) return ACTOR_PUBKEYS;
  try {
    const raw = process.env.SOLACE_ACTOR_PUBKEYS_JSON || "{}";
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return (ACTOR_PUBKEYS = {});
    return (ACTOR_PUBKEYS = parsed);
  } catch {
    return (ACTOR_PUBKEYS = {});
  }
}

function getActorPublicKeyPem(actorId) {
  const map = getActorPubKeys();
  const pem = map[String(actorId || "")];
  return typeof pem === "string" && pem.includes("BEGIN PUBLIC KEY") ? pem : null;
}

// ---------------------------------------------------------------------
// Timing + replay controls
// ---------------------------------------------------------------------

// Max allowable acceptance window (defense-in-depth)
const MAX_ACCEPTANCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// In-memory replay guard: prevents reusing the same acceptance to mint multiple permits.
// (Server stores this module singleton in-process; for multi-instance, externalize.)
const SEEN_ACCEPTANCE_IDS = new Map(); // acceptanceId -> expiresAtEpochMs

function nowIso() {
  return new Date().toISOString();
}

function cleanupSeenAcceptance() {
  const now = Date.now();
  for (const [id, exp] of SEEN_ACCEPTANCE_IDS.entries()) {
    if (typeof exp !== "number" || exp <= now) SEEN_ACCEPTANCE_IDS.delete(id);
  }
}

function makeAcceptanceId({ actorId, payload, signatureB64 }) {
  // Replay key: deterministic, tied to signed content.
  const material = `${actorId}|${payload}|${signatureB64}`;
  return crypto.createHash("sha256").update(material).digest("hex");
}

// ---------------------------------------------------------------------
// Canonical signing payload
// ---------------------------------------------------------------------
//
// IMPORTANT: canonical payload order must match what the client signs.
// Payload MUST be exactly:
// {"actor":"...","action":"...","issuedAt":"...","expiresAt":"..."}
//
// Notes:
// - We sign "action" (not full context) to keep it narrow and unambiguous.
// - Context still influences decisions, but it is not part of the acceptance signature
//   unless you explicitly choose to include it (future hardening).
//
function makeCanonicalAcceptancePayload({ actorId, action, issuedAt, expiresAt }) {
  return JSON.stringify({
    actor: String(actorId),
    action: String(action),
    issuedAt: String(issuedAt),
    expiresAt: String(expiresAt)
  });
}

// ---------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------

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

function verifyHmacHexSignature({ payload, signatureHex }) {
  const expected = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(payload)
    .digest("hex");
  return safeEqualHex(expected, signatureHex);
}

function base64urlToBuf(s) {
  try {
    const str = String(s || "");
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function verifyEd25519Signature({ payload, signatureB64Url, actorPublicKeyPem }) {
  try {
    const sig = base64urlToBuf(signatureB64Url);
    if (!sig || sig.length === 0) return false;
    const msg = Buffer.from(String(payload), "utf8");
    // For Ed25519, algorithm is `null` in Node's crypto.verify
    return crypto.verify(null, msg, actorPublicKeyPem, sig);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Deterministic policy surface (minimal + explicit)
// ---------------------------------------------------------------------
//
// This is intentionally small for demo clarity.
// Expand by adding actions and required constraints.
//
// Actions are the unit of scope. Roles are inputs, not authority.
//
// decision defaults:
// - If required inputs missing → DENY
// - If policy cannot resolve deterministically → ESCALATE
//
const POLICY = {
  // Low-risk example action: safe drafting (still can require acceptance if you want)
  draft_assist: {
    risk: "low",
    requireAcceptance: false,
    onUnclear: "DENY"
  },

  // High-liability reliance action: MUST be gated
  // This is the boundary you’re trying to demonstrate.
  reliance_eligible_output: {
    risk: "high",
    requireAcceptance: true,
    // Under deadline pressure, do NOT infer permission. Escalate by default.
    // If your product stance is “deny under pressure unless pre-cleared,” set to DENY.
    onDeadlinePressure: "ESCALATE",
    onUnclear: "ESCALATE"
  }
};

function policyForAction(actionName) {
  return POLICY[String(actionName || "")] || null;
}

// ---------------------------------------------------------------------
// authorizeExecution(intent)
// Returns:
//  - DENY (with reason), or
//  - ESCALATE (with reason + required fields), or
//  - PERMIT (with permitId, jti, expiresAt)
// ---------------------------------------------------------------------
export function authorizeExecution(intent) {
  cleanupSeenAcceptance();

  // ------------------------------------------------------------
  // FAIL CLOSED: structural validation
  // ------------------------------------------------------------
  if (!intent || !intent.actor || !intent.actor.id) {
    return { decision: "DENY", reason: "invalid_or_missing_actor" };
  }

  // You previously used `intent.intent` as the action string.
  // Keep compatibility, but support `intent.action?.name` too.
  const actionName =
    intent.intent ||
    intent.action?.name ||
    intent.action ||
    null;

  if (!actionName) {
    return { decision: "DENY", reason: "invalid_or_missing_action" };
  }

  const actorId = String(intent.actor.id);

  // ------------------------------------------------------------
  // Resolve policy deterministically
  // ------------------------------------------------------------
  const policy = policyForAction(actionName);
  if (!policy) {
    // Unknown action: fail closed (or escalate if you want discovery mode)
    return { decision: "DENY", reason: "unknown_action_not_authorized" };
  }

  // ------------------------------------------------------------
  // Hard boundary: reliance under deadline pressure
  // ------------------------------------------------------------
  const deadlinePressure =
    intent.context?.deadline_pressure === true ||
    (typeof intent.context?.deadline_minutes === "number" &&
      intent.context.deadline_minutes <= 30);

  if (actionName === "reliance_eligible_output" && deadlinePressure) {
    if (policy.onDeadlinePressure === "DENY") {
      return { decision: "DENY", reason: "authority_undefined_under_pressure" };
    }
    return {
      decision: "ESCALATE",
      reason: "human_attestation_required_under_pressure",
      required: ["explicit_acceptance", "human_attestation"]
    };
  }

  // ------------------------------------------------------------
  // Acceptance required?
  // ------------------------------------------------------------
  if (policy.requireAcceptance !== true) {
    // PERMIT for low-risk actions in demo mode (still time-bound)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 min
    return {
      decision: "PERMIT",
      permitId: crypto.randomUUID(),
      jti: crypto.randomUUID(),
      expiresAt
    };
  }

  // For high-risk actions, acceptance is mandatory.
  const acceptance = intent.acceptance;
  if (!acceptance) {
    return { decision: "DENY", reason: "missing_explicit_acceptance" };
  }

  const issuedAt = acceptance.issuedAt;
  const expiresAt = acceptance.expiresAt;

  // Signature format:
  // - ed25519: { alg:"ed25519", sig:"<base64url>" }
  // - hmac:    { alg:"hmac-sha256", sigHex:"<hex>" }  (legacy)
  const alg = String(acceptance.alg || "ed25519");
  const sigB64 = acceptance.sig;     // base64url (ed25519)
  const sigHex = acceptance.sigHex;  // hex (hmac)

  if (!issuedAt || !expiresAt) {
    return { decision: "DENY", reason: "malformed_acceptance_timestamps" };
  }

  const now = new Date();
  const issued = new Date(issuedAt);
  const expires = new Date(expiresAt);

  if (Number.isNaN(issued.getTime()) || Number.isNaN(expires.getTime())) {
    return { decision: "DENY", reason: "invalid_acceptance_timestamps" };
  }

  // Must be valid now
  if (now < issued || now > expires) {
    return { decision: "DENY", reason: "authorization_expired" };
  }

  // Defense-in-depth: cap window
  const windowMs = expires.getTime() - issued.getTime();
  if (windowMs <= 0 || windowMs > MAX_ACCEPTANCE_WINDOW_MS) {
    return { decision: "DENY", reason: "invalid_acceptance_window" };
  }

  // ------------------------------------------------------------
  // Verify acceptance signature
  // ------------------------------------------------------------
  const payload = makeCanonicalAcceptancePayload({
    actorId,
    action: actionName,
    issuedAt,
    expiresAt
  });

  let sigOk = false;

  if (alg === "ed25519") {
    const pubPem = getActorPublicKeyPem(actorId);
    if (!pubPem) {
      // No registered public key for this actor → cannot verify → fail closed
      return { decision: "DENY", reason: "unknown_actor_public_key" };
    }
    if (!sigB64) return { decision: "DENY", reason: "missing_signature" };
    sigOk = verifyEd25519Signature({
      payload,
      signatureB64Url: sigB64,
      actorPublicKeyPem: pubPem
    });
  } else if (alg === "hmac-sha256") {
    if (!sigHex) return { decision: "DENY", reason: "missing_signature" };
    sigOk = verifyHmacHexSignature({ payload, signatureHex: sigHex });
  } else {
    return { decision: "DENY", reason: "unsupported_acceptance_algorithm" };
  }

  if (!sigOk) {
    return { decision: "DENY", reason: "invalid_cryptographic_acceptance" };
  }

  // ------------------------------------------------------------
  // Prevent acceptance replay (minting multiple permits)
  // ------------------------------------------------------------
  const replayKeySig = alg === "ed25519" ? String(sigB64) : String(sigHex);
  const acceptanceId = makeAcceptanceId({
    actorId,
    payload,
    signatureB64: replayKeySig
  });

  if (SEEN_ACCEPTANCE_IDS.has(acceptanceId)) {
    return { decision: "DENY", reason: "acceptance_replay_detected" };
  }

  SEEN_ACCEPTANCE_IDS.set(acceptanceId, expires.getTime());

  // ------------------------------------------------------------
  // Optional: require human attestation for high-risk actions
  // ------------------------------------------------------------
  // This is how Solace prevents “I accept responsibility” from becoming authority.
  // Human attestation must be an explicit field, not an implied statement.
  if (actionName === "reliance_eligible_output") {
    const attested = intent.context?.human_attestation === true;
    if (!attested) {
      return {
        decision: "ESCALATE",
        reason: "human_attestation_required",
        required: ["human_attestation"]
      };
    }
  }

  // ------------------------------------------------------------
  // PERMIT (time-bound) + jti (token identifier)
  // ------------------------------------------------------------
  return {
    decision: "PERMIT",
    permitId: crypto.randomUUID(),
    jti: crypto.randomUUID(),
    expiresAt
  };
}

// Expose for tests/debug (optional)
export function _debugAcceptancePayload(actorId, action, issuedAt, expiresAt) {
  const payload = makeCanonicalAcceptancePayload({
    actorId: String(actorId),
    action: String(action),
    issuedAt,
    expiresAt
  });

  const expectedHmac = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(payload)
    .digest("hex");

  return {
    generatedAt: nowIso(),
    payload,
    expectedHmac,
    actorHasEd25519PubKey: Boolean(getActorPublicKeyPem(String(actorId)))
  };
}
