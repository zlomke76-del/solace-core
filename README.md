# solace-core
Runtime execution authority engine. Evaluates action intents and issues enforceable Permit / Deny / Escalate decisions at execution time. Headless, deterministic, and fail-closed by design.
## Core Invariant

Solace Core is the final authority on execution.
If Solace Core does not issue a Permit, no side effects may occur.
If Solace Core is unavailable, execution must fail closed.

## What This Repo Does NOT Contain

- No conversational interfaces
- No memory or user profiles
- No optimization logic
- No natural language reasoning
- No tool execution

## Trust Boundary

Solace Core must remain external to the systems it governs.
Integrations call Solace Core; they do not embed or modify it.
