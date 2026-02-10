# solace-core

Solace Core is a runtime execution authority engine.  
It enforces execution decisions and issues binding **Permit / Deny** outcomes for actions that produce side effects.

Governance evaluation (including **Escalate**) occurs outside Solace Core and must resolve before execution authority is issued.

Solace Core is headless, deterministic, and fail-closed by design.

---

## Core Invariant

Solace Core is the final authority on execution.

If Solace Core does not explicitly issue a **Permit**, no execution that produces side effects may occur.  
If Solace Core is unavailable, unreachable, or indeterminate, execution **must fail closed**.

Authority is enforced at runtime and is never inferred from prior state, confidence, learning, or optimization.

Solace Core does not learn, adapt, optimize, or revise its authority decisions at runtime.

---

## Drift Prevention

Solace Core prevents **execution drift** by externalizing and enforcing execution authority at runtime.

All actions that produce side effects must be bound to an explicit execution authorization and submitted to Solace Core for verification prior to execution.

Solace Core does not reason about intent semantics, risk, or policy.  
It deterministically verifies whether valid authority exists for the exact execution requested.

If Solace Core does not explicitly issue a Permit—due to denial, missing authority, invalid binding, or unavailability—execution must fail closed and no side effects may occur.

Because authority is enforced outside the reasoning or optimization layer, internal model behavior, confidence, learning, or adaptation cannot accumulate unchecked execution power over time.

Drift may occur in reasoning, but it cannot manifest as action.

---

## What This Repository Does *Not* Contain

This repository intentionally excludes:

- Conversational interfaces or user-facing experiences  
- Memory systems, profiles, or personalization  
- Optimization, goal-seeking, or reward logic  
- Natural language reasoning or interpretation  
- Tool execution, orchestration, or side effects  

Solace Core does not decide *what* to do.  
It decides **whether execution is allowed to proceed**.

---

## Trust Boundary

Solace Core must remain external to the systems it governs.

Integrating systems submit execution requests to Solace Core for authorization.  
They do not embed, fork, modify, or bypass it.

Any system that can execute side effects without passing through Solace Core is **not governed**.

Authority exists only if it cannot be overridden.

Solace Core is a control plane, not a product surface.
