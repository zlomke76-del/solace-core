// server.js
// Runtime HTTP wrapper for Solace Core Authority
// Adds: permit store, one-time permit consumption, audit log (hash-chained)

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authorizeExecution } from "./authority-engine.js";

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
      error: "invalid_json",
      message: err.message
    });
  }
  next(err);
});

// ------------------------------------------------------------
// Permit Store (in-memory)
// ------------------------------------------------------------
const PERMITS = new Map();

// ------------------------------------------------------------
// Hash-chained audit log (append-only, fail-closed)
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// POST /v1/authorize
// ------------------------------------------------------------
app.post("/v1/authorize", (req, res) => {
  try {
    const decision = authorizeExecution(req.body);

    appendAudit("authorize_decision", {
      request: {
        actorId: req.body?.actor?.id,
        intent: req.body?.intent
      },
      decision
    });

    if (decision.decision === "PERMIT") {
      PERMITS.set(decision.permitId, {
        permitId: decision.permitId,
        jti: decision.jti,
        actorId: req.body.actor.id,
        intent: req.body.intent,
        expiresAt: decision.expiresAt,
        issuedAt: new Date().toISOString(),
        consumedAt: null
      });
    }

    return res.status(200).json(decision);
  } catch (err) {
    const msg = err?.message ?? "unknown_error";
    try {
      appendAudit("authorize_error", { error: msg });
    } catch {}
    return res.status(500).json({
      decision: "DENY",
      reason: "authority_evaluation_error",
      error: msg
    });
  }
});

// ------------------------------------------------------------
// POST /v1/execute
// ------------------------------------------------------------
app.post("/v1/execute", (req, res) => {
  try {
    const { permitId, jti, actor, intent } = req.body || {};

    if (!permitId || !jti || !actor?.id || !intent) {
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_execute_request"
      });
    }

    const record = PERMITS.get(permitId);
    if (!record) {
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_not_found"
      });
    }

    if (
      record.jti !== jti ||
      record.actorId !== actor.id ||
      record.intent !== intent
    ) {
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_binding_mismatch"
      });
    }

    if (record.consumedAt) {
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_already_consumed"
      });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_expired"
      });
    }

    record.consumedAt = new Date().toISOString();
    appendAudit("execute_permitted", { permitId });

    return res.status(200).json({
      decision: "PERMIT",
      permitId,
      consumedAt: record.consumedAt
    });
  } catch (err) {
    const msg = err?.message ?? "unknown_error";
    return res.status(500).json({
      decision: "DENY",
      reason: "execution_gate_error",
      error: msg
    });
  }
});

// ------------------------------------------------------------
// GET /v1/permit/:permitId (debug)
// ------------------------------------------------------------
app.get("/v1/permit/:permitId", (req, res) => {
  return res.status(200).json(PERMITS.get(req.params.permitId) || null);
});

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on http://localhost:${PORT}`);
});
