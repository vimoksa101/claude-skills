/**
 * Session Resume — Save and restore session context for drift reduction
 *
 * Saves what the agent was working on when a session ends (or generator completes),
 * and builds a resume briefing when a new session starts.
 *
 * State: .claude/.harness-state/session-resume.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const STATE_DIR = join(process.cwd(), '.claude', '.harness-state');
const STATE_FILE = join(STATE_DIR, 'session-resume.json');

function defaultState() {
  return {
    lastFiles: [],
    lastChangeSummary: '',
    pendingTasks: [],
    fullFailHistory: [],
    lastAgent: null,
    savedAt: null,
  };
}

/**
 * Load session state
 */
export function loadSessionState() {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (!state.savedAt) return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * Save session state
 * @param {object} data
 * @param {string[]} [data.lastFiles] - files modified
 * @param {string} [data.lastChangeSummary] - what was done
 * @param {string[]} [data.pendingTasks] - remaining work
 * @param {object[]} [data.fullFailHistory] - all FAIL reasons
 * @param {string} [data.lastAgent] - last active agent
 */
export function saveSessionState(data) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  const state = {
    ...defaultState(),
    ...data,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Build a resume briefing message for session start
 * @returns {string|null} - markdown briefing or null if no previous session
 */
export function buildResumeBriefing() {
  const state = loadSessionState();
  if (!state) return null;

  const lines = [];
  lines.push(`### Previous Session Resume`);
  lines.push(`> Saved at: ${state.savedAt}`);

  if (state.lastAgent) {
    lines.push(`\nLast active agent: **${state.lastAgent}**`);
  }

  if (state.lastChangeSummary) {
    lines.push(`\nWhat was done:\n> ${state.lastChangeSummary}`);
  }

  if (state.lastFiles && state.lastFiles.length > 0) {
    lines.push(`\nFiles modified (${state.lastFiles.length}):`);
    for (const f of state.lastFiles.slice(0, 15)) {
      lines.push(`- \`${f}\``);
    }
    if (state.lastFiles.length > 15) {
      lines.push(`- ... and ${state.lastFiles.length - 15} more`);
    }
  }

  if (state.pendingTasks && state.pendingTasks.length > 0) {
    lines.push(`\nPending tasks:`);
    for (const t of state.pendingTasks) {
      lines.push(`- [ ] ${t}`);
    }
  }

  if (state.fullFailHistory && state.fullFailHistory.length > 0) {
    lines.push(`\nFail history (${state.fullFailHistory.length} total):`);
    for (const fail of state.fullFailHistory.slice(-3)) {
      const gate = fail.gateType === 'designReview' ? 'Designer Review' : 'QA';
      lines.push(`- [${gate}] iteration ${fail.iteration}: ${fail.reason}`);
    }
  }

  return lines.join('\n');
}
