# Project Agent System

> Anthropic Harness Pattern — 2-Stage Evaluator Loop

## Architecture

```
Planner (PM, Tech Lead)
    │
    ▼
Generator (implements code)
    │
    ▼
[Stage 1] QA — functional verification
    │ PASS          │ FAIL → Generator re-fix
    ▼               │
[Stage 2] Designer Review — UX quality
    │ PASS          │ FAIL → Generator re-fix (QA re-verifies too)
    ▼
✅ Commit allowed       Max 15 iterations
```

## Team

### Planner
- **PM** — Requirements, spec writing, progress monitoring
- **Tech Lead** (main Claude) — Task decomposition, code review, loop management

### Generator
- **Backend** — Server-side implementation
- **Frontend** — Client-side implementation
- **Mobile** — Mobile app implementation (if applicable)
- **Architect** — Shared types, schemas, API contracts

### Evaluator (all read-only)
- **QA** [Stage 1] — Build/test/AC verification
- **Designer Review** [Stage 2] — UX quality evaluation (4 criteria)
- **Security** — Security review (optional)

## File Ownership

> Enforced by hooks (`scripts/claude-hooks/pre-write-guard.mjs`).

| Agent | Can Modify | Cannot Modify |
|-------|-----------|--------------|
| PM | `docs/specs/` | All code files |
| Architect | `packages/shared/`, `src/shared/` | Specific implementations |
| Backend | `src/server/`, `server/`, `apps/api/` | Client, mobile |
| Frontend | `src/client/`, `client/`, `apps/web/` | Server, mobile |
| Mobile | `apps/mobile/` | Server, web |
| QA | None (read + execute only) | All |
| Designer | None (read-only) | All |
| Security | None (read-only) | All |

**Customize**: Edit `scripts/claude-hooks/lib/agent-registry.mjs` to match your project structure.

## Execution Order

1. PM writes SPEC with Acceptance Criteria
2. Tech Lead decomposes tasks
3. Architect creates shared types + API contracts
4. Backend + Frontend in parallel
5. **2-Stage Evaluator Loop**:
   - [Stage 1] QA → FAIL → Generator re-fix → QA re-verify
   - [Stage 2] Designer Review → FAIL → Generator re-fix → Stage 1 restart
6. Both PASS → commit allowed

## Harness Hooks

| Hook | Script | Action |
|------|--------|--------|
| PreToolUse (Write/Edit) | `pre-write-guard.mjs` | File ownership enforcement |
| PreToolUse (Bash) | `pre-bash-guard.mjs` | Dangerous command blocking + commit gate |
| PostToolUse (Write/Edit) | `post-write-verify.mjs` | Quality warnings |
| SubagentStart | `subagent-contract.mjs` | Sprint contract + loop management |
| SessionStart | `session-init.mjs` | Rules reminder + loop status |
