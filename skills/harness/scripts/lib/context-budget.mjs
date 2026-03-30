/**
 * Context Budget — Track file reads/writes to prevent context overflow
 *
 * Warns when too many files are modified (split needed) or
 * excessively large files are read without scoping.
 *
 * State: .claude/.harness-state/context-budget.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const STATE_DIR = join(process.cwd(), '.claude', '.harness-state');
const STATE_FILE = join(STATE_DIR, 'context-budget.json');

const WRITE_THRESHOLD = 13;   // files modified before warning
const READ_LINE_THRESHOLD = 500; // lines read in one go before warning

function defaultState() {
  return {
    filesRead: [],
    filesWritten: [],
    totalReads: 0,
    totalWrites: 0,
    sessionStart: new Date().toISOString(),
  };
}

export function readBudgetState() {
  try {
    if (!existsSync(STATE_FILE)) return defaultState();
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return defaultState();
  }
}

function writeBudgetState(state) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Track a file read
 * @param {string} filePath
 * @param {number} [lineCount] - number of lines read
 * @returns {{ warnings: string[] }}
 */
export function trackRead(filePath, lineCount = 0) {
  const state = readBudgetState();
  const rel = filePath.startsWith(process.cwd())
    ? relative(process.cwd(), filePath)
    : filePath;

  if (!state.filesRead.includes(rel)) {
    state.filesRead.push(rel);
  }
  state.totalReads += 1;
  writeBudgetState(state);

  const warnings = [];
  if (lineCount > READ_LINE_THRESHOLD) {
    warnings.push(
      `Context budget: Reading ${lineCount} lines from ${rel}. ` +
      `Consider reading only the relevant section (offset + limit) to save context.`
    );
  }

  return { warnings };
}

/**
 * Track a file write/edit
 * @param {string} filePath
 * @returns {{ warnings: string[] }}
 */
export function trackWrite(filePath) {
  const state = readBudgetState();
  const rel = filePath.startsWith(process.cwd())
    ? relative(process.cwd(), filePath)
    : filePath;

  if (!state.filesWritten.includes(rel)) {
    state.filesWritten.push(rel);
  }
  state.totalWrites += 1;
  writeBudgetState(state);

  const warnings = [];
  const uniqueFiles = state.filesWritten.length;

  if (uniqueFiles === WRITE_THRESHOLD) {
    warnings.push(
      `Context budget: ${uniqueFiles} files modified this session. ` +
      `Consider committing current work and splitting remaining tasks to a new agent.`
    );
  } else if (uniqueFiles > WRITE_THRESHOLD && uniqueFiles % 5 === 0) {
    warnings.push(
      `Context budget: ${uniqueFiles} files modified. Task split strongly recommended.`
    );
  }

  return { warnings };
}

/**
 * Get current budget summary
 */
export function getBudgetSummary() {
  const state = readBudgetState();
  return {
    uniqueReads: state.filesRead.length,
    uniqueWrites: state.filesWritten.length,
    totalReads: state.totalReads,
    totalWrites: state.totalWrites,
  };
}

/**
 * Reset budget (new session)
 */
export function resetBudget() {
  writeBudgetState(defaultState());
}
