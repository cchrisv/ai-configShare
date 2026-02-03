/**
 * Workflow Executor
 * Low-level execution of workflow phases and steps
 */

import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { logInfo, logDebug, logWarn, logError, createTimer } from './lib/loggerStructured.js';
import type { StepManifest, WorkflowState, WorkflowLogEntry } from './types/configTypes.js';

/**
 * Phase execution options
 */
export interface PhaseExecutionOptions {
  phaseName: string;
  steps: StepManifest[];
  state: WorkflowState;
  dryRun?: boolean;
  verbose?: boolean;
  timeout?: number;
}

/**
 * Phase execution result
 */
export interface PhaseExecutionResult {
  success: boolean;
  phaseName: string;
  executedSteps: string[];
  failedSteps: string[];
  logs: WorkflowLogEntry[];
  duration: number;
}

/**
 * Step execution options
 */
export interface StepExecutionOptions {
  manifest: StepManifest;
  state: WorkflowState;
  dryRun?: boolean;
  verbose?: boolean;
  timeout?: number;
}

/**
 * Step execution result
 */
export interface StepExecutionResult {
  success: boolean;
  stepId: string;
  output?: string;
  error?: string;
  duration: number;
}

/**
 * Execute a workflow phase
 */
export async function executePhase(
  options: PhaseExecutionOptions
): Promise<PhaseExecutionResult> {
  const timer = createTimer();
  const { phaseName, steps, state, dryRun = false, verbose = false } = options;

  logInfo(`Executing phase: ${phaseName}`, { stepCount: steps.length });

  const executedSteps: string[] = [];
  const failedSteps: string[] = [];
  const logs: WorkflowLogEntry[] = [];

  for (const step of steps) {
    const log = (level: WorkflowLogEntry['level'], message: string): void => {
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        step: step.id,
        message,
      });
      
      if (verbose) {
        console.log(`[${phaseName}/${step.id}] ${message}`);
      }
    };

    log('info', `Starting step: ${step.name}`);

    try {
      const result = await executeStep({
        manifest: step,
        state,
        dryRun,
        verbose,
        timeout: options.timeout,
      });

      if (result.success) {
        log('info', 'Step completed');
        executedSteps.push(step.id);
      } else {
        log('error', `Step failed: ${result.error}`);
        failedSteps.push(step.id);
      }
    } catch (error) {
      log('error', `Step threw exception: ${error instanceof Error ? error.message : String(error)}`);
      failedSteps.push(step.id);
    }
  }

  const duration = timer.elapsed();
  logInfo(`Phase ${phaseName} completed in ${duration}ms`, {
    executed: executedSteps.length,
    failed: failedSteps.length,
  });

  return {
    success: failedSteps.length === 0,
    phaseName,
    executedSteps,
    failedSteps,
    logs,
    duration,
  };
}

/**
 * Execute a single workflow step
 */
export async function executeStep(
  options: StepExecutionOptions
): Promise<StepExecutionResult> {
  const timer = createTimer();
  const { manifest, state, dryRun = false, verbose = false, timeout = 300000 } = options;

  logDebug(`Executing step: ${manifest.id}`);

  if (dryRun) {
    logDebug(`[DRY RUN] Would execute: ${manifest.name}`);
    return {
      success: true,
      stepId: manifest.id,
      output: '[DRY RUN] Step would be executed',
      duration: timer.elapsed(),
    };
  }

  // Check for script alternative
  if (manifest.script_alternative) {
    return executeScriptAlternative(manifest, state, timeout);
  }

  // Step requires prompt-based execution
  logDebug(`Step ${manifest.id} requires prompt-based execution`);
  
  return {
    success: true,
    stepId: manifest.id,
    output: 'Step requires prompt-based execution',
    duration: timer.elapsed(),
  };
}

/**
 * Execute a script alternative command
 */
async function executeScriptAlternative(
  manifest: StepManifest,
  state: WorkflowState,
  timeout: number
): Promise<StepExecutionResult> {
  const timer = createTimer();
  const command = manifest.script_alternative!;

  logInfo(`Executing script: ${command}`);

  try {
    // Replace variables in command
    let resolvedCommand = command;
    
    for (const [key, value] of Object.entries(state.variables)) {
      if (value !== undefined && value !== null) {
        resolvedCommand = resolvedCommand.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value)
        );
      }
    }

    logDebug(`Resolved command: ${resolvedCommand}`);

    const output = execSync(resolvedCommand, {
      encoding: 'utf-8',
      timeout,
      cwd: process.cwd(),
      env: {
        ...process.env,
        WORK_ITEM_ID: String(state.workItemId),
      },
    });

    return {
      success: true,
      stepId: manifest.id,
      output: output.trim(),
      duration: timer.elapsed(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(`Script failed: ${errorMsg}`);

    return {
      success: false,
      stepId: manifest.id,
      error: errorMsg,
      duration: timer.elapsed(),
    };
  }
}

/**
 * Execute a command asynchronously with streaming output
 */
export function executeCommandAsync(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    timeout?: number;
  } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const { cwd, env, onStdout, onStderr, timeout = 300000 } = options;

    let stdout = '';
    let stderr = '';
    let killed = false;

    const proc: ChildProcess = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (onStdout) onStdout(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (onStderr) onStderr(text);
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      
      if (killed) {
        reject(new Error('Command timed out'));
      } else {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        });
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Check if inputs are available for a step
 */
export function checkStepInputs(
  manifest: StepManifest,
  state: WorkflowState
): { available: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const input of manifest.inputs) {
    if (!input.required) continue;

    // Check variables
    if (input.source?.startsWith('variable:')) {
      const varName = input.source.replace('variable:', '');
      if (state.variables[varName] === undefined) {
        missing.push(input.name);
      }
      continue;
    }

    // Check artifacts
    if (input.source?.startsWith('artifact:')) {
      const artifactName = input.source.replace('artifact:', '');
      if (!state.artifacts[artifactName]) {
        missing.push(input.name);
      }
      continue;
    }

    // Check files
    if (input.type === 'file') {
      const filePath = state.artifacts[input.name];
      if (!filePath || !existsSync(filePath)) {
        missing.push(input.name);
      }
    }
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Collect step outputs and update state
 */
export function collectStepOutputs(
  manifest: StepManifest,
  result: StepExecutionResult,
  state: WorkflowState
): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};

  for (const output of manifest.outputs) {
    if (output.type === 'file' && output.path) {
      const filePath = resolve(process.cwd(), output.path);
      if (existsSync(filePath)) {
        outputs[output.name] = filePath;
        
        // Also try to read content for JSON outputs
        if (output.type === 'json') {
          try {
            const content = readFileSync(filePath, 'utf-8');
            outputs[`${output.name}_content`] = JSON.parse(content);
          } catch {
            // Ignore parse errors
          }
        }
      }
    } else if (output.type === 'string' && result.output) {
      outputs[output.name] = result.output;
    }
  }

  return outputs;
}

/**
 * Format step result for logging
 */
export function formatStepResult(result: StepExecutionResult): string {
  const status = result.success ? 'SUCCESS' : 'FAILED';
  const duration = `${result.duration}ms`;
  
  let message = `[${status}] ${result.stepId} (${duration})`;
  
  if (!result.success && result.error) {
    message += `\n  Error: ${result.error}`;
  }
  
  if (result.output) {
    const truncatedOutput = result.output.length > 200 
      ? `${result.output.substring(0, 200)}...` 
      : result.output;
    message += `\n  Output: ${truncatedOutput}`;
  }
  
  return message;
}
