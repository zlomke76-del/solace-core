# Solace Core Integration Patterns

This document shows common end-to-end integration patterns.

Key principle:
**Language flows freely. Effects are gated.**

---

## Pattern 1 — Agent Executor Gate (Recommended Default)

User → LLM → (proposes intent) → Solace → decision → Executor → Tool/API

### Flow
1. LLM produces a plan or suggestion.
2. Product/executor constructs an Intent (metadata only).
3. Call `/v1/authority/evaluate`.
4. If PERMIT → execute tool/API.
5. If DENY → refuse.
6. If ESCALATE → route to human approval workflow; then `/ack`.

### Why it works
- Solace remains governance-only.
- Executors enforce “no side effects without PERMIT.”

---

## Pattern 2 — Proxy Enforcement (When tools are centralized)

Agent → Tool Proxy → Solace → decision → Tool Proxy executes/blocks


### Use when
- Many agents share the same set of tools.
- You want enforcement in a single choke point.

### Notes
- Proxy must be the only path to tools (capability revocation elsewhere).
- Great for “non-bypassability” proofs.

---

## Pattern 3 — Human Approval Workflow (ESCALATE loop)

Evaluate → ESCALATE → Human UI → signed proof → /ack → PERMIT → execute


### Key requirements
- Human approvals produce:
  - evidence_hash (pointer)
  - proof (JWT/JWS/etc.) + expiry
- `/ack` binds to the original decision_id
- If expired, re-evaluate

---

## Pattern 4 — “Explain / Notify / Redact” Obligations

Solace may emit obligations like:
- EXPLAIN_DECISION
- USER_NOTIFICATION
- REDACT_OUTPUT / SANITIZE_OUTPUT

These are enforced by the caller, not Solace.

Example:
- Solace returns PERMIT with REDACT_OUTPUT obligation
- Client applies output sanitation before execution or display
- Client logs the fulfillment metadata

---

## Pattern 5 — Post-Market Monitoring Hooks

Solace logs enable monitoring without inspecting prompts.

Recommended metrics:
- DENY rate by intent_type
- ESCALATE rate by domain
- OBLIGATION_NOT_SATISFIED frequency
- high-risk intent quota usage (429 risk throttles)

Alert on:
- sudden spikes
- repeated retries on DENY
- escalation loops without resolution

---

## Canonical Client Enforcement Rules (Non-Negotiable)

1. If Solace is unreachable → treat as DENY.
2. If response is malformed → treat as DENY.
3. If decision == DENY → no side effects.
4. If decision == ESCALATE → no side effects until obligations satisfied and PERMIT issued.
5. Execution must be idempotent downstream (decision_id should be part of idempotency keying).

---

## Intent Hashing (Recommended)

To correlate across systems without storing prompts:

Compute:

`intent_hash = SHA-256(canonical_json(intent))`

Canonical JSON rules (recommended):
- UTF-8 encoding
- object keys sorted lexicographically
- no insignificant whitespace
- arrays preserved in order
- numbers normalized (avoid floating ambiguity)

Store only:
- intent_hash
- decision_id
- timestamps
- reason_code

---

## Deployment Notes

- Run Solace as a separate service (control plane).
- Keep policy packs immutable and versioned.
- Use attestation in audits:
  - prove what invariants/policies governed the system at time T.


