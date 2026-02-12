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
 * Legacy issuer public key (fallback only)
 * ------------------------------------------------------------
 * If no authorityKeyId is provided in acceptance, we fall back
 * to issuer.pub for backwards compatibility.
 */
const ISSUER_PUB_PATH = path.join(process.cwd(), "issuer.pub");
if (!fs.existsSync(ISSUER_PUB_PATH)) {
  throw new Error("issuer_pubkey_missing");
}
const ISSUER_PUBLIC_KEY_FALLBACK = fs.readFileSync(ISSUER_PUB_PATH, "utf8");

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
 * Authority key lookup (registry)
 * ------------------------------------------------------------
 * acceptance may optionally include:
 * - authorityKeyId (preferred) OR authority_key_id (legacy snake)
 *
 * If present, Solace Core will fetch the public key from
 * public.solace_authority_keys and verify against it (fail-closed).
 */
const AUTHORITY_KEY_CACHE = new Map(); // keyId -> { row, cachedAtMs }
const AUTHORITY_KEY_CACHE_TTL_MS = 60_000; // 60s (safe + cheap)

function asUuidString(v) {
  if (!v) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function parseTs(ts) {
  const d = new Date(String(ts || ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinValidityWindow(row, now) {
  const from = parseTs(row.valid_from);
  if (!from) return false;
  if (now < from) return false;

  if (row.valid_until) {
    const until = parseTs(row.valid_until);
    if (!until) return false;
    if (now > until) return false;
  }

  return true;
}

async function fetchAuthorityKeyById(authorityKeyId) {
  const keyId = asUuidString(authorityKeyId);
  if (!keyId) return { ok: false, reason: "missing_authority_key_id" };

  const cached = AUTHORITY_KEY_CACHE.get(keyId);
  const nowMs = Date.now();
  if (cached && nowMs - cached.cachedAtMs < AUTHORITY_KEY_CACHE_TTL_MS) {
    return { ok: true, row: cached.row };
  }

  const { data, error } = await supabase
    .from("solace_authority_keys")
    .select("id, organization_id, principal_id, public_key, key_purpose, valid_from, valid_until, status")
    .eq("id", keyId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "authority_key_lookup_failed", error: String(error.message || error) };
  }
  if (!data) {
    return { ok: false, reason: "authority_key_not_found" };
  }

  AUTHORITY_KEY_CACHE.set(keyId, { row: data, cachedAtMs: nowMs });
  return { ok: true, row: data };
}

/**
 * ------------------------------------------------------------
 * Signature verification for acceptance
 * ------------------------------------------------------------
 * Acceptance signs canonical material including executeHash.
 */
function verifyAcceptanceSignatureWithKey(acceptance, executeHash, publicKeyPem) {
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

  return verifier.verify(publicKeyPem, signature, "base64");
}

/**
 * ------------------------------------------------------------
 * Ledger write (Supabase)
 * ------------------------------------------------------------
 * NOTE: prev_hash + entry_hash are computed in DB trigger.
 * Core supplies decision facts + binding hashes.
 */
async function ledgerWrite({
  actor_id,
  intent,
  intent_hash,
  execute_hash,
  acceptance_hash,
  decision,
  reason,
  organization_id,
  principal_id,
  authority_key_id,
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
    organization_id: organization_id || null,
    principal_id: principal_id || null,
    authority_key_id: authority_key_id || null,
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
 * Non-executing authority inquiry (advisory)
 * ------------------------------------------------------------
 */
app.post("/v1/authorize", async (req, res) => {
  const intentObj = req.body;

  let decision = "DENY";
  let reason = "no_acceptance_issued";

  const actorId =
    (intentObj && intentObj.actor && intentObj.actor.id && String(intentObj.actor.id)) ||
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

    // Best-effort evidence write (authorize is advisory; do not block response)
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
      console.error("[LEDGER][AUTHORIZE][ERROR] write failed:", String(e?.message || e));
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
 *
 * Replay resistance is enforced by DB unique index on acceptance_hash:
 *   solace_ledger_acceptance_hash_uniq (acceptance_hash) WHERE acceptance_hash IS NOT NULL
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
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_acceptance",
      });
    }

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

    // Registry key selection (optional, fail-closed if provided but invalid)
    const authorityKeyId =
      asUuidString(acceptance.authorityKeyId) || asUuidString(acceptance.authority_key_id);

    let verificationKeyPem = ISSUER_PUBLIC_KEY_FALLBACK;
    let ledgerAuthorityKeyId = null;
    let ledgerOrgId = null;
    let ledgerPrincipalId = null;

    if (authorityKeyId) {
      const keyRes = await fetchAuthorityKeyById(authorityKeyId);
      if (!keyRes.ok) {
        try {
          await ledgerWrite({
            actor_id: actorId,
            intent: intentName,
            intent_hash: intentHash,
            execute_hash: executeHash,
            acceptance_hash: acceptanceHash,
            decision: "DENY",
            reason: keyRes.reason || "invalid_authority_key",
          });
        } catch {}

        return res.status(200).json({
          decision: "DENY",
          reason: keyRes.reason || "invalid_authority_key",
        });
      }

      const row = keyRes.row;

      if (String(row.status || "").toLowerCase() !== "active") {
        try {
          await ledgerWrite({
            actor_id: actorId,
            intent: intentName,
            intent_hash: intentHash,
            execute_hash: executeHash,
            acceptance_hash: acceptanceHash,
            decision: "DENY",
            reason: "authority_key_inactive",
            authority_key_id: row.id,
            organization_id: row.organization_id,
            principal_id: row.principal_id,
          });
        } catch {}

        return res.status(200).json({
          decision: "DENY",
          reason: "authority_key_inactive",
        });
      }

      if (!isWithinValidityWindow(row, now)) {
        try {
          await ledgerWrite({
            actor_id: actorId,
            intent: intentName,
            intent_hash: intentHash,
            execute_hash: executeHash,
            acceptance_hash: acceptanceHash,
            decision: "DENY",
            reason: "authority_key_outside_validity_window",
            authority_key_id: row.id,
            organization_id: row.organization_id,
            principal_id: row.principal_id,
          });
        } catch {}

        return res.status(200).json({
          decision: "DENY",
          reason: "authority_key_outside_validity_window",
        });
      }

      verificationKeyPem = row.public_key;
      ledgerAuthorityKeyId = row.id;
      ledgerOrgId = row.organization_id;
      ledgerPrincipalId = row.principal_id;
    }

    // Verify external signature binds to executeHash
    const sigOk = verifyAcceptanceSignatureWithKey(acceptance, executeHash, verificationKeyPem);
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
          authority_key_id: ledgerAuthorityKeyId,
          organization_id: ledgerOrgId,
          principal_id: ledgerPrincipalId,
        });
      } catch {}

      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_acceptance_signature",
      });
    }

    // PERMIT — FAIL CLOSED if we cannot persist proof (and enforce replay resistance)
    try {
      await ledgerWrite({
        actor_id: actorId,
        intent: intentName,
        intent_hash: intentHash,
        execute_hash: executeHash,
        acceptance_hash: acceptanceHash,
        decision: "PERMIT",
        reason: "valid_acceptance_signature",
        authority_key_id: ledgerAuthorityKeyId,
        organization_id: ledgerOrgId,
        principal_id: ledgerPrincipalId,
      });
    } catch (e) {
      const msg = String(e?.message || "ledger_write_failed");

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
      authorityKeyId: ledgerAuthorityKeyId || null,
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
