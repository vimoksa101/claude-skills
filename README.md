# Claude Skills Collection

Reusable Claude Code skills & hooks for any project.

## Skills

| Skill | Description | Type |
|-------|------------|------|
| [ui-test-lite](skills/ui-test-lite/) | Token-efficient UI/UX testing — accessibility tree + boundingBox instead of screenshots (90% token reduction) | Skill (SKILL.md) |
| [harness](skills/harness/) | Anthropic Harness Pattern — 2-stage evaluator loop, commit gate, file ownership, quality guards | Hooks + Skill |

## Quick Install

### ui-test-lite (Skill only)

```bash
# Copy to your Claude skills directory
mkdir -p ~/.claude/skills/ui-test-lite
curl -sL https://raw.githubusercontent.com/vimoksa101/claude-skills/main/skills/ui-test-lite/SKILL.md \
  -o ~/.claude/skills/ui-test-lite/SKILL.md
```

### harness (Hooks + Scripts)

```bash
# Run the setup script in your project root
curl -sL https://raw.githubusercontent.com/vimoksa101/claude-skills/main/skills/harness/setup.sh | bash
```

Or manually:

```bash
git clone https://github.com/vimoksa101/claude-skills.git /tmp/claude-skills
cd /tmp/claude-skills
bash skills/harness/setup.sh /path/to/your/project
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
