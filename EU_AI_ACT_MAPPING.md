# EU AI Act Mapping — Solace Core (Execution Authority Layer)

This document maps Solace Core to relevant obligations under **Regulation (EU) 2024/1689 (EU AI Act)**.

Solace Core does **not meet the definition of an AI system under Article 3** of the EU AI Act. It performs no inference, prediction, learning, or content generation, and does not autonomously affect the environment. Instead, it is a **runtime execution-authority control layer** designed to be embedded into AI systems to support compliance with governance, oversight, and risk-management obligations.

This mapping is provided to support conformity assessments, internal audits, and regulatory review.

---

## System Classification

Solace Core is:

- **Not a General-Purpose AI Model (GPAI)**
- **Not a High-Risk AI System**
- **Not an AI system performing inference or prediction**
- **Not a system that autonomously affects the environment**
- **Governance and control infrastructure only**

Solace Core evaluates **proposed action intents** and issues an enforceable authority decision:

- `PERMIT`
- `DENY`
- `ESCALATE`

No execution, side effects, or real-world impact may occur without a valid `PERMIT`.

---

## Allocation of Regulatory Responsibility

Solace Core does **not** replace or assume the obligations of AI system providers or deployers under the EU AI Act.

Responsibility for:
- risk classification,
- dataset governance,
- model accuracy,
- bias mitigation,
- robustness of model outputs,
- and post-market incident reporting

remains with the provider or deployer of the AI system into which Solace Core is embedded.

Solace Core provides a **structural execution-control layer** that enables compliance by preventing ungoverned or unauthorized execution, but it does not itself satisfy provider obligations.

---

## Article-by-Article Mapping

### Article 9 — Risk Management System

**Requirement:**  
High-risk AI systems must implement a continuous risk management process covering foreseeable misuse and failure modes.

**Solace Core Contribution:**
- Enforces explicit denial paths (`DENY`)
- Enforces mandatory escalation paths (`ESCALATE`)
- Prevents silent, implicit, or inferred execution
- Fails closed when uncertainty, malformed input, or invalid state is detected
- Explicitly documents non-goals and out-of-scope behaviors

**Compliance Role:**  
Provides a structural risk-mitigation mechanism that prevents uncontrolled execution even when upstream systems behave incorrectly.

---

### Article 12 — Record-Keeping and Traceability

**Requirement:**  
AI systems must enable automatic logging sufficient to trace decisions and outcomes.

**Solace Core Contribution:**
- Deterministic evaluation of declared action intents
- Explicit, enumerable authority outcomes
- Designed for immutable logging of:
  - input intent
  - evaluation metadata
  - final authority decision
  - governing policy and invariant versions

**Note:**  
Solace Core requires downstream systems to persist decision logs but ensures that execution cannot proceed without an auditable authority decision.

---

### Article 14 — Human Oversight

**Requirement:**  
AI systems must allow for effective human oversight, including the ability to intervene or halt operation.

**Solace Core Contribution:**
- `ESCALATE` is a first-class authority outcome
- Human approval can be mandated before execution
- No autonomous override path exists
- Execution authority is explicitly separated from AI capability

**Compliance Role:**  
Implements enforceable human-in-the-loop and human-on-the-loop control mechanisms.

---

### Article 15 — Accuracy, Robustness, and Cybersecurity

**Requirement:**  
AI systems must be robust against errors, misuse, and security threats.

**Solace Core Contribution:**
- Deterministic authority evaluation (not model inference)
- Explicit failure states that prevent unsafe execution
- Reduction of systemic risk propagation caused by erroneous, manipulated, or compromised upstream outputs
- Non-bypassable denial semantics under fault conditions

**Clarification:**  
Solace Core does not guarantee accuracy of AI outputs; it prevents inaccurate or unsafe outputs from producing unauthorized side effects.

---

### Article 17 — Quality Management System (Supportive)

**Requirement:**  
Providers must establish and maintain a quality management system.

**Solace Core Contribution:**
- Enforces execution invariants consistently
- Emits auditable authority decisions
- Integrates cleanly into provider QMS, audit, and change-control processes

---

### Articles 61–65 — Post-Market Monitoring and Incident Reporting

**Requirement:**  
Providers must monitor system behavior and report serious incidents.

**Solace Core Contribution:**
- Emits structured, machine-readable authority decisions
- Enables downstream monitoring for:
  - repeated denials
  - escalation frequency
  - anomalous intent patterns
  - misuse or abuse attempts

**Note:**  
Solace Core does not perform monitoring itself; it enables compliant downstream implementation.

---

## Summary

Solace Core is a **compliance-enabling execution authority layer** that supports multiple EU AI Act obligations without itself constituting an AI system.

Its primary function is to **prevent ungoverned execution**, not to generate decisions, predictions, or recommendations.

Solace Core strengthens AI governance by ensuring that no system — regardless of intelligence, confidence, or autonomy — can act without explicit, auditable authority.
