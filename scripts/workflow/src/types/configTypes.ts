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
  artifacts_root: string;
  reports: string;
  scripts: string;
  prompts: string;
  config: string;
  templates: string;
  standards: string;
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

