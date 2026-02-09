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
// Health check (explicit, non-authoritative)
// ------------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// ------------------------------------------------------------
// Permit Store (in-memory)
// For multi-instance: move to durable store (Redis/Postgres).
// ------------------------------------------------------------
const PERMITS = new Map(); // permitId -> { jti, actorId, intent, expiresAt, consumedAt? }

// ------------------------------------------------------------
// Hash-chained audit log (append-only)
// Fail-closed: if audit write fails, deny.
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
  try {
    if (!fs.existsSync(AUDIT_PATH)) return "GENESIS";
    const data = fs.readFileSync(AUDIT_PATH, "utf8");
    const lines = data.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "GENESIS";
    const last = JSON.parse(lines[lines.length - 1]);
    return last.hash || "GENESIS";
  } catch {
    return null; // fail closed
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

  const material = JSON.stringify(entry);
  const hash = sha256Hex(material);

  const finalEntry = { ...entry, hash };
  fs.appendFileSync(AUDIT_PATH, JSON.stringify(finalEntry) + "\n", "utf8");
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
        intent: req.body?.intent,
        issuedAt: req.body?.acceptance?.issuedAt,
        expiresAt: req.body?.acceptance?.expiresAt
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
      appendAudit("execute_denied", {
        reason: "invalid_or_missing_execute_request",
        request: { permitId, jti, actorId: actor?.id, intent }
      });
      return res.status(200).json({
        decision: "DENY",
        reason: "invalid_or_missing_execute_request"
      });
    }

    const record = PERMITS.get(permitId);
    if (!record) {
      appendAudit("execute_denied", {
        reason: "permit_not_found",
        request: { permitId, jti, actorId: actor.id, intent }
      });
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_not_found"
      });
    }

    if (record.jti !== jti || record.actorId !== actor.id || record.intent !== intent) {
      appendAudit("execute_denied", {
        reason: "permit_binding_mismatch",
        request: { permitId, jti, actorId: actor.id, intent }
      });
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_binding_mismatch"
      });
    }

    const now = new Date();
    const exp = new Date(record.expiresAt);
    if (now > exp) {
      appendAudit("execute_denied", {
        reason: "permit_expired",
        request: { permitId, jti, actorId: actor.id, intent }
      });
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_expired"
      });
    }

    if (record.consumedAt) {
      appendAudit("execute_denied", {
        reason: "permit_already_consumed",
        request: { permitId, jti, actorId: actor.id, intent }
      });
      return res.status(200).json({
        decision: "DENY",
        reason: "permit_already_consumed"
      });
    }

    record.consumedAt = new Date().toISOString();
    PERMITS.set(permitId, record);

    appendAudit("execute_permitted", {
      request: { permitId, jti, actorId: actor.id, intent },
      permit: { expiresAt: record.expiresAt, consumedAt: record.consumedAt }
    });

    return res.status(200).json({
      decision: "PERMIT",
      permitId,
      consumedAt: record.consumedAt
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

// ------------------------------------------------------------
// GET /v1/permit/:permitId (debug only)
// ------------------------------------------------------------
app.get("/v1/permit/:permitId", (req, res) => {
  const record = PERMITS.get(req.params.permitId);
  return res.status(200).json(record || null);
});

// ------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on http://localhost:${PORT}`);
});
