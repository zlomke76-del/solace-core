// server.js
// Solace Core Authority — Dual-Surface
// - /v1/authorize : non-executing authority evaluation (Model A-lite)
// - /v1/execute   : acceptance-only execution gate (Model B)
// FAIL-CLOSED. EXTERNAL AUTHORITY. CRYPTOGRAPHIC BINDING.
// EVIDENCE: writes append-only decision records to Supabase ledger (RLS locked).

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

console.log("BOOT FILE:", import.meta.url);

const app = express();

/**
 * ------------------------------------------------------------
 * Environment / identity
 * ------------------------------------------------------------
 */
const CORE_VERSION =
  process.env.SOLACE_CORE_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "unknown";

const CORE_ENV =
  process.env.SOLACE_ENVIRONMENT ||
  process.env.NODE_ENV ||
  "unknown";

/**
 * ------------------------------------------------------------
 * Authority key identity (optional, audit-grade)
 * ------------------------------------------------------------
 * This is NOT used for signature verification yet.
 * It is written to the ledger for traceability / rotation readiness.
 */
const AUTHORITY_KEY_ID =
  (process.env.SOLACE_AUTHORITY_KEY_ID &&
    String(process.env.SOLACE_AUTHORITY_KEY_ID)) ||
  null;

/**
 * ------------------------------------------------------------
 * Supabase (service role) — append-only authority ledger
 * ------------------------------------------------------------
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("supabase_url_missing");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("supabase_service_role_key_missing");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * ------------------------------------------------------------
 * Health check
 * ------------------------------------------------------------
 */
app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "solace-core-authority",
    mode: "dual-surface",
    time: new Date().toISOString(),
    coreVersion: CORE_VERSION,
    environment: CORE_ENV,
    authorityKeyId: AUTHORITY_KEY_ID || null,
  });
});

/**
 * ------------------------------------------------------------
 * JSON body parser
 * ------------------------------------------------------------
 */
app.use(express.json());

/**
 * ------------------------------------------------------------
 * JSON parse error guard
 * ------------------------------------------------------------
 */
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      decision: "DENY",
      reason: "invalid_json",
      message: err.message,
    });
  }
  next(err);
});

/**
 * ------------------------------------------------------------
 * Load issuer public key (external authority)
 * ------------------------------------------------------------
 */
const ISSUER_PUB_PATH = path.join(process.cwd(), "issuer.pub");
if (!fs.existsSync(ISSUER_PUB_PATH)) {
  throw new Error("issuer_pubkey_missing");
}
const ISSUER_PUBLIC_KEY = fs.readFileSync(ISSUER_PUB_PATH, "utf8");

/**
 * ------------------------------------------------------------
 * Stable canonicalization (recursive) + hashing
 * ------------------------------------------------------------
 * Node's JSON key order is not a cryptographic primitive.
 * We canonicalize recursively so insurers can verify deterministically.
 */
function stableSort(value) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(stableSort);
  }

  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = stableSort(value[k]);
    }
    return out;
  }

  return value;
}

function canonical(obj) {
  return JSON.stringify(stableSort(obj));
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function computeIntentHash(intent) {
  // Bind to the exact structured intent submitted to Core
  return sha256Hex(canonical(intent));
}

function computeExecuteHash(execute) {
  // Bind authority to the exact execution requested
  return sha256Hex(canonical(execute));
}

function computeAcceptanceHash(acceptance) {
  // Hash the acceptance object as-presented
  return sha256Hex(canonical(acceptance));
}

/**
 * ------------------------------------------------------------
 * Signature verification for acceptance
 * ------------------------------------------------------------
 * Acceptance signs canonical material including executeHash.
 */
function verifyAcceptanceSignature(acceptance, executeHash) {
  const { issuer, actorId, intent, issuedAt, expiresAt, signature } = acceptance;

  const material = canonical({
    issuer,
    actorId,
    intent,
    executeHash,
    issuedAt,
    expiresAt,
  });

  const verifier = crypto.createVerify("SHA256");
  verifier.update(material);
  verifier.end();

  return verifier.verify(ISSUER_PUBLIC_KEY, signature, "base64");
}

/**
 * ------------------------------------------------------------
 * Ledger write (Supabase)
 * ------------------------------------------------------------
 * NOTE: prev_hash + entry_hash are computed in the DB trigger.
 * Core supplies only the decision facts + binding hashes.
 */
async function ledgerWrite({
  actor_id,
  intent,
  intent_hash,
  execute_hash,
  acceptance_hash,
  decision,
  reason,
}) {
  const row = {
    actor_id,
    intent,
    intent_hash,
    execute_hash: execute_hash || null,
    acceptance_hash: acceptance_hash || null,
    decision,
    reason,
    core_version: CORE_VERSION,
    environment: CORE_ENV,
    authority_key_id: AUTHORITY_KEY_ID || null,
  };

  const { error } = await supabase.from("solace_authority_ledger").insert(row);

  if (error) {
    const msg = String(error.message || "ledger_insert_failed");
    const details = error.details ? String(error.details) : "";
    throw new Error(details ? `${msg} :: ${details}` : msg);
  }
}

/**
 * ------------------------------------------------------------
 * POST /v1/authorize
 * Non-executing authority inquiry
 * IMPORTANT:
 * - advisory surface; does not mint execution authority
 * - MUST WRITE DENY/ESCALATE decisions to ledger for insurer evidence
 * - MUST NOT fail-closed on ledger failure (authorize is advisory)
 * ------------------------------------------------------------
 */
app.post("/v1/authorize", async (req, res) => {
  const intentObj = req.body;

  // Decide deterministically first
  let decision = "DENY";
  let reason = "no_acceptance_issued";

  const actorId =
    (intentObj &&
      intentObj.actor &&
      intentObj.actor.id &&
      String(intentObj.actor.id)) ||
    "unknown";

  const intentName =
    (intentObj && typeof intentObj.intent === "string" && intentObj.intent) ||
    "unknown_intent";

  try {
    if (!intentObj || !intentObj.intent || !intentObj.actor?.id) {
      decision = "DENY";
      reason = "invalid_authorize_request";
    } else if (
      intentObj.intent === "generate_court_filing_language" &&
      typeof intentObj.context?.deadline_minutes === "number" &&
      intentObj.context.deadline_minutes <= 30
    ) {
      decision = "ESCALATE";
      reason = "high_liability_time_constrained_action_requires_external_acceptance";
    } else {
      decision = "DENY";
      reason = "no_acceptance_issued";
    }

    // Always attempt to write evidence for authorize decisions
    // (best-effort; DO NOT block authorize response)
    try {
      await ledgerWrite({
        actor_id: actorId,
        intent: intentName,
        intent_hash: computeIntentHash(intentObj),
        execute_hash: null,
        acceptance_hash: null,
        decision,
        reason,
      });
    } catch (e) {
      console.error("[LEDGER][AUTHORIZE] write failed:", String(e?.message || e));
    }

    return res.status(200).json({ decision, reason });
  } catch (err) {
    const msg = err?.message ?? "unknown_error";

    // Try to record the error event as a DENY (best-effort)
    try {
      await ledgerWrite({
        actor_id: actorId,
        intent: intentName,
        intent_hash: computeIntentHash(intentObj),
        execute_hash: null,
        acceptance_hash: null,
        decision: "DENY",
        reason: "authorization_gate_error",
      });
    } catch (e) {
      console.error(
        "[LEDGER][AUTHORIZE][ERROR] write failed:",
        String(e?.message || e)
      );
    }

    return res.status(500).json({
      decision: "DENY",
      reason: "authorization_gate_error",
      error: msg,
    });
  }
});

/**
 * ------------------------------------------------------------
 * POST /v1/execute
 * Acceptance-only execution gate
 * FAIL CLOSED: if ledger write fails, decision is DENY.
 * ------------------------------------------------------------
 */
app.post("/v1/execute", async (req, res) => {
  const startedAt = new Date().toISOString();

  try {
    const { intent, execute, acceptance } = req.body || {};

    // Structural validation (fail closed)
    if (!intent || !intent.actor?.id || !intent.intent || !execute || !acceptance) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_execute_request",
      });
    }

    const actorId = String(intent.actor.id);
    const intentName = String(intent.intent);

    // Compute bindings
    const intentHash = computeIntentHash(intent);
    const executeHash = computeExecuteHash(execute);
    const acceptanceHash = computeAcceptanceHash(acceptance);

    // Acceptance fields
    const {
      issuer,
      actorId: acceptedActorId,
      intent: acceptedIntent,
      issuedAt,
      expiresAt,
      signature,
    } = acceptance;

    if (!issuer || !acceptedActorId || !acceptedIntent || !issuedAt || !expiresAt || !signature) {
      // FAIL CLOSED — write ledger (best effort) then deny
      try {
        await ledgerWrite({
          actor_id: actorId,
          intent: intentName,
          intent_hash: intentHash,
          execute_hash: executeHash,
          acceptance_hash: acceptanceHash,
          decision: "DENY",
          reason: "invalid_or_missing_acceptance",
        });
      } catch {
        // If ledger fails, we still deny; no execution proceeds.
      }

      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_acceptance",
      });
    }

    // Time window check
    const now = new Date();
    if (now < new Date(issuedAt) || now > new Date(expiresAt)) {
      try {
        await ledgerWrite({
          actor_id: actorId,
          intent: intentName,
          intent_hash: intentHash,
          execute_hash: executeHash,
          acceptance_hash: acceptanceHash,
          decision: "DENY",
          reason: "acceptance_not_in_valid_time_window",
        });
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "acceptance_not_in_valid_time_window",
      });
    }

    // Binding checks
    if (String(acceptedActorId) !== actorId) {
      try {
        await ledgerWrite({
          actor_id: actorId,
          intent: intentName,
          intent_hash: intentHash,
          execute_hash: executeHash,
          acceptance_hash: acceptanceHash,
          decision: "DENY",
          reason: "actor_binding_mismatch",
        });
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "actor_binding_mismatch",
      });
    }

    if (String(acceptedIntent) !== intentName) {
      try {
        await ledgerWrite({
          actor_id: actorId,
          intent: intentName,
          intent_hash: intentHash,
          execute_hash: executeHash,
          acceptance_hash: acceptanceHash,
          decision: "DENY",
          reason: "intent_binding_mismatch",
        });
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "intent_binding_mismatch",
      });
    }

    // Verify external signature binds to executeHash
    const sigOk = verifyAcceptanceSignature(acceptance, executeHash);
    if (!sigOk) {
      try {
        await ledgerWrite({
          actor_id: actorId,
          intent: intentName,
          intent_hash: intentHash,
          execute_hash: executeHash,
          acceptance_hash: acceptanceHash,
          decision: "DENY",
          reason: "invalid_acceptance_signature",
        });
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_acceptance_signature",
      });
    }

    // PERMIT — but FAIL CLOSED if we cannot persist proof
    try {
      await ledgerWrite({
        actor_id: actorId,
        intent: intentName,
        intent_hash: intentHash,
        execute_hash: executeHash,
        acceptance_hash: acceptanceHash,
        decision: "PERMIT",
        reason: "valid_acceptance_signature",
      });
    } catch (e) {
      const msg = String(e?.message || "ledger_write_failed");

      // Replay resistance: DB enforces unique acceptance_hash via:
      // solace_ledger_acceptance_hash_uniq on (acceptance_hash) WHERE acceptance_hash IS NOT NULL
      if (msg.includes("solace_ledger_acceptance_hash_uniq")) {
        return res.status(200).json({
          decision: "DENY",
          reason: "acceptance_replay_detected",
        });
      }

      return res.status(200).json({
        decision: "DENY",
        reason: "ledger_write_failed",
        error: msg,
      });
    }

    return res.status(200).json({
      decision: "PERMIT",
      executeHash,
      intentHash,
      issuedAt,
      expiresAt,
      time: startedAt,
    });
  } catch (err) {
    const msg = err?.message ?? "unknown_error";
    return res.status(500).json({
      decision: "DENY",
      reason: "execution_gate_error",
      error: msg,
    });
  }
});

/**
 * ------------------------------------------------------------
 * Start server
 * ------------------------------------------------------------
 */
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log("Legacy server listening...");
});
