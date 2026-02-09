# Execution Invariants — Solace Core

This document defines the non-negotiable invariants enforced by Solace Core.

These invariants are intended to be testable, auditable, and externally verifiable.

---

## Invariant 1 — No Execution Without Permit

**Statement:**  
No execution may occur unless Solace Core issues an explicit `PERMIT`.

**Implication:**
- Absence of a decision is equivalent to denial
- Execution systems must fail closed

---

## Invariant 2 — Deny Is Non-Bypassable

**Statement:**  
A `DENY` decision cannot be overridden by:
- Retries
- Operator pressure
- Fallback logic
- Alternative execution paths

---

## Invariant 3 — Escalation Halts Execution

**Statement:**  
An `ESCALATE` decision suspends execution until explicit external authorization is granted.

**Implication:**
- Escalation is not advisory
- Escalation is a hard stop

---

## Invariant 4 — Deterministic Evaluation

**Statement:**  
Given the same intent and state, Solace Core produces the same authority decision.

**Implication:**
- Decisions are auditable
- Post-hoc reconstruction is possible

---

## Invariant 5 — Fail Closed on Error

**Statement:**  
Any internal error, invalid state, or malformed intent results in non-execution.

**Implication:**
- Safety is prioritized over availability
- Uncertainty never grants authority

---

## Invariant 6 — No Implicit Authority

**Statement:**  
Authority must be explicit, enumerable, and inspectable.

**Implication:**
- There are no hidden allow paths
- There are no default permits

---

## Enforcement Expectation

Downstream systems integrating Solace Core **must**:
- Treat authority decisions as binding
- Persist decision records
- Prevent execution paths that bypass Solace Core

Failure to do so invalidates compliance claims.

