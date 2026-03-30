#!/usr/bin/env node

/**
 * PostToolUse Hook: Backpressure detection
 *
 * Tracks repetitive edits to the same file and recurring error patterns.
 * Warns agent to change approach instead of retrying the same thing.
 *
 * Matcher: Write|Edit|Bash
 * Env: CLAUDE_TOOL_INPUT: { file_path?: string, command?: string }
 *       CLAUDE_TOOL_NAME: "Write"|"Edit"|"Bash"
 *       CLAUDE_TOOL_RESULT: tool output (for Bash error detection)
 */

import { trackEdit, trackError } from './lib/backpressure.mjs';
import { appendTrace } from './lib/trace-logger.mjs';

function main() {
  let toolInput;
  try {
    toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  } catch {
    process.exit(0);
  }

  const toolName = process.env.CLAUDE_TOOL_NAME;
  const warnings = [];

  if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
    const result = trackEdit(toolInput.file_path);
    warnings.push(...result.warnings);
  }

  if (toolName === 'Bash') {
    // Check for error indicators in tool result
    const toolResult = process.env.CLAUDE_TOOL_RESULT || '';
    const exitCode = process.env.CLAUDE_TOOL_EXIT_CODE;

    if (exitCode && exitCode !== '0' && toolResult) {
      // Extract first meaningful error line
      const errorLine = toolResult.split('\n')
        .find(line => /error|Error|ERROR|failed|FAILED|Cannot|cannot|ENOENT|EACCES/i.test(line));

      if (errorLine) {
        const result = trackError(errorLine);
        warnings.push(...result.warnings);
      }
    }
  }

  if (warnings.length > 0) {
    appendTrace({
      action: 'warning',
      agent: process.env.CLAUDE_AGENT_NAME || 'main',
      file: toolInput.file_path || toolInput.command?.slice(0, 80),
      reason: warnings.join('; '),
      meta: { hook: 'backpressure' },
    });

    process.stdout.write(JSON.stringify({
      decision: 'allow',
      message: warnings.join('\n'),
    }));
  }

  process.exit(0);
}

main();
