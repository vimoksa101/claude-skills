/**
 * Spec Parser — Extract Acceptance Criteria from SPEC files
 *
 * Used by SubagentStart hook to inject sprint contracts to Generators.
 * Looks for SPEC-*.md files in docs/specs/ directory.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SPECS_DIR = join(process.cwd(), 'docs', 'specs');

/**
 * Get active SPEC file paths (excludes done/ subdirectory)
 */
export function getActiveSpecs() {
  try {
    const files = readdirSync(SPECS_DIR)
      .filter(f => f.startsWith('SPEC-') && f.endsWith('.md'))
      .map(f => join(SPECS_DIR, f));
    return files;
  } catch {
    return [];
  }
}

/**
 * Extract Acceptance Criteria section from a SPEC file
 * @param {string} specPath
 * @returns {string[]} AC items
 */
export function extractAcceptanceCriteria(specPath) {
  try {
    const content = readFileSync(specPath, 'utf-8');
    const lines = content.split('\n');
    const acItems = [];
    let inACSection = false;

    for (const line of lines) {
      // Detect AC section start (supports multiple formats)
      if (/^#{1,3}\s*(Acceptance Criteria|AC|검증 기준|수용 기준|수락 기준)/i.test(line)) {
        inACSection = true;
        continue;
      }

      // End AC section at next heading
      if (inACSection && /^#{1,3}\s/.test(line) && !/^#{1,3}\s*(Acceptance|AC|검증|수락)/i.test(line)) {
        inACSection = false;
        continue;
      }

      // Extract AC items (checklist or numbered list)
      if (inACSection) {
        const match = line.match(/^[-*]\s*\[[ x]?\]\s*(.+)|^\d+\.\s*(.+)/);
        if (match) {
          acItems.push((match[1] || match[2]).trim());
        }
      }
    }

    return acItems;
  } catch {
    return [];
  }
}

/**
 * Extract Overview section from a SPEC file
 */
export function extractOverview(specPath) {
  try {
    const content = readFileSync(specPath, 'utf-8');
    const lines = content.split('\n');
    let inOverview = false;
    const overview = [];

    for (const line of lines) {
      if (/^#{1,3}\s*(Overview|개요|목적)/i.test(line)) {
        inOverview = true;
        continue;
      }
      if (inOverview && /^#{1,3}\s/.test(line)) break;
      if (inOverview && line.trim()) {
        overview.push(line.trim());
      }
    }

    return overview.join(' ').slice(0, 300);
  } catch {
    return '';
  }
}

/**
 * Build sprint contract from all active SPECs
 * @returns {string} Markdown sprint contract
 */
export function buildSprintContract() {
  const specs = getActiveSpecs();
  if (specs.length === 0) return '';

  let contract = '## Sprint Contract (auto-generated)\n\n';
  contract += '> Auto-extracted from SPEC Acceptance Criteria.\n';
  contract += '> Generator MUST verify all items before completion.\n\n';

  for (const specPath of specs) {
    const fileName = specPath.split('/').pop();
    const acItems = extractAcceptanceCriteria(specPath);
    const overview = extractOverview(specPath);

    if (acItems.length === 0) continue;

    contract += `### ${fileName}\n`;
    if (overview) contract += `> ${overview}\n\n`;
    for (const item of acItems) {
      contract += `- [ ] ${item}\n`;
    }
    contract += '\n';
  }

  contract += '---\n';
  contract += '**Done when**: All checklist items met + build passes + tests pass\n';
  contract += '**On failure**: Evaluator marks FAIL → Generator re-fixes → Evaluator re-verifies (max 15 iterations)\n';

  return contract;
}
