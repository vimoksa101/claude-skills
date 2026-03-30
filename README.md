# Claude Skills Collection

Reusable Claude Code skills & hooks for any project.

## Skills

| Skill | Description | Type |
|-------|------------|------|
| [ui-test-lite](skills/ui-test-lite/) | Token-efficient UI/UX testing — accessibility tree + boundingBox instead of screenshots (90% token reduction) | Skill (SKILL.md) |
| [harness](skills/harness/) | Anthropic Harness Pattern — evaluator loop, commit gate, file ownership, context budget, backpressure, tracing, session resume, handoff memos | Hooks |
| [claudemd-guide](skills/claudemd-guide/) | Best practices for writing effective CLAUDE.md files | Skill (SKILL.md) |

## Quick Install

### ui-test-lite (Skill only)

```bash
# Copy to your Claude skills directory
mkdir -p ~/.claude/skills/ui-test-lite
curl -sL https://raw.githubusercontent.com/vimoksa101/claude-skills/main/skills/ui-test-lite/SKILL.md \
  -o ~/.claude/skills/ui-test-lite/SKILL.md
```

### claudemd-guide (Skill only)

```bash
mkdir -p ~/.claude/skills/claudemd-guide
curl -sL https://raw.githubusercontent.com/vimoksa101/claude-skills/main/skills/claudemd-guide/SKILL.md \
  -o ~/.claude/skills/claudemd-guide/SKILL.md
```

### harness (Hooks + Scripts)

```bash
git clone https://github.com/vimoksa101/claude-skills.git /tmp/claude-skills
bash /tmp/claude-skills/skills/harness/setup.sh /path/to/your/project
```

## What is a "Skill"?

A **Skill** is a `SKILL.md` file placed in `~/.claude/skills/` that Claude Code loads as instructions. Reference it in your `CLAUDE.md`:

```markdown
Refer to `~/.claude/skills/ui-test-lite/SKILL.md` for UI testing approach.
```

## What is a "Hook"?

**Hooks** are scripts defined in `.claude/settings.json` that Claude Code runs automatically at specific lifecycle events (PreToolUse, PostToolUse, SubagentStart, SessionStart). They enforce rules without relying on the LLM to remember them.

## Contributing

1. Fork this repo
2. Add your skill under `skills/your-skill-name/`
3. Include a `SKILL.md` (for prompt-based skills) or `README.md` + `setup.sh` (for hook-based skills)
4. Submit a PR

## License

MIT
