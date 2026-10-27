# Contributing to Rehearse

Thank you for your interest in improving Rehearse! This document provides standards and workflows for contributing to our monorepo.

---

## Development Workflow

### 1. Branch Naming
Follow standard feature branching conventions:
- `feat/<feature-name>` (e.g. `feat/proctoring-pipeline`)
- `fix/<bug-description>` (e.g. `fix/eval-evidence-gate`)
- `chore/<task>` (e.g. `chore/upgrade-livekit`)
- `docs/<topic>` (e.g. `docs/update-architecture`)

### 2. Commit Conventions
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```
<type>(<scope>): <short description>

[optional body]
```
Examples:
- `feat(web): add Monaco vim keybinding switch`
- `fix(eval): prevent zero-score fallback on unassessed competencies`
- `test(compiler): add output truncation assertion`

---

## Quality Gates & Verification

Before submitting a Pull Request, all of the following commands must execute cleanly on your branch:

```bash
# 1. Typecheck all packages
pnpm -r typecheck

# 2. Run unit and integration test suites
pnpm test

# 3. Verify Python voice agent unit tests
cd interview-bot
.\venv\Scripts\python.exe test_structured_interview.py
.\venv\Scripts\python.exe test_technical_coach.py
cd ..

# 4. Production build check
pnpm -r build
```

---

## Code Quality Standards

- **Zero Fake Data:** Never insert synthetic fallback scores, default categories, or fabricated metrics in evaluation routines. If data is missing or insufficient, reflect it honestly with `null` or `INSUFFICIENT_DATA`.
- **Security:** Do not expose `INTERNAL_API_KEY`, `INTERNAL_BOT_SECRET`, or `DATA_ENCRYPTION_KEY` to client components.
- **Documentation:** When introducing new architecture or features, regenerate visual assets with `pnpm docs:assets` and update relevant Mermaid diagrams.
