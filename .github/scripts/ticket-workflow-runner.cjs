#!/usr/bin/env node

/**
 * ticket-workflow-runner.js
 *
 * Lightweight orchestrator scaffolding used to:
 *  1. Invoke run-prepare-ticket.js to resolve runtime/config for a work item.
 *  2. Generate a concrete workflow plan (one entry per prompt) with helpful
 *     descriptions and suggested execution order.
 *  3. Persist that plan to `.ai-artifacts/<id>/workflow-plan.json`, enabling
 *     humans or automation hooks to drive each prompt sequentially.
 *
 * This does not execute the prompts itself; instead, it provides a structured
 * vision of "what to run next" that external tooling (Copilot, MCP runners,
 * or shell scripts) can consume.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node .github/scripts/ticket-workflow-runner.js <workItemId>');
  process.exit(1);
}

function parseWorkItemId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('workItemId must be a positive integer');
  }
  return id;
}

function runPrepareTicket(workItemId) {
  const result = spawnSync('node', [path.join('.ai-config', 'scripts', 'run-prepare-ticket.js'), String(workItemId)], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });

  if (result.status !== 0) {
    throw new Error(`run-prepare-ticket.js failed with exit code ${result.status}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (err) {
    throw new Error(`Failed to parse run-prepare-ticket output: ${err.message}`);
  }
}

function buildPlan(payload) {
  const researchDescriptions = {
    organization_dictionary: 'Load and cache acronyms/internal terms',
    ado: 'Pull full ADO work item data and extract keywords',
    wiki: 'Search internal wiki for related docs and metadata',
    business_context: 'Map personas/departments/goals for this item',
    salesforce: 'Discover live Salesforce metadata dependencies',
    code: 'Review repository history/patterns (reference only)',
    web: 'Capture external best practices',
    context7: 'Load relevant API/library docs via Context7',
    similar_workitems: 'Relate similar ADO work items and summarize research',
  };

  const sequentialPhases = [];

  // Research prompts ordered as defined in payload
  const researchPrompts = payload.next_steps.prompts.research;
  const researchPlan = Object.keys(researchPrompts).map((key, idx) => ({
    order: idx + 1,
    phase: 'research',
    subPhase: key,
    description: researchDescriptions[key] || `Execute ${key} research step`,
    promptFile: researchPrompts[key],
  }));

  sequentialPhases.push(...researchPlan);

  sequentialPhases.push(
    {
      order: researchPlan.length + 1,
      phase: 'grooming',
      promptFile: payload.next_steps.prompts.grooming,
      description: 'Apply templates, classifications, and INVEST validation',
    },
    {
      order: researchPlan.length + 2,
      phase: 'solutioning',
      promptFile: payload.next_steps.prompts.solutioning,
      description: 'Design implementation approach, risks, and test strategy',
    },
    {
      order: researchPlan.length + 3,
      phase: 'wiki',
      promptFile: payload.next_steps.prompts.wiki,
      description: 'Produce wiki page + link artifact without comments',
    },
    {
      order: researchPlan.length + 4,
      phase: 'finalization',
      promptFile: payload.next_steps.prompts.finalization,
      description: 'Create context snapshot, audit task, and final comment',
    }
  );

  return {
    generated_at: payload.runtime.timestamp,
    work_item_id: payload.runtime.work_item_id,
    artifact_path: payload.runtime.artifact_path,
    phases: sequentialPhases,
    instructions: [
      'Run prompts in order. Update run-state.json after deterministic steps.',
      'Before each prompt, load payload.runtime/config into assistant context.',
      'After finalization, ensure wiki link + audit task exist; no extra comments.',
    ],
  };
}

function savePlan(plan) {
  const planPath = path.join(plan.artifact_path, 'workflow-plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  return planPath;
}

function main() {
  const [, , workItemArg] = process.argv;
  if (!workItemArg) usage();

  const workItemId = parseWorkItemId(workItemArg);
  const payload = runPrepareTicket(workItemId);
  const plan = buildPlan(payload);
  const planPath = savePlan(plan);

  console.log('Workflow plan saved:', planPath);
  console.table(
    plan.phases.map((entry) => ({
      order: entry.order,
      phase: entry.phase,
      subPhase: entry.subPhase || '',
      prompt: entry.promptFile,
    }))
  );
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
