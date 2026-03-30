/**
 * Handoff Memo — Structured agent-to-agent handoff artifacts
 *
 * When a Generator completes work, it saves a handoff memo.
 * The next agent (QA, Designer, or another Generator) receives this context.
 *
 * Storage: .claude/.harness-state/handoffs/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const HANDOFFS_DIR = join(process.cwd(), '.claude', '.harness-state', 'handoffs');

function ensureDir() {
  if (!existsSync(HANDOFFS_DIR)) {
    mkdirSync(HANDOFFS_DIR, { recursive: true });
  }
}

/**
 * Save a handoff memo
 * @param {object} data
 * @param {string} data.agent - agent name
 * @param {string[]} [data.modifiedFiles] - files changed
 * @param {string[]} [data.keyDecisions] - important decisions made
 * @param {string[]} [data.warnings] - things the next agent should watch out for
 * @param {string[]} [data.remainingTODO] - unfinished work
 * @param {string} [data.summary] - brief summary of work done
 */
export function saveHandoff(data) {
  ensureDir();
  const memo = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_${data.agent || 'unknown'}.json`;
  writeFileSync(join(HANDOFFS_DIR, filename), JSON.stringify(memo, null, 2));
}

/**
 * Get the most recent handoff memo
 * @returns {object|null}
 */
export function getLatestHandoff() {
  try {
    ensureDir();
    const files = readdirSync(HANDOFFS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;
    return JSON.parse(readFileSync(join(HANDOFFS_DIR, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get all handoffs for current iteration
 * @returns {object[]}
 */
export function getAllHandoffs() {
  try {
    ensureDir();
    const files = readdirSync(HANDOFFS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    return files.map(f => {
      try {
        return JSON.parse(readFileSync(join(HANDOFFS_DIR, f), 'utf-8'));
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Build a handoff context message for the next agent
 * @returns {string|null}
 */
export function buildHandoffContext() {
  const handoff = getLatestHandoff();
  if (!handoff) return null;

  const lines = [];
  lines.push(`### Handoff from ${handoff.agent || 'previous agent'}`);
  lines.push(`> ${handoff.timestamp}`);

  if (handoff.summary) {
    lines.push(`\n**Summary:** ${handoff.summary}`);
  }

  if (handoff.modifiedFiles && handoff.modifiedFiles.length > 0) {
    lines.push(`\n**Modified files (${handoff.modifiedFiles.length}):**`);
    for (const f of handoff.modifiedFiles) {
      lines.push(`- \`${f}\``);
    }
  }

  if (handoff.keyDecisions && handoff.keyDecisions.length > 0) {
    lines.push(`\n**Key decisions:**`);
    for (const d of handoff.keyDecisions) {
      lines.push(`- ${d}`);
    }
  }

  if (handoff.warnings && handoff.warnings.length > 0) {
    lines.push(`\n**Warnings:**`);
    for (const w of handoff.warnings) {
      lines.push(`- ${w}`);
    }
  }

  if (handoff.remainingTODO && handoff.remainingTODO.length > 0) {
    lines.push(`\n**Remaining TODO:**`);
    for (const t of handoff.remainingTODO) {
      lines.push(`- [ ] ${t}`);
    }
  }

  return lines.join('\n');
}
