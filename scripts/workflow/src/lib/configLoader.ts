/**
 * Configuration Loader
 * Loads and validates configuration files
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SharedConfig, TemplateVariables } from '../types/configTypes.js';

/**
 * Get the project root directory (where .github lives)
 */
export function getProjectRoot(): string {
  // Try to find .github relative to cwd or script location
  const possibleRoots = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '..', '..'),
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..'),
  ];
  
  for (const root of possibleRoots) {
    if (existsSync(resolve(root, 'config', 'shared.json'))) {
      return root;
    }
  }
  
  // Default to cwd
  return process.cwd();
}

/**
 * Get the base directory for config files
 */
function getConfigDir(): string {
  return resolve(getProjectRoot(), 'config');
}

/**
 * Load and parse a JSON file
 */
function loadJsonFile<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load the shared configuration
 * 
 * @param configPath - Optional explicit path to shared.json
 * @returns Shared configuration object
 */
export function loadSharedConfig(configPath?: string): SharedConfig {
  const path = configPath ?? resolve(getConfigDir(), 'shared.json');
  return loadJsonFile<SharedConfig>(path);
}

/**
 * Load template variables
 * 
 * @param configPath - Optional explicit path to template-variables.json
 * @returns Template variables object
 */
export function loadTemplateVariables(configPath?: string): TemplateVariables {
  const path = configPath ?? resolve(getConfigDir(), 'template-variables.json');
  
  // Template variables might not exist, return empty object
  if (!existsSync(path)) {
    return {};
  }
  
  return loadJsonFile<TemplateVariables>(path);
}

/**
 * Get a CLI command from shared config
 * 
 * @param commandKey - Key of the command to get
 * @param configPath - Optional explicit path to shared.json
 * @returns Command string
 */
export function getCliCommand(
  commandKey: keyof SharedConfig['cli_commands'],
  configPath?: string
): string {
  const config = loadSharedConfig(configPath);
  const command = config.cli_commands[commandKey];
  
  if (!command) {
    throw new Error(`CLI command not found: ${commandKey}`);
  }
  
  return command;
}

/**
 * Resolve template variables in a string
 * 
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Variables to substitute
 * @returns Resolved string
 */
export function resolveTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    if (value === undefined) {
      return match; // Leave unresolved placeholders as-is
    }
    return String(value);
  });
}

/**
 * Merge template variables with defaults
 * 
 * @param base - Base variables
 * @param overrides - Override variables
 * @returns Merged variables
 */
export function mergeVariables(
  base: TemplateVariables,
  overrides: TemplateVariables
): TemplateVariables {
  return { ...base, ...overrides };
}

/**
 * Get the path to a prompt file
 * 
 * @param promptName - Name of the prompt (without extension)
 * @returns Full path to the prompt file
 */
export function getPromptPath(promptName: string): string {
  // Prompts are in .github/prompts/
  const promptsDir = resolve(getProjectRoot(), '.github', 'prompts');
  return resolve(promptsDir, `${promptName}.prompt.md`);
}

/**
 * Get the path to a template file
 * 
 * @param templateName - Name of the template
 * @returns Full path to the template file
 */
export function getTemplatePath(templateName: string): string {
  // Templates are in config/templates/
  const templatesDir = resolve(getConfigDir(), 'templates');
  return resolve(templatesDir, templateName);
}

/**
 * Get the path to a standards file
 * 
 * @param standardName - Name of the standard
 * @returns Full path to the standards file
 */
export function getStandardPath(standardName: string): string {
  // Standards are in config/standards/
  const standardsDir = resolve(getConfigDir(), 'standards');
  return resolve(standardsDir, standardName);
}
