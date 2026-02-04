#!/usr/bin/env node

/**
 * sync-check.js
 *
 * Validates that shared prompts, templates, and documentation do not contain
 * tool-specific paths or hard-coded prefix/tag values.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROMPTS_DIR = path.join(ROOT, 'prompts');

const disallowedPatterns = [
  { pattern: /#file:\.github\//g, message: 'Found #file:.github/ reference in shared prompt.' },
  { pattern: /#file:\.windsurf\//g, message: 'Found #file:.windsurf/ reference in shared prompt.' },
  { pattern: /mcp_ado_/g, message: 'Found hard-coded Azure DevOps prefix (use {{config.mcp_prefixes.azure_devops}}).' },
  { pattern: /mcp_Salesforce_DX_/g, message: 'Found hard-coded Salesforce prefix (use {{config.mcp_prefixes.salesforce}}).' },
  { pattern: /mcp_context7_/g, message: 'Found hard-coded Context7 prefix (use {{config.mcp_prefixes.context7}}).' },
  { pattern: /CoPilot-Refined/g, message: 'Found hard-coded refinement tag (use {{config.tags.refined}}).' },
  { pattern: /CoPilot-Solutioned/g, message: 'Found hard-coded solution tag (use {{config.tags.solutioned}}).' },
  { pattern: /Windsurf-Refined/g, message: 'Found Windsurf-specific tag (use {{config.tags.refined}}).' },
  { pattern: /Windsurf-Solutioned/g, message: 'Found Windsurf-specific tag (use {{config.tags.solutioned}}).' }
];

function readAllPromptFiles() {
  return fs
    .readdirSync(PROMPTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      name: file,
      content: fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf8')
    }));
}

function validatePrompts(prompts) {
  const errors = [];

  for (const prompt of prompts) {
    for (const rule of disallowedPatterns) {
      if (rule.pattern.test(prompt.content)) {
        errors.push(`${prompt.name}: ${rule.message}`);
      }
    }
  }

  return errors;
}

function main() {
  try {
    const prompts = readAllPromptFiles();
    const errors = validatePrompts(prompts);

    if (errors.length > 0) {
      console.error('Sync check failed:');
      for (const error of errors) {
        console.error(`  • ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('Sync check passed: shared prompts are free of tool-specific references.');
  } catch (error) {
    console.error('Sync check encountered an unexpected error:', error);
    process.exitCode = 1;
  }
}

main();

