#!/usr/bin/env node
/**
 * SF Tools CLI
 * Command-line interface for Salesforce operations
 */

import { Command } from 'commander';
import { executeSoqlQuery, executeToolingQuery, queryAll } from '../src/sfQueryExecutor.js';
import { 
  describeObject, 
  describeField,
  getApexClasses,
  getApexTriggers,
  getValidationRules,
  getFlows,
  getCustomObjects,
} from '../src/sfMetadataDescriber.js';
import { discoverDependencies, exportGraphToJson } from '../src/sfDependencyDiscovery.js';
import { configureLogger } from '../src/lib/loggerStructured.js';
import type { MetadataType } from '../src/types/sfDependencyTypes.js';

const program = new Command();

program
  .name('sf-tools')
  .description('Salesforce query and metadata operations')
  .version('2.0.0');

// Query command
program
  .command('query <soql>')
  .description('Execute a SOQL query')
  .option('--tooling', 'Use Tooling API')
  .option('--all', 'Fetch all records (handle pagination)')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (soql: string, options) => {
    try {
      // Silence logs when outputting JSON to keep stdout clean
      if (options.json || !options.verbose) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      let result;
      
      if (options.all && !options.tooling) {
        // Use queryAll for full pagination
        result = await queryAll(soql, { alias: options.org });
        console.log(JSON.stringify({ totalSize: result.length, records: result }, null, 2));
      } else if (options.tooling) {
        result = await executeToolingQuery(soql, { alias: options.org });
        console.log(JSON.stringify(result, null, 2));
      } else {
        result = await executeSoqlQuery(soql, { alias: options.org });
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Describe command
program
  .command('describe <objectNames>')
  .description('Describe one or more SObjects (comma-separated for batch)')
  .option('-f, --field <fieldName>', 'Describe a specific field')
  .option('--fields-only', 'Only output field information')
  .option('--batch', 'Process multiple objects in parallel (comma-separated)')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (objectNames: string, options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      // Batch processing for multiple objects
      if (options.batch || objectNames.includes(',')) {
        const objectList = objectNames.split(',').map(s => s.trim());
        const results = await Promise.all(
          objectList.map(async (objName) => {
            try {
              const describe = await describeObject(objName, { alias: options.org });
              return {
                objectName: objName,
                success: true,
                data: options.fieldsOnly ? describe.fields : describe
              };
            } catch (error) {
              return {
                objectName: objName,
                success: false,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          })
        );
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      // Single object processing
      if (options.field) {
        // Describe specific field
        const field = await describeField(objectNames, options.field, { alias: options.org });
        console.log(JSON.stringify(field, null, 2));
      } else {
        // Describe object
        const describe = await describeObject(objectNames, { alias: options.org });
        
        if (options.fieldsOnly) {
          console.log(JSON.stringify(describe.fields, null, 2));
        } else {
          console.log(JSON.stringify(describe, null, 2));
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Discover command
program
  .command('discover')
  .description('Discover metadata dependencies for one or more components')
  .requiredOption('--type <type>', 'Metadata type (CustomObject, CustomField, ApexClass, etc.)')
  .requiredOption('--name <names>', 'Component name (comma-separated for batch)')
  .option('--depth <n>', 'Maximum traversal depth', (v: string) => parseInt(v, 10), 3)
  .option('--include-standard', 'Include standard objects')
  .option('--batch', 'Process multiple components in parallel (comma-separated)')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      // Batch processing for multiple components
      if (options.batch || options.name.includes(',')) {
        const nameList = options.name.split(',').map((s: string) => s.trim());
        const results = await Promise.all(
          nameList.map(async (componentName: string) => {
            try {
              const result = await discoverDependencies(
                {
                  rootType: options.type as MetadataType,
                  rootName: componentName,
                  maxDepth: options.depth,
                  includeStandardObjects: options.includeStandard,
                },
                { alias: options.org }
              );

              return {
                componentName,
                success: true,
                graph: JSON.parse(exportGraphToJson(result.graph)),
                pills: result.pills,
                warnings: result.warnings,
                executionTime: result.executionTime,
              };
            } catch (error) {
              return {
                componentName,
                success: false,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          })
        );
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      // Single component processing
      const result = await discoverDependencies(
        {
          rootType: options.type as MetadataType,
          rootName: options.name,
          maxDepth: options.depth,
          includeStandardObjects: options.includeStandard,
        },
        { alias: options.org }
      );

      // Convert graph to JSON-serializable format
      const output = {
        graph: JSON.parse(exportGraphToJson(result.graph)),
        pills: result.pills,
        warnings: result.warnings,
        executionTime: result.executionTime,
      };

      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Apex classes command
program
  .command('apex-classes')
  .description('List Apex classes')
  .option('--pattern <pattern>', 'Name pattern (use % for wildcard)')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      const classes = await getApexClasses(options.pattern, { alias: options.org });
      console.log(JSON.stringify(classes, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Apex triggers command
program
  .command('apex-triggers')
  .description('List Apex triggers')
  .option('--object <name>', 'Filter by object name')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      const triggers = await getApexTriggers(options.object, { alias: options.org });
      console.log(JSON.stringify(triggers, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Validation rules command
program
  .command('validation-rules <objectNames>')
  .description('List validation rules for one or more objects (comma-separated for batch)')
  .option('--all', 'Include inactive rules')
  .option('--batch', 'Process multiple objects in parallel (comma-separated)')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (objectNames: string, options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      // Batch processing for multiple objects
      if (options.batch || objectNames.includes(',')) {
        const objectList = objectNames.split(',').map(s => s.trim());
        const results = await Promise.all(
          objectList.map(async (objName) => {
            try {
              const rules = await getValidationRules(objName, !options.all, { alias: options.org });
              return {
                objectName: objName,
                success: true,
                rules: rules
              };
            } catch (error) {
              return {
                objectName: objName,
                success: false,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          })
        );
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      // Single object processing
      const rules = await getValidationRules(objectNames, !options.all, { alias: options.org });
      console.log(JSON.stringify(rules, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Flows command
program
  .command('flows')
  .description('List flows')
  .option('--object <name>', 'Filter by trigger object')
  .option('--all', 'Include inactive flows')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      const flows = await getFlows(options.object, !options.all, { alias: options.org });
      console.log(JSON.stringify(flows, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Custom objects command
program
  .command('custom-objects')
  .description('List custom objects')
  .option('-o, --org <alias>', 'Org alias (uses default org if not specified)')
  .option('--json', 'Output as JSON (default)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      // Silence logs by default for clean JSON output, unless verbose
      if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      } else {
        configureLogger({ silent: true });
      }

      const objects = await getCustomObjects({ alias: options.org });
      console.log(JSON.stringify(objects, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
