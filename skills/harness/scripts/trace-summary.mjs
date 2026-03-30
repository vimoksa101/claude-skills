#!/usr/bin/env node

/**
 * Trace Summary CLI — Analyze agent traces
 *
 * Usage:
 *   node scripts/claude-hooks/trace-summary.mjs           # today's traces
 *   node scripts/claude-hooks/trace-summary.mjs 2026-03-29 # specific date
 *   node scripts/claude-hooks/trace-summary.mjs --list     # list available dates
 */

import { readTraces, listTraceDates, summarizeTraces } from './lib/trace-logger.mjs';

function formatTimeline(traces) {
  if (traces.length === 0) return '  (no events)';

  const lines = [];
  for (const t of traces) {
    const time = t.timestamp.slice(11, 19);
    const agent = (t.agent || '').padEnd(16);
    const action = (t.action || '').padEnd(12);
    const detail = t.file || t.verdict || t.reason || '';
    lines.push(`  ${time}  ${agent} ${action} ${detail.slice(0, 60)}`);
  }
  return lines.join('\n');
}

function formatSummary(summary) {
  const lines = [];

  lines.push(`\n=== Summary ===`);
  lines.push(`Total events: ${summary.totalEvents}`);

  if (summary.timespan) {
    lines.push(`Timespan: ${summary.timespan.from.slice(11, 19)} → ${summary.timespan.to.slice(11, 19)}`);
  }

  lines.push(`\nBy action:`);
  for (const [action, count] of Object.entries(summary.actions).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${action.padEnd(16)} ${count}`);
  }

  lines.push(`\nBy agent:`);
  for (const [agent, count] of Object.entries(summary.agents).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${agent.padEnd(16)} ${count}`);
  }

  if (summary.blocks > 0) {
    lines.push(`\nBlocks: ${summary.blocks}`);
  }
  if (summary.warnings > 0) {
    lines.push(`Warnings: ${summary.warnings}`);
  }

  if (summary.verdicts.length > 0) {
    lines.push(`\nVerdicts:`);
    for (const v of summary.verdicts) {
      lines.push(`  ${v.timestamp.slice(11, 19)} ${v.agent || ''} → ${v.verdict}`);
    }
  }

  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const dates = listTraceDates();
    if (dates.length === 0) {
      console.log('No traces found.');
    } else {
      console.log('Available trace dates:');
      for (const d of dates) {
        const traces = readTraces(d);
        console.log(`  ${d}  (${traces.length} events)`);
      }
    }
    process.exit(0);
  }

  const date = args[0] || new Date().toISOString().slice(0, 10);
  const traces = readTraces(date);

  if (traces.length === 0) {
    console.log(`No traces for ${date}.`);
    console.log('Use --list to see available dates.');
    process.exit(0);
  }

  console.log(`=== Trace Timeline: ${date} ===\n`);
  console.log(formatTimeline(traces));

  const summary = summarizeTraces(traces);
  console.log(formatSummary(summary));
}

main();
