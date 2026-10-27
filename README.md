<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/banner-light.svg">
    <img alt="Rehearse Hero Banner" src="docs/assets/banner-dark.svg" width="100%">
  </picture>
</p>

<p align="center">
  <strong>Multimodal AI mock interview simulator featuring real-time conversational voice agents, an in-browser Monaco coding sandbox, and verifiable evidence-gated candidate evaluations.</strong>
</p>

<p align="center">
  <a href="#test-results"><img src="https://img.shields.io/badge/tests-64%20passed%20(100%25)-10B981?style=for-the-badge&logo=pytest&logoColor=white" alt="Test Status" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14.2-0A0A0A?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.python.org"><img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://livekit.io"><img src="https://img.shields.io/badge/LiveKit-WebRTC-F64302?style=for-the-badge&logo=webrtc&logoColor=white" alt="LiveKit" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F64302?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/Project-Undergraduate%20Capstone-black?style=for-the-badge" alt="Student Capstone" />
</p>

<p align="center">
  <a href="#getting-started">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#features-by-module">Features</a> •
  <a href="#evidence-based-scoring-pipeline">Scoring Engine</a> •
  <a href="#code-metrics">Metrics</a> •
  <a href="#security-and-privacy">Security</a>
</p>

---

## Table of Contents
- [What is Rehearse](#what-is-rehearse)
- [Why Rehearse Exists](#why-rehearse-exists)
- [Product Walkthrough](#product-walkthrough)
- [Features by Module](#features-by-module)
- [System Architecture](#system-architecture)
  - [1. Monorepo Service Architecture](#1-monorepo-service-architecture)
  - [2. Live Interview Sequence](#2-live-interview-sequence)
  - [3. Interview State Machine](#3-interview-state-machine)
  - [4. Database Entity-Relationship Model](#4-database-entity-relationship-model)
  - [5. Evidence-Based Scoring Pipeline](#5-evidence-based-scoring-pipeline)
  - [6. Cloud Hybrid Deployment Topology](#6-cloud-hybrid-deployment-topology)
  - [7. End-to-End User Journey](#7-end-to-end-user-journey)
- [Tech Stack Table](#tech-stack-table)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running the Services](#running-the-services)
  - [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Scripts and Automated Testing](#scripts-and-automated-testing)
- [Code Metrics](#code-metrics)
- [Security and Privacy](#security-and-privacy)
- [Production Deployment](#production-deployment)
- [Project Roadmap](#project-roadmap)
- [Team & Acknowledgements](#team--acknowledgements)
- [License](#license)

---

## What is Rehearse

**Rehearse** is an open-source, AI-native technical interview simulator designed to mirror real engineering hiring loops. Unlike traditional platforms that limit preparation to static algorithmic quizzes or asynchronous text prompts, Rehearse combines high-throughput WebRTC voice dialogue, synchronous in-browser Monaco code execution, and rigorous evidence-gated assessment rubrics.

Candidates upload their target resume and job description. Rehearse normalizes skill taxonomies, calculates deterministically validated skill gaps, and provisions a personalized voice interview conducted by **Aria**, an autonomous LiveKit voice agent. During the session, Aria asks targeted technical and architectural questions, observes live code updates via data channels, offers progressive hints when candidates get stuck, and evaluates verbal fluency in real time.

When the interview concludes, Rehearse runs an evidence-based audit pipeline. Under our **No Evidence, No Score** policy, candidate scores are computed strictly from verified speech turns, actual passing test cases, and verbatim transcripts—completely eliminating artificial benchmark numbers and synthetic hallucinated feedback.

[Back to top](#table-of-contents)

---

## Why Rehearse Exists

Technical interview preparation is currently fragmented between static coding platforms, expensive human mock interviews, and ungrounded LLM chat interfaces:

| Dimension | Static Problem Banks (e.g. LeetCode) | Human Mock Services (e.g. Interviewing.io) | Generic Chat LLMs (e.g. ChatGPT) | Rehearse |
| :--- | :--- | :--- | :--- | :--- |
| **Interaction Modality** | Asynchronous typed code only | Live human voice + screen share | Typed text prompts or generic voice | Real-time WebRTC audio + synchronized Monaco editor |
| **Personalization** | Generic problem sets | Depends on human interviewer | High, but disconnected from executable code | Resume + target JD skill gap extraction |
| **Code Execution** | Remote judge (black-box) | Shared third-party editor | No execution sandbox or copy-paste prompt | Isolated Docker / subprocess sandbox with 64KB cap |
| **Cost & Scalability** | Low cost / static scale | High cost (~$100–$250/hr typical market range) | Subscription / generic | Free, self-hostable open-source monorepo |
| **Evaluation Integrity** | Binary test pass / fail | Subjective human notes | Hallucinated praise & ungrounded scores | Evidence-gated rubrics; no score without proof |

[Back to top](#table-of-contents)

---

## Product Walkthrough

<p align="center">
  <img src="docs/screenshots/dashboard.webp" alt="Rehearse Candidate Dashboard" width="49%">
  <img src="docs/screenshots/prep-skill-gap.webp" alt="Deterministic Skill Gap Alignment" width="49%">
</p>
<p align="center">
  <em>Figure 1: Candidate Preparation Dashboard with longitudinal session tracking (left) and Deterministic Skill Gap Matrix with role alignment score (right) (fictional demo data).</em>
</p>

<p align="center">
  <img src="docs/screenshots/interview-live.webp" alt="Live LiveKit Voice Interview and Synchronized Monaco Editor" width="49%">
  <img src="docs/screenshots/oa-practice.webp" alt="Multi-Company Online Assessment Practice Sandbox" width="49%">
</p>
<p align="center">
  <em>Figure 2: Real-time LiveKit Voice Rehearsal with Aria and synchronized Monaco code editor in split layout (left) and Multi-Company Online Assessment Sandbox with live execution (right) (fictional demo data).</em>
</p>

<p align="center">
  <img src="docs/screenshots/report.webp" alt="Evidence-Gated Scorecard Report" width="49%">
  <img src="docs/screenshots/analytics.webp" alt="Longitudinal Performance Trajectory Analytics" width="49%">
</p>
<p align="center">
  <em>Figure 3: Evidence-Gated Performance Audit Scorecard with verified transcript citations (left) and Longitudinal Trajectory Analytics across 5 rehearsal rounds (right) (fictional demo data).</em>
</p>

<p align="center">
  <img src="docs/screenshots/report-partial.webp" alt="Honest Partial Session Evaluation" width="49%">
  <img src="docs/screenshots/dashboard-mobile.webp" alt="Responsive Mobile Dashboard" width="49%">
</p>
<p align="center">
  <em>Figure 4: Honest evaluation audit enforcing the 'No Evidence, No Score' benchmark policy on partial sessions (left) and Responsive Mobile Dashboard (right) (fictional demo data).</em>
</p>

[Back to top](#table-of-contents)

---

## Features by Module

### 1. Preparation & Skill Gap Analysis
- **Resume & JD Parsing:** Extracts structured experience, education, and skill taxonomies.
- **Deterministic Match Engine:** Normalizes technical skills across aliases (`react.js` ↔ `react`, `k8s` ↔ `kubernetes`, `postgres` ↔ `postgresql`) and computes weighted required vs. preferred competency scores.
- **Overridable Skill Sets:** Candidates can refine their extracted skill profile before launching sessions.

### 2. Autonomous Voice Agent (Aria)
- **LiveKit WebRTC Integration:** Full-duplex conversational voice audio with Silero VAD turn-detection.
- **Natural Cadence Engine:** 1.3s–5.0s adaptive conversational endpointing with interruption tolerance.
- **Multilingual Support:** English, Spanish, French, German, Hindi, Mandarin, Japanese, and Portuguese.
- **Single-Call Dialogue Pipeline:** Streams candidate response to TTS immediately while extracting evaluation metadata asynchronously.

### 3. Live Technical Coding Round
- **Synchronized Monaco Editor:** Real-time dual-publishing over LiveKit data channels (`topic: code_update`).
- **Compiler Sandbox Microservice:** Sandboxed execution for Python and JavaScript with 3000ms wall-clock timeouts and a 64 KB stdout/stderr buffer cap.
- **3-Level Hint Ladder:** Aria observes code modifications and issues conceptual hints before revealing algorithmic patterns.

### 4. Online Assessment (OA) Practice
- **Multi-Company Bank:** 18 curated coding problems modeled on technical assessments from Google, Stripe, Meta, Apple, Netflix, and Uber.
- **Security-Masked Tests:** Public sample test cases for candidate verification alongside hidden test suites strictly withheld on the server runner.

### 5. Evidence-Gated Report & Scoring Engine
- **No Evidence, No Score Gate:** If candidate provides fewer than 2 meaningful responses ($\ge 8$ words excluding greetings), the session is marked `INSUFFICIENT_DATA` with `overallScore: null`.
- **Competency Thresholds:** Category marks require distinct proof (e.g., Coding requires code execution; Behavioral requires $\ge 40$-word narrative with STAR markers).
- **Verbatim Citations:** The scorecard highlights direct candidate quotes and verified passing ratios.

### 6. Candidate Profile Analyzer
- Multi-dimensional audits across **Resume ATS Optimization**, **LinkedIn Profile Structure**, **GitHub Repository Velocity**, **Competitive Coding Profiles**, and **Portfolio Quality**.

[Back to top](#table-of-contents)

---

## System Architecture

### 1. Monorepo Service Architecture

```mermaid
flowchart LR
    subgraph Client["Client Browser"]
        UI["Next.js Web Client\n(Tailwind CSS + Monaco Editor)"]
        LKClient["LiveKit Client SDK\n(Audio Track + Data Channel)"]
    end

    subgraph Edge["Edge & App Server (Port 3000)"]
        NextServer["Next.js Route Handlers\n(Auth.js + Prisma ORM)"]
    end

    subgraph InternalServices["Isolated Microservices"]
        AIEngine["ai-engine (Fastify :4001)\nResume Parsing & ATS Analyzer"]
        Compiler["compiler (Fastify :4002)\nSubprocess Sandbox (64KB cap)"]
    end

    subgraph MediaServer["LiveKit SFU (:7880)"]
        LiveKitServer["LiveKit WebRTC Server"]
    end

    subgraph PythonWorker["Voice Agent Worker"]
        Aria["interviewer.py (LiveKit Agents)\nTurn Controller & Technical Coach"]
    end

    subgraph ExternalCloud["Cloud Providers"]
        Groq["Groq API\n(Llama 3.3 70B Versatile)"]
        Deepgram["Deepgram / EdgeTTS\n(STT & Neural Audio)"]
        NeonDB[("PostgreSQL Database\n(Prisma Models)")]
    end

    UI -->|"HTTPS / REST"| NextServer
    LKClient <-->|"WebRTC Media & Data"| LiveKitServer
    LiveKitServer <-->|"WebRTC Track Sync"| Aria
    NextServer -->|"Internal Secret Header"| AIEngine
    NextServer -->|"Internal Secret Header"| Compiler
    NextServer -->|"SQL Pooled Queries"| NeonDB
    AIEngine -->|"Structured JSON"| Groq
    Aria -->|"Streaming Audio"| Deepgram
    Aria -->|"Streaming Tokens"| Groq
    Aria -->|"POST /api/internal/interview/[id]/result"| NextServer
```

---

### 2. Live Interview Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate Browser
    participant LK as LiveKit Server (SFU)
    participant Aria as Interview Bot (Python)
    participant LLM as Groq LLM (Llama 3.3)
    participant Web as Next.js Internal API
    participant DB as PostgreSQL

    Candidate->>LK: Connect audio & data channels
    LK->>Aria: Dispatch agent job to room
    Aria->>Candidate: Stream spoken greeting via TTS
    Candidate->>Aria: Candidate voice answer
    Aria->>Aria: Silero VAD detects end-of-speech (1.3s delay)
    Aria->>LLM: Stream prompt with sliding history (<450 tokens)
    LLM-->>Aria: Stream tokens sentence-by-sentence
    Aria->>Candidate: Stream synthesized neural audio via TTS
    Candidate->>LK: Send code update (topic: code_update)
    LK->>Aria: Aria receives code AST and run execution results
    Candidate->>Web: End interview session
    Web->>Aria: Trigger graceful shutdown
    Aria->>Web: POST /api/internal/interview/[id]/result (Full transcript & evidence)
    Web->>Web: Evaluate evidence gates (meaningful turns >= 2)
    Web->>DB: Upsert FeedbackReport & update InterviewSession
```

---

### 3. Interview State Machine

```mermaid
stateDiagram-v2
    [*] --> PHASE_GREETING: Worker joins room
    PHASE_GREETING --> PHASE_SMALL_TALK: Candidate responds
    PHASE_SMALL_TALK --> PHASE_INTRODUCTION: Confirm role focus
    PHASE_INTRODUCTION --> PHASE_WALKTHROUGH: Architectural overview
    PHASE_WALKTHROUGH --> PHASE_RESUME_JD: Deep dive into project experience
    PHASE_RESUME_JD --> PHASE_TECHNICAL_CODING: Monaco problem displayed
    PHASE_TECHNICAL_CODING --> PHASE_BEHAVIOURAL: Problem solved or timed out
    PHASE_BEHAVIOURAL --> PHASE_CLOSING: Q&A & final candidate queries
    PHASE_CLOSING --> PHASE_EVALUATION: Interview completed
    
    PHASE_GREETING --> INSUFFICIENT_DATA: Disconnected (< 2 turns)
    PHASE_SMALL_TALK --> INSUFFICIENT_DATA: Disconnected (< 2 turns)
    PHASE_WALKTHROUGH --> PARTIAL_SESSION: Early exit (>= 2 turns)
    PHASE_RESUME_JD --> PARTIAL_SESSION: Early exit (>= 2 turns)
    PHASE_TECHNICAL_CODING --> PARTIAL_SESSION: Early exit (>= 2 turns)
    
    PHASE_EVALUATION --> [*]: Results persisted
    INSUFFICIENT_DATA --> [*]: Honest report (No fake scores)
    PARTIAL_SESSION --> [*]: Preliminary report
```

---

### 4. Database Entity-Relationship Model

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : establishes
    User ||--o{ Resume : uploads
    User ||--o{ JobDescription : saves
    User ||--o{ InterviewSession : conducts
    User ||--o{ AssessmentAttempt : submits
    User ||--o{ OaSubmission : runs
    User ||--o{ AnalyzerResult : generates
    
    InterviewSession ||--o| FeedbackReport : generates
    InterviewSession ||--o{ SessionQuestion : includes
    InterviewSession }o--|| Resume : references
    InterviewSession }o--|| JobDescription : references
    
    Question ||--o{ SessionQuestion : instantiated_in
    Question ||--o{ OaSubmission : solves
    
    Assessment ||--o{ AssessmentSection : organizes
    AssessmentSection ||--o{ AssessmentQuestion : contains
    AssessmentSection ||--o{ AssessmentCodingQuestion : contains
    AssessmentAttempt ||--o{ AssessmentAnswer : records
    AssessmentAttempt ||--o{ AssessmentCodingAttempt : executes

    User {
        string id PK
        string email UK
        string name
        Role role
        datetime createdAt
    }

    InterviewSession {
        string id PK
        string userId FK
        string resumeId FK
        string jdId FK
        SessionStatus status
        string targetRole
        json transcript
        json botSummary
        datetime endedAt
    }

    FeedbackReport {
        string id PK
        string sessionId UK, FK
        float overallScore
        json categoryScores
        string[] strengths
        string[] weaknesses
        string[] improvementPlan
        json skillGapInsights
    }

    Question {
        string id PK
        QuestionType type
        string title
        string text
        Difficulty difficulty
        string[] skillTags
        json starterCode
        json testCases
        boolean isActive
    }
```

---

### 5. Evidence-Based Scoring Pipeline

```mermaid
flowchart TD
    RawData["Raw Session Telemetry\n(Transcript + Code Executions + Test Results)"] --> Extract["extractSessionEvidence()"]
    
    subgraph EvidenceModel["Session Evidence Computation"]
        Extract --> Turns["Candidate Turns\n(filter: >= 8 words, non-greeting)"]
        Extract --> Speech["Speech Telemetry\n(words, speaking time, filler counts)"]
        Extract --> Code["Code Telemetry\n(runs, passed/total tests, hints)"]
    end

    Turns --> Gate1{"Meaningful Turns >= 2?"}
    
    Gate1 -- "No (< 2)" --> Insufficient["Status: INSUFFICIENT_DATA\noverallScore: null\nVerdict: Not Evaluated\nNo Synthetic Scores"]
    
    Gate1 -- "Yes (>= 2)" --> CompetencyGates["Assess Competencies with Individual Evidence Gates"]
    
    subgraph Competencies["Competency Evaluations"]
        CompetencyGates --> Comm["Communication & Articulation\n(Requires >= 3 meaningful turns)"]
        CompetencyGates --> ResumeComp["Resume Depth\n(Requires >= 2 resume phase answers)"]
        CompetencyGates --> CodingComp["Coding & Complexity\n(Requires submitted code / executed runs)"]
        CompetencyGates --> STAR["Behavioral STAR\n(Requires >= 1 answer with >= 40 words)"]
    end
    
    Competencies --> WeightedAvg["Weighted Score Calculation\n(Average across ASSESSED dimensions only)"]
    WeightedAvg --> Grounding["groundSummaryText()\n(Strip ungrounded technologies)"]
    Grounding --> FinalReport["Generate Verifiable Scorecard\n(Complete / Preliminary Report)"]
```

---

### 6. Cloud Hybrid Deployment Topology

```mermaid
flowchart LR
    Candidate["Candidate Browser"] -->|"HTTPS / CDN"| Vercel["Vercel Edge Network\n(apps/web Next.js SSR)"]
    Candidate <-->|"WebRTC Audio"| LKCloud["LiveKit Cloud SFU\n(Global Media Mesh)"]
    
    subgraph Railway["Railway Cloud Platform"]
        AIEngine["ai-engine (:4001)\nFastify Worker"]
        Compiler["compiler (:4002)\nSandbox Microservice"]
        VoiceAgent["interview-bot\nPython LiveKit Worker"]
    end
    
    subgraph DataPlane["Managed Data Plane"]
        Neon[("Neon Serverless PostgreSQL\n(Prisma Schema)")]
    end
    
    Vercel -->|"Connection Pooling"| Neon
    Vercel -->|"x-internal-key"| AIEngine
    Vercel -->|"x-internal-key"| Compiler
    VoiceAgent <-->|"WebRTC Stream"| LKCloud
    VoiceAgent -->|"Internal Secret"| Vercel
```

---

### 7. End-to-End User Journey

```mermaid
flowchart TD
    A["1. Sign Up / Login\n(Email & Password Authentication)"] --> B["2. Upload Profile\n(Resume PDF/Docx + Target Job Description)"]
    B --> C["3. Skill Gap Analysis\n(Deterministic Taxonomy Match + Missing Skills)"]
    C --> D["4. Start Rehearsal\n(Provision LiveKit Room + Camera/Mic Check)"]
    D --> E["5. Conversational Interview\n(Aria Voice Interaction across 6 Phases)"]
    E --> F["6. Live Algorithmic Challenge\n(Monaco Editor + Sandboxed Test Execution)"]
    F --> G["7. Behavioral Assessment\n(STAR Methodology Narrative Analysis)"]
    G --> H["8. Verifiable Evaluation Report\n(Evidence-Gated Scorecard + 7-Day Action Plan)"]
    H --> I["9. Targeted Practice\n(Company OA Questions & ATS Analyzer)"]
```

[Back to top](#table-of-contents)

---

## Tech Stack Table

| Layer | Technology | Version | Purpose in Rehearse |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Next.js (App Router) | `14.2.25` | SSR, dynamic client layouts, edge middleware, and backend API routes. |
| **UI & Styling** | React + Tailwind CSS | `18.3.1` / `^3.4` | Aeris design system (`#0A0A0A` dark surfaces, orange `#F64302` accent). |
| **Code Editor** | Monaco Editor | `^4.7.0` | In-browser syntax-highlighted IDE for live interview coding & OA practice. |
| **Authentication** | Auth.js (NextAuth) | `5.0.0-beta.25` | Session management with Prisma adapter and bcrypt credential hashing. |
| **Database & ORM** | PostgreSQL + Prisma | `^6.5.0` | Relational storage for users, transcripts, reports, and questions. |
| **WebRTC Media** | LiveKit Client & Server | `^2.22` / `^2.19` | Low-latency WebRTC SFU streaming for conversational agent audio. |
| **Voice Agent** | LiveKit Python Agents | `~0.8` / Python 3.11+ | Autonomous conversational bot worker managing turn-taking and coaching. |
| **Microservices** | Fastify (Node.js) | `^4.26` | High-throughput JSON microservices for AI processing and compiler execution. |
| **LLM Provider** | Groq (Llama 3.3 70B) | Cloud API | Fast-turn conversational generation (<400ms TTFT) and fallback models. |
| **Speech-to-Text** | Deepgram Nova / Whisper | Cloud / Local | Real-time audio stream transcription with multilingual support. |
| **Text-to-Speech** | EdgeTTS / Deepgram Aura | Cloud / Local | Natural neural voice synthesis synchronized sentence-by-sentence. |
| **Monorepo Engine** | Turborepo + pnpm | `^2.5.0` / `9.15` | Parallel caching, typechecking, and package workspace orchestration. |

[Back to top](#table-of-contents)

---

## Repository Structure

```
AI_Mock_Interview_Project/
├── apps/
│   └── web/                         # Next.js 14 Web Application
│       ├── app/                     # App Router pages & API handlers
│       │   ├── (app)/               # Protected candidate routes (dashboard, interview, report)
│       │   ├── (auth)/              # Authentication views (login, register)
│       │   └── api/                 # Internal & public API route handlers
│       ├── components/              # Modular UI components (Monaco, Report, Landing)
│       ├── lib/                     # Evaluation engine, crypto, auth, and prisma clients
│       └── prisma/                  # Primary PostgreSQL schema and migrations
├── services/
│   ├── ai-engine/                   # Fastify service for Resume parsing & ATS analysis
│   │   ├── src/                     # LLM handlers, text extractors, and endpoints (:4001)
│   │   └── Dockerfile               # Production container definition
│   └── compiler/                    # Fastify service for isolated code sandbox (:4002)
│       ├── src/                     # Subprocess execution driver with 64KB output cap
│       └── Dockerfile               # Production container definition
├── packages/
│   └── shared/                      # Shared workspace package (@rehearse/shared)
│       └── src/                     # Common Zod validation schemas and evaluation types
├── interview-bot/                   # LiveKit Python Autonomous Voice Agent
│   ├── plugins/                     # STT, TTS, Groq turn engine, and technical coach
│   ├── prompts/                     # Grounded system instructions for Aria
│   ├── bench/                       # Real latency measurement scripts & test suites
│   ├── agent.py                     # LiveKit Agents entrypoint (dev / start)
│   └── interviewer.py               # Human-like turn controller and transcription publisher
├── docs/
│   ├── assets/                      # Generated vector diagrams and charts
│   ├── screenshots/                 # High-resolution production interface captures
│   └── PLAN.md                      # Monorepo architecture & implementation roadmap
├── scripts/                         # Audit, calibration, and asset generation utilities
├── turbo.json                       # Turborepo task pipeline configuration
├── docker-compose.yml               # Local development stack (Postgres + LiveKit)
└── package.json                     # Monorepo dependencies & root scripts
```

[Back to top](#table-of-contents)

---

## Getting Started

### Prerequisites
- **Node.js:** `v20.x` or `v22.x`
- **pnpm:** `9.15.x` or higher (`npm install -g pnpm`)
- **Python:** `3.11+` with `pip` and `venv`
- **Docker Desktop:** (Optional, for containerized local Postgres and LiveKit)

---

### Installation

Clone the repository and install all monorepo package dependencies:

```bash
git clone https://github.com/your-username/rehearse.git
cd rehearse
pnpm install
```

---

### Environment Configuration

Copy the root environment example and configure your service credentials:

```bash
cp .env.example .env
```

| Environment Variable | Required | Description | Example / Fallback | Provider Source |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/rehearse?schema=public` | Local Postgres or [Neon.tech](https://neon.tech) |
| `NEXTAUTH_SECRET` | **Yes** | 32-byte secret for JWT session encryption | `openssl rand -base64 32` | Generated locally |
| `NEXTAUTH_URL` | **Yes** | Base canonical URL of the web app | `http://localhost:3000` | Local or production domain |
| `INTERNAL_API_KEY` | **Yes** | Shared internal secret for microservices | `rehearse_internal_secret_key` | Generated locally |
| `INTERNAL_BOT_SECRET` | **Yes** | Secret verifying Aria bot result callbacks | `rehearse_internal_secret_key` | Matches `INTERNAL_API_KEY` |
| `DATA_ENCRYPTION_KEY`| **Yes** | 32-byte hex/base64 key for AES-256-GCM | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | Generated locally |
| `GROQ_API_KEY` | **Yes** | API key for LLM conversational engine | `gsk_...` | [Groq Console](https://console.groq.com) |
| `LIVEKIT_URL` | **Yes** | LiveKit WebRTC server WebSocket URL | `ws://127.0.0.1:7880` or `wss://...livekit.cloud` | Local server or [LiveKit Cloud](https://cloud.livekit.io) |
| `LIVEKIT_API_KEY` | **Yes** | LiveKit project access key | `devkey` | LiveKit config or cloud dashboard |
| `LIVEKIT_API_SECRET` | **Yes** | LiveKit project secret key | `secret` | LiveKit config or cloud dashboard |
| `DEEPGRAM_API_KEY` | Optional | Low-latency streaming STT key | `...` | [Deepgram Console](https://console.deepgram.com) |
| `AI_ENGINE_URL` | **Yes** | AI engine service location | `http://localhost:4001` | Fastify AI service |
| `COMPILER_SERVICE_URL`| **Yes** | Compiler sandbox service location | `http://localhost:4002` | Fastify compiler service |

---

### Database Setup & Migrations

Deploy database migrations and populate the initial question bank:

```bash
# Push Prisma schema migrations
pnpm db:migrate

# Seed multi-company questions and assessment bank
pnpm db:seed
```

---

### Running the Services

#### Option 1: On Windows (PowerShell)

**Terminal 1 — Local Infrastructure (Docker):**
```powershell
docker compose up rehearse-postgres rehearse-livekit
```

**Terminal 2 — Web Application & Microservices:**
```powershell
pnpm dev
```

**Terminal 3 — Python Interview Bot Worker:**
```powershell
cd interview-bot
.\venv\Scripts\Activate.ps1
python agent.py dev
```

#### Option 2: On macOS or Linux (Bash)

**Terminal 1 — Local Infrastructure (Docker):**
```bash
docker compose up rehearse-postgres rehearse-livekit
```

**Terminal 2 — Web Application & Microservices:**
```bash
pnpm dev
```

**Terminal 3 — Python Interview Bot Worker:**
```bash
cd interview-bot
source venv/bin/activate
python agent.py dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Troubleshooting Common Issues

| Symptom / Error | Likely Root Cause | Resolution |
| :--- | :--- | :--- |
| **Aria is silent or does not join room** | Python worker (`interview-bot`) not running or wrong `LIVEKIT_URL`. | Ensure `python agent.py dev` is active and `LIVEKIT_API_KEY` matches between web and agent. |
| **Browser blocks microphone input** | WebRTC requires secure context (HTTPS or `localhost`). | Access via `http://localhost:3000` (not IP address) or configure HTTPS certificate. |
| **Docker sandbox execution fails** | Docker daemon is inactive or not started. | The compiler automatically falls back to an unprivileged subprocess runner; start Docker Desktop if container isolation is required. |
| **"Unstyled Page" / Missing CSS** | Outdated chunk hash in `.next` cache. | Delete `.next` folder (`Remove-Item -Recurse apps/web/.next`) and restart `pnpm dev`. |
| **Groq 429 Rate Limit Warning** | LLM free-tier token cap reached. | System automatically switches to `llama-3.1-8b-instant`; verify your daily usage in `.groq_usage.json`. |

[Back to top](#table-of-contents)

---

## Scripts and Automated Testing

Rehearse maintains 100% test passing integrity across all monorepo packages.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/chart-tests-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/chart-tests-light.svg">
    <img alt="Automated Test Suites Status" src="docs/assets/chart-tests-dark.svg" width="80%">
  </picture>
</p>

### Useful Repository Commands

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `pnpm dev` | Monorepo Root | Starts Next.js web app, AI engine, and compiler concurrently via Turborepo. |
| `pnpm build` | Monorepo Root | Runs production build across all four workspace packages. |
| `pnpm typecheck` | Monorepo Root | Executes strict TypeScript validation (`tsc --noEmit`) across the repository. |
| `pnpm test` | Monorepo Root | Executes all package unit and integration tests (shared, compiler, ATS, web). |
| `pnpm oa:validate` | Monorepo Root | Runs the strict OA coding problem schema validator against question fixtures. |
| `pnpm docs:assets` | Monorepo Root | Regenerates all vector banners and analytical SVGs in `docs/assets/`. |
| `node scripts/audit-fake-data.mjs`| Monorepo Root | Scans codebase for hardcoded fallback scores or synthetic data. |

[Back to top](#table-of-contents)

---

## Code Metrics

Codebase metrics were measured across active source files using AST directory traversal, excluding `node_modules`, `venv`, `.next`, and generated bundles.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/chart-loc-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/chart-loc-light.svg">
    <img alt="Lines of Code by Language" src="docs/assets/chart-loc-dark.svg" width="80%">
  </picture>
</p>

### Code Volume Breakdown

| Language / Layer | Source Files | Lines of Code (LOC) | Share (%) | Key Subsystems |
| :--- | :--- | :--- | :--- | :--- |
| **TypeScript (`.ts`)** | 84 | 14,900 | 42.2% | Next.js API routes, evaluation pipeline, compilers, shared Zod schemas. |
| **React / TSX (`.tsx`)**| 108 | 13,025 | 36.9% | Monaco editor, report scorecard, analytics charts, UI design system. |
| **Python (`.py`)** | 26 | 7,033 | 19.9% | LiveKit voice agent, turn timing, state machine, technical coaching plugins. |
| **JavaScript (`.js`/`.mjs`)**| 6 | 327 | 1.0% | Build scripts, asset generation utilities, and audit runners. |
| **Total** | **224** | **35,285** | **100.0%** | Measured 2026-10-27. |

---

### Measured Voice Turn Latency

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/chart-latency-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/chart-latency-light.svg">
    <img alt="Live Voice Turn Latency Pipeline" src="docs/assets/chart-latency-dark.svg" width="80%">
  </picture>
</p>

- **Measured End-to-Speech to First Audio:** ~1.69s median under standard cloud profiles (Deepgram / Groq / EdgeTTS).
- **Target Pipeline Benchmark:** < 1.0s under edge streaming configurations.

[Back to top](#table-of-contents)

---

## Security and Privacy

Rehearse enforces strict privacy protections for candidate data:

1. **At-Rest Document Encryption:**
   - Candidate resumes and job descriptions are encrypted at rest using **AES-256-GCM** via [`apps/web/lib/crypto.ts`](apps/web/lib/crypto.ts).
   - Keys are managed exclusively on the server through `DATA_ENCRYPTION_KEY` and are never transmitted to client browsers.
2. **Internal Service Shielding:**
   - Communication between Next.js and backend microservices (`ai-engine` and `compiler`) requires the `x-internal-key` header with `INTERNAL_API_KEY`.
3. **Sandbox Resource Caps:**
   - The code execution sandbox caps standard output and error buffers at 64 KB (`MAX_OUTPUT_BYTES`) to prevent denial-of-service memory exhaustion.
   - Code runs enforce a hard 3000ms execution timeout.
4. **Data Deletion:**
   - Users can delete their uploaded resumes, target job descriptions, and past session histories directly from the Settings panel.

For instructions on reporting security vulnerabilities, please refer to [SECURITY.md](SECURITY.md).

[Back to top](#table-of-contents)

---

## Production Deployment

Rehearse can be deployed to production using either:
- **Option A (Single VPS via Docker Compose):** Recommended for self-hosted instances on Ubuntu 22.04+ (runs web, Postgres, microservices, LiveKit, and python agent on one box).
- **Option B (Managed Cloud Hybrid):** 
  - Frontend: [Vercel](https://vercel.com)
  - Microservices & Bot: [Railway.app](https://railway.app)
  - Database: [Neon Serverless Postgres](https://neon.tech)
  - WebRTC SFU: [LiveKit Cloud](https://cloud.livekit.io)

For a complete step-by-step walkthrough, refer to [DEPLOYMENT.md](DEPLOYMENT.md) (or review the detailed hybrid guide in project documentation).

[Back to top](#table-of-contents)

---

## Project Roadmap

The following checklist tracks implemented capabilities against planned roadmap initiatives:

- [x] Full-duplex conversational voice agent with LiveKit WebRTC audio.
- [x] Monaco code editor with real-time WebSocket state synchronization.
- [x] Sandboxed Python and JavaScript execution with 64 KB output capping.
- [x] Deterministic skill-gap analyzer with taxonomy alias normalization.
- [x] Evidence-gated evaluation model with hard gates against fake scoring.
- [x] 18-question multi-company Online Assessment (OA) practice engine.
- [x] Multi-tab candidate profile analyzer (ATS, LinkedIn, GitHub, Coding, Portfolio).
- [ ] Computer-vision proctoring & non-verbal gaze/posture analytics.
- [ ] Collaborative interactive system design whiteboard.
- [ ] Offline local deployment using quantized small language models (SLMs).
- [ ] Automated targeted resume bullet point rewriter.

[Back to top](#table-of-contents)

---

## Team & Acknowledgements

### Project Team
- **Kavya Mittal** — *Undergraduate Candidate, B.Tech Computer Science & Engineering, Manipal University Jaipur*
- **Om Wattamwar** — *Undergraduate Candidate, B.Tech Computer Science & Engineering, Manipal University Jaipur*
- **Faculty Guide:** *[Faculty Guide Placeholder]* — *Department of Computer Science & Engineering, Manipal University Jaipur*

### Acknowledgements
We extend our gratitude to the open-source engineering teams behind the foundational platforms that make Rehearse possible:
- [LiveKit](https://livekit.io) for high-performance WebRTC agent orchestration.
- [Groq](https://groq.com) for high-speed LPU inference making real-time voice latency feasible.
- [Deepgram](https://deepgram.com) for accurate multilingual streaming speech recognition.
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for client-side development environments.
- [Next.js](https://nextjs.org) and [Vercel](https://vercel.com) for edge application architecture.
- [Prisma](https://prisma.io) and [Neon](https://neon.tech) for serverless PostgreSQL data management.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

[Back to top](#table-of-contents)
