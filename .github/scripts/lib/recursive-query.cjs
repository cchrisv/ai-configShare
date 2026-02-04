/**
 * Recursive Dependency Query Engine
 * 
 * Provides full recursive traversal of Salesforce metadata dependencies
 * with cycle detection and depth limiting. Ported from sfdc-soup patterns.
 */

const utils = require('./utils.cjs');

/**
 * Creates a recursive dependency query engine
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @param {number} options.maxDepth - Maximum recursion depth (default: 5)
 * @param {string} options.baseUrl - Salesforce instance URL for building links
 * @returns {Object} Query engine with exec and getResults methods
 */
function createRecursiveDependencyQuery(queryFunction, options = {}) {
  const {
    maxDepth = 5,
    baseUrl = ''
  } = options;

  const result = [];
  const idsAlreadyQueried = new Set();
  let currentDepth = 0;

  /**
   * Builds the MetadataComponentDependency query
   * 
   * @param {string|string[]} metadataIds - IDs to query dependencies for
   * @returns {string} SOQL query string
   */
  function createDependencyQuery(metadataIds) {
    const ids = utils.filterableId(
      Array.isArray(metadataIds) ? metadataIds : [metadataIds]
    );

    return `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, 
            MetadataComponentNamespace, RefMetadataComponentName, RefMetadataComponentType, 
            RefMetadataComponentId, RefMetadataComponentNamespace 
            FROM MetadataComponentDependency 
            WHERE MetadataComponentId IN ('${ids}') 
            AND MetadataComponentType != 'FlexiPage' 
            ORDER BY MetadataComponentName, RefMetadataComponentType`;
  }

  /**
   * Simplifies raw dependency records into a consistent format
   * 
   * @param {Object} rawResults - Raw query results
   * @returns {Array} Simplified dependency objects
   */
  function simplifyResults(rawResults) {
    if (!rawResults.result || !rawResults.result.records) {
      return [];
    }

    const dependencies = rawResults.result.records.map(dep => {
      const simplified = {
        name: dep.RefMetadataComponentName,
        type: dep.RefMetadataComponentType,
        id: dep.RefMetadataComponentId,
        repeated: false,
        url: `${baseUrl}/${dep.RefMetadataComponentId}`,
        notes: null,
        namespace: dep.RefMetadataComponentNamespace || null,
        pills: [],
        referencedBy: {
          name: dep.MetadataComponentName,
          id: dep.MetadataComponentId,
          type: dep.MetadataComponentType
        }
      };

      // Add namespace pill if from managed package
      if (simplified.namespace) {
        simplified.pills.push(utils.createPill(
          simplified.namespace,
          'standard',
          'Managed Package'
        ));
      }

      // Add dynamic reference note
      if (utils.isDynamicReference(simplified)) {
        simplified.notes = 'This entity is dynamically referenced. Its value can only be determined at run time.';
        simplified.url = baseUrl;
      }

      return simplified;
    });

    // Filter out standard entities (available in any org)
    return dependencies.filter(dep => dep.type !== 'StandardEntity');
  }

  /**
   * Executes the recursive dependency query
   * 
   * @param {string|string[]} ids - Initial metadata IDs to query
   * @returns {Promise<void>}
   */
  async function exec(ids) {
    // Convert to array if needed
    const idArray = Array.isArray(ids) ? ids : [ids];
    
    // Track queried IDs
    idArray.forEach(id => idsAlreadyQueried.add(id));

    // Check depth limit
    if (currentDepth >= maxDepth) {
      console.log(`[RecursiveQuery] Max depth ${maxDepth} reached, stopping recursion`);
      return;
    }

    currentDepth++;

    // Build and execute query
    const query = createDependencyQuery(idArray);
    let rawResults;
    
    try {
      rawResults = await queryFunction(query, { useTooling: true });
    } catch (error) {
      console.log(`[RecursiveQuery] Query failed: ${error.message}`);
      return;
    }

    const dependencies = simplifyResults(rawResults);
    console.log(`[RecursiveQuery] Depth ${currentDepth}: Found ${dependencies.length} dependencies`);

    // Determine next level IDs
    const nextLevelIds = [];

    dependencies.forEach(dep => {
      const alreadyQueried = idsAlreadyQueried.has(dep.id);

      // Always add to results (even if repeated, to show the reference)
      result.push(dep);

      if (alreadyQueried) {
        // Mark as repeated to prevent infinite loops in tree display
        dep.repeated = true;
      } else {
        // Only recurse into non-dynamic references
        if (!utils.isDynamicReference(dep)) {
          nextLevelIds.push(dep.id);
        }
      }
    });

    // Recurse if there are more IDs to query
    if (nextLevelIds.length > 0) {
      await exec(nextLevelIds);
    }
  }

  /**
   * Returns all collected dependencies
   * 
   * @returns {Array} All dependencies found
   */
  function getResults() {
    return result;
  }

  /**
   * Returns statistics about the query
   * 
   * @returns {Object} Query statistics
   */
  function getStats() {
    const stats = {};
    
    // Filter out repeated items for stats
    const uniqueDeps = result.filter(dep => !dep.repeated);
    
    uniqueDeps.forEach(dep => {
      if (stats[dep.type]) {
        stats[dep.type]++;
      } else {
        stats[dep.type] = 1;
      }
    });

    return stats;
  }

  /**
   * Gets the maximum depth reached during query
   * 
   * @returns {number} Maximum depth reached
   */
  function getMaxDepthReached() {
    return currentDepth;
  }

  /**
   * Resets the query engine for reuse
   */
  function reset() {
    result.length = 0;
    idsAlreadyQueried.clear();
    currentDepth = 0;
  }

  return {
    exec,
    getResults,
    getStats,
    getMaxDepthReached,
    reset
  };
}

/**
 * Creates a recursive usage query engine (reverse direction)
 * Finds what uses a given metadata component
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Object} Query engine with exec and getResults methods
 */
function createRecursiveUsageQuery(queryFunction, options = {}) {
  const {
    maxDepth = 3,
    baseUrl = ''
  } = options;

  const result = [];
  const idsAlreadyQueried = new Set();
  let currentDepth = 0;

  /**
   * Builds the usage query (reverse of dependency query)
   * 
   * @param {string|string[]} metadataIds - IDs to find usage for
   * @returns {string} SOQL query string
   */
  function createUsageQuery(metadataIds) {
    const ids = utils.filterableId(
      Array.isArray(metadataIds) ? metadataIds : [metadataIds]
    );

    return `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType,
            MetadataComponentNamespace, RefMetadataComponentName, RefMetadataComponentType, 
            RefMetadataComponentId, RefMetadataComponentNamespace 
            FROM MetadataComponentDependency 
            WHERE RefMetadataComponentId IN ('${ids}') 
            ORDER BY MetadataComponentType`;
  }

  /**
   * Simplifies raw usage records
   * 
   * @param {Object} rawResults - Raw query results
   * @returns {Array} Simplified usage objects
   */
  function simplifyResults(rawResults) {
    if (!rawResults.result || !rawResults.result.records) {
      return [];
    }

    return rawResults.result.records.map(record => ({
      name: record.MetadataComponentName,
      type: record.MetadataComponentType,
      id: record.MetadataComponentId,
      url: `${baseUrl}/${record.MetadataComponentId}`,
      notes: null,
      namespace: record.MetadataComponentNamespace || null,
      pills: [],
      sortOrder: null
    }));
  }

  async function exec(ids) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    idArray.forEach(id => idsAlreadyQueried.add(id));

    if (currentDepth >= maxDepth) {
      return;
    }

    currentDepth++;

    const query = createUsageQuery(idArray);
    let rawResults;

    try {
      rawResults = await queryFunction(query, { useTooling: true });
    } catch (error) {
      console.log(`[RecursiveUsage] Query failed: ${error.message}`);
      return;
    }

    const usages = simplifyResults(rawResults);
    console.log(`[RecursiveUsage] Depth ${currentDepth}: Found ${usages.length} usages`);

    usages.forEach(usage => {
      if (!idsAlreadyQueried.has(usage.id)) {
        result.push(usage);
      }
    });
  }

  function getResults() {
    return result;
  }

  function getStats() {
    const stats = {};
    result.forEach(item => {
      stats[item.type] = (stats[item.type] || 0) + 1;
    });
    return stats;
  }

  function reset() {
    result.length = 0;
    idsAlreadyQueried.clear();
    currentDepth = 0;
  }

  return {
    exec,
    getResults,
    getStats,
    reset
  };
}

/**
 * Creates a dependency tree structure from flat dependency array
 * 
 * @param {Array} dependencies - Flat array of dependencies
 * @param {Object} entryPoint - The entry point metadata object
 * @returns {Object} Tree structure with nested references
 */
function createDependencyTree(dependencies, entryPoint) {
  // Group dependencies by their "referencedBy" to build tree
  const byReferencer = new Map();

  dependencies.forEach(dep => {
    if (dep.referencedBy) {
      const key = dep.referencedBy.id;
      if (!byReferencer.has(key)) {
        byReferencer.set(key, []);
      }
      byReferencer.get(key).push(dep);
    }
  });

  // Build tree recursively
  function buildNode(itemId, itemName) {
    const children = byReferencer.get(itemId) || [];
    
    if (children.length === 0) {
      return null;
    }

    // Group children by type
    const references = {};
    children.forEach(child => {
      if (!references[child.type]) {
        references[child.type] = [];
      }
      
      const childNode = {
        name: child.name,
        type: child.type,
        id: child.id,
        repeated: child.repeated,
        url: child.url,
        notes: child.notes,
        namespace: child.namespace,
        pills: child.pills
      };

      // Recursively add children's references
      if (!child.repeated) {
        const childRefs = buildNode(child.id, child.name);
        if (childRefs) {
          childNode.references = childRefs;
        }
      }

      references[child.type].push(childNode);
    });

    return references;
  }

  // Start from entry point
  const tree = {};
  tree[entryPoint.name] = {
    references: buildNode(entryPoint.id, entryPoint.name) || {}
  };

  return tree;
}

/**
 * Creates a usage tree structure from flat usage array
 * 
 * @param {Array} usages - Flat array of usage records
 * @returns {Object} Tree grouped by metadata type
 */
function createUsageTree(usages) {
  const tree = {};

  usages.forEach(usage => {
    if (!tree[usage.type]) {
      tree[usage.type] = [];
    }
    tree[usage.type].push(usage);
  });

  return tree;
}

module.exports = {
  createRecursiveDependencyQuery,
  createRecursiveUsageQuery,
  createDependencyTree,
  createUsageTree
};
