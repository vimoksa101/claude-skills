#!/bin/bash
set -e

# Anthropic Harness Pattern — Setup Script
# Usage: bash setup.sh [project-dir]
#   If project-dir is omitted, uses current directory.

PROJECT_DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 Installing Anthropic Harness Pattern..."
echo "   Target: $PROJECT_DIR"

# 1. Copy hook scripts
echo "📁 Copying hook scripts..."
mkdir -p "$PROJECT_DIR/scripts/claude-hooks/lib"
cp "$SCRIPT_DIR/scripts/pre-write-guard.mjs" "$PROJECT_DIR/scripts/claude-hooks/"
cp "$SCRIPT_DIR/scripts/pre-bash-guard.mjs" "$PROJECT_DIR/scripts/claude-hooks/"
cp "$SCRIPT_DIR/scripts/post-write-verify.mjs" "$PROJECT_DIR/scripts/claude-hooks/"
cp "$SCRIPT_DIR/scripts/subagent-contract.mjs" "$PROJECT_DIR/scripts/claude-hooks/"
cp "$SCRIPT_DIR/scripts/session-init.mjs" "$PROJECT_DIR/scripts/claude-hooks/"
cp "$SCRIPT_DIR/scripts/lib/agent-registry.mjs" "$PROJECT_DIR/scripts/claude-hooks/lib/"
cp "$SCRIPT_DIR/scripts/lib/spec-parser.mjs" "$PROJECT_DIR/scripts/claude-hooks/lib/"
cp "$SCRIPT_DIR/scripts/lib/loop-state.mjs" "$PROJECT_DIR/scripts/claude-hooks/lib/"

# 2. Copy settings.json (only if not exists)
echo "⚙️  Setting up .claude/settings.json..."
mkdir -p "$PROJECT_DIR/.claude"
if [ -f "$PROJECT_DIR/.claude/settings.json" ]; then
  echo "   ⚠️  .claude/settings.json already exists — skipping (merge manually)"
  echo "   Reference: $SCRIPT_DIR/templates/settings.json"
else
  cp "$SCRIPT_DIR/templates/settings.json" "$PROJECT_DIR/.claude/settings.json"
  echo "   ✅ Created .claude/settings.json"
fi

# 3. Copy AGENTS.md (only if not exists)
if [ -f "$PROJECT_DIR/AGENTS.md" ]; then
  echo "   ⚠️  AGENTS.md already exists — skipping"
else
  cp "$SCRIPT_DIR/templates/AGENTS.md" "$PROJECT_DIR/AGENTS.md"
  echo "   ✅ Created AGENTS.md (customize for your project)"
fi

# 4. Create docs/specs directory
mkdir -p "$PROJECT_DIR/docs/specs"
echo "   ✅ Created docs/specs/ for SPEC files"

# 5. Create harness state directory
mkdir -p "$PROJECT_DIR/.claude/.harness-state"
echo "   ✅ Created .claude/.harness-state/"

# 6. Add harness state to .gitignore
if [ -f "$PROJECT_DIR/.gitignore" ]; then
  if ! grep -q ".claude/.harness-state" "$PROJECT_DIR/.gitignore"; then
    echo "" >> "$PROJECT_DIR/.gitignore"
    echo "# Harness loop state (local only)" >> "$PROJECT_DIR/.gitignore"
    echo ".claude/.harness-state/" >> "$PROJECT_DIR/.gitignore"
    echo "   ✅ Added .harness-state to .gitignore"
  fi
fi

echo ""
echo "✅ Harness installed!"
echo ""
echo "Next steps:"
echo "  1. Edit scripts/claude-hooks/lib/agent-registry.mjs"
echo "     → Customize AGENT_ROLES and OWNERSHIP for your project"
echo "  2. Edit AGENTS.md"
echo "     → Define your team's agent roles and file ownership"
echo "  3. Edit scripts/claude-hooks/post-write-verify.mjs"
echo "     → Customize quality rules for your codebase"
echo "  4. Create SPEC files in docs/specs/"
echo "     → Include '## Acceptance Criteria' sections with checklists"
echo ""
echo "The harness will activate automatically on next Claude Code session."
