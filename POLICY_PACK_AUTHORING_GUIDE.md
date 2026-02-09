# Solace Policy Pack Authoring Guide

This guide describes how to write **policy packs** that drive deterministic decisions, stable reason codes, and enforceable obligations in Solace Core.

Policy packs are **declarative constraint sets** layered on top of a stable authority kernel.

---

## Principles

1. **Determinism**
   - Same intent + same policy pack version ⇒ same decision outcome.

2. **Fail-closed**
   - When policy cannot confidently classify or validate required fields ⇒ DENY.

3. **Stable reason codes**
   - Reason codes are contract-grade identifiers used for audit, analytics, and legal reconstruction.

4. **Obligations are enforceable**
   - If you emit an obligation, clients must have a defined path to satisfy it (e.g., `/ack` evidence).

5. **Data minimization**
   - Policy packs should not require raw prompts or personal data to decide. Prefer metadata.

---

## Pack Structure (Recommended)

A policy pack SHOULD include:

- `policy_id` (string) e.g. `eu-ai-act`
- `version` (string) e.g. `2026-02-01`
- `sha256` (computed over pack content)
- `scope`:
  - `regions` (EU/US/UK/…)
  - optional `intent_types` allowlist
- `rules`:
  - ordered list of deterministic rules

---

## Rule Model (Conceptual)

Each rule SHOULD be defined as:

- `when`: predicate over intent fields
- `then`:
  - decision: PERMIT | DENY | ESCALATE
  - reason_code: stable identifier
  - reason: short human explanation
  - obligations: optional list

Rules MUST be ordered or made unambiguous. If two rules match and conflict, the pack must define priority resolution.

---

## Reason Codes

Reason codes MUST be:
- **Stable** across time within a policy family
- **Specific enough** to explain why
- **Non-sensitive** (no personal data)

Recommended format:

`{JURISDICTION}_{DOMAIN}_{CAUSE}`

Examples:
- `EU_HR_HUMAN_OVERSIGHT_REQUIRED`
- `EU_MINORS_RESTRICTED_ACTION`
- `US_PHI_REQUIRES_CONSENT`
- `GLOBAL_MALFORMED_INTENT_DENY`
- `OBLIGATION_NOT_SATISFIED`

---

## Obligations

Obligations are commitments the client must satisfy.

### Core obligation types (from OpenAPI)
- HUMAN_APPROVAL
- EXTERNAL_AUTHORITY
- LOG_PERSISTENCE
- USER_CONSENT
- DATA_MINIMIZATION
- INCIDENT_REPORT
- USER_NOTIFICATION
- EXPLAIN_DECISION
- REDACT_OUTPUT / SANITIZE_OUTPUT
- SECONDARY_APPROVAL / DUAL_CONTROL

### Extensions
If you need a new obligation:
- use `vendor_code` like `tenant:NOTIFY_SUPERVISOR`
- include `namespace` like `tenant` or `regulator-pack`

---

## Evidence and /ack

Policy packs that emit obligations requiring evidence MUST specify:
- evidence type (`human_approval`, `user_consent`, etc.)
- expected attestor role (e.g., `licensed_medical_professional`)
- whether cryptographic proof is required (`proof_type`)

Recommended:
- Use `evidence_hash` as pointer to client-held evidence store.
- Prefer JWT/JWS/CWT proofs for portability.

---

## Expiry Semantics

If a rule emits a decision with `expires_at`, define:
- default validity window per risk class
- behavior on expiry:
  - clients must re-evaluate
  - `/ack` should be rejected with `DECISION_EXPIRED`

---

## Policy Testing Checklist

Before publishing a pack version:

1. **Schema completeness**
   - All required fields referenced in predicates exist in the Intent schema.
2. **No ambiguous overlaps**
   - Two rules should not match the same condition with different outcomes unless priority is explicit.
3. **Reason code stability**
   - Codes are stable and documented.
4. **Obligation satisfiability**
   - Every obligation has a real fulfillment path.
5. **Fail-closed defaults**
   - Missing/unknown fields lead to DENY, not PERMIT.
6. **Versioning**
   - Pack version increments on any semantic change.

---

## Minimal EU High-Risk Pattern (Example)

If:
- jurisdiction.region == EU
- risk.risk_class == high
- action.side_effects includes health OR finance OR critical_infrastructure

Then:
- decision = ESCALATE
- reason_code = EU_HR_HUMAN_OVERSIGHT_REQUIRED
- obligations:
  - HUMAN_APPROVAL (licensed role)
  - LOG_PERSISTENCE (retention minimum)
  - EXPLAIN_DECISION (where required)

---

## Publishing Discipline

- Policy packs are published as immutable versions.
- Never mutate an existing version.
- Always provide a changelog entry per version:
  - added rules
  - changed thresholds
  - new obligations
  - deprecated reason codes
