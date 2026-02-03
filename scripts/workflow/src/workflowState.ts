/**
 * Workflow State Management
 * Manages workflow execution state and persistence
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { logInfo, logDebug, logWarn } from './lib/loggerStructured.js';
import type {
  WorkflowState,
  WorkflowStatus,
  TemplateVariables,
} from './types/configTypes.js';

/**
 * Default state directory
 */
const DEFAULT_STATE_DIR = '.github/state';

/**
 * Get the state file path for a work item
 */
function getStateFilePath(workItemId: number, stateDir?: string): string {
  const dir = stateDir ?? resolve(process.cwd(), DEFAULT_STATE_DIR);
  return resolve(dir, `workflow-${workItemId}.json`);
}

/**
 * Ensure state directory exists
 */
function ensureStateDir(stateDir?: string): void {
  const dir = stateDir ?? resolve(process.cwd(), DEFAULT_STATE_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create a new workflow state
 */
export function createState(workItemId: number): WorkflowState {
  return {
    workItemId,
    currentPhase: '',
    currentStep: '',
    completedSteps: [],
    skippedSteps: [],
    artifacts: {},
    variables: { workItemId },
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Load workflow state from disk
 * 
 * @param workItemId - Work item ID
 * @param stateDir - Optional state directory
 * @returns Workflow state or undefined if not found
 */
export function loadState(
  workItemId: number,
  stateDir?: string
): WorkflowState | undefined {
  const filePath = getStateFilePath(workItemId, stateDir);
  
  logDebug(`Loading state from ${filePath}`);

  if (!existsSync(filePath)) {
    logDebug(`No state file found for work item ${workItemId}`);
    return undefined;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const state = JSON.parse(content) as WorkflowState;
    logInfo(`Loaded state for work item ${workItemId}`, { status: state.status });
    return state;
  } catch (error) {
    logWarn(`Error loading state for work item ${workItemId}`, { error });
    return undefined;
  }
}

/**
 * Save workflow state to disk
 * 
 * @param state - Workflow state to save
 * @param stateDir - Optional state directory
 */
export function saveState(state: WorkflowState, stateDir?: string): void {
  ensureStateDir(stateDir);
  const filePath = getStateFilePath(state.workItemId, stateDir);

  // Update timestamp
  state.lastUpdated = new Date().toISOString();

  logDebug(`Saving state to ${filePath}`);

  try {
    const content = JSON.stringify(state, null, 2);
    writeFileSync(filePath, content, 'utf-8');
    logDebug(`State saved for work item ${state.workItemId}`);
  } catch (error) {
    logWarn(`Error saving state for work item ${state.workItemId}`, { error });
    throw error;
  }
}

/**
 * Reset workflow state
 * 
 * @param workItemId - Work item ID
 * @param stateDir - Optional state directory
 */
export function resetState(workItemId: number, stateDir?: string): void {
  const filePath = getStateFilePath(workItemId, stateDir);

  logInfo(`Resetting state for work item ${workItemId}`);

  if (existsSync(filePath)) {
    // Create backup before resetting
    const backupPath = `${filePath}.backup`;
    const content = readFileSync(filePath, 'utf-8');
    writeFileSync(backupPath, content, 'utf-8');
    logDebug(`Backed up state to ${backupPath}`);
  }

  // Create fresh state
  const newState = createState(workItemId);
  saveState(newState, stateDir);
}

/**
 * Update workflow status
 */
export function updateStatus(
  state: WorkflowState,
  status: WorkflowStatus,
  error?: string
): WorkflowState {
  return {
    ...state,
    status,
    error: error ?? state.error,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Mark a step as completed
 */
export function completeStep(
  state: WorkflowState,
  stepId: string
): WorkflowState {
  if (state.completedSteps.includes(stepId)) {
    return state;
  }

  return {
    ...state,
    completedSteps: [...state.completedSteps, stepId],
    currentStep: '',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Mark a step as skipped
 */
export function skipStep(
  state: WorkflowState,
  stepId: string
): WorkflowState {
  if (state.skippedSteps.includes(stepId)) {
    return state;
  }

  return {
    ...state,
    skippedSteps: [...state.skippedSteps, stepId],
    currentStep: '',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Set current step
 */
export function setCurrentStep(
  state: WorkflowState,
  phase: string,
  step: string
): WorkflowState {
  return {
    ...state,
    currentPhase: phase,
    currentStep: step,
    status: 'in_progress',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Add an artifact to state
 */
export function addArtifact(
  state: WorkflowState,
  name: string,
  path: string
): WorkflowState {
  return {
    ...state,
    artifacts: {
      ...state.artifacts,
      [name]: path,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update variables in state
 */
export function updateVariables(
  state: WorkflowState,
  variables: Partial<TemplateVariables>
): WorkflowState {
  return {
    ...state,
    variables: {
      ...state.variables,
      ...variables,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Check if a step is completed
 */
export function isStepCompleted(state: WorkflowState, stepId: string): boolean {
  return state.completedSteps.includes(stepId);
}

/**
 * Check if a step is skipped
 */
export function isStepSkipped(state: WorkflowState, stepId: string): boolean {
  return state.skippedSteps.includes(stepId);
}

/**
 * Check if workflow can be resumed
 */
export function canResume(state: WorkflowState): boolean {
  return state.status === 'in_progress' || state.status === 'paused';
}

/**
 * Get workflow progress percentage
 */
export function getProgress(state: WorkflowState, totalSteps: number): number {
  if (totalSteps === 0) return 0;
  const completed = state.completedSteps.length + state.skippedSteps.length;
  return Math.round((completed / totalSteps) * 100);
}

/**
 * Get workflow summary
 */
export function getStateSummary(state: WorkflowState): StateSummary {
  return {
    workItemId: state.workItemId,
    status: state.status,
    currentPhase: state.currentPhase,
    currentStep: state.currentStep,
    completedCount: state.completedSteps.length,
    skippedCount: state.skippedSteps.length,
    artifactCount: Object.keys(state.artifacts).length,
    startedAt: state.startedAt,
    lastUpdated: state.lastUpdated,
    error: state.error,
  };
}

/**
 * State summary interface
 */
export interface StateSummary {
  workItemId: number;
  status: WorkflowStatus;
  currentPhase: string;
  currentStep: string;
  completedCount: number;
  skippedCount: number;
  artifactCount: number;
  startedAt: string;
  lastUpdated: string;
  error?: string;
}

/**
 * List all workflow states
 */
export function listStates(stateDir?: string): WorkflowState[] {
  const dir = stateDir ?? resolve(process.cwd(), DEFAULT_STATE_DIR);
  
  if (!existsSync(dir)) {
    return [];
  }

  const { readdirSync } = require('fs');
  const files = readdirSync(dir) as string[];
  const states: WorkflowState[] = [];

  for (const file of files) {
    if (file.startsWith('workflow-') && file.endsWith('.json')) {
      try {
        const content = readFileSync(resolve(dir, file), 'utf-8');
        const state = JSON.parse(content) as WorkflowState;
        states.push(state);
      } catch {
        // Skip invalid files
      }
    }
  }

  return states;
}

/**
 * Clean up old workflow states
 */
export function cleanupOldStates(
  maxAgeDays: number = 30,
  stateDir?: string
): number {
  const states = listStates(stateDir);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  let cleaned = 0;
  const { unlinkSync } = require('fs');

  for (const state of states) {
    const lastUpdated = new Date(state.lastUpdated);
    if (lastUpdated < cutoffDate && state.status === 'completed') {
      const filePath = getStateFilePath(state.workItemId, stateDir);
      try {
        unlinkSync(filePath);
        cleaned++;
        logDebug(`Cleaned up state for work item ${state.workItemId}`);
      } catch {
        // Ignore errors
      }
    }
  }

  if (cleaned > 0) {
    logInfo(`Cleaned up ${cleaned} old workflow states`);
  }

  return cleaned;
}
