Solace Core — Authority & Execution Control (Public Contract)

Purpose

Solace Core provides non-bypassable execution authority for systems that generate, propose, or automate actions with real-world side effects.

This document defines the public integration contract governing:

Governance evaluation of proposed intents (policy, risk, jurisdiction)

Runtime enforcement of execution authority (cryptographic, fail-closed)

Solace Core does not perform inference, does not execute tools, and does not optimize outcomes.
It exists solely to decide whether execution may occur — and to make unauthorized execution impossible.

Core Invariant

Solace Core is the final authority on execution.

If Solace Core does not issue a PERMIT, no side effects may occur.

If Solace Core is unavailable, unreachable, or indeterminate, execution must fail closed.

No retry, fallback, degraded mode, or override may produce side effects without an explicit PERMIT.

Integrations may propose, prepare, simulate, or explain actions —
but may not execute side effects without runtime authorization enforced by Solace Core.

Authority is never inferred from:

model confidence

prior approvals

learning or optimization

operator intent

historical behavior

System Model (Authoritative)

Solace is intentionally split into two distinct control phases:

PHASE 1 — Governance Evaluation (Semantic)
PHASE 2 — Execution Authority (Runtime Enforcement)


These phases are not interchangeable.

Phase 1 — Governance Evaluation (Policy & Risk)
Purpose

Determine whether a class of action is allowed, denied, or requires escalation under:

policy packs

jurisdictional constraints

risk classification

authority mode (automatic vs human vs external)

This phase answers:

“Is this kind of action allowed under the governing rules, and under what conditions?”

Interface

Governance evaluation is performed via the Authority Evaluation API:

POST /v1/authority/evaluate


(as defined in openapi.solace-core-authority.v1.x.yaml)

Inputs

A semantic Action Intent, including (but not limited to):

intent type

declared side effects

risk classification

jurisdiction

subject

requested authority mode

contextual metadata

This input is descriptive, not executable.

Outputs

One of three governance decisions:

PERMIT

The intent is allowed under current policy.

Does not authorize execution.

Allows issuance of a runtime execution acceptance.

DENY

The intent is prohibited.

No execution may occur.

No acceptance may be issued.

ESCALATE

The intent is not allowed without additional authority.

Obligations are returned (e.g., human approval, external authority).

Automation must pause until obligations are satisfied and re-evaluated.

Governance decisions may expire and may require re-evaluation.

Phase 2 — Execution Authority (Runtime Enforcement)
Purpose

Determine whether a specific execution instance may occur now, based on explicit authority.

This phase answers:

“Has an authorized party cryptographically approved this exact execution?”

Properties

Execution authority enforcement is:

Deterministic

Fail-closed

Non-bypassable

Cryptographically verifiable

Independent of model behavior

Solace Core does not reason about policy, risk, or intent semantics at this stage.

Execution Acceptance

Execution authority is conveyed via a signed acceptance artifact issued by an external authority.

An acceptance binds exactly:

actorId

intent (string identifier)

executeHash (hash of the exact execution payload)

issuedAt / expiresAt

issuer

Any material change requires a new acceptance.

Runtime Enforcement

Execution enforcement is performed via:

POST /v1/execute


with the required envelope:

{
  "intent": { ...semantic intent object... },
  "execute": { ...exact execution payload... },
  "acceptance": { ...signed authority artifact... }
}


Solace Core performs the following checks in order:

Request is syntactically valid

Required fields are present

Acceptance time window is valid

Actor binding matches

Intent string matches

Execution hash matches

Signature verifies

Audit record is appended

If any check fails → DENY

If all checks pass → PERMIT

Solace Core does not execute the payload.
It only authorizes or refuses.

Drift Containment (Accurate Scope)

Solace Core does not prevent cognitive or model drift.

It prevents authority drift.

Models may change behavior, confidence, or reasoning.

Systems may adapt, learn, or optimize.

Proposals may evolve over time.

None of this can result in side effects without external, explicit execution authority.

Drift may exist in reasoning.
Drift cannot manifest as action.

Trust Boundary

Solace Core must remain external to the systems it governs.

Integrations must call Solace Core over a defined interface.

Solace Core logic must not be embedded, forked, or reinterpreted.

Any system that can execute without passing through Solace Core is not governed.

Authority exists only if it cannot be overridden.

Definitions
Action Intent (Governance Phase)

A structured, semantic declaration describing a proposed category of action, used for governance evaluation.

Characteristics:

Descriptive, not executable

Policy- and risk-aware

Jurisdictionally scoped

Auditable

Action Intents are evaluated in Phase 1 only.

Execution Payload (Runtime Phase)

An exact, concrete description of what would be executed if authorized.

Characteristics:

Deterministic

Hashable

Side-effect bearing

Authority-bound

Execution payloads are enforced in Phase 2 only.

Side Effect

Any externalized change, including but not limited to:

Network calls

Database writes

File or object storage writes

Messaging or notifications

Payments or entitlement changes

Device or infrastructure control

External tool invocation

If a side effect can occur, Solace Core must gate it.

Required Integrator Behavior (Mandatory)
Fail-Closed Execution Gate

Integrators must implement a hard gate:

Default state: deny execution

Only override: explicit runtime PERMIT

On error, timeout, or ambiguity: treat as DENY

No Side Effects Before Permit

Before a runtime PERMIT, integrations may perform only:

Local computation

Planning or reasoning

Formatting or validation

Dry-run simulation

UI rendering

Integrations must not perform:

State mutation

External service calls

Writes to durable stores

Tool calls with side effects

“Pre-checks” that mutate state

Non-Bypassable Wiring

Solace Core must sit in the critical execution path.

If execution can occur without Solace Core approval:

Governance is invalid

The system is out of compliance with this contract

Summary Invariant

Governance may decide what is allowed.
Solace Core decides what actually happens.
Nothing executes without a runtime Permit.
