# Solace Core Authority API — Contract README

This directory contains the **canonical, versioned API contracts** for **Solace Core**, the runtime execution authority engine.

These files are **not implementation details**.  
They are **constitutional artifacts** that define authority, responsibility, and failure semantics.

---

## What This API Is

**Solace Core** is a **Policy Decision Point (PDP)** for high-consequence AI and automated systems.

It evaluates **proposed intents** and returns a **binding authority decision**:

- `PERMIT`
- `DENY`
- `ESCALATE`

Solace Core:
- does **not** execute tools
- does **not** generate language
- does **not** perform inference
- does **not** store prompts or model outputs

It governs **whether action is allowed**, not *how* actions are performed.

---

## What This API Is Not

Solace Core is **not**:
- an AI model
- an agent framework
- a content moderation system
- an explainability engine
- a workflow orchestrator
- a policy suggestion service

If Solace returns `DENY` or `ESCALATE`, **no side effects may occur**.

---

## Fail-Closed Invariant (Non-Negotiable)

All clients integrating with Solace Core **MUST** enforce the following:

- Network failure → treat as `DENY`
- 4xx / 5xx / 429 → treat as `DENY`
- Malformed response → treat as `DENY`
- Unknown obligation → treat as `REQUIRED` → no execution

This invariant is the foundation of Solace’s compliance and liability model.

---

## File Structure

docs/
└── api/
├── README.md
└── openapi.solace-core-authority.v1.1.1.yaml


- Each OpenAPI file is **versioned and immutable**
- New behavior = **new file**, never edits in place

---

## Versioning Policy

OpenAPI specs follow **semantic versioning**:

- **Patch (v1.1.x)**  
  Clarifications, examples, optional fields, documentation improvements  
  *No breaking changes*

- **Minor (v1.x.0)**  
  Backwards-compatible schema additions (new optional fields, obligations, endpoints)

- **Major (v2.0.0)**  
  Breaking changes (new required fields, altered semantics, changed invariants)

Once committed:
- ❌ Do not modify existing versions
- ✅ Add a new versioned file instead

This guarantees:
- verifiable attestation
- audit traceability
- legal defensibility

---

## Regulatory Alignment

The Solace Core Authority API is designed to support:

- **EU AI Act (High-Risk Systems)**  
  - Human oversight (Articles 14, 26)
  - Risk classification and mitigation
  - Auditability and post-market monitoring
- **Medical / Health Systems**
- **Financial & Legal Decision Systems**
- **Safety-critical automation**

The `ESCALATE → obligation → ack → re-evaluation` flow is intentional and maps directly to real regulatory oversight requirements.

---

## Obligations & Evidence

Solace may return **obligations** alongside decisions, such as:

- `HUMAN_APPROVAL`
- `DUAL_CONTROL`
- `INCIDENT_REPORT`
- `EXPLAIN_DECISION`
- `REDACT_OUTPUT`

Obligations:
- are **enforceable**
- may require **evidence** (hashes, cryptographic proofs)
- are **binding** unless explicitly satisfied and acknowledged

Unknown or unsupported obligations **must not be ignored**.

---

## Attestation & Audit

The `/v1/attestation` endpoint exposes:

- invariant version + hash
- boundary declaration hash
- policy pack versions + hashes
- optional tenant contract snapshot hash

This enables statements like:

> “On 2026-02-09, this system was governed by Solace Core v1.1.1 with policy pack eu-ai-act@2026-02-01 under these invariants.”

That is the intended outcome.

---

## Related Documentation

Recommended companion documents (located elsewhere in the repo):

- `POLICY_PACK_AUTHORING_GUIDE.md`  
  How to write deterministic, auditable policy packs

- `THREAT_MODEL.md`  
  What Solace mitigates — and what it explicitly does not

- `INTEGRATION_PATTERNS.md`  
  Canonical enforcement patterns (executor gate, proxy, human-in-the-loop)

---

## Design Principle (Keep This in Mind)

> **Language is free.  
> Effects are governed.  
> Authority is external.**

If a proposed change violates that principle, it does not belong in Solace Core.

---

## Final Note

This directory defines the **hard boundary** of Solace Core.

If you are unsure whether something belongs here, it probably does not.

Governance stays small.  
Authority stays sharp.  
Everything else happens elsewhere.
