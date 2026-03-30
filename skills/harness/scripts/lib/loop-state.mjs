/**
 * Loop State — 2-Stage Generator-Evaluator Loop State Management
 *
 * 2-stage commit gate:
 *   Stage 1: QA (functional verification) — build, tests, AC
 *   Stage 2: Designer Review (UX quality) — design, originality, craft, appeal
 *   Both must PASS to allow commit
 *
 * Loop: Generator → QA → FAIL → Generator → QA → PASS → Designer → FAIL → Generator → ...
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const STATE_DIR = join(process.cwd(), '.claude', '.harness-state');
const STATE_FILE = join(STATE_DIR, 'qa-loop.json');

const MAX_ITERATIONS = 15;

/**
 * Default state structure
 */
function defaultState() {
  return {
    gate: {
      qa: 'IDLE',           // IDLE | PENDING | IN_PROGRESS | PASSED | FAILED
      designReview: 'IDLE', // IDLE | PENDING | IN_PROGRESS | PASSED | FAILED
    },
    iteration: 0,
    maxIterations: MAX_ITERATIONS,
    lastGenerator: null,
    lastEvaluator: null,
    failReasons: [],
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

// Compute overall status from gate states
function getOverallStatus(state) {
  const { qa, designReview } = state.gate;
  if (qa === 'IDLE' && designReview === 'IDLE') return 'IDLE';
  if (qa === 'FAILED' || designReview === 'FAILED') return 'QA_FAILED';
  if (qa === 'IN_PROGRESS' || designReview === 'IN_PROGRESS') return 'QA_IN_PROGRESS';
  if (qa === 'PENDING' || designReview === 'PENDING') return 'QA_PENDING';
  if (qa === 'PASSED' && designReview === 'PASSED') return 'QA_PASSED';
  if (qa === 'PASSED' && designReview === 'IDLE') return 'QA_PENDING';
  return 'QA_PENDING';
}

/**
 * Read state file (returns default if missing, migrates old format)
 */
export function readState() {
  try {
    if (!existsSync(STATE_FILE)) return defaultState();
    const raw = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (!raw.gate) {
      const migrated = defaultState();
      migrated.iteration = raw.iteration || 0;
      migrated.lastGenerator = raw.lastGenerator;
      migrated.lastEvaluator = raw.lastEvaluator;
      migrated.failReasons = raw.failReasons || [];
      migrated.history = raw.history || [];
      if (raw.status === 'QA_PASSED') migrated.gate.qa = 'PASSED';
      else if (raw.status === 'QA_FAILED') migrated.gate.qa = 'FAILED';
      else if (raw.status === 'QA_PENDING') migrated.gate.qa = 'PENDING';
      return migrated;
    }
    return raw;
  } catch {
    return defaultState();
  }
}

/**
 * Write state file
 */
export function writeState(state) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  state.updatedAt = new Date().toISOString();
  state.status = getOverallStatus(state);
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Called when Generator completes — transitions to QA PENDING
 */
export function onGeneratorComplete(agentName) {
  const state = readState();
  state.gate.qa = 'PENDING';
  state.gate.designReview = 'IDLE';
  state.lastGenerator = agentName;
  state.iteration += 1;
  state.history.push({
    phase: 'generator_complete',
    agent: agentName,
    iteration: state.iteration,
    timestamp: new Date().toISOString(),
  });
  writeState(state);
  return state;
}

/**
 * Called when Evaluator starts
 * @param {string} agentName
 * @param {'qa'|'designReview'} gateType
 */
export function onEvaluatorStart(agentName, gateType = 'qa') {
  const state = readState();
  state.gate[gateType] = 'IN_PROGRESS';
  state.lastEvaluator = agentName;
  state.history.push({
    phase: `${gateType}_start`,
    agent: agentName,
    iteration: state.iteration,
    timestamp: new Date().toISOString(),
  });
  writeState(state);
  return state;
}

/**
 * Called when Evaluator passes
 * @param {string} agentName
 * @param {'qa'|'designReview'} gateType
 */
export function onEvaluatorPass(agentName, gateType = 'qa') {
  const state = readState();
  state.gate[gateType] = 'PASSED';
  state.history.push({
    phase: `${gateType}_pass`,
    agent: agentName,
    iteration: state.iteration,
    timestamp: new Date().toISOString(),
  });

  // QA pass → Designer Review pending
  if (gateType === 'qa' && state.gate.designReview !== 'PASSED') {
    state.gate.designReview = 'PENDING';
  }

  writeState(state);
  return state;
}

/**
 * Called when Evaluator fails — Generator must re-fix
 * @param {string} agentName
 * @param {string} reason
 * @param {'qa'|'designReview'} gateType
 */
export function onEvaluatorFail(agentName, reason, gateType = 'qa') {
  const state = readState();
  state.gate[gateType] = 'FAILED';
  // Any gate FAIL resets both (must re-verify from scratch)
  if (gateType === 'designReview') {
    state.gate.qa = 'IDLE';
  }
  state.failReasons.push({
    iteration: state.iteration,
    reason,
    agent: agentName,
    gateType,
    timestamp: new Date().toISOString(),
  });
  state.history.push({
    phase: `${gateType}_fail`,
    agent: agentName,
    iteration: state.iteration,
    reason,
    timestamp: new Date().toISOString(),
  });
  writeState(state);
  return state;
}

/**
 * Check if commit is allowed — 2-stage gate
 * @returns {{ canCommit: boolean, reason?: string, state: object }}
 */
export function canCommit() {
  const state = readState();
  const overall = getOverallStatus(state);

  if (overall === 'IDLE') {
    return { canCommit: true, state };
  }

  if (overall === 'QA_PASSED') {
    return { canCommit: true, state };
  }

  if (state.gate.qa === 'PENDING') {
    return {
      canCommit: false,
      reason: `Commit blocked: [Stage 1] QA verification incomplete.\n` +
        `Run the QA Evaluator.\n` +
        `Current: iteration ${state.iteration}/${state.maxIterations} | Generator: ${state.lastGenerator}`,
      state,
    };
  }

  if (state.gate.qa === 'PASSED' && state.gate.designReview === 'PENDING') {
    return {
      canCommit: false,
      reason: `Commit blocked: [Stage 1] QA PASS -> [Stage 2] Designer Review incomplete.\n` +
        `Run the Designer Review Evaluator.`,
      state,
    };
  }

  if (state.gate.qa === 'FAILED' || state.gate.designReview === 'FAILED') {
    const failedGate = state.gate.qa === 'FAILED' ? 'QA' : 'Designer Review';
    if (state.iteration >= state.maxIterations) {
      return {
        canCommit: false,
        reason: `Commit blocked: ${failedGate} still FAIL after ${state.maxIterations} iterations.\n` +
          `Last failure: ${state.failReasons.at(-1)?.reason}\n` +
          `Manual review required.`,
        state,
      };
    }
    return {
      canCommit: false,
      reason: `Commit blocked: ${failedGate} FAIL (iteration ${state.iteration}/${state.maxIterations}).\n` +
        `Failure: ${state.failReasons.at(-1)?.reason}\n` +
        `Re-run Generator to fix, then re-evaluate.`,
      state,
    };
  }

  if (state.gate.qa === 'IN_PROGRESS' || state.gate.designReview === 'IN_PROGRESS') {
    return {
      canCommit: false,
      reason: `Commit blocked: Evaluation in progress. Wait for completion.`,
      state,
    };
  }

  return { canCommit: true, state };
}

/**
 * Reset the loop to initial state
 */
export function resetLoop() {
  writeState(defaultState());
}

/**
 * Get human-readable status summary
 */
export function getStatusSummary() {
  const state = readState();
  const emoji = { IDLE: '⚪', PENDING: '🟡', IN_PROGRESS: '🔵', PASSED: '✅', FAILED: '🔴' };
  return (
    `${emoji[state.gate.qa] || '❓'} [Stage 1] QA: ${state.gate.qa}\n` +
    `${emoji[state.gate.designReview] || '❓'} [Stage 2] Designer Review: ${state.gate.designReview}\n` +
    `🔄 Iteration: ${state.iteration}/${state.maxIterations}`
  );
}
