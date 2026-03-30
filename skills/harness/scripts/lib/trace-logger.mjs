/**
 * Trace Logger — Append-only JSONL trace of agent actions
 *
 * Logs every significant event (agent start, file write, block, warning, verdict)
 * to a daily JSONL file for post-hoc analysis.
 *
 * Storage: .claude/.harness-state/traces/YYYY-MM-DD.jsonl
 * Format: One JSON object per line (JSONL)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TRACES_DIR = join(process.cwd(), '.claude', '.harness-state', 'traces');

function ensureDir() {
  if (!existsSync(TRACES_DIR)) {
    mkdirSync(TRACES_DIR, { recursive: true });
  }
}

function getTraceFile(date) {
  const d = date || new Date().toISOString().slice(0, 10);
  return join(TRACES_DIR, `${d}.jsonl`);
}

/**
 * Append a trace entry (fire-and-forget, never throws)
 *
 * @param {object} entry
 * @param {string} entry.action - e.g. 'agent_start', 'file_write', 'block', 'warning', 'verdict'
 * @param {string} [entry.agent] - agent name
 * @param {string} [entry.file] - file path involved
 * @param {string} [entry.verdict] - PASS/FAIL
 * @param {string} [entry.reason] - block/warning reason
 * @param {object} [entry.meta] - any additional data
 */
export function appendTrace(entry) {
  try {
    ensureDir();
    const record = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    appendFileSync(getTraceFile(), JSON.stringify(record) + '\n');
  } catch {
    // Trace logging must never break the hook
  }
}

/**
 * Read all traces for a given date
 * @param {string} [date] - YYYY-MM-DD, defaults to today
 * @returns {object[]}
 */
export function readTraces(date) {
  try {
    const file = getTraceFile(date);
    if (!existsSync(file)) return [];
    const lines = readFileSync(file, 'utf-8').trim().split('\n');
    return lines.filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * List available trace dates
 * @returns {string[]} - e.g. ['2026-03-28', '2026-03-29']
 */
export function listTraceDates() {
  try {
    ensureDir();
    return readdirSync(TRACES_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Generate summary statistics from traces
 * @param {object[]} traces
 * @returns {object}
 */
export function summarizeTraces(traces) {
  const agents = {};
  const actions = {};
  const blocks = [];
  const warnings = [];
  const verdicts = [];

  for (const t of traces) {
    // Count by agent
    if (t.agent) {
      agents[t.agent] = (agents[t.agent] || 0) + 1;
    }
    // Count by action
    actions[t.action] = (actions[t.action] || 0) + 1;

    if (t.action === 'block') blocks.push(t);
    if (t.action === 'warning') warnings.push(t);
    if (t.verdict) verdicts.push(t);
  }

  return {
    totalEvents: traces.length,
    agents,
    actions,
    blocks: blocks.length,
    warnings: warnings.length,
    verdicts,
    timespan: traces.length > 0
      ? { from: traces[0].timestamp, to: traces[traces.length - 1].timestamp }
      : null,
  };
}
