#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------
const ISSUER_ID = "human-board-1";
const KEY_PATH = "./issuer.key";
const TTL_MINUTES = 60;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonical(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// ------------------------------------------------------------
// Load issuer private key
// ------------------------------------------------------------
const privateKey = fs.readFileSync(KEY_PATH, "utf8");

// ------------------------------------------------------------
// CLI input
// ------------------------------------------------------------
const [, , intentPath, executePath, actorId] = process.argv;

if (!intentPath || !executePath || !actorId) {
  console.error("Usage: issue <intent.json> <execute.json> <actorId>");
  process.exit(1);
}

// ------------------------------------------------------------
// Load intent + execution
// ------------------------------------------------------------
const intentObj = JSON.parse(fs.readFileSync(intentPath, "utf8"));
const execute = JSON.parse(fs.readFileSync(executePath, "utf8"));

// ------------------------------------------------------------
// Extract authority-bound intent identifier
// ------------------------------------------------------------
if (!intentObj.intent) {
  console.error("intent.json missing required field: intent");
  process.exit(1);
}

const intent = intentObj.intent; // STRING ONLY (authoritative)

// ------------------------------------------------------------
// Compute execution binding
// ------------------------------------------------------------
const executeHash = sha256(canonical(execute));

// ------------------------------------------------------------
// Temporal window
// ------------------------------------------------------------
const issuedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();

// ------------------------------------------------------------
// Canonical material to sign
// ------------------------------------------------------------
const material = canonical({
  issuer: ISSUER_ID,
  actorId,
  intent,
  executeHash,
  issuedAt,
  expiresAt
});

// ------------------------------------------------------------
// Sign
// ------------------------------------------------------------
const signature = crypto
  .createSign("SHA256")
  .update(material)
  .sign(privateKey, "base64");

// ------------------------------------------------------------
// Output acceptance
// ------------------------------------------------------------
const acceptance = {
  issuer: ISSUER_ID,
  actorId,
  intent,
  executeHash,
  issuedAt,
  expiresAt,
  signature
};

console.log(JSON.stringify(acceptance, null, 2));
