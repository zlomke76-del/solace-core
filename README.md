# solace-core

Solace Core is a runtime execution authority engine.  
It evaluates action intents and issues enforceable **Permit / Deny / Escalate** decisions at execution time.

Solace Core is headless, deterministic, and fail-closed by design.

---

## Core Invariant

Solace Core is the final authority on execution.

If Solace Core does not explicitly issue a **Permit**, no execution that produces side effects may occur.  
If Solace Core is unavailable, unreachable, or indeterminate, execution **must fail closed**.

Authority is evaluated at runtime, not inferred from prior state, confidence, learning, or optimization.

Solace Core does not learn, adapt, optimize, or revise its authority decisions at runtime.

---

## Drift Prevention

Solace Core prevents execution drift by externalizing and enforcing execution authority at runtime. All actions that produce side effects must be declared as explicit intents and submitted to Solace Core for authorization. Solace Core evaluates each intent deterministically and statelessly, issuing a Permit, Deny, or Escalate decision. If Solace Core does not explicitly issue a Permit—due to denial, uncertainty, or unavailability—execution must fail closed and no side effects may occur. Because authority is enforced outside the reasoning or optimization layer, internal model behavior, confidence, learning, or adaptation cannot accumulate unchecked execution power over time. Drift may occur in reasoning, but it cannot manifest as action.

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

Integrating systems submit action intents to Solace Core for authorization.  
They do not embed, fork, modify, or bypass it.

Authority exists only if it cannot be overridden.

Solace Core is a control plane, not a product surface.
