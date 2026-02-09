# AUTHORITY_API.md
Solace Core — Authority API (Public Contract)

Solace Core is a runtime execution authority engine. It evaluates **proposed action intents** and returns an enforceable decision: **Permit / Deny / Escalate**.

This document defines the **public contract** for integrating with Solace Core as an external control plane.

---

## Core Invariant

**Solace Core is the final authority on execution.**

- If Solace Core does **not** issue a `PERMIT`, **no side effects may occur**.
- If Solace Core is **unavailable**, **unreachable**, or **indeterminate**, execution **must fail closed**.
- Integrations may *propose*, *prepare*, and *simulate* actions, but may not execute side effects without an explicit `PERMIT`.

Authority is evaluated at runtime and is not inferred from prior approvals, confidence, learning, or optimization.

---

## Drift Prevention

Solace Core prevents execution drift by externalizing and enforcing execution authority at runtime. All actions that produce side effects must be declared as explicit action intents and submitted to Solace Core for authorization prior to execution. Solace Core evaluates each intent deterministically and statelessly, issuing a Permit, Deny, or Escalate decision. If Solace Core does not explicitly issue a Permit—due to denial, uncertainty, or unavailability—execution must fail closed and no side effects may occur. Because authority is enforced outside the reasoning or optimization layer, internal model behavior, confidence, learning, or adaptation cannot accumulate unchecked execution power over time. Drift may occur in reasoning, but it cannot manifest as action.

---

## Formal Authority Property

### Non-Bypassable Execution Authority

For any action \( A \) that produces side effects \( S \):

- Execution of \( A \) is permitted **if and only if** Solace Core issues an explicit `PERMIT` decision for \( A \) at runtime.
- If Solace Core returns `DENY`, `ESCALATE`, or is unavailable, unreachable, or indeterminate, then \( A \) **MUST NOT** execute and \( S = \varnothing \).
- There exists no execution path, retry mechanism, fallback, degraded mode, or override by which side effects may occur without a corresponding `PERMIT`.

This property is enforced by architectural design and is invariant over time.

---

## Trust Boundary

Solace Core must remain **external** to the systems it governs.

- Integrations call Solace Core over a defined interface.
- Integrations must not embed, modify, fork, or reinterpret Solace Core logic.
- Any system that can bypass Solace Core is **not governed** by Solace Core.

Authority exists only if it cannot be overridden.

---

## Definitions

### Action Intent

An **Action Intent** is a structured declaration of what a system proposes to do *before* any side effects occur.

An Action Intent must be:
- **Specific** — what action, what target, what parameters
- **Contextual** — who or what requested it, under what policy or mode
- **Auditable** — traceable identifiers and evidence references
- **Side-effect bounded** — explicit declaration of intended effects

### Side Effect

A **Side Effect** is any externalized change including, but not limited to:
- Network calls (HTTP requests, webhooks)
- Writes (databases, filesystems, object storage)
- Outbound messages (email, SMS, push notifications)
- Payments, account changes, or entitlement changes
- Device actuation or control signals
- External tool or service invocation of any kind

---

## API Overview

Solace Core exposes a single conceptual operation:

> **Evaluate(ActionIntent) → Decision**

---

## Decision Outcomes

### `PERMIT`

Execution is allowed **exactly as described** by the evaluated Action Intent.

- Integrator may proceed with the declared side effects within scope.
- Integrator must record the Permit decision as part of the execution audit trail.
- Permits are **intent-scoped** and do not confer blanket authorization.

### `DENY`

Execution is not allowed.

- Integrator must not perform any side effect associated with the intent.
- Integrator may surface the denial to a user or operator.
- Integrator may submit a modified intent for reevaluation.

### `ESCALATE`

Execution is not allowed until explicit external authorization occurs.

- Integrator must pause automation and route to an authority workflow (human approver, policy custodian, or designated arbiter).
- Integrator may not auto-resolve escalation through retries, rephrasing, or optimization.
- After authorization, a new Action Intent must be submitted referencing the authorization artifact.

---

## Required Integrator Behavior

### Fail-Closed Execution Gate (Mandatory)

Integrators must implement a hard execution gate:

- **Default state:** deny execution
- **Only override:** an explicit `PERMIT` response for the specific Action Intent
- **On timeout, error, or unreachable:** treat as `DENY` (fail closed)

### No Side Effects Before Permit (Mandatory)

Before a Permit is issued, integrations may only perform:
- Local computation
- Planning or reasoning
- Formatting or validation
- Dry-run simulation
- Rendering UI for review

Integrations may **not** perform:
- Calls to external services that mutate state
- Writes to durable or shared stores
- Tool execution that could trigger side effects
- Pre-authorization effects disguised as checks or probes

### Explicit Intent Binding (Mandatory)

A Permit must be bound to:
- The exact action name
- The exact target or targets
- The material parameters
- A traceable request identifier

Any material change requires a new evaluation.

### Non-Bypassable Wiring (Mandatory)

Solace Core must sit in the critical execution path.

If execution can proceed without a Permit:
- Governance is invalid
- The system is out of compliance with this contract

---

## Request Contract (Schema)

Solace Core is transport-agnostic. Integrations may use HTTP, RPC, message buses, or embedded gateways. The contract below defines the **minimum required fields** for an evaluation request.

### `ActionIntent` (minimum required shape)

```json
{
  "intent_id": "string",
  "timestamp": "ISO-8601 string",
  "actor": {
    "type": "human|service|agent",
    "id": "string",
    "display": "string (optional)"
  },
  "system": {
    "name": "string",
    "version": "string",
    "environment": "prod|staging|dev|other"
  },
  "action": {
    "name": "string",
    "category": "read|write|notify|payment|admin|other",
    "side_effects": ["string"]
  },
  "targets": [
    {
      "type": "string",
      "id": "string",
      "attributes": { "any": "json" }
    }
  ],
  "parameters": { "any": "json" },
  "context": {
    "policy_mode": "string",
    "risk_tier": "low|medium|high|unknown",
    "jurisdiction": ["string"],
    "purpose": "string (optional)"
  },
  "evidence": [
    {
      "type": "string",
      "ref": "string",
      "hash": "string (optional)"
    }
  ]
}
