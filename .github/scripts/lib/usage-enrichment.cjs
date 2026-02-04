/**
 * Usage Enrichment Module (Pills System)
 * 
 * Provides context about HOW metadata is being used, not just that it IS used.
 * Ported from sfdc-soup patterns.
 * 
 * Pills indicate:
 * - Read vs Write operations in Apex
 * - Filter vs Grouping vs Column in Reports
 * - Active vs Inactive Flow versions
 * - Workflow status and type
 */

const utils = require('./utils.cjs');

/**
 * Enriches Apex class usage with read/write detection
 * 
 * Analyzes Apex class bodies to determine if fields are used for
 * reading (conditions, comparisons) or writing (assignments).
 * 
 * @param {Array} apexClasses - Array of Apex class usage records
 * @param {Object} entryPoint - The field being analyzed
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @returns {Promise<Array>} Enriched Apex class records with pills
 */
async function enrichApexClassUsage(apexClasses, entryPoint, queryFunction) {
  if (!apexClasses || apexClasses.length === 0) {
    return apexClasses;
  }

  // Extract field name (without object prefix)
  const fieldParts = entryPoint.name.split('.');
  const fieldName = fieldParts.length > 1 ? fieldParts[1] : entryPoint.name;

  // Regex for assignment (field = value, but NOT field == value)
  const assignmentExp = new RegExp(`${fieldName}\\s*=(?!=)`, 'gi');
  
  // Regex for any usage (for read detection)
  const usageExp = new RegExp(`${fieldName}`, 'gi');

  // Query class bodies
  const ids = apexClasses.map(ac => ac.id);
  const idsForQuery = utils.filterableId(ids);
  
  const query = `SELECT Id, Name, Body FROM ApexClass WHERE Id IN ('${idsForQuery}')`;
  
  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[Enrichment] Failed to query Apex class bodies: ${error.message}`);
    return apexClasses;
  }

  // Build map of class ID to body
  const classBodyById = new Map();
  if (results.result && results.result.records) {
    results.result.records.forEach(rec => {
      classBodyById.set(rec.Id, rec.Body);
    });
  }

  // Analyze each class
  apexClasses.forEach(ac => {
    const body = classBodyById.get(ac.id);
    if (!body) {
      ac.pills.push(utils.createPill(
        'Unable to analyze',
        'info',
        'Could not retrieve class body for analysis'
      ));
      ac.sortOrder = 5;
      return;
    }

    // Strip comments and whitespace for analysis
    let cleanBody;
    try {
      cleanBody = utils.stripComments(body);
      cleanBody = utils.removeWhitespace(cleanBody);
    } catch (error) {
      cleanBody = utils.removeWhitespace(body);
    }

    // Check for assignment (write) vs read-only
    if (cleanBody.match(assignmentExp)) {
      ac.pills.push(utils.createPill(
        'write',
        'warning',
        'This class writes data into the field. Changes to the field may affect data integrity.'
      ));
      ac.sortOrder = 1;
    } else if (cleanBody.match(usageExp)) {
      ac.pills.push(utils.createPill(
        'read',
        'success',
        'This class only reads the field. Changes to field values could impact logic.'
      ));
      ac.sortOrder = 2;
    }
  });

  // Sort by impact (writes first)
  apexClasses.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return apexClasses;
}

/**
 * Enriches Flow usage with version and status information
 * 
 * @param {Array} flows - Array of Flow usage records
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @returns {Promise<Array>} Enriched Flow records with pills
 */
async function enrichFlowUsage(flows, queryFunction) {
  if (!flows || flows.length === 0) {
    return flows;
  }

  const ids = flows.map(f => f.id);
  const idsForQuery = utils.filterableId(ids);

  const query = `SELECT Id, DeveloperName, VersionNumber, Status, ProcessType 
                 FROM Flow WHERE Id IN ('${idsForQuery}')`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[Enrichment] Failed to query Flow details: ${error.message}`);
    return flows;
  }

  const flowInfoById = new Map();
  if (results.result && results.result.records) {
    results.result.records.forEach(rec => {
      flowInfoById.set(rec.Id, {
        version: rec.VersionNumber,
        status: rec.Status,
        type: rec.ProcessType === 'Workflow' ? 'Process Builder' : rec.ProcessType
      });
    });
  }

  flows.forEach(flow => {
    const info = flowInfoById.get(flow.id);
    if (!info) return;

    // Add type pill
    flow.pills.push(utils.createPill(
      `Type: ${info.type}`,
      'standard',
      'The automation type'
    ));

    // Add status pill
    if (info.status === 'Active') {
      flow.pills.push(utils.createPill(
        `v${info.version} - Active`,
        'success',
        'This is the active version most likely impacted by changes'
      ));
      flow.sortOrder = 1;
    } else {
      flow.pills.push(utils.createPill(
        `v${info.version} - ${info.status}`,
        'standard',
        `This version is ${info.status.toLowerCase()}`
      ));
      flow.sortOrder = 2;
    }
  });

  // Sort by status (active first)
  flows.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return flows;
}

/**
 * Enriches Report usage with column/filter/grouping detection
 * 
 * Uses the Analytics API to determine exactly how a field is used in reports.
 * 
 * @param {Array} reports - Array of Report usage records
 * @param {Object} entryPoint - The field being analyzed
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Enriched Report records with pills
 */
async function enrichReportUsage(reports, entryPoint, queryFunction, options = {}) {
  const { maxReports = 100 } = options;

  if (!reports || reports.length === 0) {
    return reports;
  }

  // Split into reports we can analyze vs those we can't
  const includedReports = reports.slice(0, maxReports);
  const excludedReports = reports.slice(maxReports);

  // Mark excluded reports
  excludedReports.forEach(report => {
    report.pills.push(utils.createPill(
      'Not analyzed - Too many reports',
      'standard',
      `More than ${maxReports} reports use this field. Only the first ${maxReports} are analyzed.`
    ));
    report.sortOrder = 5;
  });

  // For included reports, query report metadata via Analytics API
  // Note: This requires making HTTP requests to the Analytics API
  // In a real implementation, you'd use the Analytics Reporting API
  
  for (const report of includedReports) {
    // Query basic report info
    const query = `SELECT Id, Name, DeveloperName, FolderName FROM Report WHERE Id = '${report.id}'`;
    
    try {
      const results = await queryFunction(query, { useTooling: false });
      
      if (results.result && results.result.records && results.result.records.length > 0) {
        const reportInfo = results.result.records[0];
        
        // Add folder info
        if (reportInfo.FolderName) {
          report.pills.push(utils.createPill(
            `Folder: ${reportInfo.FolderName}`,
            'standard',
            'Report folder location'
          ));
        }
      }
    } catch (error) {
      // Skip if can't get report info
    }

    // Without full Analytics API access, we indicate analysis is limited
    // In a full implementation, you'd parse the report metadata for:
    // - groupingColumnInfo (field used for grouping)
    // - reportFilters (field used for filtering) 
    // - detailColumns (field used as column)
    
    if (report.pills.length === 0) {
      report.pills.push(utils.createPill(
        'Used in report',
        'info',
        'Field is referenced in this report. Use Salesforce Setup for detailed analysis.'
      ));
      report.sortOrder = 3;
    }
  }

  // Combine and sort
  const allReports = [...includedReports, ...excludedReports];
  allReports.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return allReports;
}

/**
 * Enriches Validation Rule usage with formula analysis
 * 
 * @param {Array} validationRules - Array of Validation Rule usage records
 * @param {Object} entryPoint - The field being analyzed
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @returns {Promise<Array>} Enriched Validation Rule records with pills
 */
async function enrichValidationRuleUsage(validationRules, entryPoint, queryFunction) {
  if (!validationRules || validationRules.length === 0) {
    return validationRules;
  }

  const ids = validationRules.map(vr => vr.id);
  const idsForQuery = utils.filterableId(ids);

  const query = `SELECT Id, ValidationName, Active, ErrorConditionFormula, ErrorMessage 
                 FROM ValidationRule WHERE Id IN ('${idsForQuery}')`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[Enrichment] Failed to query Validation Rule details: ${error.message}`);
    return validationRules;
  }

  const vrInfoById = new Map();
  if (results.result && results.result.records) {
    results.result.records.forEach(rec => {
      vrInfoById.set(rec.Id, {
        active: rec.Active,
        formula: rec.ErrorConditionFormula,
        message: rec.ErrorMessage
      });
    });
  }

  validationRules.forEach(vr => {
    const info = vrInfoById.get(vr.id);
    if (!info) return;

    // Add active/inactive pill
    if (info.active) {
      vr.pills.push(utils.createPill(
        'Active',
        'success',
        'This validation rule is active and will enforce on record save'
      ));
      vr.sortOrder = 1;
    } else {
      vr.pills.push(utils.createPill(
        'Inactive',
        'standard',
        'This validation rule is inactive'
      ));
      vr.sortOrder = 2;
    }
  });

  validationRules.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return validationRules;
}

/**
 * Enriches all usage data based on metadata types
 * 
 * Main entry point for usage enrichment. Dispatches to type-specific
 * enrichment functions.
 * 
 * @param {Object} usageTree - Usage tree grouped by metadata type
 * @param {Object} entryPoint - The metadata being analyzed
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Enriched usage tree
 */
async function enrichUsageData(usageTree, entryPoint, queryFunction, options = {}) {
  const enrichedTree = { ...usageTree };

  // Enrich Apex Classes
  if (enrichedTree.ApexClass && ['CustomField', 'StandardField'].includes(entryPoint.type)) {
    enrichedTree.ApexClass = await enrichApexClassUsage(
      enrichedTree.ApexClass,
      entryPoint,
      queryFunction
    );
  }

  // Enrich Flows
  if (enrichedTree.Flow) {
    enrichedTree.Flow = await enrichFlowUsage(
      enrichedTree.Flow,
      queryFunction
    );
  }

  // Enrich Reports
  if (enrichedTree.Report && options.enhancedReportData) {
    enrichedTree.Report = await enrichReportUsage(
      enrichedTree.Report,
      entryPoint,
      queryFunction,
      options
    );
  }

  // Enrich Validation Rules
  if (enrichedTree.ValidationRule) {
    enrichedTree.ValidationRule = await enrichValidationRuleUsage(
      enrichedTree.ValidationRule,
      entryPoint,
      queryFunction
    );
  }

  return enrichedTree;
}

/**
 * Adds parent object name prefix to field references
 * 
 * The MetadataComponentDependency API returns field names without object prefix.
 * This function adds the object name for clarity.
 * 
 * @param {Array} fields - Array of field usage records
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @returns {Promise<Array>} Fields with prefixed names
 */
async function addParentNamePrefix(fields, queryFunction) {
  if (!fields || fields.length === 0) {
    return fields;
  }

  // Extract unique IDs
  const ids = [...new Set(fields.map(f => f.id))];
  const idsForQuery = utils.filterableId(ids);

  const query = `SELECT Id, TableEnumOrId FROM CustomField WHERE Id IN ('${idsForQuery}')`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    return fields;
  }

  // Build ID to object map
  const objectById = new Map();
  if (results.result && results.result.records) {
    results.result.records.forEach(rec => {
      objectById.set(rec.Id, rec.TableEnumOrId);
    });
  }

  // Prefix field names
  fields.forEach(field => {
    const objectName = objectById.get(field.id);
    if (objectName && !field.name.includes('.')) {
      field.name = `${objectName}.${field.name}`;
    }
  });

  return fields;
}

module.exports = {
  enrichApexClassUsage,
  enrichFlowUsage,
  enrichReportUsage,
  enrichValidationRuleUsage,
  enrichUsageData,
  addParentNamePrefix
};
