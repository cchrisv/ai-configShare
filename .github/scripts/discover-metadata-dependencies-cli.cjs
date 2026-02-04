#!/usr/bin/env node

/**
 * Discover Salesforce Metadata Dependencies
 *
 * Uses Salesforce CLI and the Tooling API to find metadata component dependencies.
 * Supports caching for improved performance and outputs results as JSON.
 *
 * Usage:
 *   node discover-metadata-dependencies-cli.js --metadata-type CustomField --metadata-names Contact.Stage__c --org-alias dev
 *   node discover-metadata-dependencies-cli.js --metadata-type CustomObject --metadata-names Account,Contact --clear-cache
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  metadataType: null,
  metadataNames: [],
  orgAlias: null,
  outputPath: null,
  cacheDir: path.join(process.cwd(), '.sf-dependency-cache'),
  clearCache: false,
  direction: 'all', // 'all', 'incoming', 'outgoing'
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
  }
}

// Validate required arguments
if (!options.metadataType || options.metadataNames.length === 0) {
  console.error('Error: --metadata-type and --metadata-names are required');
  console.error('Usage: node discover-metadata-dependencies-cli.js --metadata-type CustomField --metadata-names Contact.Stage__c');
  process.exit(1);
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
  const cacheKey = `${options.metadataType}-${metadataName}`;

  // Check cache first
  if (!options.clearCache) {
    const cached = getCachedDependencies(cacheKey);
    if (cached) {
      return cached;
    }
  }

  console.log(`[Query] Discovering dependencies for ${metadataName}...`);

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

    // Query for dependencies - both directions
    const depQuery = `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency WHERE MetadataComponentId = '${queryId}' OR RefMetadataComponentId = '${queryId}' LIMIT 5000`;

    let aliasArg = '';
    if (options.orgAlias) {
      aliasArg = `--target-org ${options.orgAlias}`;
    }

    const result = execSync(`sf data query --query "${depQuery}" --use-tooling-api --json ${aliasArg}`, { encoding: 'utf8' });
    const data = JSON.parse(result);
    
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
      },
    };

    if (data.result && data.result.records) {
      const records = data.result.records;
      console.log(`[Query] Found ${records.length} dependency records`);
      
      // Process records to separate incoming (usage) and outgoing (dependencies)
      records.forEach((record, index) => {
        if (record.MetadataComponentId === queryId) {
          // This record shows what we (metadataName) depend on
          const depType = record.RefMetadataComponentType;
          if (!dependencies.dependencyTree[depType]) {
            dependencies.dependencyTree[depType] = [];
          }
          dependencies.dependencyTree[depType].push({
            name: record.RefMetadataComponentName,
            type: depType,
            id: record.RefMetadataComponentId,
          });
        } else if (record.RefMetadataComponentId === queryId) {
          // This record shows what uses us (metadataName)
          const usageType = record.MetadataComponentType;
          if (!dependencies.usageTree[usageType]) {
            dependencies.usageTree[usageType] = [];
          }
          dependencies.usageTree[usageType].push({
            name: record.MetadataComponentName,
            type: usageType,
            id: record.MetadataComponentId,
          });
        }
      });

      // Update stats based on actual tree content
      Object.values(dependencies.usageTree).forEach(items => {
        dependencies.stats.usage += items.length;
      });
      Object.values(dependencies.dependencyTree).forEach(items => {
        dependencies.stats.dependencies += items.length;
      });
      
      console.log(`[Query] Processed - Usage: ${dependencies.stats.usage}, Dependencies: ${dependencies.stats.dependencies}`);
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
    };
  }
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

    const allResults = [];
    for (const metadataName of options.metadataNames) {
      const dependencies = queryDependencies(metadataName);
      allResults.push(dependencies);
    }

    const output = {
      query: {
        metadataType: options.metadataType,
        metadataNames: options.metadataNames,
        direction: options.direction,
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
