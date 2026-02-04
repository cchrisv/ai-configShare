#!/usr/bin/env node

/**
 * Discover Salesforce Metadata Dependencies
 *
 * Uses Salesforce CLI and the Tooling API to find metadata component dependencies.
 * Supports caching for improved performance and outputs results as JSON.
 *
 * Enhanced with sfdc-soup patterns:
 * - Recursive dependency traversal with cycle detection
 * - Usage enrichment with pills (read/write/filter/grouping context)
 * - Standard field reference detection via code scanning
 * - Custom Metadata Type string reference detection
 * - Workflow/Process Builder analysis
 *
 * Usage:
 *   node discover-metadata-dependencies.js --metadata-type CustomField --metadata-names Contact.Stage__c --org-alias dev
 *   node discover-metadata-dependencies.js --metadata-type CustomObject --metadata-names Account,Contact --clear-cache
 *   node discover-metadata-dependencies.js --metadata-type CustomField --metadata-names Account.Name --depth 3 --enrich
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import enhanced lib modules
const utils = require('./lib/utils.cjs');
const { createRecursiveDependencyQuery, createRecursiveUsageQuery, createDependencyTree, createUsageTree } = require('./lib/recursive-query.cjs');
const { enrichUsageData, enrichDependencyData } = require('./lib/usage-enrichment.cjs');
const standardField = require('./lib/metadata-types/standard-field.cjs');
const customMetadataType = require('./lib/metadata-types/custom-metadata-type.cjs');
const workflowAnalysis = require('./lib/metadata-types/workflow-analysis.cjs');

// Parse command line arguments
const args = process.argv.slice(2);
let includeDescribeSpecified = false;
const options = {
  metadataType: null,
  metadataNames: [],
  orgAlias: null,
  outputPath: null,
  cacheDir: path.join(process.cwd(), '.sf-dependency-cache'),
  clearCache: false,
  direction: 'all', // 'all', 'incoming', 'outgoing'
  includeDescribe: false,
  includePicklistValues: false, // Default false - picklist fetching is slow, enable with --include-picklist-values
  maxFields: null, // No limit by default - fetch all fields
  // Enhanced options (sfdc-soup patterns)
  depth: 1, // Recursion depth for dependency traversal (1 = single level, original behavior)
  enrich: false, // Enable usage enrichment with pills
  includeStandardFields: false, // Scan code for standard field references
  includeCMTSearch: false, // Search Custom Metadata Types for string references
  includeWorkflowAnalysis: false, // Analyze workflow rules and process builders
  maxRecursiveQueries: 50, // Safety limit for recursive queries
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--metadata-type' && i + 1 < args.length) {
    options.metadataType = args[++i];
  } else if (arg === '--metadata-names' && i + 1 < args.length) {
    options.metadataNames = args[++i].split(',').map(n => n.trim());
  } else if (arg === '--org-alias' && i + 1 < args.length) {
    options.orgAlias = args[++i];
  } else if (arg === '--output-path' && i + 1 < args.length) {
    options.outputPath = args[++i];
  } else if (arg === '--cache-dir' && i + 1 < args.length) {
    options.cacheDir = args[++i];
  } else if (arg === '--clear-cache') {
    options.clearCache = true;
  } else if (arg === '--direction' && i + 1 < args.length) {
    options.direction = args[++i];
  } else if (arg === '--include-describe') {
    options.includeDescribe = true;
    includeDescribeSpecified = true;
  } else if (arg === '--no-include-describe') {
    options.includeDescribe = false;
    includeDescribeSpecified = true;
  } else if (arg === '--include-picklist-values') {
    options.includePicklistValues = true;
  } else if (arg === '--skip-picklist-values') {
    // Deprecated - kept for backwards compatibility
    options.includePicklistValues = false;
  } else if (arg === '--max-fields' && i + 1 < args.length) {
    options.maxFields = parseInt(args[++i], 10);
  } else if (arg === '--depth' && i + 1 < args.length) {
    options.depth = parseInt(args[++i], 10);
  } else if (arg === '--enrich') {
    options.enrich = true;
  } else if (arg === '--include-standard-fields') {
    options.includeStandardFields = true;
  } else if (arg === '--include-cmt-search') {
    options.includeCMTSearch = true;
  } else if (arg === '--include-workflow-analysis') {
    options.includeWorkflowAnalysis = true;
  } else if (arg === '--max-recursive-queries' && i + 1 < args.length) {
    options.maxRecursiveQueries = parseInt(args[++i], 10);
  } else if (arg === '--all-enhanced') {
    // Convenience flag to enable all enhanced features
    options.enrich = true;
    options.includeStandardFields = true;
    options.includeCMTSearch = true;
    options.includeWorkflowAnalysis = true;
    options.depth = 2;
  }
}

// Validate required arguments
if (!options.metadataType || options.metadataNames.length === 0) {
  console.error('Error: --metadata-type and --metadata-names are required');
  console.error('Usage: node discover-metadata-dependencies.js --metadata-type CustomField --metadata-names Contact.Stage__c');
  process.exit(1);
}

// Set defaults that depend on parsed options
if (!includeDescribeSpecified && options.metadataType === 'CustomObject') {
  options.includeDescribe = true;
}

// Cache management
function getCachePath(key) {
  return path.join(options.cacheDir, `${key}.json`);
}

function getCachedDependencies(key) {
  const cachePath = getCachePath(key);
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const now = Date.now();
      const cacheAge = now - data.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (cacheAge < maxAge) {
        console.log(`[Cache] Using cached results for ${key} (${Math.round(cacheAge / 1000)}s old)`);
        return data.dependencies;
      }
    } catch (e) {
      // Cache file corrupted, will be regenerated
    }
  }
  return null;
}

function saveDependencies(key, dependencies) {
  if (!fs.existsSync(options.cacheDir)) {
    fs.mkdirSync(options.cacheDir, { recursive: true });
  }
  const cachePath = getCachePath(key);
  const cacheData = {
    timestamp: Date.now(),
    key,
    dependencies,
  };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
}

function clearCache() {
  if (fs.existsSync(options.cacheDir)) {
    fs.rmSync(options.cacheDir, { recursive: true, force: true });
    console.log('[Cache] Cleared cache directory');
  }
}

function runSfQuery(query, { useTooling = true } = {}) {
  const escapedQuery = query.replace(/"/g, '\\"');
  const toolingArg = useTooling ? ' --use-tooling-api' : '';
  const aliasArg = options.orgAlias ? ` --target-org ${options.orgAlias}` : '';
  const cmd = `sf data query --query "${escapedQuery}"${toolingArg} --json${aliasArg}`;
  const result = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(result);
}

/**
 * Promisified query function for use with async lib modules
 * @param {string} query - SOQL query
 * @param {Object} opts - Query options
 * @returns {Promise<Object>} Query result
 */
async function queryFunction(query, opts = {}) {
  return runSfQuery(query, opts);
}

/**
 * Gets the base URL for the org (for constructing record links)
 * @returns {string} Base URL
 */
function getOrgBaseUrl() {
  try {
    const aliasArg = options.orgAlias ? ` --target-org ${options.orgAlias}` : '';
    const cmd = `sf org display${aliasArg} --json`;
    const result = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
    return result.result?.instanceUrl || '';
  } catch (e) {
    return '';
  }
}

function fetchPicklistValues(fieldDurableId) {
  try {
    const data = runSfQuery(
      `SELECT Value, Label, IsDefaultValue, IsActive, SequenceNumber FROM PicklistValueInfo WHERE EntityParticleId = '${fieldDurableId}' ORDER BY SequenceNumber`,
      { useTooling: true }
    );
    if (data.result && data.result.records) {
      return data.result.records.map(valueRecord => ({
        value: valueRecord.Value,
        label: valueRecord.Label,
        isDefault: valueRecord.IsDefaultValue,
        isActive: valueRecord.IsActive,
        sequence: valueRecord.SequenceNumber,
      }));
    }
  } catch (error) {
    console.log(`[Describe] Warning: Could not retrieve picklist values for ${fieldDurableId}: ${error.message}`);
  }
  return [];
}

function fetchObjectDescribe(objectName) {
  const describe = {
    object: null,
    fields: [],
  };

  console.log(`[Describe] Fetching object metadata for ${objectName}...`);
  try {
    const entityData = runSfQuery(
      `SELECT QualifiedApiName, Label, PluralLabel, Description, KeyPrefix, IsCustomSetting, IsCustomizable FROM EntityDefinition WHERE QualifiedApiName = '${objectName}' LIMIT 1`,
      { useTooling: true }
    );

    if (entityData.result && entityData.result.records && entityData.result.records.length > 0) {
      const record = entityData.result.records[0];
      describe.object = {
        apiName: record.QualifiedApiName,
        label: record.Label,
        pluralLabel: record.PluralLabel,
        description: record.Description,
        keyPrefix: record.KeyPrefix,
        isCustomSetting: record.IsCustomSetting,
        isCustomizable: record.IsCustomizable,
      };
      console.log(`[Describe] Retrieved object metadata for ${objectName}`);
    }
  } catch (error) {
    console.log(`[Describe] Warning: Failed to describe EntityDefinition for ${objectName}: ${error.message}`);
  }

  try {
    console.log(`[Describe] Fetching field definitions for ${objectName}...`);
    const fieldData = runSfQuery(
      `SELECT DurableId, QualifiedApiName, Label, DataType, Length, Precision, Scale, IsCalculated, IsHighScaleNumber, IsHtmlFormatted, IsNameField, IsNillable, IsWorkflowFilterable, IsCompactLayoutable, IsFieldHistoryTracked, IsIndexed, IsApiFilterable, IsApiSortable, IsListFilterable, IsListSortable, IsApiGroupable, IsListVisible, Description, RelationshipName, ReferenceTo, ReferenceTargetField, ControllingFieldDefinitionId FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}' ORDER BY QualifiedApiName`,
      { useTooling: true }
    );

    if (fieldData.result && fieldData.result.records) {
      let fieldsToProcess = fieldData.result.records;
      const totalFields = fieldsToProcess.length;
      const limited = options.maxFields !== null && totalFields > options.maxFields;
      
      if (limited) {
        console.log(`[Describe] Found ${totalFields} fields for ${objectName} (limiting to ${options.maxFields} to prevent timeout)`);
        fieldsToProcess = fieldsToProcess.slice(0, options.maxFields);
      } else {
        console.log(`[Describe] Found ${totalFields} fields for ${objectName} - fetching all fields`);
      }
      
      const picklistFields = [];
      describe.fields = fieldsToProcess.map((fieldRecord, index) => {
        if ((index + 1) % 50 === 0 || (index + 1) === fieldsToProcess.length) {
          console.log(`[Describe] Processing field ${index + 1} of ${fieldsToProcess.length}...`);
        }
        
        const fieldDescribe = {
          apiName: fieldRecord.QualifiedApiName,
          label: fieldRecord.Label,
          dataType: fieldRecord.DataType,
          length: fieldRecord.Length,
          precision: fieldRecord.Precision,
          scale: fieldRecord.Scale,
          calculated: fieldRecord.IsCalculated,
          highScaleNumber: fieldRecord.IsHighScaleNumber,
          htmlFormatted: fieldRecord.IsHtmlFormatted,
          nameField: fieldRecord.IsNameField,
          required: fieldRecord.IsNillable === false,
          nillable: fieldRecord.IsNillable,
          workflowFilterable: fieldRecord.IsWorkflowFilterable,
          compactLayoutable: fieldRecord.IsCompactLayoutable,
          fieldHistoryTracked: fieldRecord.IsFieldHistoryTracked,
          indexed: fieldRecord.IsIndexed,
          apiFilterable: fieldRecord.IsApiFilterable,
          apiSortable: fieldRecord.IsApiSortable,
          listFilterable: fieldRecord.IsListFilterable,
          listSortable: fieldRecord.IsListSortable,
          apiGroupable: fieldRecord.IsApiGroupable,
          listVisible: fieldRecord.IsListVisible,
          description: fieldRecord.Description,
          relationshipName: fieldRecord.RelationshipName,
          referenceTargets: fieldRecord.ReferenceTo && fieldRecord.ReferenceTo.referenceTo
            ? fieldRecord.ReferenceTo.referenceTo
            : null,
          referenceTargetField: fieldRecord.ReferenceTargetField,
          controllingFieldDefinitionId: fieldRecord.ControllingFieldDefinitionId,
          picklistValues: [],
        };

        if (['Picklist', 'MultiselectPicklist'].includes(fieldRecord.DataType)) {
          picklistFields.push({ field: fieldDescribe, durableId: fieldRecord.DurableId });
        }

        return fieldDescribe;
      });

      // Fetch picklist values only if explicitly requested (slow operation)
      if (picklistFields.length > 0 && options.includePicklistValues) {
        console.log(`[Describe] Fetching picklist values for ${picklistFields.length} picklist fields (this may take a while)...`);
        picklistFields.forEach((item, index) => {
          if ((index + 1) % 10 === 0 || (index + 1) === picklistFields.length) {
            console.log(`[Describe] Processing picklist ${index + 1} of ${picklistFields.length}...`);
          }
          try {
            item.field.picklistValues = fetchPicklistValues(item.durableId);
          } catch (error) {
            console.log(`[Describe] Warning: Could not fetch picklist values for ${item.field.apiName}: ${error.message}`);
          }
        });
        console.log(`[Describe] Completed picklist value retrieval for ${picklistFields.length} fields`);
      } else if (picklistFields.length > 0) {
        console.log(`[Describe] Skipped picklist value retrieval (${picklistFields.length} picklist fields found) - use --include-picklist-values to fetch values`);
      }
      
      console.log(`[Describe] Completed field metadata for ${objectName}: ${describe.fields.length} fields`);
    }
  } catch (error) {
    console.log(`[Describe] Warning: Failed to retrieve FieldDefinition data for ${objectName}: ${error.message}`);
  }

  return describe;
}

// Query metadata using Tooling API
function queryMetadata(metadataName) {
  try {
    let query = '';
    
    if (options.metadataType === 'CustomField') {
      const [objectName, fieldName] = metadataName.split('.');
      query = `SELECT Id FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}' AND QualifiedApiName = '${fieldName}' LIMIT 1`;
    } else if (options.metadataType === 'CustomObject') {
      query = `SELECT Id FROM EntityDefinition WHERE QualifiedApiName = '${metadataName}' LIMIT 1`;
    } else if (options.metadataType === 'ApexClass') {
      query = `SELECT Id FROM ApexClass WHERE Name = '${metadataName}' LIMIT 1`;
    } else if (options.metadataType === 'Flow') {
      query = `SELECT Id FROM FlowDefinition WHERE DeveloperName = '${metadataName}' LIMIT 1`;
    } else {
      return null;
    }

    let aliasArg = '';
    if (options.orgAlias) {
      aliasArg = `--target-org ${options.orgAlias}`;
    }

    const result = execSync(`sf data query --query "${query}" --use-tooling-api --json ${aliasArg}`, { encoding: 'utf8' });
    const data = JSON.parse(result);
    
    if (data.result && data.result.records && data.result.records.length > 0) {
      const record = data.result.records[0];
      // For Tooling API, the real ID is often in the attributes.url
      // Extract it if available: /services/data/v65.0/tooling/sobjects/EntityType/Id
      if (record.attributes && record.attributes.url) {
        const urlParts = record.attributes.url.split('/');
        const realId = urlParts[urlParts.length - 1];
        return realId;
      }
      return record.Id;
    }
    return null;
  } catch (error) {
    console.log(`[Query] Warning: Could not find ${options.metadataType} with name ${metadataName}`);
    return null;
  }
}

// Query dependencies using MetadataComponentDependency
function queryDependencies(metadataName) {
  const cacheKey = `${options.metadataType}-${metadataName}-depth${options.depth}`;

  // Check cache first
  if (!options.clearCache) {
    const cached = getCachedDependencies(cacheKey);
    if (cached) {
      return cached;
    }
  }

  console.log(`[Query] Discovering dependencies for ${metadataName}...`);
  if (options.depth > 1) {
    console.log(`[Query] Using OPTIMIZED batch recursive traversal with depth ${options.depth}`);
  }

  try {
    // Get metadata ID
    const metadataId = queryMetadata(metadataName);
    if (!metadataId) {
      throw new Error(`Could not find metadata with name ${metadataName}`);
    }

    // For CustomField, query at the object level since MetadataComponentDependency
    // tracks field dependencies at the object level, not the field level
    let queryId = metadataId;
    if (options.metadataType === 'CustomField' && metadataName.includes('.')) {
      const [objectName] = metadataName.split('.');
      queryId = objectName;
      console.log(`[Query] Note: Querying at object level '${objectName}' for field '${metadataName}' since MetadataComponentDependency tracks field dependencies at the object level`);
    }

    const dependencies = {
      metadata: {
        name: metadataName,
        type: options.metadataType,
        id: metadataId,
      },
      usageTree: {},
      dependencyTree: {},
      stats: {
        usage: 0,
        dependencies: 0,
        recursiveDepth: options.depth,
        cyclesDetected: 0,
        totalQueriesExecuted: 0,
      },
      pills: [], // Root-level pills for the entry point
    };

    // HIGH-VALUE TYPES - Only recurse into these for performance
    // These are the types most likely to have meaningful transitive dependencies
    const HIGH_VALUE_TYPES = new Set([
      'ApexClass', 'ApexTrigger', 'Flow', 'FlowDefinition',
      'Report', 'Dashboard', 'ReportType',
      'LightningComponentBundle', 'AuraComponentBundle',
      'WorkflowRule', 'WorkflowFieldUpdate', 'WorkflowAlert',
      'ValidationRule', 'ApexPage', 'ApexComponent',
      'CustomObject', 'CustomField', 'RecordType',
      'PermissionSet', 'Profile', 'Layout',
      'QuickAction', 'FlexiPage', 'CustomTab'
    ]);

    // Track already queried IDs to prevent cycles
    const queriedIds = new Set();
    
    // Helper to normalize IDs (15 vs 18 char comparison)
    function normalizeId(id) {
      if (!id) return id;
      return id.substring(0, 15);
    }

    // OPTIMIZED: Batch query function - queries multiple IDs at once
    function batchQueryDependencies(idsToQuery) {
      if (idsToQuery.length === 0) return [];
      
      dependencies.stats.totalQueriesExecuted++;
      
      // Build IN clause with all IDs (max ~100 per query to avoid SOQL limits)
      const idList = idsToQuery.map(id => `'${id}'`).join(',');
      const depQuery = `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency WHERE MetadataComponentId IN (${idList}) OR RefMetadataComponentId IN (${idList}) LIMIT 5000`;

      let aliasArg = '';
      if (options.orgAlias) {
        aliasArg = `--target-org ${options.orgAlias}`;
      }

      try {
        const result = execSync(`sf data query --query "${depQuery}" --use-tooling-api --json ${aliasArg}`, { 
          encoding: 'utf8', 
          maxBuffer: 50 * 1024 * 1024 
        });
        const data = JSON.parse(result);
        return data.result?.records || [];
      } catch (e) {
        console.log(`[Query] Warning: Batch query failed: ${e.message}`);
        return [];
      }
    }

    // OPTIMIZED: Level-by-level batch processing
    function processLevelBatch(currentLevelItems, currentDepth) {
      if (currentDepth > options.depth || currentLevelItems.length === 0) {
        return;
      }

      // Filter out already-queried IDs and collect new ones
      const newIds = [];
      const idToItemMap = new Map();
      
      for (const item of currentLevelItems) {
        const normId = normalizeId(item.id);
        if (!queriedIds.has(normId)) {
          queriedIds.add(normId);
          newIds.push(item.id);
          idToItemMap.set(normId, item);
        } else {
          dependencies.stats.cyclesDetected++;
        }
      }

      if (newIds.length === 0) {
        return;
      }

      console.log(`[Query] Level ${currentDepth}: Batch querying ${newIds.length} components...`);

      // Process in batches of 50 to avoid SOQL length limits
      const BATCH_SIZE = 50;
      const allRecords = [];
      
      for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
        const batch = newIds.slice(i, i + BATCH_SIZE);
        const records = batchQueryDependencies(batch);
        allRecords.push(...records);
      }

      console.log(`[Query] Level ${currentDepth}: Found ${allRecords.length} total dependency records`);

      // Group records by their source/target for building tree structure
      const nextLevelItems = [];
      const normalizedNewIds = new Set(newIds.map(normalizeId));

      for (const record of allRecords) {
        const metaIdNorm = normalizeId(record.MetadataComponentId);
        const refIdNorm = normalizeId(record.RefMetadataComponentId);

        // Check if this record is FROM one of our queried IDs (outgoing dependency)
        if (normalizedNewIds.has(metaIdNorm)) {
          const parentItem = idToItemMap.get(metaIdNorm);
          if (parentItem) {
            const depType = record.RefMetadataComponentType;
            if (!parentItem.children) parentItem.children = {};
            if (!parentItem.children[depType]) parentItem.children[depType] = [];
            
            const dep = {
              name: record.RefMetadataComponentName,
              type: depType,
              id: record.RefMetadataComponentId,
              depth: currentDepth,
              pills: [],
            };
            parentItem.children[depType].push(dep);
            
            // Only recurse into high-value types
            if (HIGH_VALUE_TYPES.has(depType) && !queriedIds.has(normalizeId(record.RefMetadataComponentId))) {
              nextLevelItems.push(dep);
            }
          }
        }

        // Check if this record is TO one of our queried IDs (incoming usage)
        if (normalizedNewIds.has(refIdNorm)) {
          const parentItem = idToItemMap.get(refIdNorm);
          if (parentItem) {
            const usageType = record.MetadataComponentType;
            if (!parentItem.usedBy) parentItem.usedBy = {};
            if (!parentItem.usedBy[usageType]) parentItem.usedBy[usageType] = [];
            
            const usage = {
              name: record.MetadataComponentName,
              type: usageType,
              id: record.MetadataComponentId,
              depth: currentDepth,
              pills: [],
            };
            parentItem.usedBy[usageType].push(usage);
            
            // Only recurse into high-value types
            if (HIGH_VALUE_TYPES.has(usageType) && !queriedIds.has(normalizeId(record.MetadataComponentId))) {
              nextLevelItems.push(usage);
            }
          }
        }
      }

      // Recurse to next level with collected items
      if (nextLevelItems.length > 0 && currentDepth < options.depth) {
        processLevelBatch(nextLevelItems, currentDepth + 1);
      }
    }

    // Start with initial query for the root item
    const rootItem = { id: queryId, name: metadataName, type: options.metadataType };
    
    // First level query
    const initialRecords = batchQueryDependencies([queryId]);
    console.log(`[Query] Level 1: Found ${initialRecords.length} records for ${metadataName}`);

    const normalizedQueryId = normalizeId(queryId);
    queriedIds.add(normalizedQueryId);
    
    const nextLevelItems = [];

    for (const record of initialRecords) {
      const metaIdNorm = normalizeId(record.MetadataComponentId);
      const refIdNorm = normalizeId(record.RefMetadataComponentId);

      if (metaIdNorm === normalizedQueryId) {
        // Outgoing dependency
        const depType = record.RefMetadataComponentType;
        if (!dependencies.dependencyTree[depType]) {
          dependencies.dependencyTree[depType] = [];
        }
        const dep = {
          name: record.RefMetadataComponentName,
          type: depType,
          id: record.RefMetadataComponentId,
          depth: 1,
          pills: [],
        };
        dependencies.dependencyTree[depType].push(dep);
        
        if (HIGH_VALUE_TYPES.has(depType)) {
          nextLevelItems.push(dep);
        }
      } else if (refIdNorm === normalizedQueryId) {
        // Incoming usage
        const usageType = record.MetadataComponentType;
        if (!dependencies.usageTree[usageType]) {
          dependencies.usageTree[usageType] = [];
        }
        const usage = {
          name: record.MetadataComponentName,
          type: usageType,
          id: record.MetadataComponentId,
          depth: 1,
          pills: [],
        };
        dependencies.usageTree[usageType].push(usage);
        
        if (HIGH_VALUE_TYPES.has(usageType)) {
          nextLevelItems.push(usage);
        }
      }
    }

    // Process remaining levels in batches
    if (options.depth > 1 && nextLevelItems.length > 0) {
      processLevelBatch(nextLevelItems, 2);
    }

    // Calculate stats
    function countItems(tree) {
      let count = 0;
      for (const items of Object.values(tree)) {
        count += items.length;
        for (const item of items) {
          if (item.children) count += countItems(item.children);
          if (item.usedBy) count += countItems(item.usedBy);
        }
      }
      return count;
    }
    
    dependencies.stats.usage = countItems(dependencies.usageTree);
    dependencies.stats.dependencies = countItems(dependencies.dependencyTree);
    
    console.log(`[Query] Completed - Total Usage: ${dependencies.stats.usage}, Total Dependencies: ${dependencies.stats.dependencies}`);
    console.log(`[Query] Queries executed: ${dependencies.stats.totalQueriesExecuted}, Cycles detected: ${dependencies.stats.cyclesDetected}`);

    // Apply enhanced features if enabled
    if (options.enrich) {
      console.log(`[Enrich] Enriching usage data with context pills...`);
      dependencies.usageTree = enrichUsageTreeSync(dependencies.usageTree, { 
        metadataName, 
        metadataType: options.metadataType 
      });
    }

    if (options.includeDescribe) {
      const describeTarget = options.metadataType === 'CustomField' && metadataName.includes('.')
        ? metadataName.split('.')[0]
        : metadataName;
      dependencies.describe = fetchObjectDescribe(describeTarget);
    }

    // Cache the results
    saveDependencies(cacheKey, dependencies);

    return dependencies;
  } catch (error) {
    console.error(`Error querying dependencies for ${metadataName}:`, error.message);
    return {
      metadata: {
        name: metadataName,
        type: options.metadataType,
      },
      error: error.message,
      usageTree: {},
      dependencyTree: {},
      stats: { usage: 0, dependencies: 0 },
      pills: [],
    };
  }
}

/**
 * Synchronous wrapper for enriching usage tree
 * @param {Object} usageTree - Usage tree to enrich
 * @param {Object} context - Context for enrichment
 * @returns {Object} Enriched usage tree
 */
function enrichUsageTreeSync(usageTree, context) {
  const enrichedTree = {};
  
  for (const [type, items] of Object.entries(usageTree)) {
    enrichedTree[type] = items.map(item => {
      const enriched = { ...item };
      
      // Add type-specific pills
      if (type === 'ApexClass') {
        // Check if we can determine read/write
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Apex', 'info'));
      } else if (type === 'Flow') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Flow', 'info'));
      } else if (type === 'Report') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Report', 'info'));
      } else if (type === 'ValidationRule') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Validation', 'warning'));
      } else if (type === 'WorkflowRule') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Workflow', 'info'));
      } else if (type === 'LightningComponentBundle') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('LWC', 'info'));
      } else if (type === 'AuraComponentBundle') {
        enriched.pills = enriched.pills || [];
        enriched.pills.push(utils.createPill('Aura', 'info'));
      }
      
      return enriched;
    });
  }
  
  return enrichedTree;
}

// Main execution
async function main() {
  if (options.clearCache) {
    clearCache();
  }

  try {
    console.log('[Init] Discovering dependencies...');
    console.log(`[Init] Metadata type: ${options.metadataType}`);
    console.log(`[Init] Metadata names: ${options.metadataNames.join(', ')}`);
    
    // Log enhanced options if enabled
    if (options.depth > 1) {
      console.log(`[Init] Recursive depth: ${options.depth}`);
    }
    if (options.enrich) {
      console.log('[Init] Usage enrichment: enabled');
    }
    if (options.includeStandardFields) {
      console.log('[Init] Standard field scanning: enabled');
    }
    if (options.includeCMTSearch) {
      console.log('[Init] Custom Metadata Type search: enabled');
    }
    if (options.includeWorkflowAnalysis) {
      console.log('[Init] Workflow analysis: enabled');
    }

    const allResults = [];
    for (const metadataName of options.metadataNames) {
      const dependencies = queryDependencies(metadataName);
      
      // Apply async enhanced features
      if (options.includeStandardFields && options.metadataType === 'CustomField') {
        console.log(`[Enhanced] Scanning for standard field references...`);
        try {
          const entryPoint = {
            name: metadataName,
            type: options.metadataType,
            id: dependencies.metadata?.id
          };
          const baseUrl = getOrgBaseUrl();
          const standardRefs = await standardField.findStandardFieldReferences(
            entryPoint,
            queryFunction,
            { baseUrl }
          );
          
          if (standardRefs.length > 0) {
            console.log(`[Enhanced] Found ${standardRefs.length} standard field references`);
            dependencies.standardFieldReferences = standardRefs;
          }
        } catch (e) {
          console.log(`[Enhanced] Standard field scan error: ${e.message}`);
        }
      }
      
      if (options.includeCMTSearch && options.metadataType === 'ApexClass') {
        console.log(`[Enhanced] Searching Custom Metadata Types for class references...`);
        try {
          const entryPoint = {
            name: metadataName,
            type: options.metadataType,
            id: dependencies.metadata?.id
          };
          const baseUrl = getOrgBaseUrl();
          const cmtRefs = await customMetadataType.findClassReferencesInCMT(
            entryPoint,
            queryFunction,
            { baseUrl }
          );
          
          if (cmtRefs.length > 0) {
            console.log(`[Enhanced] Found ${cmtRefs.length} CMT references`);
            dependencies.customMetadataTypeReferences = cmtRefs;
          }
        } catch (e) {
          console.log(`[Enhanced] CMT search error: ${e.message}`);
        }
      }
      
      if (options.includeWorkflowAnalysis && options.metadataType === 'CustomObject') {
        console.log(`[Enhanced] Analyzing workflow rules for object...`);
        try {
          const workflowRules = await workflowAnalysis.queryWorkflowRulesForObject(
            queryFunction,
            metadataName
          );
          const fieldUpdates = await workflowAnalysis.queryFieldUpdatesForObject(
            queryFunction,
            metadataName
          );
          
          if (workflowRules.length > 0 || fieldUpdates.length > 0) {
            console.log(`[Enhanced] Found ${workflowRules.length} workflow rules, ${fieldUpdates.length} field updates`);
            dependencies.workflowAnalysis = {
              rules: workflowRules,
              fieldUpdates: fieldUpdates
            };
          }
        } catch (e) {
          console.log(`[Enhanced] Workflow analysis error: ${e.message}`);
        }
      }
      
      allResults.push(dependencies);
    }

    const output = {
      query: {
        metadataType: options.metadataType,
        metadataNames: options.metadataNames,
        direction: options.direction,
        // Include enhanced options in output for transparency
        enhancedOptions: {
          depth: options.depth,
          enrich: options.enrich,
          includeStandardFields: options.includeStandardFields,
          includeCMTSearch: options.includeCMTSearch,
          includeWorkflowAnalysis: options.includeWorkflowAnalysis
        }
      },
      results: allResults,
      timestamp: new Date().toISOString(),
    };

    // Output results
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, JSON.stringify(output, null, 2));
      console.log(`[Output] Results saved to ${options.outputPath}`);
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
