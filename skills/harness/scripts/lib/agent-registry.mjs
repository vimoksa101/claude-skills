/**
 * Agent Registry — File ownership enforcement based on AGENTS.md
 *
 * Customize AGENT_ROLES and OWNERSHIP for your project.
 * Agent names come from CLAUDE_AGENT_NAME environment variable.
 */

// Agent role classification — ADD YOUR ROLES HERE
export const AGENT_ROLES = {
  // Planner (planning)
  planner: ['pm', 'tech-lead', 'techlead', 'product-manager'],
  // Generator (implementation)
  generator: ['architect', 'backend', 'frontend', 'mobile', 'illustrator'],
  // Evaluator (review, read-only)
  evaluator: ['qa', 'security', 'designer', 'designer-review', 'verifier'],
};

// File ownership mapping — CUSTOMIZE FOR YOUR PROJECT
// allowed: paths the agent CAN modify
// denied: paths the agent CANNOT modify (use ['*'] for read-only)
const OWNERSHIP = {
  // Planners
  pm: {
    allowed: ['docs/specs/', 'docs/'],
    denied: ['src/', 'apps/', 'packages/', 'scripts/'],
  },
  architect: {
    allowed: ['packages/shared/', 'src/shared/'],
    denied: [],
  },
  backend: {
    allowed: ['src/server/', 'apps/api/', 'server/'],
    denied: ['src/client/', 'apps/web/', 'apps/mobile/'],
  },
  frontend: {
    allowed: ['src/client/', 'apps/web/', 'client/'],
    denied: ['src/server/', 'apps/api/', 'apps/mobile/'],
  },
  mobile: {
    allowed: ['apps/mobile/'],
    denied: ['apps/api/', 'apps/web/'],
  },
  illustrator: {
    allowed: ['src/components/illustrations/', 'apps/mobile/src/components/illustrations/'],
    denied: [],
  },
  // Evaluators — read-only, cannot modify code
  qa: { allowed: [], denied: ['*'] },
  security: { allowed: [], denied: ['*'] },
  designer: { allowed: [], denied: ['*'] },
  'designer-review': { allowed: [], denied: ['*'] },
  verifier: { allowed: [], denied: ['*'] },
};

/**
 * Normalize agent name (lowercase, spaces/underscores → hyphens)
 */
export function normalizeAgentName(name) {
  if (!name) return null;
  return name.toLowerCase().replace(/[\s_]+/g, '-').trim();
}

/**
 * Get agent's role group (planner | generator | evaluator | unknown)
 */
export function getAgentRole(agentName) {
  const normalized = normalizeAgentName(agentName);
  if (!normalized) return 'unknown';

  for (const [role, names] of Object.entries(AGENT_ROLES)) {
    if (names.some(n => normalized.includes(n))) return role;
  }
  return 'unknown';
}

/**
 * Check if agent can modify a file
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkFileOwnership(agentName, filePath) {
  const normalized = normalizeAgentName(agentName);
  if (!normalized) return { allowed: true };

  const ownership = OWNERSHIP[normalized];
  if (!ownership) return { allowed: true };

  // denied: ['*'] → all code modifications blocked (Evaluator)
  if (ownership.denied.includes('*')) {
    if (filePath.startsWith('docs/')) return { allowed: true };
    return {
      allowed: false,
      reason: `${agentName} is an Evaluator (read-only). Cannot modify code. Provide feedback only.`,
    };
  }

  // Check denied patterns
  for (const pattern of ownership.denied) {
    if (filePath.startsWith(pattern.replace('*', ''))) {
      return {
        allowed: false,
        reason: `${agentName} cannot modify ${filePath}. Allowed: ${ownership.allowed.join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if agent is an Evaluator
 */
export function isEvaluator(agentName) {
  return getAgentRole(agentName) === 'evaluator';
}

/**
 * Check if agent is a Generator
 */
export function isGenerator(agentName) {
  return getAgentRole(agentName) === 'generator';
}
