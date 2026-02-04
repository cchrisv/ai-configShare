#!/usr/bin/env node

/**
 * generate-docs.js
 *
 * Generates derived documentation from the shared configuration files.
 * Currently produces `.github/docs/CONFIG-SUMMARY.md` with a snapshot of
 * shared metadata and tool-specific overrides.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.resolve(__dirname, '..', 'config');
const DOCS_DIR = path.resolve(__dirname, '..', 'docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'CONFIG-SUMMARY.md');

function loadJson(fileName) {
  const filePath = path.join(CONFIG_DIR, fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function renderPrefixes(prefixes) {
  return Object.entries(prefixes)
    .map(([key, value]) => `| ${key} | \`${value}\` |`)
    .join('\n');
}

function buildSummary(shared, githubConfig, cursorConfig) {
  const lines = [];

  lines.push('# Configuration Summary');
  lines.push('');
  lines.push('Generated from `.github/config/*.json` via `scripts/generate-docs.js`.');
  lines.push('');

  lines.push('## Shared Metadata');
  lines.push('');
  lines.push(`- **Organization:** ${shared.organization}`);
  lines.push(`- **Project:** ${shared.project}`);
  lines.push(`- **Wiki Base Path:** ${shared.wiki.parent_path}`);
  lines.push('');
  lines.push('### Workflow Phases');
  lines.push(shared.workflow.phases.map((phase, index) => `${index + 1}. ${phase}`).join('\n'));
  lines.push('');

  lines.push('## MCP Prefixes');
  lines.push('');
  lines.push('### GitHub Copilot');
  lines.push('| Service | Prefix |');
  lines.push('|---------|--------|');
  lines.push(renderPrefixes(githubConfig.mcp_prefixes));
  lines.push('');
  lines.push('### Cursor (Windsurf)');
  lines.push('| Service | Prefix |');
  lines.push('|---------|--------|');
  lines.push(renderPrefixes(cursorConfig.mcp_prefixes));
  lines.push('');

  lines.push('## Tag Names');
  lines.push('');
  lines.push('| Assistant | Refined Tag | Solutioned Tag |');
  lines.push('|-----------|-------------|----------------|');
  lines.push('| GitHub Copilot | `' + githubConfig.tags.refined + '` | `' + githubConfig.tags.solutioned + '` |');
  lines.push('| Cursor (Windsurf) | `' + cursorConfig.tags.refined + '` | `' + cursorConfig.tags.solutioned + '` |');
  lines.push('');

  // Note: comment_marker section removed - workflow no longer posts comments

  return lines.join('\n');
}

function main() {
  try {
    const shared = loadJson('shared.json');
    const githubConfig = loadJson('github-copilot.json');
    const cursorConfig = loadJson('cursor.json');

    const summary = buildSummary(shared, githubConfig, cursorConfig);
    fs.writeFileSync(OUTPUT_FILE, summary + '\n');
    console.log(`Configuration summary written to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Failed to generate configuration documentation:', error);
    process.exitCode = 1;
  }
}

main();

