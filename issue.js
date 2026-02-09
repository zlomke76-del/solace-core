#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";

// ---- config ----
const ISSUER_ID = "human-board-1";
const KEY_PATH = "./issuer.key";
const TTL_MINUTES = 60;

// ---- helpers ----
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonical(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// ---- load key ----
const privateKey = fs.readFileSync(KEY_PATH, "utf8");

// ---- input ----
const [,, intentPath, executePath, actorId ] = process.argv;
if (!intentPath || !executePath || !actorId) {
  console.error("Usage: issue <intent.json> <execute.json> <actorId>");
  process.exit(1);
}

const intent = JSON.parse(fs.readFileSync(intentPath));
const execute = JSON.parse(fs.readFileSync(executePath));

// ---- compute binding ----
const executeHash = sha256(canonical(execute));

const issuedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();

const material = canonical({
  issuer: ISSUER_ID,
  actorId,
  intent,
  executeHash,
  issuedAt,
  expiresAt
});

// ---- sign ----
const signature = crypto
  .createSign("SHA256")
  .update(material)
  .sign(privateKey, "base64");

// ---- output ----
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
