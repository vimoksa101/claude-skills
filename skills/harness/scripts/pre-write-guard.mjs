#!/usr/bin/env node

/**
 * PreToolUse Hook: Write/Edit file ownership enforcement
 *
 * Blocks Evaluators from modifying code.
 * Blocks Generators from modifying files outside their ownership.
 *
 * Env: CLAUDE_TOOL_INPUT: { file_path: string }, CLAUDE_AGENT_NAME: string
 * Output: JSON { decision: "allow"|"block", reason?: string }
 */

import { checkFileOwnership } from './lib/agent-registry.mjs';
import { relative } from 'path';

function main() {
  const agentName = process.env.CLAUDE_AGENT_NAME;
  if (!agentName) {
    // Main agent (Tech Lead) has no restrictions
    process.exit(0);
  }

  let toolInput;
  try {
    toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  } catch {
    process.exit(0);
  }

  const filePath = toolInput.file_path;
  if (!filePath) process.exit(0);

  const cwd = process.cwd();
  const relativePath = filePath.startsWith(cwd)
    ? relative(cwd, filePath)
    : filePath;

  // Always allow harness state files
  if (relativePath.startsWith('.claude/.harness-state/')) {
    process.exit(0);
  }

  const result = checkFileOwnership(agentName, relativePath);

  if (!result.allowed) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: result.reason,
    }));
    process.exit(0);
  }

  process.exit(0);
}

main();
