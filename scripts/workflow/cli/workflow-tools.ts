#!/usr/bin/env node
/**
 * Workflow Tools CLI
 * Command-line interface for workflow automation
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { configureLogger } from '../src/lib/loggerStructured.js';
import { getWorkItem } from '../src/adoWorkItems.js';
import { loadSharedConfig, getProjectRoot } from '../src/lib/configLoader.js';

const program = new Command();

program
  .name('workflow-tools')
  .description('Workflow automation operations')
  .version('2.0.0');

// Prepare command
program
  .command('prepare')
  .description('Initialize workflow artifacts for a work item')
  .requiredOption('-w, --work-item <id>', 'Work item ID', parseInt)
  .option('--force', 'Overwrite existing run state')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItemId = options.workItem;
      
      // Load shared config
      const config = loadSharedConfig();
      const projectRoot = getProjectRoot();
      const artifactsRoot = config.paths.artifacts_root;
      
      // Define paths (relative to project root, not cwd)
      const root = resolve(projectRoot, artifactsRoot, String(workItemId));
      const researchDir = resolve(root, 'research');
      const groomingDir = resolve(root, 'grooming');
      const solutioningDir = resolve(root, 'solutioning');
      const wikiDir = resolve(root, 'wiki');
      const finalizationDir = resolve(root, 'finalization');
      const runStatePath = resolve(root, 'run-state.json');
      
      // Check if already initialized
      if (existsSync(runStatePath) && !options.force) {
        const result = {
          success: false,
          message: `Workflow already initialized for ${workItemId}. Use --force to reinitialize.`,
          runStatePath,
        };
        console.log(options.json ? JSON.stringify(result, null, 2) : result.message);
        process.exit(0);
      }
      
      // Fetch work item to validate it exists
      const workItem = await getWorkItem(workItemId, { expand: 'All' });
      
      // Create directories
      const dirsCreated: string[] = [];
      for (const dir of [root, researchDir, groomingDir, solutioningDir, wikiDir, finalizationDir]) {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
          dirsCreated.push(dir);
        }
      }
      
      // Create run state
      const now = new Date().toISOString();
      const runState = {
        workItemId: String(workItemId),
        version: 1,
        currentPhase: 'research',
        phaseOrder: ['research', 'grooming', 'solutioning', 'wiki', 'finalization'],
        completedSteps: [],
        errors: [],
        metrics: {
          phases: {},
          startedAt: now,
        },
        lastUpdated: now,
      };
      writeFileSync(runStatePath, JSON.stringify(runState, null, 2), 'utf-8');
      
      // Save work item snapshot
      const workItemPath = resolve(researchDir, config.artifact_files.research.ado_workitem);
      writeFileSync(workItemPath, JSON.stringify(workItem, null, 2), 'utf-8');
      
      const result = {
        success: true,
        workItemId,
        workItemType: workItem.fields['System.WorkItemType'],
        title: workItem.fields['System.Title'],
        directories: {
          root,
          research: researchDir,
          grooming: groomingDir,
          solutioning: solutioningDir,
          wiki: wikiDir,
        },
        files: {
          runState: runStatePath,
          workItemSnapshot: workItemPath,
        },
        message: `Workflow initialized for ${workItemId}. Next: Run research phase.`,
      };
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`✓ Initialized workflow for ${workItem.fields['System.WorkItemType']} #${workItemId}`);
        console.log(`  Title: ${workItem.fields['System.Title']}`);
        console.log(`  Run state: ${runStatePath}`);
        console.log(`  Next step: Run research phase`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Get workflow status')
  .requiredOption('-w, --work-item <id>', 'Work item ID', parseInt)
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItemId = options.workItem;
      const config = loadSharedConfig();
      const projectRoot = getProjectRoot();
      const artifactsRoot = config.paths.artifacts_root;
      const root = resolve(projectRoot, artifactsRoot, String(workItemId));
      const runStatePath = resolve(root, 'run-state.json');
      
      if (!existsSync(runStatePath)) {
        const result = {
          success: false,
          workItemId,
          message: `No workflow found for ${workItemId}. Run 'workflow-tools prepare' first.`,
        };
        console.log(options.json ? JSON.stringify(result, null, 2) : result.message);
        process.exit(1);
      }
      
      const runState = JSON.parse(readFileSync(runStatePath, 'utf-8'));
      
      // Count artifacts in each phase directory
      const countFiles = (dir: string): number => {
        if (!existsSync(dir)) return 0;
        return readdirSync(dir).length;
      };
      
      const result = {
        success: true,
        workItemId,
        currentPhase: runState.currentPhase,
        completedSteps: runState.completedSteps.length,
        errors: runState.errors.length,
        artifacts: {
          research: countFiles(resolve(root, 'research')),
          grooming: countFiles(resolve(root, 'grooming')),
          solutioning: countFiles(resolve(root, 'solutioning')),
          wiki: countFiles(resolve(root, 'wiki')),
        },
        startedAt: runState.metrics?.startedAt,
        lastUpdated: runState.lastUpdated,
      };
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Workflow Status for #${workItemId}`);
        console.log(`  Current Phase: ${runState.currentPhase}`);
        console.log(`  Completed Steps: ${runState.completedSteps.length}`);
        console.log(`  Errors: ${runState.errors.length}`);
        console.log(`  Artifacts: research=${result.artifacts.research}, grooming=${result.artifacts.grooming}, solutioning=${result.artifacts.solutioning}, wiki=${result.artifacts.wiki}`);
        console.log(`  Started: ${runState.metrics?.startedAt || 'N/A'}`);
        console.log(`  Last Updated: ${runState.lastUpdated}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Reset command
program
  .command('reset')
  .description('Reset workflow state (all phases or specific phase)')
  .requiredOption('-w, --work-item <id>', 'Work item ID', parseInt)
  .option('-p, --phase <phase>', 'Specific phase to reset (research, grooming, solutioning, wiki)')
  .option('--force', 'Skip confirmation')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      if (!options.force) {
        const scope = options.phase ? `${options.phase} phase` : 'all artifacts';
        console.error(`Error: Use --force to confirm reset. This will delete ${scope}.`);
        process.exit(1);
      }

      const workItemId = options.workItem;
      const phase = options.phase;
      const validPhases = ['research', 'grooming', 'solutioning', 'wiki'];
      
      // Validate phase if provided
      if (phase && !validPhases.includes(phase)) {
        console.error(`Error: Invalid phase '${phase}'. Valid phases: ${validPhases.join(', ')}`);
        process.exit(1);
      }

      const config = loadSharedConfig();
      const projectRoot = getProjectRoot();
      const artifactsRoot = config.paths.artifacts_root;
      const root = resolve(projectRoot, artifactsRoot, String(workItemId));
      
      if (!existsSync(root)) {
        const result = {
          success: false,
          workItemId,
          message: `No workflow found for ${workItemId}.`,
        };
        console.log(options.json ? JSON.stringify(result, null, 2) : result.message);
        process.exit(0);
      }

      if (phase) {
        // Reset specific phase
        const phaseDir = resolve(root, phase);
        const deletedFiles: string[] = [];
        
        if (existsSync(phaseDir)) {
          // Count files before deletion
          const files = readdirSync(phaseDir);
          deletedFiles.push(...files);
          rmSync(phaseDir, { recursive: true, force: true });
          // Recreate empty directory
          mkdirSync(phaseDir, { recursive: true });
        }
        
        // Update run state to reflect phase reset
        const runStatePath = resolve(root, 'run-state.json');
        if (existsSync(runStatePath)) {
          const runState = JSON.parse(readFileSync(runStatePath, 'utf-8'));
          // Remove completed steps for this phase
          runState.completedSteps = runState.completedSteps.filter(
            (step: string) => !step.toLowerCase().includes(phase)
          );
          // If resetting a phase before current, reset currentPhase
          const phaseIndex = runState.phaseOrder.indexOf(phase);
          const currentIndex = runState.phaseOrder.indexOf(runState.currentPhase);
          if (phaseIndex <= currentIndex) {
            runState.currentPhase = phase;
          }
          // Clear phase metrics
          if (runState.metrics?.phases?.[phase]) {
            delete runState.metrics.phases[phase];
          }
          runState.lastUpdated = new Date().toISOString();
          writeFileSync(runStatePath, JSON.stringify(runState, null, 2), 'utf-8');
        }
        
        const result = {
          success: true,
          workItemId,
          phase,
          deletedFiles: deletedFiles.length,
          message: `Phase '${phase}' reset for ${workItemId}. ${deletedFiles.length} files deleted.`,
          deletedPath: phaseDir,
        };
        
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`✓ Phase '${phase}' reset for #${workItemId}`);
          console.log(`  Deleted: ${deletedFiles.length} files from ${phaseDir}`);
          console.log(`  Run state updated`);
        }
      } else {
        // Reset all (original behavior)
        rmSync(root, { recursive: true, force: true });
        
        const result = {
          success: true,
          workItemId,
          phase: 'all',
          message: `Workflow reset for ${workItemId}. All artifacts deleted.`,
          deletedPath: root,
        };
        
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`✓ Workflow reset for #${workItemId}`);
          console.log(`  Deleted: ${root}`);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
