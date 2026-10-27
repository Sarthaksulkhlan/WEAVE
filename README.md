# WEAVE (SIH26263)

WEAVE is the working project name for **SIH26263**: an APAAR ID-based student data management and verification platform for AICTE-approved institutions.

> Current status: repository initialized with architecture, rules, and scaffolding only. No production functionality is implemented yet.

## Team Ownership

- **Sarthak** — frontend (`apps/web`) using Google AI Studio and VS Code.
- **Satyam** — backend (`apps/api`), database, APIs, validation engine, authentication/security, infrastructure and synthetic data generation.
- **Shared approval required** — API contract changes in `packages/contracts/openapi.yaml`.

## Monorepo Structure

```text
apps/
  web/
  api/
packages/
  contracts/
    openapi.yaml
  fixtures/
docs/
help/
rules/
data/
synthetic/
infra/
```

## Technology Stack (Source of Truth)

See `DECISION.md` and `RULEBOOK.md`.

- Frontend: React 18 + TypeScript + Vite + React Router + TanStack Query + Tailwind + accessible Radix-based UI + React Hook Form + Zod + Recharts
- Backend: Python 3.12 + FastAPI + Uvicorn + Pydantic v2 + SQLAlchemy 2.0 + Alembic
- DB: PostgreSQL 16
- API: REST JSON under `/api/v1`
- Background jobs: PostgreSQL-backed queue + separate worker process

## Quick Start (Scaffold Phase)

### Prerequisites

- Git
- Docker + Docker Compose
- Node.js 20+
- Python 3.12
- VS Code

### Windows + VS Code notes

- Use PowerShell or Windows Terminal.
- Recommended: WSL2 + Docker Desktop integration for smoother Python/Node workflows.
- In VS Code, install Python, Pylance, ESLint, Prettier, Tailwind CSS IntelliSense and Docker extensions.
- Keep `.env` local and uncommitted.

### 1) Clone and configure

```bash
git clone <repo-url>
cd WEAVE
cp .env.example .env
```

### 2) Local development with Docker Compose (to be implemented in `infra/`)

```bash
docker compose up --build
```

### 3) Frontend local dev (Sarthak)

```bash
cd apps/web
# scaffold/init commands will be added during implementation
```

### 4) Backend local dev (Satyam)

```bash
cd apps/api
# create venv, install deps, run uvicorn, and alembic commands will be added during implementation
```

## OpenAPI Contract Workflow

The contract lives at `packages/contracts/openapi.yaml`.

Planned generation flow:

- **Backend** validates and serves the same contract version.
- **Frontend** generates TypeScript client/types from contract.

Example command pattern (tool choice may vary):

```bash
# Example only; finalize tool in implementation phase
npx @openapitools/openapi-generator-cli generate \
  -i packages/contracts/openapi.yaml \
  -g typescript-fetch \
  -o apps/web/src/generated/api
```

## Branch & Pull Request Workflow (2 developers)

1. Create feature branch from `main`:
   - `feat/web-...` for Sarthak
   - `feat/api-...` for Satyam
2. Keep PRs small and single-purpose.
3. Contract changes (`packages/contracts/openapi.yaml`) require both reviewers.
4. Merge only after checks pass and security rules in `RULEBOOK.md` are met.

## Safety & Compliance Snapshot

- Synthetic student data only.
- Never commit credentials, signing keys, or encryption keys.
- Never expose full APAAR IDs in API responses or QR URLs.
- No Aadhaar collection.
- Do not claim real APAAR/government API verification without authorized access.
- Deterministic validation/authorization/verification must not depend on LLM decisions.

## Documentation Index

- `DECISION.md`
- `RULEBOOK.md`
- `docs/01-analysis-and-features.md`
- `docs/02-system-architecture.md`
- `docs/03-database-schema.md`
- `docs/04-api-spec.md`
- `docs/05-security-and-privacy.md`
- `docs/06-testing-strategy.md`
- `docs/07-delivery-plan.md`
- `docs/PS-CHECKLIST.md`
