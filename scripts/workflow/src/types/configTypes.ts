/**
 * Configuration Types
 * Type definitions for shared configuration
 */

/**
 * Shared configuration structure
 */
export interface SharedConfig {
  scripts: ScriptsConfig;
  cli_commands: CliCommandsConfig;
  paths: PathsConfig;
  defaults: DefaultsConfig;
}

/**
 * Scripts configuration
 */
export interface ScriptsConfig {
  metadata_dependencies: string;
  scripts_path: string;
}

/**
 * CLI commands configuration
 */
export interface CliCommandsConfig {
  ado_get: string;
  ado_update: string;
  ado_create: string;
  ado_search: string;
  ado_link: string;
  sf_query: string;
  sf_describe: string;
  sf_discover: string;
  wiki_update: string;
}

/**
 * Paths configuration
 */
export interface PathsConfig {
  prompts: string;
  templates: string;
  standards: string;
  artifacts: string;
  output: string;
}

/**
 * Default values configuration
 */
export interface DefaultsConfig {
  ado_org: string;
  ado_project: string;
  sf_org: string;
  wiki_name: string;
}

/**
 * Template variables structure
 */
export interface TemplateVariables {
  workItemId?: number;
  workItemType?: string;
  projectName?: string;
  areaPath?: string;
  iterationPath?: string;
  assignedTo?: string;
  sfOrg?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Step manifest structure
 */
export interface StepManifest {
  id: string;
  name: string;
  description: string;
  phase: string;
  order: number;
  prompt: string;
  inputs: StepInput[];
  outputs: StepOutput[];
  script_alternative?: string;
  dependencies?: string[];
  conditions?: StepCondition[];
}

/**
 * Step input definition
 */
export interface StepInput {
  name: string;
  type: 'file' | 'string' | 'number' | 'boolean' | 'json';
  required: boolean;
  description: string;
  default?: unknown;
  source?: string;
}

/**
 * Step output definition
 */
export interface StepOutput {
  name: string;
  type: 'file' | 'string' | 'number' | 'boolean' | 'json';
  description: string;
  path?: string;
}

/**
 * Step condition
 */
export interface StepCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'exists' | 'notExists';
  value?: unknown;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  workItemId: number;
  currentPhase: string;
  currentStep: string;
  completedSteps: string[];
  skippedSteps: string[];
  artifacts: Record<string, string>;
  variables: TemplateVariables;
  startedAt: string;
  lastUpdated: string;
  status: WorkflowStatus;
  error?: string;
}

/**
 * Workflow status
 */
export type WorkflowStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  workItemId: number;
  phases?: string[];
  steps?: string[];
  dryRun?: boolean;
  verbose?: boolean;
  continueOnError?: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  state: WorkflowState;
  executedSteps: string[];
  failedSteps: string[];
  outputs: Record<string, unknown>;
  executionTime: number;
  logs: WorkflowLogEntry[];
}

/**
 * Workflow log entry
 */
export interface WorkflowLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  step: string;
  message: string;
  data?: unknown;
}
