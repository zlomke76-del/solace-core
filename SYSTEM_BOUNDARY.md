# System Boundary Declaration — Solace Core

This document defines the explicit system boundary for **Solace Core**.

The purpose of this declaration is to ensure correct technical and regulatory interpretation,
including proper classification under Regulation (EU) 2024/1689 (EU AI Act).

---

## What Solace Core Is

Solace Core is a **runtime execution authority enforcement engine**.

It:
- Verifies whether valid execution authority exists for a proposed action
- Enforces a deterministic, fail-closed execution gate
- Issues a binding execution outcome:
  - `PERMIT`
  - `DENY`

Solace Core enforces authority **only at the point of execution**.
It does not perform policy reasoning, risk assessment, or semantic interpretation.

Solace Core does **not** perform execution itself.

---

## What Solace Core Is Not

Solace Core is **not**:

- An AI model
- A machine-learning system
- A general-purpose AI model (GPAI)
- A high-risk AI system
- An inference engine
- A recommendation system
- An autonomous decision-making system

It does not:
- Generate predictions
- Generate recommendations
- Interpret natural language
- Optimize outcomes
- Learn from data
- Modify or adapt its authority logic
- Initiate actions autonomously

---

## Authority vs Capability Separation

Solace Core enforces a strict and explicit separation:

- **Capability systems** (AI or non-AI) may propose actions
- **Solace Core** verifies whether execution of those actions is authorized

Without a valid runtime `PERMIT` issued by Solace Core:
- No side effects may occur
- No retries may override the result
- No fallback or degraded execution may proceed

This separation is structural, non-negotiable, and enforced at runtime.

---

## Fail-Closed Design

If Solace Core:
- Is unavailable
- Receives malformed input
- Cannot verify authority
- Encounters an indeterminate state

Then:
- Execution must not proceed
- No implicit or inferred permission is granted

This ensures conservative and predictable behavior under uncertainty.

---

## Regulatory Scope Implication

Because Solace Core:
- Does not perform inference
- Does not generate content or recommendations
- Does not autonomously affect the environment
- Does not adapt or learn

It functions as **governance and execution control infrastructure**, not as an AI system as defined under Regulation (EU) 2024/1689.

Solace Core is comparable to:
- authorization gateways
- safety interlocks
- cryptographic execution controls
- compliance enforcement infrastructure

---

## Intended Use

Solace Core is intended to be integrated into:
- High-risk AI systems
- Regulated automation pipelines
- Safety- or compliance-critical execution environments

Its role is to **enforce execution authority and accountability**.

Solace Core does **not** replace provider obligations under the EU AI Act or other regulations.
It enables those obligations to be met through enforceable technical controls.
