# Security Policy

## Supported Versions

The following table outlines the current security support status for Rehearse services:

| Service / Subsystem | Supported Versions | Notes |
| :--- | :--- | :--- |
| Next.js Web App (`apps/web`) | `>= 0.0.1` | Next.js 14 App Router with Auth.js |
| AI Engine (`services/ai-engine`) | `>= 0.0.1` | Fastify with internal API authentication |
| Compiler Sandbox (`services/compiler`)| `>= 0.0.1` | Containerized subprocesses, memory & time limits |
| Voice Agent (`interview-bot`) | `>= 0.0.1` | LiveKit agent protocol with shared internal secrets |

---

## Security Architecture & Defenses

1. **At-Rest Document Encryption:**
   - Candidate resumes and job descriptions are encrypted at rest using **AES-256-GCM** via [`apps/web/lib/crypto.ts`](apps/web/lib/crypto.ts).
   - Encryption keys are retrieved strictly server-side from `DATA_ENCRYPTION_KEY` and are never exposed to the client.

2. **Internal Service Isolation:**
   - Internal microservice routes (`/v1/*` in `ai-engine` and `compiler`) require a shared secret header (`x-internal-key` / `INTERNAL_API_KEY`).
   - Browser clients communicate exclusively with the Next.js reverse proxy; microservice network ports (`4001`, `4002`) remain shielded.

3. **Compiler Sandbox Isolation:**
   - User-submitted code execution is capped with hard resource boundaries:
     - Output buffer capped at 64 KB (`MAX_OUTPUT_BYTES`) to prevent denial-of-service memory exhaustion.
     - Wall-clock timeouts enforced strictly (default 3000ms).
     - Execution runs inside isolated unprivileged subprocesses or Docker containers (`SANDBOX_DRIVER=docker`).

4. **Credential Masking:**
   - API keys (Groq, Deepgram, LiveKit) are strictly sanitized and masked in all server logs, displaying at most 4 prefix characters.

---

## Reporting a Vulnerability

If you discover a security vulnerability within Rehearse, please report it responsibly:

1. **Do not create public GitHub issues** for security-sensitive bugs.
2. Email the maintainers directly at the contact addresses listed in project documentation or open a private GitHub Security Advisory.
3. Include detailed reproduction steps, payload examples, and affected service components.
4. Maintainers will review and acknowledge reports within 48 hours and coordinate a patch before public disclosure.
