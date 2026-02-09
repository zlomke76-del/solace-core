// server.js
// Runtime HTTP wrapper for Solace Core Authority
// Adds: permit store, one-time permit consumption, audit log (hash-chained)

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authorizeExecution } from "./authority-engine.js";

const app = express();
app.use(express.json());

// ------------------------------------------------------------
// Permit Store (in-memory)
// ------------------------------------------------------------
const PERMITS = new Map(); // permitId -> record

// ------------------------------------------------------------
// Audit log (hash chained)
// ------------------------------------------------------------
const LOG_DIR = path.join(process.cwd(), "logs");
const AUDIT_PATH = path.join(LOG_DIR, "audit.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function loadLastAuditHash() {
  if (!fs.existsSync(AUDIT_PATH)) return "GENESIS";
  const lines = fs.readFileSync(AUDIT_PATH, "utf8").trim().split("\n");
  if (!lines.length) return "GENESIS";
  const last = JSON.parse(lines[lines.length - 1]);
  return last.hash || "GENESIS";
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
  const finalEntry = { ...entry, hash };

  fs.appendFileSync(AUDIT_PATH, JSON.stringify(finalEntry) + "\n");
  LAST_AUDIT_HASH = hash;
}

// ------------------------------------------------------------
// HEALTH CHECK (you were missing this)
// ------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    time: new Date().toISOString()
  });
});

// ------------------------------------------------------------
// AUTHORIZE
// ------------------------------------------------------------
app.post("/v1/authorize", (req, res) => {
  try {
    const decision = authorizeExecution(req.body);

    appendAudit("authorize_decision", {
      actorId: req.body?.actor?.id,
      intent: req.body?.intent,
      issuedAt: req.body?.acceptance?.issuedAt,
      expiresAt: req.body?.acceptance?.expiresAt,
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

    res.json(decision);
  } catch (err) {
    try {
      appendAudit("authorize_error", { error: err.message });
    } catch {}

    res.status(500).json({
      decision: "DENY",
      reason: "authority_evaluation_error",
      error: err.message
    });
  }
});

// ------------------------------------------------------------
// EXECUTE (one-time consumption)
// ------------------------------------------------------------
app.post("/v1/execute", (req, res) => {
  try {
    const { permitId, jti, actor, intent } = req.body || {};

    if (!permitId || !jti || !actor?.id || !intent) {
      appendAudit("execute_denied", { reason: "invalid_request", permitId });
      return res.json({ decision: "DENY", reason: "invalid_request" });
    }

    const record = PERMITS.get(permitId);
    if (!record) {
      appendAudit("execute_denied", { reason: "permit_not_found", permitId });
      return res.json({ decision: "DENY", reason: "permit_not_found" });
    }

    if (
      record.jti !== jti ||
      record.actorId !== actor.id ||
      record.intent !== intent
    ) {
      appendAudit("execute_denied", {
        reason: "permit_binding_mismatch",
        permitId
      });
      return res.json({ decision: "DENY", reason: "permit_binding_mismatch" });
    }

    if (new Date() > new Date(record.expiresAt)) {
      appendAudit("execute_denied", { reason: "permit_expired", permitId });
      return res.json({ decision: "DENY", reason: "permit_expired" });
    }

    if (record.consumedAt) {
      appendAudit("execute_denied", {
        reason: "permit_already_consumed",
        permitId
      });
      return res.json({
        decision: "DENY",
        reason: "permit_already_consumed"
      });
    }

    record.consumedAt = new Date().toISOString();
    PERMITS.set(permitId, record);

    appendAudit("execute_permitted", {
      permitId,
      consumedAt: record.consumedAt
    });

    res.json({
      decision: "PERMIT",
      permitId,
      consumedAt: record.consumedAt
    });
  } catch (err) {
    try {
      appendAudit("execute_error", { error: err.message });
    } catch {}

    res.status(500).json({
      decision: "DENY",
      reason: "execution_gate_error",
      error: err.message
    });
  }
});

// ------------------------------------------------------------
// DEBUG: GET PERMIT
// ------------------------------------------------------------
app.get("/v1/permit/:permitId", (req, res) => {
  res.json(PERMITS.get(req.params.permitId) || null);
});

// ------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on http://localhost:${PORT}`);
});
