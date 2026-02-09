# EU AI Act Mapping — Solace Core (Execution Authority Layer)

This document maps Solace Core to relevant obligations under **Regulation (EU) 2024/1689 (EU AI Act)**.

Solace Core is **not an AI system** under the Act. It is a **runtime execution-authority control layer** designed to be embedded into AI systems to support compliance with governance, oversight, and risk-management obligations.

This mapping is provided to support conformity assessments, internal audits, and regulatory review.

---

## System Classification

- **Not a General-Purpose AI Model (GPAI)**
- **Not a High-Risk AI System**
- **Not an AI system performing inference or prediction**
- **Governance and control infrastructure only**

Solace Core evaluates **proposed action intents** and issues an enforceable decision:
- `PERMIT`
- `DENY`
- `ESCALATE`

No execution, inference, or real-world effect may occur without a valid `PERMIT`.

---

## Article-by-Article Mapping

### Article 9 — Risk Management System

**Requirement:**  
High-risk AI systems must implement a continuous risk management process covering foreseeable misuse and failure modes.

**Solace Core Contribution:**
- Enforces explicit denial paths (`DENY`)
- Enforces escalation paths (`ESCALATE`)
- Prevents silent or implicit execution
- Fails closed when uncertain or malformed inputs are detected
- Explicitly documents non-goals and out-of-scope behaviors

**Compliance Role:**  
Provides a structural risk-mitigation layer that prevents uncontrolled execution.

---

### Article 12 — Record-Keeping and Traceability

**Requirement:**  
AI systems must enable automatic logging sufficient to trace decisions and outcomes.

**Solace Core Contribution:**
- Deterministic evaluation of intents
- Explicit, enumerable decision outcomes
- Designed for immutable logging of:
  - Input intent
  - Evaluation state
  - Final authority decision

**Note:**  
Solace Core **requires downstream systems** to persist logs, but ensures logs cannot be bypassed without violating execution constraints.

---

### Article 14 — Human Oversight

**Requirement:**  
AI systems must allow for effective human oversight, including the ability to intervene or halt operation.

**Solace Core Contribution:**
- Escalation (`ESCALATE`) is a first-class decision outcome
- Human approval can be required before execution proceeds
- No autonomous override path exists
- Execution authority is explicitly separated from AI capability

**Compliance Role:**  
Implements enforceable human-in-the-loop / human-on-the-loop control.

---

### Article 15 — Accuracy, Robustness, and Cybersecurity

**Requirement:**  
Systems must be robust against errors and misuse.

**Solace Core Contribution:**
- Deterministic state machine
- Explicit failure states
- No probabilistic or heuristic authority decisions
- Non-bypassable denial semantics

---

### Article 17 — Quality Management System (Supportive)

**Requirement:**  
Providers must establish a quality management system.

**Solace Core Contribution:**
- Enables enforcement of execution invariants
- Provides auditable authority decisions
- Can be integrated into provider QMS processes

---

### Article 61–65 — Post-Market Monitoring

**Requirement:**  
Providers must monitor system behavior and report serious incidents.

**Solace Core Contribution:**
- Emits structured authority decisions suitable for monitoring pipelines
- Enables detection of:
  - Repeated denial patterns
  - Escalation frequency
  - Misuse attempts

**Note:**  
Solace Core does not perform monitoring itself; it enables compliant downstream implementation.

---

## Summary

Solace Core is a **compliance-enabling execution authority layer** that supports multiple EU AI Act obligations without itself constituting an AI system.

Its primary value is **preventing ungoverned execution**, not generating decisions.

