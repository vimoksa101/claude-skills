#!/usr/bin/env node

/**
 * PreToolUse Hook: Dangerous command blocking + commit gate
 *
 * 1. Blocks dangerous commands (rm -rf /, git push --force, --no-verify, etc.)
 * 2. Commit gate: blocks git commit unless QA + Designer Review both PASS
 *
 * Env: CLAUDE_TOOL_INPUT: { command: string }
 * Output: JSON { decision: "allow"|"block", reason?: string }
 */

import { canCommit } from './lib/loop-state.mjs';

const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+(-rf|-fr)\s+[\/~]/, reason: 'Blocked: rm -rf on root/home directory' },
  { pattern: /git\s+push\s+.*--force(?!-)/, reason: 'Blocked: git push --force. Use --force-with-lease instead' },
  { pattern: /--no-verify/, reason: 'Blocked: --no-verify. Do not bypass hooks' },
  { pattern: /git\s+reset\s+--hard\s+(?!HEAD\b)/, reason: 'Blocked: git reset --hard (except HEAD). Risk of losing work' },
  { pattern: /git\s+clean\s+-[a-z]*f/, reason: 'Blocked: git clean -f. Risk of deleting untracked files' },
  { pattern: /drop\s+table|drop\s+database/i, reason: 'Blocked: DROP TABLE/DATABASE' },
];

function main() {
  let toolInput;
  try {
    toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  } catch {
    process.exit(0);
  }

  const command = toolInput.command;
  if (!command) process.exit(0);

  // 1. Dangerous command check
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `${reason}\nCommand: ${command}`,
      }));
      process.exit(0);
    }
  }

  // 2. Commit gate: check QA status before git commit
  if (/git\s+commit\b/.test(command)) {
    const { canCommit: allowed, reason } = canCommit();
    if (!allowed) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason,
      }));
      process.exit(0);
    }
  }

  process.exit(0);
}

main();
