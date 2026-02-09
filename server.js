// server.js
// Solace Core Authority — Acceptance-Only (Model B)
// Verifies externally issued acceptance, binds to execution, fail-closed.

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

console.log("BOOT FILE:", import.meta.url);

const app = express();

/**
 * ------------------------------------------------------------
 * Health check (MUST be before body parsing)
 * ------------------------------------------------------------
 */
app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "solace-core-authority",
    mode: "acceptance-only",
    time: new Date().toISOString()
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
      message: err.message
    });
  }
  next(err);
});

/**
 * ------------------------------------------------------------
 * Audit log (append-only, hash-chained)
 * ------------------------------------------------------------
 */
const LOG_DIR = path.join(process.cwd(), "logs");
const AUDIT_PATH = path.join(LOG_DIR, "audit.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function loadLastAuditHash() {
  try {
    if (!fs.existsSync(AUDIT_PATH)) return "GENESIS";
    const lines = fs.readFileSync(AUDIT_PATH, "utf8").trim().split("\n");
    if (!lines.length) return "GENESIS";
    return JSON.parse(lines[lines.length - 1]).hash || "GENESIS";
  } catch {
    return null;
  }
}

let LAST_AUDIT_HASH = null;

function appendAudit(event, payload) {
  ensureLogDir();

  if (LAST_AUDIT_HASH === null) {
    LAST_AUDIT_HASH = loadLastAuditHash();
  }
  if (LAST_AUDIT_HASH === null) {
    throw new Error("audit_log_unreadable");
  }

  const entry = {
    ts: new Date().toISOString(),
    event,
    payload,
    prevHash: LAST_AUDIT_HASH
  };

  const hash = sha256Hex(JSON.stringify(entry));
  fs.appendFileSync(
    AUDIT_PATH,
    JSON.stringify({ ...entry, hash }) + "\n",
    "utf8"
  );

  LAST_AUDIT_HASH = hash;
}

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
 * Canonicalization helpers
 * ------------------------------------------------------------
 */
function canonical(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function computeExecuteHash(execute) {
  return sha256Hex(canonical(execute));
}

function verifyAcceptanceSignature(acceptance, executeHash) {
  const {
    issuer,
    actorId,
    intent,
    issuedAt,
    expiresAt,
    signature
  } = acceptance;

  const material = canonical({
    issuer,
    actorId,
    intent,
    executeHash,
    issuedAt,
    expiresAt
  });

  const verifier = crypto.createVerify("SHA256");
  verifier.update(material);

  return verifier.verify(ISSUER_PUBLIC_KEY, signature, "base64");
}

/**
 * ------------------------------------------------------------
 * POST /v1/execute
 * ------------------------------------------------------------
 */
app.post("/v1/execute", (req, res) => {
  try {
    const { intent, execute, acceptance } = req.body || {};

    // --- Structural guards ---
    if (
      !intent ||
      !intent.actor?.id ||
      !intent.intent ||
      !execute ||
      !acceptance
    ) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_execute_request"
      });
    }

    const {
      issuer,
      actorId,
      intent: acceptedIntent,
      issuedAt,
      expiresAt,
      signature
    } = acceptance;

    if (
      !issuer ||
      !actorId ||
      !acceptedIntent ||
      !issuedAt ||
      !expiresAt ||
      !signature
    ) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_acceptance"
      });
    }

    // --- Temporal validity ---
    const now = new Date();
    if (now < new Date(issuedAt) || now > new Date(expiresAt)) {
      return res.status(200).json({
        decision: "DENY",
        reason: "acceptance_not_in_valid_time_window"
      });
    }

    // --- Actor binding ---
    if (actorId !== intent.actor.id) {
      return res.status(200).json({
        decision: "DENY",
        reason: "actor_binding_mismatch"
      });
    }

    // --- Intent binding ---
    if (acceptedIntent !== intent.intent) {
      return res.status(200).json({
        decision: "DENY",
        reason: "intent_binding_mismatch"
      });
    }

    // --- Execution binding ---
    const executeHash = computeExecuteHash(execute);
    const sigValid = verifyAcceptanceSignature(acceptance, executeHash);

    if (!sigValid) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_acceptance_signature"
      });
    }

    appendAudit("execute_permitted", {
      actorId,
      intent: intent.intent,
      execute,
      issuer
    });

    return res.status(200).json({
      decision: "PERMIT",
      actorId,
      intent: intent.intent,
      executeHash,
      issuer,
      consumedAt: new Date().toISOString()
    });
  } catch (err) {
    const msg = err?.message ?? "unknown_error";
    try {
      appendAudit("execute_error", { error: msg });
    } catch {}
    return res.status(500).json({
      decision: "DENY",
      reason: "execution_gate_error",
      error: msg
    });
  }
});

/**
 * ------------------------------------------------------------
 * Start server
 * ------------------------------------------------------------
 */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on http://localhost:${PORT}`);
  console.log("Mode: acceptance-only (external authority required)");
});
