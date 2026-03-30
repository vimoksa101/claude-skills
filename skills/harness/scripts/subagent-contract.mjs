#!/usr/bin/env node

/**
 * SubagentStart Hook: Sprint contract injection + 2-stage loop management
 *
 * - Generator start: injects SPEC AC contract + previous FAIL feedback
 * - QA start: injects functional verification prompt (Stage 1)
 * - Designer Review start: injects UX quality evaluation prompt (Stage 2)
 *
 * Env: CLAUDE_AGENT_NAME: subagent name
 */

import { isGenerator, normalizeAgentName } from './lib/agent-registry.mjs';
import { buildSprintContract } from './lib/spec-parser.mjs';
import { readState, onEvaluatorStart, getStatusSummary } from './lib/loop-state.mjs';
import { appendTrace } from './lib/trace-logger.mjs';
import { buildHandoffContext } from './lib/handoff.mjs';
import { saveSessionState } from './lib/session-resume.mjs';

function isDesignerReview(agentName) {
  const n = normalizeAgentName(agentName);
  return n && (n.includes('designer') || n.includes('design'));
}

function isQA(agentName) {
  const n = normalizeAgentName(agentName);
  return n && (n.includes('qa') || n.includes('verifier'));
}

function main() {
  const agentName = process.env.CLAUDE_AGENT_NAME;
  if (!agentName) process.exit(0);

  const state = readState();
  const messages = [];

  // --- Generator agent start ---
  if (isGenerator(agentName)) {
    appendTrace({ action: 'agent_start', agent: agentName, meta: { role: 'generator', iteration: state.iteration } });

    const contract = buildSprintContract();
    if (contract) {
      messages.push(contract);
    }

    // Inject previous handoff context
    const handoffCtx = buildHandoffContext();
    if (handoffCtx) {
      messages.push(`\n${handoffCtx}`);
    }

    // If re-running after FAIL → inject failure feedback
    const lastFail = state.failReasons?.at(-1);
    if (lastFail) {
      const failGate = lastFail.gateType === 'designReview' ? 'Designer Review (UX)' : 'QA (functional)';
      messages.push(
        `\n## Re-fix Request from ${failGate} (iteration ${state.iteration}/${state.maxIterations})\n\n` +
        `Previous Evaluator FAIL reason:\n` +
        `> ${lastFail.reason}\n\n` +
        `**You MUST resolve the above issue before completing your work.**`
      );
    }

    messages.push(
      `\n---\n` +
      `On completion you MUST:\n` +
      `1. Build passes (no type errors)\n` +
      `2. Tests pass\n` +
      `3. All Sprint Contract AC items met\n` +
      `4. **Write a handoff memo** — list modified files, key decisions, warnings, and remaining TODOs\n` +
      `Both QA + Designer Review must PASS before commit is allowed.`
    );

    // Save session state for resume
    saveSessionState({
      lastAgent: agentName,
      fullFailHistory: state.failReasons || [],
    });
  }

  // --- Stage 1: QA agent start ---
  if (isQA(agentName)) {
    appendTrace({ action: 'agent_start', agent: agentName, meta: { role: 'qa', iteration: state.iteration } });
    onEvaluatorStart(agentName, 'qa');

    // Inject handoff context from Generator
    const handoffCtx = buildHandoffContext();
    if (handoffCtx) {
      messages.push(`\n${handoffCtx}\n`);
    }

    messages.push(
      `## [Stage 1] QA Functional Verification\n\n` +
      `You are a **skeptical functional evaluator**. Verify the implementation actually works.\n\n` +
      `### Verification Scope\n` +
      `1. **Build**: No type errors, no compilation failures\n` +
      `2. **Tests**: All tests pass\n` +
      `3. **AC Coverage**: Every Acceptance Criteria item verified individually\n` +
      `4. **Real Behavior**: Functions are called, APIs respond, data flows correctly\n` +
      `5. **Stub Detection**: Signature-only implementations with empty bodies = FAIL\n\n` +
      `### Verdict\n` +
      `| Verdict | Condition |\n` +
      `|---------|----------|\n` +
      `| **PASS** | 100% AC met + build passes + real behavior confirmed |\n` +
      `| **FAIL** | Any AC unmet / runtime error / stub-only implementation |\n\n` +
      `### Anti-patterns\n` +
      `- "Almost done, PASS" → FAIL\n` +
      `- "Function exists, PASS" → if not called, FAIL\n` +
      `- "Minor issue, PASS" → a problem is a problem\n\n` +
      `### Output Format\n` +
      `\`\`\`\n` +
      `## QA Verdict: [PASS|FAIL]\n` +
      `### AC Verification\n` +
      `- [ ] AC-1: PASS/FAIL — evidence\n` +
      `### Build & Tests\n` +
      `- [ ] Build: PASS/FAIL\n` +
      `- [ ] Tests: PASS/FAIL\n` +
      `### Failure Reasons (if FAIL)\n` +
      `file:line — symptom — expected behavior\n` +
      `\`\`\`\n\n` +
      `> On PASS → proceeds to Stage 2 Designer Review.`
    );

    messages.push(`\n${getStatusSummary()}`);
  }

  // --- Stage 2: Designer Review agent start ---
  if (isDesignerReview(agentName)) {
    appendTrace({ action: 'agent_start', agent: agentName, meta: { role: 'designer-review', iteration: state.iteration } });
    onEvaluatorStart(agentName, 'designReview');

    // Inject handoff context
    const handoffCtx = buildHandoffContext();
    if (handoffCtx) {
      messages.push(`\n${handoffCtx}\n`);
    }

    messages.push(
      `## [Stage 2] Designer Review — UX Quality Evaluation\n\n` +
      `You are a **UX quality judge**. QA already confirmed functionality.\n` +
      `Your job: evaluate whether **users would actually enjoy this**.\n\n` +
      `### 4 Evaluation Criteria\n\n` +
      `#### 1. Design Quality (high weight)\n` +
      `> "Does the design feel like a cohesive whole, not a collection of parts?"\n\n` +
      `#### 2. Originality (high weight)\n` +
      `> "Evidence of custom decisions? Or does it look like a default template?"\n\n` +
      `#### 3. Craft (Technical Execution)\n` +
      `> Typography hierarchy, spacing consistency, color harmony, animations\n\n` +
      `#### 4. User Appeal\n` +
      `> Can users figure out what to do in 3 seconds? Is interaction enjoyable?\n\n` +
      `### Scoring: 1-5 per criterion\n` +
      `| Score | Meaning |\n` +
      `|-------|---------|\n` +
      `| 1 | Not implemented / default template level |\n` +
      `| 2 | Functional but unappealing |\n` +
      `| 3 | Average — fine but not special |\n` +
      `| 4 | Good — noticeable attention to detail |\n` +
      `| 5 | Excellent — users would be drawn to it |\n\n` +
      `### Verdict\n` +
      `| Verdict | Condition |\n` +
      `|---------|----------|\n` +
      `| **PASS** | Average 3.5+ AND no criterion below 2 |\n` +
      `| **FAIL** | Average below 3.5 OR any criterion at 2 or below |\n\n` +
      `### Output Format\n` +
      `\`\`\`\n` +
      `## Designer Review Verdict: [PASS|FAIL]\n\n` +
      `### Scores\n` +
      `| Criterion | Score | Evidence |\n` +
      `|-----------|-------|----------|\n` +
      `| Design Quality | X/5 | ... |\n` +
      `| Originality | X/5 | ... |\n` +
      `| Craft | X/5 | ... |\n` +
      `| User Appeal | X/5 | ... |\n` +
      `| **Average** | **X.X/5** | |\n\n` +
      `### Improvement Instructions (if FAIL)\n` +
      `1. {component} — {current problem} → {specific fix}\n` +
      `\`\`\``
    );

    messages.push(`\n${getStatusSummary()}`);
  }

  if (messages.length > 0) {
    process.stdout.write(JSON.stringify({
      decision: 'allow',
      message: messages.join('\n'),
    }));
  }

  process.exit(0);
}

main();
