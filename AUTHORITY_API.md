# AUTHORITY_API.md
Solace Core — Authority API (Public Contract)

Solace Core is a runtime execution authority engine. It evaluates **proposed action intents** and returns an enforceable decision: **Permit / Deny / Escalate**.

This document defines the **public contract** for integrating with Solace Core as an external control plane.

---

## Core Invariant

**Solace Core is the final authority on execution.**

- If Solace Core does **not** issue a `PERMIT`, **no side effects may occur**.
- If Solace Core is **unavailable**, execution **must fail closed**.
- Integrations may *propose*, *prepare*, and *simulate* actions, but may not execute side effects without an explicit `PERMIT`.

---

## Trust Boundary

Solace Core must remain **external** to the systems it governs.

- Integrations call Solace Core over a defined interface.
- Integrations must not embed, modify, or reinterpret Solace Core logic.
- Any system that can bypass Solace Core is **not governed** by Solace Core.

---

## Definitions

### Action Intent
An **Action Intent** is a structured declaration of what a system proposes to do *before* any side effects occur.

An Action Intent must be:
- **Specific** (what action, what target, what parameters)
- **Contextual** (who/what requested it, under what mode/policy)
- **Auditable** (traceable identifiers and evidence references)
- **Side-effect bounded** (clear declaration of intended effect)

### Side Effect
A **Side Effect** is any externalized change including, but not limited to:
- network calls (HTTP requests, webhooks)
- writes (database, filesystem, object storage)
- outbound messages (email, SMS, push notifications)
- payments, account changes, entitlement changes
- device actuation or control signals
- external tool invocation of any kind

---

## API Overview

Solace Core exposes a single conceptual operation:

> **Evaluate(ActionIntent) → Decision**

### Decision Outcomes

#### `PERMIT`
Execution is allowed **exactly as described** by the Action Intent.

- Integrator may proceed with the side effect(s) within declared bounds.
- Integrator must record the Permit decision as part of the execution audit trail.
- Permits are **scope-limited** to the intent evaluated (no blanket authorization).

#### `DENY`
Execution is not allowed.

- Integrator must not perform any side effect associated with the intent.
- Integrator may surface the denial to a user/operator.
- Integrator may submit a modified intent for reevaluation.

#### `ESCALATE`
Execution is not allowed until explicit external authorization occurs.

- Integrator must pause and route to an authority workflow (human, policy custodian, or designated approver).
- Integrator may not “auto-resolve” escalation via retries, rephrasing, or optimization.
- Once authorization is obtained, integrator submits a new intent referencing the authorization artifact.

---

## Required Integrator Behavior

### Fail-Closed Execution Gate (Mandatory)
Integrators must implement a hard gate:

- **Default state:** deny execution
- **Only override:** an explicit `PERMIT` response for the specific intent
- **On timeout/error/unreachable:** treat as `DENY` (fail closed)

### No Side Effects Before Permit (Mandatory)
Before a Permit, integrations may only do:
- local computation
- planning
- formatting
- dry-run simulation
- rendering UI for review

Integrations may **not** do:
- calls to external services that mutate state
- writes to durable stores (unless explicitly non-operative staging with zero external effect)
- tool execution that could trigger side effects
- “pre-authorization” effects disguised as harmless checks

### Explicit Intent Binding (Mandatory)
A Permit must be bound to:
- the exact action name
- the exact target(s)
- the material parameters
- a traceable request identifier

If any of these change, a new evaluation is required.

### Non-Bypassable Wiring (Mandatory)
Solace Core must sit in the critical path.

If execution can proceed without a Permit:
- governance is invalid
- the system is out of compliance with this contract

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
    "side_effects": ["string", "string"]
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
