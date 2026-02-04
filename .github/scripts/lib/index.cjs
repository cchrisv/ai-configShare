/**
 * Dependency Analysis Library
 * 
 * Enhanced metadata dependency discovery modules ported from sfdc-soup patterns.
 * 
 * @module lib
 */

const utils = require('./utils.cjs');
const recursiveQuery = require('./recursive-query.cjs');
const usageEnrichment = require('./usage-enrichment.cjs');
const standardField = require('./metadata-types/standard-field.cjs');
const customMetadataType = require('./metadata-types/custom-metadata-type.cjs');
const workflowAnalysis = require('./metadata-types/workflow-analysis.cjs');

module.exports = {
  // Core utilities
  utils,
  
  // Recursive query engine
  recursiveQuery,
  createRecursiveDependencyQuery: recursiveQuery.createRecursiveDependencyQuery,
  createRecursiveUsageQuery: recursiveQuery.createRecursiveUsageQuery,
  createDependencyTree: recursiveQuery.createDependencyTree,
  createUsageTree: recursiveQuery.createUsageTree,
  
  // Usage enrichment (pills)
  usageEnrichment,
  enrichUsageData: usageEnrichment.enrichUsageData,
  enrichDependencyData: usageEnrichment.enrichDependencyData,
  
  // Extended type support
  metadataTypes: {
    standardField,
    customMetadataType,
    workflowAnalysis
  }
};
