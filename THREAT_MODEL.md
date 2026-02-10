# Solace Core Threat Model

This document describes the threats **Solace Core mitigates** and those that are **explicitly out of scope**.

Solace Core is a **runtime execution authority enforcement point** that verifies whether execution of an action is permitted.
It emits binding **PERMIT** or **DENY** outcomes based on cryptographic and structural authority checks.

Governance decisions such as **ESCALATE** occur in upstream governance systems and must be resolved before execution authority is issued.

---

## Trust Boundaries

### In scope
- Solace Core runtime service
- Execution authority verification logic
- Acceptance validation and binding
- Decision issuance (PERMIT / DENY)
- Decision logging and audit chaining
- Attestation endpoint (runtime, invariant, and boundary hashes)

### Out of scope (by design)
- Model weights, prompts, or inference behavior
- Natural language reasoning or interpretation
- Tool execution engines and side-effecting runtimes
- External data stores (except Solace-managed logs, if applicable)
- Customer internal authorization systems (unless explicitly integrated)
- Client-side executor enforcement

---

## Primary Threats Mitigated

### 1) Bypass of execution authority
**Threat:** A system executes side effects without valid runtime authority.  
**Mitigation:** Solace Core enforces a fail-closed execution gate and emits verifiable PERMIT/DENY decisions with audit evidence.  
**Residual:** Solace Core cannot prevent bypass if the customer’s execution environment ignores or circumvents the control plane.

---

### 2) Silent escalation avoidance
**Threat:** A system receives an escalation requirement upstream and proceeds without resolving it.  
**Mitigation:** Solace Core requires a valid execution acceptance; without it, execution is denied.  
**Residual:** Upstream governance resolution must be enforced by the customer before acceptance issuance.

---

### 3) Evidence forgery or replay
**Threat:** Forged or replayed approvals (human consent, external authority).  
**Mitigation:** Evidence references are hashed, time-bound, and optionally cryptographically verifiable (JWT/JWS/COSE). Acceptance artifacts bind evidence implicitly via issuance.  
**Residual:** If customers accept weak or opaque evidence formats, assurance is reduced.

---

### 4) Decision tampering or repudiation
**Threat:** Disputes over which rules or invariants applied at execution time.  
**Mitigation:** Decisions include invariant and boundary versions; attestation endpoints expose hashes for reconstruction.  
**Residual:** Requires secure log storage and access controls in the customer environment.

---

### 5) Replay and race conditions
**Threat:** Duplicate or replayed execution requests cause double execution.  
**Mitigation:** Acceptance artifacts are time-bound and execution-bound; Solace Core enforces validity windows.  
**Residual:** Customers must implement idempotent execution downstream to fully prevent double effects.

---

### 6) Undetected policy or invariant drift
**Threat:** Runtime behavior changes due to silent policy or invariant updates.  
**Mitigation:** Versioned invariants and boundary declarations with cryptographic hashes exposed via attestation.  
**Residual:** Operational discipline is required to prevent unauthorized changes.

---

## Threats Explicitly Not Mitigated

### A) Model jailbreaks or prompt injection
Solace Core does not inspect prompts, model outputs, or intermediate reasoning.

### B) Incorrect or hallucinated model outputs
Solace Core governs execution authority, not correctness or truthfulness.

### C) Training data poisoning or model compromise
Out of scope.

### D) Customer infrastructure compromise
If an attacker controls the customer’s execution environment, Solace Core cannot prevent local bypass.

---

## Recommended Compensating Controls (Customer Side)

- Executor-level hard gate: no side effects unless decision == PERMIT
- Capability isolation and least-privilege execution
- Immutable, append-only execution logs
- Signed human or external authority workflows
- Monitoring and alerting for:
  - spikes in DENY
  - repeated escalation loops
  - anomalous intent or execution patterns

---

## Security Posture Summary

Solace Core functions as:

- **Control-plane execution authority**
- **Cryptographic enforcement boundary**
- **Evidence and audit anchor**
- **Fail-closed runtime guard**

Solace Core is **not**:

- a content moderation system
- an inference auditor
- a complete security boundary by itself

Security requires correct integration at the execution layer.
