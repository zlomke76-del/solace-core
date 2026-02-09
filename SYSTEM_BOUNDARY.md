# System Boundary Declaration — Solace Core

This document defines the explicit system boundary for Solace Core.

The purpose of this declaration is to prevent misclassification under the EU AI Act and to ensure correct regulatory interpretation.

---

## What Solace Core Is

Solace Core is a **runtime execution authority engine**.

It:
- Evaluates proposed action intents
- Applies deterministic governance rules
- Issues an enforceable authority decision:
  - `PERMIT`
  - `DENY`
  - `ESCALATE`

Solace Core does **not** perform execution itself.

---

## What Solace Core Is Not

Solace Core is **not**:

- An AI model
- A machine-learning system
- A general-purpose AI model (GPAI)
- A high-risk AI system
- An inference engine
- A recommendation engine
- A decision-making system with autonomous effect

It does not:
- Generate predictions
- Generate recommendations
- Optimize outcomes
- Learn from data
- Modify its own authority rules

---

## Authority vs Capability Separation

Solace Core enforces a strict separation:

- **Capability systems** may propose actions
- **Solace Core** evaluates whether execution is allowed

Without a valid `PERMIT`:
- No side effects may occur
- No retries may override the decision
- No fallback execution may proceed

This separation is intentional and non-negotiable.

---

## Fail-Closed Design

If Solace Core:
- Is unavailable
- Receives malformed input
- Encounters an invalid state

Then:
- Execution must not proceed
- No implicit permission is granted

This ensures conservative behavior under uncertainty.

---

## Regulatory Scope Implication

Because Solace Core:
- Does not perform inference
- Does not generate outputs
- Does not autonomously affect the environment

It functions as **governance infrastructure**, not as an AI system under Regulation (EU) 2024/1689.

---

## Intended Use

Solace Core is intended to be embedded into:
- High-risk AI systems
- Regulated automation systems
- Safety-critical decision pipelines

Its role is to **enable compliance**, not replace provider obligations.

