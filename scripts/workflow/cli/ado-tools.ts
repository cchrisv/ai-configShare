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
import { linkWorkItems, unlinkWorkItems, getWorkItemRelations } from '../src/adoWorkItemLinks.js';
import { configureLogger } from '../src/lib/loggerStructured.js';
import type { WorkItemType } from '../src/types/adoFieldTypes.js';
import type { LinkTypeAlias } from '../src/types/adoLinkTypes.js';

function parseTagList(input?: string): string[] | undefined {
  if (!input) return undefined;

  const normalizedInput = input.trim();
  if (!normalizedInput) return undefined;

  if (normalizedInput.startsWith('[') && normalizedInput.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalizedInput);
      if (Array.isArray(parsed)) {
        const tags = parsed
          .map((tag) => String(tag).trim())
          .filter((tag) => tag.length > 0);
        return tags.length > 0 ? tags : undefined;
      }
    } catch {
      // Fall through to delimiter parsing
    }
  }

  const tags = input
    .split(/[;,]/)
    .map((tag) => tag.trim().replace(/^['"\[]+|['"\]]+$/g, ''))
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

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
  // Context-driven update (reads phase output from ticket-context.json)
  .option('--from-context <file>', 'Read applied_content from ticket-context.json and map to ADO fields')
  .option('--phase <phase>', 'Phase section to read from context (grooming|solutioning). Default: grooming')
  // Standalone filled-spec update (render + validate + push without Context7)
  .option('--from-filled <files>', 'Comma-separated filled-spec JSON files (each must have "template" and "slots" keys). Renders, validates, maps ado_field, and pushes in one call.')
  // Comment
  .option('--comment <comment>', 'Add a comment/history entry')
  // Dry run
  .option('--dry-run', 'Render and validate without pushing to ADO. Shows fields that would be updated.')
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

      // Context-driven update: read filled_slots from ticket-context.json,
      // auto-render via template engine, validate, then map to ADO fields.
      if (options.fromContext) {
        const ctxContent = readFileSync(options.fromContext, 'utf-8');
        const ctx = JSON.parse(ctxContent);
        const phase = options.phase || 'grooming';
        const phaseData = ctx?.[phase];

        if (!phaseData) {
          console.error(`Error: --from-context file missing "${phase}" section`);
          process.exit(1);
        }

        // Require filled_slots (new template-engine flow)
        const filledSlots = phaseData?.filled_slots;
        if (!filledSlots || typeof filledSlots !== 'object' || Object.keys(filledSlots).length === 0) {
          console.error(`Error: ${phase}.filled_slots not found in context file.`);
          console.error('Run: template-tools scaffold-phase --phase ' + phase + ' ... then fill the slots.');
          process.exit(1);
        }

        // Auto-render each template via the template engine
        const { renderTemplate, validateRendered, getTemplateEntry } = await import('../src/templateEngine.js');

        for (const [templateKey, slots] of Object.entries(filledSlots)) {
          const renderResult = renderTemplate(templateKey, slots as Record<string, import('../src/types/templateTypes.js').FillSlot>);

          if (!renderResult.success) {
            console.error(`Warning: template "${templateKey}" has ${renderResult.slots_missing} missing required slot(s): ${renderResult.missing_slots.join(', ')}`);
          }

          // Validate structural integrity
          const validation = validateRendered(templateKey, renderResult.html);
          if (!validation.valid) {
            const errors = validation.issues.filter((i: { severity: string }) => i.severity === 'error');
            console.error(`Error: template "${templateKey}" failed validation:`);
            for (const err of errors) {
              console.error(`  [${err.code}] ${err.message}`);
            }
            process.exit(1);
          }

          // Map rendered HTML to ADO field
          const entry = getTemplateEntry(templateKey);
          if (entry.ado_field) {
            fields[entry.ado_field] = renderResult.html;
          }
        }

        // Also pick up non-template fields from the phase (tags, story points, etc.)
        const extraFields = phaseData?.extra_fields;
        if (extraFields && typeof extraFields === 'object') {
          if (Array.isArray(extraFields.tags) && extraFields.tags.length > 0) {
            fields['System.Tags'] = extraFields.tags.join('; ');
          }
          if (extraFields.title) fields['System.Title'] = extraFields.title;
          if (extraFields.story_points != null) fields['Microsoft.VSTS.Scheduling.StoryPoints'] = extraFields.story_points;
          if (extraFields.work_class_type) fields['Custom.WorkClassType'] = extraFields.work_class_type;
          if (extraFields.requires_qa) fields['Custom.RequiresQA'] = extraFields.requires_qa;
        }

        // Write rendered applied_content back to context for audit trail
        if (!phaseData.templates_applied) phaseData.templates_applied = {};
        const appliedContent: Record<string, string> = {};
        for (const [adoField, value] of Object.entries(fields)) {
          if (typeof value === 'string' && value.includes('linear-gradient')) {
            const contextKey = adoFieldToContextKey(adoField);
            appliedContent[contextKey] = value;
          }
        }
        phaseData.templates_applied.applied_content = appliedContent;
        ctx[phase] = phaseData;
        const { writeFileSync: writeCtx } = await import('fs');
        writeCtx(options.fromContext, JSON.stringify(ctx, null, 2), 'utf-8');
      }

      // Standalone filled-spec update: render + validate + map ado_field + push
      // Each file must be a FillSpec (with "template" and "slots" keys) from scaffold output.
      if (options.fromFilled) {
        const filePaths = (options.fromFilled as string).split(',').map((f: string) => f.trim());
        const { renderTemplate: renderTpl, validateRendered: validateHtml, getTemplateEntry: getEntry } = await import('../src/templateEngine.js');

        for (const filePath of filePaths) {
          const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

          // Require FillSpec format with template key
          const templateKey = raw.template;
          if (!templateKey) {
            console.error(`Error: file "${filePath}" missing "template" key. Use scaffold output format.`);
            process.exit(1);
          }

          // Extract slots (support both .slots wrapper and direct slots object)
          const slots = raw.slots ?? raw;

          // Render
          const renderResult = renderTpl(templateKey, slots as Record<string, import('../src/types/templateTypes.js').FillSlot>);
          if (!renderResult.success) {
            console.error(`Warning: template "${templateKey}" has ${renderResult.slots_missing} missing slot(s): ${renderResult.missing_slots.join(', ')}`);
            if (renderResult.warnings.length > 0) {
              for (const w of renderResult.warnings) console.error(`  ⚠ ${w}`);
            }
          }

          // Validate
          const validation = validateHtml(templateKey, renderResult.html);
          if (!validation.valid) {
            const errors = validation.issues.filter((i: { severity: string }) => i.severity === 'error');
            console.error(`Error: template "${templateKey}" failed validation:`);
            for (const err of errors) {
              console.error(`  [${err.code}] ${err.message}`);
            }
            process.exit(1);
          }

          // Map to ADO field from registry
          const entry = getEntry(templateKey);
          if (entry.ado_field) {
            fields[entry.ado_field] = renderResult.html;
          } else {
            console.error(`Warning: template "${templateKey}" has no ado_field mapping — skipping.`);
          }
        }
      }

      // Helper: map ADO field path to context key name
      function adoFieldToContextKey(adoField: string): string {
        const mapping: Record<string, string> = {
          'System.Description': 'description',
          'Microsoft.VSTS.Common.AcceptanceCriteria': 'acceptance_criteria',
          'System.Title': 'title',
          'Microsoft.VSTS.TCM.ReproSteps': 'repro_steps',
          'Microsoft.VSTS.TCM.SystemInfo': 'system_info',
          'Custom.DevelopmentSummary': 'development_summary',
          'Custom.BusinessProblemandValueStatement': 'business_value',
          'Custom.BusinessObjectivesandImpact': 'objectives',
          'Custom.ReleaseNotes': 'release_notes',
        };
        return mapping[adoField] ?? adoField.replace(/\./g, '_').toLowerCase();
      }

      // Dry-run: show what would be pushed without calling ADO API
      if (options.dryRun) {
        const dryResult: Record<string, unknown> = {
          dry_run: true,
          work_item_id: parseInt(id, 10),
          fields_count: Object.keys(fields).length,
          fields_to_update: Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [
              k,
              typeof v === 'string' && (v as string).length > 200
                ? `(${(v as string).length} chars HTML)`
                : v,
            ])
          ),
          comment: options.comment ?? null,
        };
        if (options.json) {
          console.log(JSON.stringify(dryResult, null, 2));
        } else {
          console.log(`[DRY RUN] Would update work item ${id}`);
          console.log(`  Fields: ${Object.keys(fields).length}`);
          for (const [k, v] of Object.entries(dryResult['fields_to_update'] as Record<string, unknown>)) {
            console.log(`    ${k}: ${v}`);
          }
        }
        return;
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
  .option('--tags <tags>', 'Tags (comma or semicolon-separated)')
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
        tags: parseTagList(options.tags),
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
  .option('--tags <tags>', 'Tags filter (comma or semicolon-separated)')
  .option('--wiql <query>', 'Raw WIQL query')
  .option('--top <n>', 'Maximum results', parseInt)
  .option('--all', 'Return all matching results (disables --top limit)')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      if (options.all && options.top) {
        console.error('Error: --all cannot be combined with --top');
        process.exit(1);
      }

      const results = await searchWorkItems({
        searchText: options.text,
        workItemType: options.type as WorkItemType,
        state: options.state,
        assignedTo: options.assignedTo,
        areaPath: options.area,
        iterationPath: options.iteration,
        tags: parseTagList(options.tags),
        wiql: options.wiql,
        top: options.all ? undefined : options.top,
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

// Unlink command
program
  .command('unlink <sourceId> <targetId>')
  .description('Remove a link between two work items')
  .requiredOption('--type <type>', 'Link type to remove (parent, child, related, predecessor, successor)')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (sourceId: string, targetId: string, options) => {
    try {
      if (options.json) {
        configureLogger({ silent: true });
      } else if (options.verbose) {
        configureLogger({ minLevel: 'debug' });
      }

      const workItem = await unlinkWorkItems(
        parseInt(sourceId, 10),
        parseInt(targetId, 10),
        options.type as LinkTypeAlias,
      );

      if (options.json) {
        console.log(JSON.stringify(workItem, null, 2));
      } else {
        console.log(`Unlinked ${sourceId} -> ${targetId} (${options.type})`);
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
