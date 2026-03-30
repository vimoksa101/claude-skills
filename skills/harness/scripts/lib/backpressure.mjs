/**
 * Backpressure — Detect repetitive actions and suggest strategy changes
 *
 * Tracks how many times the same file is edited and recurring error patterns.
 * Warns agent to change approach instead of repeating failed strategies.
 *
 * State: .claude/.harness-state/backpressure.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const STATE_DIR = join(process.cwd(), '.claude', '.harness-state');
const STATE_FILE = join(STATE_DIR, 'backpressure.json');

const EDIT_THRESHOLD = 3;    // same file edited N+ times → warn
const ERROR_THRESHOLD = 2;   // same error pattern N+ times → warn

function defaultState() {
  return {
    fileEditCounts: {},    // { "src/foo.ts": 3 }
    errorPatterns: [],     // ["Cannot find module X", "Cannot find module X"]
    sessionStart: new Date().toISOString(),
  };
}

export function readBackpressureState() {
  try {
    if (!existsSync(STATE_FILE)) return defaultState();
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return defaultState();
  }
}

function writeBackpressureState(state) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Normalize error message for pattern matching
 * Strips line numbers, file paths, and variable content to find recurring patterns
 */
function normalizeError(errorMsg) {
  return errorMsg
    .replace(/\/[\w\/.-]+/g, '<path>')     // file paths
    .replace(/:\d+:\d+/g, ':<line>')       // line:col
    .replace(/\d+/g, '<N>')                // numbers
    .trim()
    .slice(0, 120);                         // cap length
}

/**
 * Track a file edit
 * @param {string} filePath
 * @returns {{ warnings: string[] }}
 */
export function trackEdit(filePath) {
  const state = readBackpressureState();
  const rel = filePath.startsWith(process.cwd())
    ? relative(process.cwd(), filePath)
    : filePath;

  state.fileEditCounts[rel] = (state.fileEditCounts[rel] || 0) + 1;
  writeBackpressureState(state);

  const warnings = [];
  const count = state.fileEditCounts[rel];

  if (count === EDIT_THRESHOLD) {
    warnings.push(
      `Backpressure: ${rel} has been edited ${count} times this session. ` +
      `Consider stepping back to rethink your approach before editing again.`
    );
  } else if (count > EDIT_THRESHOLD && count % 3 === 0) {
    warnings.push(
      `Backpressure: ${rel} edited ${count} times. ` +
      `This file is being churned — strong signal to change strategy.`
    );
  }

  return { warnings };
}

/**
 * Track a command error (from Bash exit code or stderr)
 * @param {string} errorMsg
 * @returns {{ warnings: string[] }}
 */
export function trackError(errorMsg) {
  if (!errorMsg || errorMsg.length < 10) return { warnings: [] };

  const state = readBackpressureState();
  const normalized = normalizeError(errorMsg);
  state.errorPatterns.push(normalized);
  writeBackpressureState(state);

  // Count occurrences of this pattern
  const count = state.errorPatterns.filter(p => p === normalized).length;

  const warnings = [];
  if (count === ERROR_THRESHOLD) {
    warnings.push(
      `Backpressure: Same error pattern seen ${count} times: "${normalized.slice(0, 80)}..." ` +
      `Consider a fundamentally different approach instead of retrying.`
    );
  } else if (count > ERROR_THRESHOLD && count % 2 === 0) {
    warnings.push(
      `Backpressure: Error pattern repeated ${count} times. Stop and rethink.`
    );
  }

  return { warnings };
}

/**
 * Reset backpressure state (new session)
 */
export function resetBackpressure() {
  writeBackpressureState(defaultState());
}
