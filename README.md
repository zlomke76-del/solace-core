# solace-core

Solace Core is a runtime execution authority engine.  
It evaluates action intents and issues enforceable **Permit / Deny / Escalate** decisions at execution time.

Solace Core is headless, deterministic, and fail-closed by design.

---

## Core Invariant

Solace Core is the final authority on execution.

If Solace Core does not explicitly issue a **Permit**, no side effects may occur.  
If Solace Core is unavailable, unreachable, or indeterminate, execution **must fail closed**.

Authority is evaluated at runtime, not inferred from prior state, confidence, or optimization.

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
