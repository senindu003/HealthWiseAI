# HealthWiseAI — Smart Intake & Diagnostic Test Recommender Engine

HealthWiseAI is a modern, enterprise-grade Clinical Decision Support System (CDSS) designed to guide users through structured health screening, deliver safe preventative medical test recommendations, and parse uploaded lab results securely.

By separating administrative core actions from machine learning dependencies, the system utilizes a **decoupled, multi-language hybrid microservice architecture** engineered for safety, data isolation, and exceptional performance.

---

## 🚀 System Architecture & Pipeline Workflow

The platform operates across an interconnected three-tier architecture built to preserve clinical safety benchmarks and prevent AI hallucinations:

1. **The Interactive Front-End (React + Tailwind CSS):** A dense, high-performance interactive 4-stage wizard that guides users through biometrics, lifestyle risks, family pedigree matrices, and systemic symptom reviews without vertical fatigue or user drop-off.
2. **The Orchestration Core (Java Spring Boot):** Acts as the centralized system gateway, handling multi-user secure session control, database transactions (CRUD), JWT authorization rules, and data cleansing. It strips all Personally Identifiable Information (PII) before routing health data blocks forward.
3. **The Intelligence Service (FastAPI + Google Gemini API):** A lightweight Python container that executes incoming data vectors against a rigorous, deterministic clinical logic rules engine to establish test recommendations. It then invokes Gemini models (`gemini-2.5-flash-lite`) solely for contextual, user-friendly language synthesis.


              ┌──────────────────────┐
              │   React + Tailwind   │
              │  (4-Stage Wizard UI) │
              └──────────────────────┘
                          │
                          ▼ (Secure JWT / Auth Rest JSON)
              ┌──────────────────────┐
              │  Java Spring Boot    │ ──► Database Persistence
              │ (System Controller)  │     & PII Anonymisation
              └──────────────────────┘
                          │
                          ▼ (Internal Endpoint Routing Payload)
              ┌──────────────────────┐
              │    Python FastAPI    │ ──► [Deterministic Rules Mesh]
              │ (AI Service Engine)  │ ──► [Gemini Context Synthesiser]
              └──────────────────────┘

---

## 🌟 Core Innovations & Engineering Guardrails

### 🛡️ Non-Hallucinating Rules Engine
To completely protect user safety, the selection of diagnostic lab tests (e.g., HbA1c, Lipid Profiles, CBC, Electrolytes) is handled strictly by programmatic, deterministic code loops based on standard medical screening criteria. The LLM is **never** permitted to independently invent, suggest, or modify the list of recommended tests. It is utilized purely as an empathetic translator to draft personalized descriptions of *why* the rules engine flagged those checks.

### 🛑 Real-Time Emergency Bypass System
The front-end and service layer maintain an immediate critical safety intercept checklist. If a user inputs high-risk systemic symptom matrices (such as acute chest pain patterns or pulmonary bleeding signals), the application intercepts the onboarding workflow, generates supportive high-impact warning vectors, and redirects the user safely to traditional primary emergency care protocols.

### 🔬 Multi-Modal Document Routing Blueprint
When users receive their physical results, they return to upload them to the system for summary indexing. The system splits handling conditionally based on data archetypes:
* **Textual Lab Datasets (PDF reports, cellular blood results):** Securely processed through an asynchronous FastAPI pipeline using multimodal OCR text extraction to pull out numerical data fields, mapping metrics against normal reference ranges.
* **Visual Diagnostics (ECG electrical wave graph charts, Chest X-Rays):** To shield users from clinical read errors, the architecture detects visual file attachments and completely aborts automated AI evaluation models. Instead, it generates a safe routing dashboard notification advising immediate in-person manual clinical assessment by a real primary care physician.
