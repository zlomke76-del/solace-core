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
  return sha256Hex(canonical(intent));
}

function computeExecuteHash(execute) {
  return sha256Hex(canonical(execute));
}

function computeAcceptanceHash(acceptance) {
  return sha256Hex(canonical(acceptance));
}

/**
 * ------------------------------------------------------------
 * Signature verification for acceptance
 * ------------------------------------------------------------
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
 * POST /v1/execute
 * Acceptance-only execution gate
 * FAIL CLOSED: if ledger write fails, decision is DENY.
 * ------------------------------------------------------------
 */
app.post("/v1/execute", async (req, res) => {
  const startedAt = new Date().toISOString();

  try {
    const { intent, execute, acceptance } = req.body || {};

    if (!intent || !intent.actor?.id || !intent.intent || !execute || !acceptance) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_execute_request",
      });
    }

    const actorId = String(intent.actor.id);
    const intentName = String(intent.intent);

    const intentHash = computeIntentHash(intent);
    const executeHash = computeExecuteHash(execute);
    const acceptanceHash = computeAcceptanceHash(acceptance);

    const {
      issuer,
      actorId: acceptedActorId,
      intent: acceptedIntent,
      issuedAt,
      expiresAt,
      signature,
    } = acceptance;

    if (!issuer || !acceptedActorId || !acceptedIntent || !issuedAt || !expiresAt || !signature) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_acceptance",
      });
    }

    const now = new Date();
    if (now < new Date(issuedAt) || now > new Date(expiresAt)) {
      return res.status(200).json({
        decision: "DENY",
        reason: "acceptance_not_in_valid_time_window",
      });
    }

    if (String(acceptedActorId) !== actorId) {
      return res.status(200).json({
        decision: "DENY",
        reason: "actor_binding_mismatch",
      });
    }

    if (String(acceptedIntent) !== intentName) {
      return res.status(200).json({
        decision: "DENY",
        reason: "intent_binding_mismatch",
      });
    }

    const sigOk = verifyAcceptanceSignature(acceptance, executeHash);
    if (!sigOk) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_acceptance_signature",
      });
    }

    // PERMIT — enforce single-use acceptance via DB unique index
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
      const msg = String(e?.message || "");

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

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log("Solace Core Authority listening...");
});
