# Anthropic Harness Pattern

A complete implementation of the [Anthropic Harness Pattern](https://www.anthropic.com/engineering/claude-code-best-practices) for Claude Code multi-agent workflows.

## What it does

- **2-Stage Evaluator Loop**: Generator builds → QA verifies function → Designer Review verifies UX → both PASS to commit
- **Commit Gate**: Blocks `git commit` until both QA and Designer Review pass
- **File Ownership**: Enforces AGENTS.md ownership rules — Evaluators can't modify code
- **Quality Guards**: Warns on hardcoded colors, font sizes, `any` types, console.log residue
- **Sprint Contract**: Auto-extracts Acceptance Criteria from SPEC files and injects to Generators
- **Session Init**: Reminds project rules and shows loop status on every session start

## Architecture

```
Generator (writes code)
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

## Install

### Quick (recommended)

```bash
cd your-project
curl -sL https://raw.githubusercontent.com/vimoksa101/claude-skills/main/skills/harness/setup.sh | bash
```

### Manual

1. Copy `scripts/` to your project's `scripts/claude-hooks/`
2. Copy `templates/settings.json` to `.claude/settings.json`
3. Copy `templates/AGENTS.md` to your project root and customize
4. Run `node scripts/claude-hooks/lib/loop-state.mjs` to verify

## Configuration

### Customize Agent Roles & File Ownership

Edit `scripts/claude-hooks/lib/agent-registry.mjs`:

```javascript
export const AGENT_ROLES = {
  planner: ['pm', 'tech-lead'],
  generator: ['backend', 'frontend', 'mobile'],  // Add your roles
  evaluator: ['qa', 'designer', 'security'],       // Read-only roles
};

const OWNERSHIP = {
  backend: {
    allowed: ['src/server/', 'src/api/'],
    denied: ['src/client/', 'src/mobile/'],
  },
  // ... add your mappings
};
```

### Customize Quality Rules

Edit `scripts/claude-hooks/post-write-verify.mjs` — add/remove patterns in the `RULES` array.

### Customize Dangerous Commands

Edit `scripts/claude-hooks/pre-bash-guard.mjs` — modify `DANGEROUS_PATTERNS`.

### Change Max Iterations

Edit `scripts/claude-hooks/lib/loop-state.mjs`:

```javascript
const MAX_ITERATIONS = 15; // Change this
```

## Hooks Reference

| Hook | Script | Trigger | Action |
|------|--------|---------|--------|
| PreToolUse | `pre-write-guard.mjs` | Write/Edit | Blocks unauthorized file modifications |
| PreToolUse | `pre-bash-guard.mjs` | Bash | Blocks dangerous commands + commit gate |
| PostToolUse | `post-write-verify.mjs` | Write/Edit | Quality warnings (non-blocking) |
| SubagentStart | `subagent-contract.mjs` | Any subagent | Sprint contract + loop management |
| SessionStart | `session-init.mjs` | Session start | Rules reminder + loop status |

## State Management

Loop state is stored at `.claude/.harness-state/qa-loop.json`:

```json
{
  "gate": {
    "qa": "PASSED",
    "designReview": "PASSED"
  },
  "iteration": 2,
  "maxIterations": 15,
  "lastGenerator": "backend",
  "lastEvaluator": "designer-review",
  "failReasons": [],
  "history": []
}
```

Reset the loop: delete `.claude/.harness-state/qa-loop.json` or run the reset function.

## SPEC Files

The harness auto-extracts Acceptance Criteria from SPEC files in `docs/specs/`:

```markdown
## Acceptance Criteria
- [ ] User can create a new record
- [ ] Form validates required fields
- [ ] Success toast appears after save
```

These are injected into Generator subagents as a "Sprint Contract" checklist.
