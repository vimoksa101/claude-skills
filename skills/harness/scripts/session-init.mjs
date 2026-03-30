#!/usr/bin/env node

/**
 * SessionStart Hook: Project rules reminder + loop status
 *
 * Runs on every new session to remind core harness rules.
 */

import { getStatusSummary, readState } from './lib/loop-state.mjs';
import { buildResumeBriefing } from './lib/session-resume.mjs';
import { appendTrace } from './lib/trace-logger.mjs';
import { resetBudget } from './lib/context-budget.mjs';
import { resetBackpressure } from './lib/backpressure.mjs';
import { existsSync } from 'fs';
import { join } from 'path';

function main() {
  const messages = [];

  messages.push(
    `## Harness Active\n\n` +
    `This project uses the **Anthropic Harness Pattern**.\n\n` +
    `### Core Rules\n` +
    `1. **Generator-Evaluator separation**: Code authors do not evaluate their own code\n` +
    `2. **Commit gate**: QA + Designer Review both PASS required before git commit\n` +
    `3. **File ownership**: Based on AGENTS.md — Evaluators are read-only\n` +
    `4. **Loop**: Generator → Evaluator → FAIL → re-fix (max 15 iterations)\n\n` +
    `### Reference\n` +
    `- \`CLAUDE.md\` — Project rules\n` +
    `- \`AGENTS.md\` — Agent roles + file ownership`
  );

  const state = readState();
  if (state.status !== 'IDLE') {
    messages.push(`\n### Loop Status\n${getStatusSummary()}`);

    if (state.status === 'QA_FAILED') {
      const lastFail = state.failReasons.at(-1);
      messages.push(
        `\nPrevious session: QA FAIL\n` +
        `Reason: ${lastFail?.reason}\n` +
        `Generator re-fix required.`
      );
    }

    if (state.status === 'QA_PENDING') {
      messages.push(
        `\nGenerator (${state.lastGenerator}) completed. Run Evaluator next.`
      );
    }
  }

  // Session resume briefing
  const resumeBriefing = buildResumeBriefing();
  if (resumeBriefing) {
    messages.push(`\n${resumeBriefing}`);
  }

  // Reset per-session state
  resetBudget();
  resetBackpressure();

  // Log session start
  appendTrace({ action: 'session_start', meta: { loopStatus: state.status } });

  const specsDir = join(process.cwd(), 'docs', 'specs');
  if (!existsSync(specsDir)) {
    messages.push(`\nNote: docs/specs/ directory not found. Create it to enable sprint contracts.`);
  }

  if (messages.length > 0) {
    process.stdout.write(JSON.stringify({
      message: messages.join('\n'),
    }));
  }

  process.exit(0);
}

main();
