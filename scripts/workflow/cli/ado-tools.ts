#!/usr/bin/env node
/**
 * ADO Tools CLI
 * Command-line interface for Azure DevOps operations
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { 
  getWorkItem, 
  updateWorkItem, 
  createWorkItem, 
  searchWorkItems 
} from '../src/adoWorkItems.js';
import { linkWorkItems, getWorkItemRelations } from '../src/adoWorkItemLinks.js';
import { configureLogger } from '../src/lib/loggerStructured.js';
import type { WorkItemType } from '../src/types/adoFieldTypes.js';
import type { LinkTypeAlias } from '../src/types/adoLinkTypes.js';

const program = new Command();

program
  .name('ado-tools')
  .description('Azure DevOps work item operations')
  .version('2.0.0');

// Get command
program
  .command('get <id>')
  .description('Get a work item by ID')
  .option('-e, --expand <type>', 'Expand relations (None, Relations, Fields, Links, All)', 'None')
  .option('-c, --comments', 'Include comments')
  .option('-f, --fields <fields>', 'Comma-separated list of fields to include')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (id: string, options) => {
    try {
      // Silence logs when outputting JSON to keep stdout clean
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItem = await getWorkItem(parseInt(id, 10), {
        expand: options.expand,
        includeComments: options.comments,
        fields: options.fields?.split(','),
      });

      if (options.json) {
        console.log(JSON.stringify(workItem, null, 2));
      } else {
        console.log(`Work Item ${workItem.id}: ${workItem.fields['System.Title']}`);
        console.log(`  Type: ${workItem.fields['System.WorkItemType']}`);
        console.log(`  State: ${workItem.fields['System.State']}`);
        console.log(`  Assigned To: ${workItem.fields['System.AssignedTo'] ?? 'Unassigned'}`);
        
        if (workItem.relations && workItem.relations.length > 0) {
          console.log(`  Relations: ${workItem.relations.length}`);
        }
        
        if (workItem.comments && workItem.comments.length > 0) {
          console.log(`  Comments: ${workItem.comments.length}`);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Update command
program
  .command('update <id>')
  .description('Update a work item')
  // Basic fields (inline)
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <description>', 'New description (HTML)')
  .option('-s, --state <state>', 'New state')
  .option('--tags <tags>', 'Tags (semicolon-separated, e.g., "Tag1; Tag2")')
  // Acceptance Criteria
  .option('--ac <criteria>', 'Acceptance criteria (HTML)')
  .option('--acceptance-criteria <criteria>', 'Acceptance criteria (HTML) - alias for --ac')
  // Bug-specific fields
  .option('--repro-steps <steps>', 'Repro steps for bugs (HTML)')
  .option('--system-info <info>', 'System info for bugs (HTML)')
  // Numeric/picklist fields
  .option('--story-points <points>', 'Story points', parseFloat)
  .option('--priority <priority>', 'Priority (1-4)', parseInt)
  .option('--work-class <type>', 'Work class type')
  .option('--requires-qa <value>', 'Requires QA (Yes/No)')
  // File-based content (for large HTML)
  .option('--description-file <file>', 'Read description from file')
  .option('--ac-file <file>', 'Read acceptance criteria from file')
  .option('--repro-steps-file <file>', 'Read repro steps from file')
  .option('--system-info-file <file>', 'Read system info from file')
  // Arbitrary field updates
  .option('--field <path>', 'Field path for arbitrary update (use with --value)')
  .option('--value <value>', 'Value for arbitrary field update (use with --field)')
  .option('--value-file <file>', 'Read value from file for arbitrary field update')
  // Bulk update from JSON
  .option('--fields-file <file>', 'Read fields from JSON file (expects { "fields": { ... } } or grooming-result.json format)')
  // Comment
  .option('--comment <comment>', 'Add a comment/history entry')
  // Output
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (id: string, options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const fields: Record<string, unknown> = {};
      
      // Basic inline fields
      if (options.title) fields['System.Title'] = options.title;
      if (options.description) fields['System.Description'] = options.description;
      if (options.state) fields['System.State'] = options.state;
      if (options.tags) fields['System.Tags'] = options.tags;
      
      // Acceptance criteria (support both --ac and --acceptance-criteria)
      const acValue = options.ac || options.acceptanceCriteria;
      if (acValue) fields['Microsoft.VSTS.Common.AcceptanceCriteria'] = acValue;
      
      // Bug-specific fields
      if (options.reproSteps) fields['Microsoft.VSTS.TCM.ReproSteps'] = options.reproSteps;
      if (options.systemInfo) fields['Microsoft.VSTS.TCM.SystemInfo'] = options.systemInfo;
      
      // Numeric/picklist fields
      if (options.storyPoints) fields['Microsoft.VSTS.Scheduling.StoryPoints'] = options.storyPoints;
      if (options.priority) fields['Microsoft.VSTS.Common.Priority'] = options.priority;
      if (options.workClass) fields['Custom.WorkClassType'] = options.workClass;
      if (options.requiresQa) fields['Custom.RequiresQA'] = options.requiresQa;

      // File-based content (for large HTML that can't be passed inline)
      if (options.descriptionFile) {
        fields['System.Description'] = readFileSync(options.descriptionFile, 'utf-8');
      }
      if (options.acFile) {
        fields['Microsoft.VSTS.Common.AcceptanceCriteria'] = readFileSync(options.acFile, 'utf-8');
      }
      if (options.reproStepsFile) {
        fields['Microsoft.VSTS.TCM.ReproSteps'] = readFileSync(options.reproStepsFile, 'utf-8');
      }
      if (options.systemInfoFile) {
        fields['Microsoft.VSTS.TCM.SystemInfo'] = readFileSync(options.systemInfoFile, 'utf-8');
      }

      // Arbitrary field update (--field + --value or --value-file)
      if (options.field) {
        if (options.valueFile) {
          fields[options.field] = readFileSync(options.valueFile, 'utf-8');
        } else if (options.value !== undefined) {
          fields[options.field] = options.value;
        } else {
          console.error('Error: --field requires either --value or --value-file');
          process.exit(1);
        }
      }

      // Bulk update from JSON file (grooming-result.json format)
      if (options.fieldsFile) {
        const fileContent = readFileSync(options.fieldsFile, 'utf-8');
        const parsed = JSON.parse(fileContent);
        
        // Support both { "fields": {...} } and direct fields object
        const fieldsFromFile = parsed.fields || parsed;
        
        // Merge fields from file (file-based fields take precedence over inline)
        for (const [key, value] of Object.entries(fieldsFromFile)) {
          if (value !== undefined && value !== null) {
            fields[key] = value;
          }
        }
      }

      const workItem = await updateWorkItem(parseInt(id, 10), {
        fields: Object.keys(fields).length > 0 ? fields : undefined,
        comment: options.comment,
      });

      if (options.json) {
        console.log(JSON.stringify(workItem, null, 2));
      } else {
        console.log(`Updated work item ${workItem.id}`);
        console.log(`  Fields updated: ${Object.keys(fields).length}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Create command
program
  .command('create <type>')
  .description('Create a new work item')
  .requiredOption('-t, --title <title>', 'Work item title')
  .option('-d, --description <description>', 'Description')
  .option('-p, --parent <id>', 'Parent work item ID', parseInt)
  .option('-a, --area <path>', 'Area path')
  .option('-i, --iteration <path>', 'Iteration path')
  .option('--assigned-to <user>', 'Assign to user')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (type: string, options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItem = await createWorkItem({
        type: type as WorkItemType,
        title: options.title,
        description: options.description,
        parentId: options.parent,
        areaPath: options.area,
        iterationPath: options.iteration,
        assignedTo: options.assignedTo,
        tags: options.tags?.split(','),
      });

      if (options.json) {
        console.log(JSON.stringify(workItem, null, 2));
      } else {
        console.log(`Created work item ${workItem.id}: ${workItem.fields['System.Title']}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Search command
program
  .command('search')
  .description('Search for work items')
  .option('-t, --text <text>', 'Search text')
  .option('--type <type>', 'Work item type')
  .option('-s, --state <state>', 'State filter')
  .option('-a, --assigned-to <user>', 'Assigned to filter')
  .option('--area <path>', 'Area path filter')
  .option('--iteration <path>', 'Iteration path filter')
  .option('--tags <tags>', 'Comma-separated tags filter')
  .option('--wiql <query>', 'Raw WIQL query')
  .option('--top <n>', 'Maximum results', parseInt)
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const results = await searchWorkItems({
        searchText: options.text,
        workItemType: options.type as WorkItemType,
        state: options.state,
        assignedTo: options.assignedTo,
        areaPath: options.area,
        iterationPath: options.iteration,
        tags: options.tags?.split(','),
        wiql: options.wiql,
        top: options.top,
      });

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(`Found ${results.count} work items:`);
        for (const wi of results.workItems) {
          console.log(`  ${wi.id}: ${wi.fields['System.Title']} [${wi.fields['System.State']}]`);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Link command
program
  .command('link <sourceId> <targetId>')
  .description('Link two work items')
  .requiredOption('--type <type>', 'Link type (parent, child, related, predecessor, successor)')
  .option('--comment <comment>', 'Link comment')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (sourceId: string, targetId: string, options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItem = await linkWorkItems({
        sourceId: parseInt(sourceId, 10),
        targetId: parseInt(targetId, 10),
        linkType: options.type as LinkTypeAlias,
        comment: options.comment,
      });

      if (options.json) {
        console.log(JSON.stringify(workItem, null, 2));
      } else {
        console.log(`Linked ${sourceId} -> ${targetId} (${options.type})`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Relations command
program
  .command('relations <id>')
  .description('Get work item relations')
  .option('--type <types>', 'Filter by link types (comma-separated)')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (id: string, options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const result = await getWorkItemRelations({
        workItemId: parseInt(id, 10),
        linkTypes: options.type?.split(',') as LinkTypeAlias[],
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Work Item ${id} Relations:`);
        for (const rel of result.relations) {
          console.log(`  ${rel.linkType}: ${rel.targetId}`);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
