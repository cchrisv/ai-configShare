#!/usr/bin/env node

/**
 * Glue script: run-prepare-ticket.js
 *
 * Purpose:
 *  - Resolve shared/github-copilot config
 *  - Compute runtime variables for a given work item ID
 *  - Sequentially execute the logical phases for `ticket.prepare` by
 *    delegating to the AI assistant (via stdin/stdout) or a future
 *    MCP/command harness.
 *
 * NOTE:
 *  - This script intentionally does NOT implement Azure DevOps or Salesforce
 *    API calls directly. Those are handled by MCP tools as described in
 *    the prompts.
 *  - The current implementation focuses on computing runtime context,
 *    creating the artifact folder structure, and emitting a single
 *    consolidated JSON payload that your Copilot command runner can
 *    feed back into the assistant.
 */

const fs = require('fs');
const path = require('path');

function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  const [, , workItemArg] = process.argv;

  if (!workItemArg) {
    console.error('Usage: node .github/scripts/run-prepare-ticket.js <workItemId>');
    process.exit(1);
  }

  const workItemId = Number(workItemArg);
  if (!Number.isInteger(workItemId) || workItemId <= 0) {
    console.error('workItemId must be a positive integer.');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const sharedConfigPath = path.join(repoRoot, '.ai-config', 'config', 'shared.json');
  const githubConfigPath = path.join(repoRoot, '.ai-config', 'config', 'github-copilot.json');

  const shared = loadJson(sharedConfigPath);
  const github = loadJson(githubConfigPath);

  const artifactRootTemplate = shared.workflow?.artifacts_root || '.ai-artifacts/{work_item_id}';
  const artifactPath = artifactRootTemplate.replace('{work_item_id}', String(workItemId));
  const researchArtifactPath = path.join(artifactPath, 'research');
  const groomingArtifactPath = path.join(artifactPath, 'grooming');
  const solutioningArtifactPath = path.join(artifactPath, 'solutioning');
  const wikiArtifactPath = path.join(artifactPath, 'wiki');

  // Ensure base directories exist so downstream tools can write artifacts
  ensureDir(artifactPath);
  ensureDir(researchArtifactPath);
  ensureDir(groomingArtifactPath);
  ensureDir(solutioningArtifactPath);
  ensureDir(wikiArtifactPath);

  const now = new Date().toISOString();

  const runtime = {
    work_item_id: workItemId,
    artifact_path: artifactPath,
    research_artifact_path: researchArtifactPath,
    grooming_artifact_path: groomingArtifactPath,
    solutioning_artifact_path: solutioningArtifactPath,
    wiki_artifact_path: wikiArtifactPath,
    timestamp: now,
  };

  const payload = {
    runtime,
    config: {
      project: shared.project,
      wiki: shared.wiki,
      workflow: shared.workflow,
      mcp_prefixes: github.mcp_prefixes,
      tags: github.tags,
      scripts: shared.scripts,
      standards: shared.standards,
      templates: shared.templates,
      quality_bar: shared.quality_bar,
    },
    notes: github.notes,
    next_steps: {
      command: 'ticket.prepare',
      phases: ['research', 'grooming', 'solutioning', 'wiki', 'finalization'],
      prompts: {
        research: {
          organization_dictionary: '.github/prompts/research-organization-dictionary.prompt.md',
          ado: '.github/prompts/research-ado.prompt.md',
          wiki: '.github/prompts/research-wiki.prompt.md',
          business_context: '.github/prompts/research-business-context.prompt.md',
          salesforce: '.github/prompts/research-salesforce.prompt.md',
          code: '.github/prompts/research-code.prompt.md',
          web: '.github/prompts/research-web.prompt.md',
          context7: '.github/prompts/research-context7.prompt.md',
          similar_workitems: '.github/prompts/research-similar-workitems.prompt.md',
        },
        grooming: '.github/prompts/grooming.prompt.md',
        solutioning: '.github/prompts/solutioning.prompt.md',
        wiki: '.github/prompts/wiki-creation.prompt.md',
        finalization: '.github/prompts/finalization.prompt.md',
      },
    },
  };

  // Emit a single JSON blob to stdout so Copilot / your harness
  // can pass this as context back into the assistant when running
  // the actual prompt sequence.
  process.stdout.write(JSON.stringify(payload, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Error running run-prepare-ticket:', err.message || err);
    process.exit(1);
  }
}
