/**
 * Workflow Prepare Ticket
 * Prepares artifacts and context for ticket workflows
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getWorkItem } from './adoWorkItems.js';
import { loadSharedConfig, loadTemplateVariables, resolveTemplate } from './lib/configLoader.js';
import { logInfo, logDebug, logError, createTimer } from './lib/loggerStructured.js';
import { createState, saveState, loadState, updateVariables, addArtifact } from './workflowState.js';
import type { WorkflowState, TemplateVariables, SharedConfig } from './types/configTypes.js';
import type { WorkItem } from './types/adoWorkItemTypes.js';

/**
 * Preparation options
 */
export interface PrepareOptions {
  workItemId: number;
  outputDir?: string;
  force?: boolean;
  configPath?: string;
}

/**
 * Preparation result
 */
export interface PrepareResult {
  success: boolean;
  state: WorkflowState;
  workItem: WorkItem;
  variables: TemplateVariables;
  artifacts: Record<string, string>;
  errors: string[];
}

/**
 * Default output directory
 */
const DEFAULT_OUTPUT_DIR = '.ai-artifacts';

/**
 * Prepare ticket artifacts for workflow execution
 * 
 * @param options - Preparation options
 * @returns Preparation result
 */
export async function prepareTicketArtifacts(
  options: PrepareOptions
): Promise<PrepareResult> {
  const timer = createTimer();
  const { workItemId, outputDir, force = false, configPath } = options;

  logInfo(`Preparing artifacts for work item ${workItemId}`);

  const errors: string[] = [];
  let state: WorkflowState;
  let workItem: WorkItem;
  let variables: TemplateVariables = {};
  const artifacts: Record<string, string> = {};

  try {
    // Check for existing state
    const existingState = loadState(workItemId);
    if (existingState && !force) {
      logInfo('Using existing workflow state', { status: existingState.status });
      state = existingState;
    } else {
      state = createState(workItemId);
    }

    // Fetch work item
    logDebug('Fetching work item details');
    workItem = await getWorkItem(workItemId, { expand: 'All', includeComments: true });

    // Build variables from work item
    variables = resolveConfig(workItem, configPath);
    state = updateVariables(state, variables);

    // Create output directory
    const artifactDir = outputDir ?? resolve(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
    if (!existsSync(artifactDir)) {
      mkdirSync(artifactDir, { recursive: true });
    }

    // Create work item artifact
    const workItemPath = resolve(artifactDir, 'work-item.json');
    writeFileSync(workItemPath, JSON.stringify(workItem, null, 2), 'utf-8');
    artifacts['work-item'] = workItemPath;
    state = addArtifact(state, 'work-item', workItemPath);

    // Create variables artifact
    const variablesPath = resolve(artifactDir, 'variables.json');
    writeFileSync(variablesPath, JSON.stringify(variables, null, 2), 'utf-8');
    artifacts['variables'] = variablesPath;
    state = addArtifact(state, 'variables', variablesPath);

    // Create context artifact (combined info for prompts)
    const context = buildContext(workItem, variables);
    const contextPath = resolve(artifactDir, 'context.md');
    writeFileSync(contextPath, context, 'utf-8');
    artifacts['context'] = contextPath;
    state = addArtifact(state, 'context', contextPath);

    // Save state
    saveState(state);

    timer.log('prepareTicketArtifacts');

    return {
      success: true,
      state,
      workItem,
      variables,
      artifacts,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError('Failed to prepare ticket artifacts', { error: errorMsg });
    errors.push(errorMsg);

    return {
      success: false,
      state: state!,
      workItem: workItem!,
      variables,
      artifacts,
      errors,
    };
  }
}

/**
 * Resolve configuration and build template variables
 */
export function resolveConfig(
  workItem: WorkItem,
  configPath?: string
): TemplateVariables {
  logDebug('Resolving configuration');

  // Load base template variables
  let variables: TemplateVariables;
  try {
    variables = loadTemplateVariables(configPath);
  } catch {
    variables = {};
  }

  // Add work item fields
  const fields = workItem.fields;
  
  variables = {
    ...variables,
    workItemId: workItem.id,
    workItemType: fields['System.WorkItemType'] as string,
    title: fields['System.Title'] as string,
    description: fields['System.Description'] as string,
    state: fields['System.State'] as string,
    areaPath: fields['System.AreaPath'] as string,
    iterationPath: fields['System.IterationPath'] as string,
    assignedTo: typeof fields['System.AssignedTo'] === 'object' 
      ? (fields['System.AssignedTo'] as { displayName: string }).displayName 
      : fields['System.AssignedTo'] as string,
    tags: fields['System.Tags'] as string,
    storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'] as number,
    priority: fields['Microsoft.VSTS.Common.Priority'] as number,
    acceptanceCriteria: fields['Microsoft.VSTS.Common.AcceptanceCriteria'] as string,
    workClassType: fields['Custom.WorkClassType'] as string,
    requiresQA: fields['Custom.RequiresQA'] as string,
    sfComponents: fields['Custom.SFComponents'] as string,
    technicalNotes: fields['Custom.TechnicalNotes'] as string,
    timestamp: new Date().toISOString(),
  };

  return variables;
}

/**
 * Build context markdown for prompts
 */
function buildContext(workItem: WorkItem, variables: TemplateVariables): string {
  const fields = workItem.fields;
  const lines: string[] = [];

  lines.push(`# Work Item Context`);
  lines.push('');
  lines.push(`## ${fields['System.WorkItemType']} #${workItem.id}: ${fields['System.Title']}`);
  lines.push('');

  // Basic info
  lines.push('### Basic Information');
  lines.push('');
  lines.push(`- **State:** ${fields['System.State']}`);
  lines.push(`- **Assigned To:** ${variables['assignedTo'] ?? 'Unassigned'}`);
  lines.push(`- **Area Path:** ${fields['System.AreaPath']}`);
  lines.push(`- **Iteration:** ${fields['System.IterationPath']}`);
  
  if (fields['Microsoft.VSTS.Scheduling.StoryPoints']) {
    lines.push(`- **Story Points:** ${fields['Microsoft.VSTS.Scheduling.StoryPoints']}`);
  }
  if (fields['Microsoft.VSTS.Common.Priority']) {
    lines.push(`- **Priority:** ${fields['Microsoft.VSTS.Common.Priority']}`);
  }
  if (fields['Custom.WorkClassType']) {
    lines.push(`- **Work Class:** ${fields['Custom.WorkClassType']}`);
  }
  if (fields['Custom.RequiresQA']) {
    lines.push(`- **Requires QA:** ${fields['Custom.RequiresQA']}`);
  }
  
  lines.push('');

  // Description
  if (fields['System.Description']) {
    lines.push('### Description');
    lines.push('');
    lines.push(fields['System.Description'] as string);
    lines.push('');
  }

  // Acceptance Criteria
  if (fields['Microsoft.VSTS.Common.AcceptanceCriteria']) {
    lines.push('### Acceptance Criteria');
    lines.push('');
    lines.push(fields['Microsoft.VSTS.Common.AcceptanceCriteria'] as string);
    lines.push('');
  }

  // Technical Notes
  if (fields['Custom.TechnicalNotes']) {
    lines.push('### Technical Notes');
    lines.push('');
    lines.push(fields['Custom.TechnicalNotes'] as string);
    lines.push('');
  }

  // SF Components
  if (fields['Custom.SFComponents']) {
    lines.push('### Salesforce Components');
    lines.push('');
    lines.push(fields['Custom.SFComponents'] as string);
    lines.push('');
  }

  // Tags
  if (fields['System.Tags']) {
    lines.push('### Tags');
    lines.push('');
    lines.push(`${fields['System.Tags']}`);
    lines.push('');
  }

  // Relations
  if (workItem.relations && workItem.relations.length > 0) {
    lines.push('### Related Work Items');
    lines.push('');
    for (const relation of workItem.relations) {
      const relType = relation.rel.replace('System.LinkTypes.', '').replace('-', ' ');
      const idMatch = /\/(\d+)$/.exec(relation.url);
      const relatedId = idMatch ? idMatch[1] : 'Unknown';
      lines.push(`- ${relType}: #${relatedId}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get artifact path for a specific artifact type
 */
export function getArtifactPath(
  workItemId: number,
  artifactName: string,
  outputDir?: string
): string {
  const artifactDir = outputDir ?? resolve(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
  return resolve(artifactDir, artifactName);
}

/**
 * Check if artifacts exist for a work item
 */
export function hasArtifacts(workItemId: number, outputDir?: string): boolean {
  const artifactDir = outputDir ?? resolve(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
  return existsSync(resolve(artifactDir, 'work-item.json'));
}

/**
 * Clean up artifacts for a work item
 */
export function cleanupArtifacts(workItemId: number, outputDir?: string): void {
  const artifactDir = outputDir ?? resolve(process.cwd(), DEFAULT_OUTPUT_DIR, String(workItemId));
  
  if (!existsSync(artifactDir)) {
    return;
  }

  const { rmSync } = require('fs');
  
  try {
    rmSync(artifactDir, { recursive: true, force: true });
    logInfo(`Cleaned up artifacts for work item ${workItemId}`);
  } catch (error) {
    logError(`Failed to cleanup artifacts for work item ${workItemId}`, { error });
  }
}
