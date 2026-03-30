#!/usr/bin/env node

/**
 * PostToolUse Hook: Quality warnings after Write/Edit
 *
 * Detects hardcoded colors, font sizes, any types, console.log residue.
 * Non-blocking — warns only, does not block the write.
 *
 * CUSTOMIZE: Edit the RULES array for your project's conventions.
 *
 * Env: CLAUDE_TOOL_INPUT: { file_path: string, content?: string, new_string?: string }
 */

import { extname } from 'path';
import { appendTrace } from './lib/trace-logger.mjs';

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// CUSTOMIZE THESE RULES FOR YOUR PROJECT
const RULES = [
  {
    name: 'Hardcoded hex color',
    pattern: /(?:color|background|backgroundColor|borderColor)\s*[:=]\s*['"`]#[0-9A-Fa-f]{3,8}['"`]/g,
    message: 'Use theme color tokens instead of hardcoded hex values',
    fileFilter: (f) => /\.(tsx?|jsx?)$/.test(f),
  },
  {
    name: 'Hardcoded fontSize',
    pattern: /fontSize\s*[:=]\s*\d+/g,
    message: 'Use theme typography tokens instead of hardcoded fontSize',
    fileFilter: (f) => /\.(tsx?|jsx?)$/.test(f),
  },
  {
    name: 'any type usage',
    pattern: /:\s*any\b(?!\s*\/\/\s*TODO)/g,
    message: 'Use specific types instead of any',
    fileFilter: (f) => /\.tsx?$/.test(f),
  },
  {
    name: 'console.log residue',
    pattern: /console\.log\(/g,
    message: 'console.log found — remove after debugging',
    fileFilter: (f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('scripts/'),
  },
];

function main() {
  let toolInput;
  try {
    toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  } catch {
    process.exit(0);
  }

  const filePath = toolInput.file_path;
  if (!filePath) process.exit(0);

  const ext = extname(filePath);
  if (!CODE_EXTENSIONS.includes(ext)) process.exit(0);

  const changedContent = toolInput.content || toolInput.new_string;
  if (!changedContent) process.exit(0);

  const warnings = [];

  for (const rule of RULES) {
    if (!rule.fileFilter(filePath)) continue;

    const matches = changedContent.match(rule.pattern);
    if (matches && matches.length > 0) {
      warnings.push(`Warning: ${rule.name} — ${rule.message} (${matches.length} found)`);
    }
  }

  if (warnings.length > 0) {
    appendTrace({ action: 'warning', agent: process.env.CLAUDE_AGENT_NAME || 'main', file: filePath, reason: warnings.join('; '), meta: { hook: 'quality-guard' } });
    process.stdout.write(JSON.stringify({
      decision: 'allow',
      message: `Quality warnings (${warnings.length}):\n${warnings.join('\n')}`,
    }));
  }

  process.exit(0);
}

main();
