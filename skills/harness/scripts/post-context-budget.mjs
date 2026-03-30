#!/usr/bin/env node

/**
 * PostToolUse Hook: Context budget tracking
 *
 * Tracks file reads/writes per session and warns when approaching
 * context overflow thresholds.
 *
 * Matcher: Read|Write|Edit
 * Env: CLAUDE_TOOL_INPUT: { file_path: string, limit?: number }
 *       CLAUDE_TOOL_NAME: "Read"|"Write"|"Edit"
 */

import { trackRead, trackWrite } from './lib/context-budget.mjs';
import { appendTrace } from './lib/trace-logger.mjs';

function main() {
  let toolInput;
  try {
    toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  } catch {
    process.exit(0);
  }

  const toolName = process.env.CLAUDE_TOOL_NAME;
  const filePath = toolInput.file_path;
  if (!filePath) process.exit(0);

  let warnings = [];

  if (toolName === 'Read') {
    const lineCount = toolInput.limit || 2000; // default Read limit
    const result = trackRead(filePath, lineCount);
    warnings = result.warnings;
  } else {
    // Write or Edit
    const result = trackWrite(filePath);
    warnings = result.warnings;
  }

  if (warnings.length > 0) {
    appendTrace({
      action: 'warning',
      agent: process.env.CLAUDE_AGENT_NAME || 'main',
      file: filePath,
      reason: warnings.join('; '),
      meta: { hook: 'context-budget' },
    });

    process.stdout.write(JSON.stringify({
      decision: 'allow',
      message: warnings.join('\n'),
    }));
  }

  process.exit(0);
}

main();
