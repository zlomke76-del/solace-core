# Solace Core Threat Model

This document describes the threats Solace Core mitigates and the threats that remain out of scope.

Solace Core is an **authority decision point** (PDP) that governs execution by emitting PERMIT / DENY / ESCALATE.

---

## Trust Boundaries

### In scope
- Solace Core service/runtime
- Policy packs and invariant set
- Attestation endpoint (versions/hashes)
- Decision issuance and logging

### Out of scope (by design)
- Model weights, prompts, token generation
- Tool execution engines
- External data stores (except log storage if you operate it)
- Customer internal authorization systems (unless integrated)

---

## Primary Threats Mitigated

### 1) Bypass of governance controls
**Threat:** Client executes actions without calling Solace, or ignores DENY/ESCALATE.  
**Mitigation:** Architectural requirement + contractual binding + verifiable decision logs/attestation.  
**Residual:** Solace cannot force client enforcement unless paired with integration verification or control-plane embedding.

### 2) Silent escalation avoidance
**Threat:** System “soft-fails” escalation and proceeds anyway.  
**Mitigation:** ESCALATE is a hard stop semantics; recommended integration patterns enforce gating.  
**Residual:** Same as above—client-side enforcement must be real.

### 3) Evidence forgery (human approvals, consent)
**Threat:** Fake approvals or replayed approvals.  
**Mitigation:** Evidence hash pointers + optional cryptographic proof (JWT/JWS/COSE) + expiry windows + idempotency.  
**Residual:** If customers choose opaque proofs or weak signing, quality degrades.

### 4) Decision tampering and repudiation
**Threat:** Parties dispute what policy/invariants applied at the time.  
**Mitigation:** Decision payload includes policy_version and invariant_version; attestation returns hashes.  
**Residual:** Requires secure storage and access controls on logs.

### 5) Replay and race conditions
**Threat:** Duplicate requests produce inconsistent decisions or double execution.  
**Mitigation:** request_id idempotency; decision_id-bound /ack flow; expiry.  
**Residual:** Customers must implement idempotent execution downstream as well.

### 6) Policy drift / untracked changes
**Threat:** Policy changes silently alter runtime behavior.  
**Mitigation:** Versioned policy packs + sha256 + attestation + immutable version discipline.  
**Residual:** Operational processes must prevent “hot edits.”

---

## Threats Explicitly Not Mitigated

### A) Model jailbreaks / prompt injection
Solace does not inspect prompts or completions. Mitigation must occur in:
- intent construction
- tool/runtime sandboxes
- input/output filtering in the client system

### B) Incorrect model outputs (hallucinations)
Solace governs execution, not truthfulness of language.

### C) Data poisoning / training compromise
Out of scope.

### D) Customer infra compromise
If attacker owns the customer’s executor, they can bypass any guard not embedded at the control plane.

---

## Recommended Compensating Controls (Customer Side)

- Executor-level enforcement gate: “no side effects unless decision == PERMIT”
- Immutable append-only logs in customer environment
- Human approval workflows issuing signed proofs
- Tool sandboxing and least-privilege capabilities
- Monitoring:
  - spikes in DENY
  - repeated escalation loops
  - unusual intent patterns

---

## Security Posture Summary

Solace is best understood as:
- **Control-plane authority**
- **Evidence generation**
- **Fail-closed runtime guard**

It is not:
- a content safety filter
- an inference auditor
- a complete security boundary by itself
