/**
 * Workflow Runner
 * Orchestrates workflow execution across phases and steps
 */

import { loadStepManifests, loadSharedConfig } from './lib/configLoader.js';
import { 
  loadState, 
  saveState, 
  createState, 
  setCurrentStep, 
  completeStep, 
  skipStep, 
  updateStatus,
  getProgress,
} from './workflowState.js';
import { prepareTicketArtifacts } from './workflowPrepareTicket.js';
import { logInfo, logDebug, logWarn, logError, createTimer } from './lib/loggerStructured.js';
import type {
  WorkflowState,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowLogEntry,
  StepManifest,
  StepCondition,
} from './types/configTypes.js';

/**
 * Run a workflow for a work item
 * 
 * @param options - Execution options
 * @returns Execution result
 */
export async function runWorkflow(
  options: WorkflowExecutionOptions
): Promise<WorkflowExecutionResult> {
  const timer = createTimer();
  const { workItemId, phases, steps, dryRun = false, verbose = false, continueOnError = false } = options;

  logInfo(`Starting workflow for work item ${workItemId}`, { dryRun, phases, steps });

  const logs: WorkflowLogEntry[] = [];
  const executedSteps: string[] = [];
  const failedSteps: string[] = [];
  const outputs: Record<string, unknown> = {};

  // Load or create state
  let state = loadState(workItemId) ?? createState(workItemId);
  state = updateStatus(state, 'in_progress');
  
  if (!dryRun) {
    saveState(state);
  }

  // Load step manifests
  let manifests: StepManifest[];
  try {
    manifests = loadStepManifests();
  } catch (error) {
    const errorMsg = `Failed to load step manifests: ${error instanceof Error ? error.message : String(error)}`;
    logError(errorMsg);
    
    return {
      success: false,
      state: updateStatus(state, 'failed', errorMsg),
      executedSteps,
      failedSteps,
      outputs,
      executionTime: timer.elapsed(),
      logs,
    };
  }

  // Filter manifests by phases/steps if specified
  let filteredManifests = manifests;
  
  if (phases && phases.length > 0) {
    filteredManifests = manifests.filter(m => phases.includes(m.phase));
  }
  
  if (steps && steps.length > 0) {
    filteredManifests = filteredManifests.filter(m => steps.includes(m.id));
  }

  // Sort by phase and order
  filteredManifests.sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase);
    }
    return a.order - b.order;
  });

  logInfo(`Executing ${filteredManifests.length} steps`);

  // Execute each step
  for (const manifest of filteredManifests) {
    const stepLog = (level: WorkflowLogEntry['level'], message: string, data?: unknown): void => {
      const entry: WorkflowLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        step: manifest.id,
        message,
        data,
      };
      logs.push(entry);
      
      if (verbose) {
        console.log(`[${level.toUpperCase()}] ${manifest.id}: ${message}`);
      }
    };

    // Check if step is already completed
    if (state.completedSteps.includes(manifest.id)) {
      stepLog('info', 'Step already completed, skipping');
      continue;
    }

    // Check conditions
    if (manifest.conditions && manifest.conditions.length > 0) {
      const conditionsMet = evaluateConditions(manifest.conditions, state);
      if (!conditionsMet) {
        stepLog('info', 'Step conditions not met, skipping');
        state = skipStep(state, manifest.id);
        if (!dryRun) {
          saveState(state);
        }
        continue;
      }
    }

    // Check dependencies
    if (manifest.dependencies && manifest.dependencies.length > 0) {
      const missingDeps = manifest.dependencies.filter(
        dep => !state.completedSteps.includes(dep)
      );
      
      if (missingDeps.length > 0) {
        stepLog('warn', `Missing dependencies: ${missingDeps.join(', ')}`);
        
        if (!continueOnError) {
          failedSteps.push(manifest.id);
          state = updateStatus(state, 'failed', `Missing dependencies: ${missingDeps.join(', ')}`);
          break;
        }
        
        state = skipStep(state, manifest.id);
        if (!dryRun) {
          saveState(state);
        }
        continue;
      }
    }

    // Set current step
    state = setCurrentStep(state, manifest.phase, manifest.id);
    if (!dryRun) {
      saveState(state);
    }

    stepLog('info', `Starting step: ${manifest.name}`);

    try {
      if (dryRun) {
        stepLog('info', '[DRY RUN] Would execute step');
        executedSteps.push(manifest.id);
        state = completeStep(state, manifest.id);
      } else {
        // Execute the step
        const result = await executeStep(manifest, state);
        
        if (result.success) {
          stepLog('info', 'Step completed successfully');
          executedSteps.push(manifest.id);
          state = completeStep(state, manifest.id);
          
          if (result.outputs) {
            Object.assign(outputs, result.outputs);
          }
        } else {
          stepLog('error', `Step failed: ${result.error}`);
          failedSteps.push(manifest.id);
          
          if (!continueOnError) {
            state = updateStatus(state, 'failed', result.error);
            saveState(state);
            break;
          }
        }
        
        saveState(state);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      stepLog('error', `Step threw exception: ${errorMsg}`);
      failedSteps.push(manifest.id);
      
      if (!continueOnError) {
        state = updateStatus(state, 'failed', errorMsg);
        if (!dryRun) {
          saveState(state);
        }
        break;
      }
    }
  }

  // Update final status
  if (failedSteps.length === 0) {
    state = updateStatus(state, 'completed');
  } else if (state.status !== 'failed') {
    state = updateStatus(state, 'completed'); // Completed with some failures
  }

  if (!dryRun) {
    saveState(state);
  }

  const executionTime = timer.elapsed();
  logInfo(`Workflow completed in ${executionTime}ms`, {
    executed: executedSteps.length,
    failed: failedSteps.length,
  });

  return {
    success: failedSteps.length === 0,
    state,
    executedSteps,
    failedSteps,
    outputs,
    executionTime,
    logs,
  };
}

/**
 * Execute a single step
 */
async function executeStep(
  manifest: StepManifest,
  state: WorkflowState
): Promise<StepExecutionResult> {
  logDebug(`Executing step: ${manifest.id}`);

  // For now, steps are executed via their script_alternative if present
  // In a full implementation, this would integrate with the prompt system
  
  if (manifest.script_alternative) {
    // Execute script alternative
    try {
      // This would execute the CLI command
      logInfo(`Would execute: ${manifest.script_alternative}`);
      
      return {
        success: true,
        outputs: {},
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // No script alternative - this step requires manual/prompt execution
  logDebug(`Step ${manifest.id} requires prompt execution`);
  
  return {
    success: true,
    outputs: {},
  };
}

/**
 * Step execution result
 */
interface StepExecutionResult {
  success: boolean;
  error?: string;
  outputs?: Record<string, unknown>;
}

/**
 * Evaluate step conditions
 */
function evaluateConditions(
  conditions: StepCondition[],
  state: WorkflowState
): boolean {
  for (const condition of conditions) {
    const fieldValue = state.variables[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        if (fieldValue !== condition.value) return false;
        break;
      case 'notEquals':
        if (fieldValue === condition.value) return false;
        break;
      case 'contains':
        if (typeof fieldValue !== 'string' || !fieldValue.includes(String(condition.value))) {
          return false;
        }
        break;
      case 'exists':
        if (fieldValue === undefined || fieldValue === null) return false;
        break;
      case 'notExists':
        if (fieldValue !== undefined && fieldValue !== null) return false;
        break;
    }
  }
  
  return true;
}

/**
 * Generate a workflow execution plan
 */
export function generateWorkflowPlan(
  options: WorkflowExecutionOptions
): WorkflowPlan {
  const { workItemId, phases, steps } = options;

  logInfo(`Generating workflow plan for work item ${workItemId}`);

  // Load manifests
  let manifests: StepManifest[];
  try {
    manifests = loadStepManifests();
  } catch {
    manifests = [];
  }

  // Filter and sort
  let filteredManifests = manifests;
  
  if (phases && phases.length > 0) {
    filteredManifests = manifests.filter(m => phases.includes(m.phase));
  }
  
  if (steps && steps.length > 0) {
    filteredManifests = filteredManifests.filter(m => steps.includes(m.id));
  }

  filteredManifests.sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase);
    }
    return a.order - b.order;
  });

  // Group by phase
  const phaseGroups = new Map<string, StepManifest[]>();
  
  for (const manifest of filteredManifests) {
    if (!phaseGroups.has(manifest.phase)) {
      phaseGroups.set(manifest.phase, []);
    }
    phaseGroups.get(manifest.phase)!.push(manifest);
  }

  // Build plan
  const planPhases: WorkflowPlanPhase[] = [];
  
  for (const [phaseName, phaseSteps] of phaseGroups) {
    planPhases.push({
      name: phaseName,
      steps: phaseSteps.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        dependencies: s.dependencies ?? [],
        hasScriptAlternative: !!s.script_alternative,
      })),
    });
  }

  return {
    workItemId,
    totalSteps: filteredManifests.length,
    phases: planPhases,
  };
}

/**
 * Workflow plan interface
 */
export interface WorkflowPlan {
  workItemId: number;
  totalSteps: number;
  phases: WorkflowPlanPhase[];
}

/**
 * Workflow plan phase
 */
export interface WorkflowPlanPhase {
  name: string;
  steps: WorkflowPlanStep[];
}

/**
 * Workflow plan step
 */
export interface WorkflowPlanStep {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  hasScriptAlternative: boolean;
}

/**
 * Get available phases
 */
export function getAvailablePhases(): string[] {
  try {
    const manifests = loadStepManifests();
    const phases = new Set(manifests.map(m => m.phase));
    return Array.from(phases).sort();
  } catch {
    return [];
  }
}

/**
 * Get steps for a phase
 */
export function getStepsForPhase(phase: string): StepManifest[] {
  try {
    const manifests = loadStepManifests();
    return manifests
      .filter(m => m.phase === phase)
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}
