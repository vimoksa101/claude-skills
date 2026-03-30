# CLAUDE.md Writing Guide

How to write effective `CLAUDE.md` files that make AI agents reliable in your project.

## What is CLAUDE.md?

A `CLAUDE.md` file contains **repo-local, durable instructions** that Claude Code reads on every session. It shapes agent behavior without relying on the model to "remember" from previous conversations.

Think of it as **infrastructure for agent behavior** — not documentation for humans.

---

## What to Include

### 1. Project Identity (Required)
```markdown
## Stack
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Express, PostgreSQL, Drizzle ORM
- Testing: Vitest, Playwright
```

Why: Agents make better decisions when they know the technology stack.

### 2. Absolute Prohibitions (Required)
```markdown
## Prohibitions
- No tRPC — use REST API
- No Replit — local development only
- No `any` types in TypeScript
- Never delete user data (soft delete only)
```

Why: Without explicit prohibitions, agents default to popular patterns that may not fit your project.

### 3. Conventions & Patterns (Required)
```markdown
## Conventions
- API paths: `/api/{domain}/{resource}`
- All fetch calls must use `apiUrl()` wrapper
- Authentication: `credentials: "include"` on every fetch
- Commit messages: Korean, format `type: 설명`
```

Why: Consistency across agent sessions. Without this, each session reinvents conventions.

### 4. Development Commands (Required)
```markdown
## Dev Commands
- `npm run dev` — Start dev server (port 3001)
- `npm test` — Run tests
- `npx tsc --noEmit` — Type check
```

Why: Agents need to know how to build, test, and run your project.

### 5. Known Gotchas (Highly Recommended)
```markdown
## Gotchas
- Mock user `local-dev-user` doesn't exist in DB — use `null` for createdBy in local dev
- Zod readonly arrays must be spread `[...arr]` for Drizzle compatibility
```

Why: Prevents agents from hitting the same bugs repeatedly across sessions.

### 6. Architecture Decisions (Recommended)
```markdown
## Architecture
- Frontend/Backend split: Vercel (frontend) + OCI (backend)
- All API URLs go through `apiUrl()` helper — never hardcode localhost
- Session cookies: SameSite=None in production
```

Why: Agents need context for cross-cutting decisions.

---

## What NOT to Include

| Don't Include | Why | Instead |
|---|---|---|
| File-by-file documentation | Derivable from reading the code | Let agents explore |
| Git history / changelog | `git log` is authoritative | Use git commands |
| Debugging solutions | The fix is in the code already | Commit messages have context |
| TODO lists / sprint plans | Ephemeral, goes stale fast | Use issue tracker |
| Full API documentation | Auto-generated tools exist | Link to Swagger/OpenAPI |
| Copy of package.json | Derivable, goes stale | Agent can read it directly |
| Environment variable values | Security risk | Reference `.env.example` |

---

## Structure Rules

### Keep it Scannable
- Use headings (##) for major sections
- Use bullet points, not paragraphs
- Use code blocks for commands and patterns
- Keep total length under 300 lines — agents read this every session

### Be Prescriptive, Not Descriptive
```markdown
# BAD (descriptive)
We use PostgreSQL for our database layer with Drizzle ORM for type-safe queries.

# GOOD (prescriptive)
- Database: PostgreSQL + Drizzle ORM
- All queries go through Drizzle — no raw SQL
- Schema changes: edit shared/schema.ts → run `npm run db:push`
```

### Use Absolute Language for Rules
```markdown
# BAD (soft)
Try to avoid using any types when possible.

# GOOD (absolute)
No `any` types. Use `unknown` + type narrowing instead.
```

### Date Stamp Major Changes
```markdown
## Architecture (updated 2026-03-15)
Frontend/Backend split deployment...
```

Why: Helps agents (and humans) know if a section might be stale.

---

## Anti-Patterns

### 1. The Novel
A 500+ line CLAUDE.md that tries to document everything. Agents hit context limits and miss critical rules buried in prose.

**Fix**: Keep under 300 lines. Move deep docs to `docs/` and link.

### 2. The Wishlist
```markdown
# BAD
- Code should be clean and well-organized
- Follow best practices
- Write good tests
```

These are too vague to be actionable. Every line should change agent behavior in a specific, testable way.

### 3. The Stale Manual
CLAUDE.md written once and never updated. References deleted files, old patterns, or deprecated commands.

**Fix**: Update CLAUDE.md when you change conventions. Treat it as living infrastructure.

### 4. The Secrets File
```markdown
# BAD
DATABASE_URL=postgresql://user:password@host:5432/db
API_KEY=sk-abc123
```

Never put credentials in CLAUDE.md. Reference `.env.example` instead.

### 5. The Duplicate
Same information in CLAUDE.md and README.md and docs/. When one updates, others go stale.

**Fix**: CLAUDE.md = agent instructions. README = human onboarding. Don't duplicate.

---

## Layered CLAUDE.md Files

Claude Code supports multiple CLAUDE.md files at different levels:

| Location | Scope | Example Content |
|---|---|---|
| `~/.claude/CLAUDE.md` | Global (all projects) | Personal preferences, tools config |
| `./CLAUDE.md` | Project root | Stack, conventions, prohibitions |
| `./AGENTS.md` | Agent system | Roles, file ownership, workflows |
| `./src/server/CLAUDE.md` | Subdirectory | Backend-specific patterns |

**Rule**: Put instructions at the narrowest applicable scope.

---

## Checklist for a Good CLAUDE.md

- [ ] Stack and key dependencies listed
- [ ] Dev commands (start, test, build) documented
- [ ] Absolute prohibitions stated
- [ ] Naming conventions specified
- [ ] Known gotchas captured
- [ ] Under 300 lines total
- [ ] No secrets or credentials
- [ ] No information duplicated from code/README
- [ ] Updated within last 30 days
