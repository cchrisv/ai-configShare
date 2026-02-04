/**
 * Standard Field Reference Finder
 * 
 * The MetadataComponentDependency API does not track references to standard fields.
 * This module manually finds those references by:
 * 1. Querying all metadata that references the parent object
 * 2. Retrieving the code/XML of each component
 * 3. Parsing for field name matches
 * 
 * Ported from sfdc-soup StandardField.js patterns.
 */

const utils = require('../utils.cjs');

/**
 * Finds all references to a standard field
 * 
 * @param {Object} entryPoint - Standard field entry point { name, type, id }
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of metadata references
 */
async function findStandardFieldReferences(entryPoint, queryFunction, options = {}) {
  const { baseUrl = '' } = options;

  // Parse object and field from name (e.g., "Account.Industry")
  const { objectName, fieldName } = utils.parseFieldName(entryPoint.name);
  
  if (!objectName || !fieldName) {
    console.log(`[StandardField] Invalid field name format: ${entryPoint.name}`);
    return [];
  }

  console.log(`[StandardField] Searching for references to ${objectName}.${fieldName}`);

  // Step 1: Get all metadata referencing the parent object
  const metadataUsingObject = await queryDependenciesByObjectName(objectName, queryFunction, baseUrl);
  console.log(`[StandardField] Found ${metadataUsingObject.length} components referencing ${objectName}`);

  // Step 2: Group by type for efficient processing
  const byType = utils.groupBy(metadataUsingObject, 'type');

  // Step 3: Search for field in each component's code/XML
  const references = [];

  for (const [metadataType, members] of byType) {
    const codeField = utils.getCodeBasedField(metadataType);
    
    if (codeField) {
      console.log(`[StandardField] Searching ${members.length} ${metadataType} components...`);
      
      const matches = await searchFieldInCode({
        members,
        fieldName,
        codeField,
        metadataType,
        queryFunction,
        baseUrl
      });
      
      references.push(...matches);
    }
  }

  console.log(`[StandardField] Found ${references.length} total references to ${fieldName}`);

  return references;
}

/**
 * Queries all metadata that depends on a specific object
 * 
 * @param {string} objectName - Object API name
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Promise<Array>} Array of dependent metadata
 */
async function queryDependenciesByObjectName(objectName, queryFunction, baseUrl) {
  const query = `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType,
                 MetadataComponentNamespace, RefMetadataComponentName, RefMetadataComponentType, 
                 RefMetadataComponentId, RefMetadataComponentNamespace 
                 FROM MetadataComponentDependency 
                 WHERE RefMetadataComponentId = '${objectName}' 
                 ORDER BY MetadataComponentType`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[StandardField] Failed to query dependencies: ${error.message}`);
    return [];
  }

  if (!results.result || !results.result.records) {
    return [];
  }

  return results.result.records.map(record => ({
    name: record.MetadataComponentName,
    type: record.MetadataComponentType,
    id: record.MetadataComponentId,
    url: `${baseUrl}/${record.MetadataComponentId}`,
    namespace: record.MetadataComponentNamespace || null
  }));
}

/**
 * Searches for a field reference in component code/XML
 * 
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Array of matching references
 */
async function searchFieldInCode({ members, fieldName, codeField, metadataType, queryFunction, baseUrl }) {
  const fieldRegex = new RegExp(fieldName, 'gi');
  const references = [];

  // Batch query the code content
  const ids = members.map(m => m.id);
  const idsForQuery = utils.filterableId(ids);

  const query = `SELECT Id, ${codeField}, NamespacePrefix FROM ${metadataType} WHERE Id IN ('${idsForQuery}')`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[StandardField] Failed to query ${metadataType} content: ${error.message}`);
    return references;
  }

  if (!results.result || !results.result.records) {
    return references;
  }

  // Build map of ID to content
  const contentById = new Map();
  results.result.records.forEach(rec => {
    contentById.set(rec.Id, rec[codeField]);
  });

  // Search each component
  for (const member of members) {
    const content = contentById.get(member.id);
    
    if (!content) continue;

    // Clean content for analysis
    let cleanContent;
    try {
      cleanContent = utils.stripComments(content);
      cleanContent = utils.removeWhitespace(cleanContent);
    } catch (error) {
      cleanContent = utils.removeWhitespace(content);
    }

    // Check for field match
    if (cleanContent.match(fieldRegex)) {
      references.push({
        name: member.name,
        type: metadataType,
        id: member.id,
        url: `${baseUrl}/${member.id}`,
        notes: null,
        namespace: member.namespace,
        pills: [],
        standardFieldReference: true
      });
    }
  }

  return references;
}

/**
 * Finds workflow field updates for a standard field
 * 
 * @param {string} objectName - Object API name
 * @param {string} fullFieldName - Full field name (Object.Field)
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Promise<Array>} Array of workflow field updates
 */
async function findWorkflowFieldUpdates(objectName, fullFieldName, queryFunction, baseUrl) {
  const query = `SELECT Id, Name, FieldDefinitionId FROM WorkflowFieldUpdate 
                 WHERE EntityDefinitionId = '${objectName}'`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[StandardField] Failed to query workflow field updates: ${error.message}`);
    return [];
  }

  if (!results.result || !results.result.records) {
    return [];
  }

  // Filter to those updating our field
  const fieldParts = fullFieldName.split('.');
  const fieldName = fieldParts.length > 1 ? fieldParts[1] : fullFieldName;

  return results.result.records
    .filter(rec => {
      // FieldDefinitionId format varies, check for field name match
      return rec.FieldDefinitionId && rec.FieldDefinitionId.toLowerCase().includes(fieldName.toLowerCase());
    })
    .map(rec => ({
      name: rec.Name,
      type: 'WorkflowFieldUpdate',
      id: rec.Id,
      url: `${baseUrl}/${rec.Id}`,
      notes: 'Updates this field via workflow',
      pills: [utils.createPill('Field Update', 'warning', 'This workflow updates the field value')]
    }));
}

/**
 * Finds validation rules that reference a standard field
 * 
 * @param {string} objectName - Object API name
 * @param {string} fieldName - Field name
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Promise<Array>} Array of validation rules
 */
async function findValidationRules(objectName, fieldName, queryFunction, baseUrl) {
  const query = `SELECT Id, ValidationName, Active, ErrorConditionFormula 
                 FROM ValidationRule 
                 WHERE EntityDefinitionId = '${objectName}'`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[StandardField] Failed to query validation rules: ${error.message}`);
    return [];
  }

  if (!results.result || !results.result.records) {
    return [];
  }

  const fieldRegex = new RegExp(fieldName, 'gi');

  return results.result.records
    .filter(rec => rec.ErrorConditionFormula && rec.ErrorConditionFormula.match(fieldRegex))
    .map(rec => ({
      name: rec.ValidationName,
      type: 'ValidationRule',
      id: rec.Id,
      url: `${baseUrl}/${rec.Id}`,
      notes: null,
      pills: [
        rec.Active
          ? utils.createPill('Active', 'success', 'Validation rule is active')
          : utils.createPill('Inactive', 'standard', 'Validation rule is inactive')
      ]
    }));
}

/**
 * Metadata types that require custom code-based search for standard fields
 */
const SEARCHABLE_TYPES = [
  'ApexClass',
  'ApexTrigger',
  'ApexPage',
  'Flow',
  'ValidationRule',
  'WorkflowRule'
];

/**
 * Checks if a type requires custom standard field search
 * 
 * @param {string} type - Metadata type
 * @returns {boolean} True if custom search is needed
 */
function requiresCustomSearch(type) {
  return SEARCHABLE_TYPES.includes(type);
}

module.exports = {
  findStandardFieldReferences,
  queryDependenciesByObjectName,
  searchFieldInCode,
  findWorkflowFieldUpdates,
  findValidationRules,
  requiresCustomSearch,
  SEARCHABLE_TYPES
};
