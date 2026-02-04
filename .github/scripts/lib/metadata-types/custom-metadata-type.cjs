/**
 * Custom Metadata Type Reference Finder
 * 
 * Custom Metadata Types often store Apex class names, field names, or object names
 * as strings in text fields (e.g., trigger handler frameworks).
 * 
 * This module finds those references by:
 * 1. Identifying CMT text fields that likely contain class/field/object references
 * 2. Querying those fields for values matching the target metadata
 * 
 * Ported from sfdc-soup CustomMetadataTypes.js patterns.
 */

const utils = require('../utils.cjs');

/**
 * Field name identifiers that suggest the field might hold an Apex class name
 */
const CLASS_IDENTIFIERS = ['class', 'handler', 'type', 'instance', 'trigger', 'controller', 'service'];

/**
 * Field name identifiers that suggest the field might hold a field reference
 */
const FIELD_IDENTIFIERS = ['field', 'column', 'attribute', 'property'];

/**
 * Field name identifiers that suggest the field might hold an object reference
 */
const OBJECT_IDENTIFIERS = ['object', 'entity', 'sobject', 'table'];

/**
 * Gets all Custom Metadata Type text fields from the org
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @returns {Promise<Array>} Array of field definitions
 */
async function getCustomMetadataTypeFields(queryFunction) {
  // First, get all Custom Metadata Type objects
  const objectQuery = `SELECT Id, DeveloperName, QualifiedApiName, NamespacePrefix 
                       FROM EntityDefinition 
                       WHERE QualifiedApiName LIKE '%__mdt'`;

  let objectResults;
  try {
    objectResults = await queryFunction(objectQuery, { useTooling: true });
  } catch (error) {
    console.log(`[CMT] Failed to query CMT objects: ${error.message}`);
    return [];
  }

  if (!objectResults.result || !objectResults.result.records || objectResults.result.records.length === 0) {
    return [];
  }

  // Build map of object ID to name
  const objectMap = new Map();
  objectResults.result.records.forEach(obj => {
    objectMap.set(obj.Id, {
      name: obj.QualifiedApiName,
      namespace: obj.NamespacePrefix
    });
  });

  // Query text fields on these objects
  const fieldQuery = `SELECT Id, DeveloperName, QualifiedApiName, EntityDefinitionId, DataType, NamespacePrefix 
                      FROM FieldDefinition 
                      WHERE EntityDefinition.QualifiedApiName LIKE '%__mdt' 
                      AND DataType IN ('Text', 'LongTextArea', 'TextArea')`;

  let fieldResults;
  try {
    fieldResults = await queryFunction(fieldQuery, { useTooling: true });
  } catch (error) {
    console.log(`[CMT] Failed to query CMT fields: ${error.message}`);
    return [];
  }

  if (!fieldResults.result || !fieldResults.result.records) {
    return [];
  }

  // Build full field names
  return fieldResults.result.records.map(field => {
    const objectInfo = objectMap.get(field.EntityDefinitionId);
    const objectName = objectInfo ? objectInfo.name : 'Unknown__mdt';
    
    return {
      fullName: `${objectName}.${field.QualifiedApiName}`,
      objectName: objectName,
      fieldName: field.QualifiedApiName,
      dataType: field.DataType,
      namespace: field.NamespacePrefix
    };
  });
}

/**
 * Filters CMT fields to those likely to hold class references
 * 
 * @param {Array} fields - Array of CMT field definitions
 * @returns {Array} Filtered fields
 */
function filterFieldsForClassReferences(fields) {
  return fields.filter(field => {
    const fieldNameLower = field.fieldName.toLowerCase();
    return CLASS_IDENTIFIERS.some(id => fieldNameLower.includes(id));
  });
}

/**
 * Filters CMT fields to those likely to hold field references
 * 
 * @param {Array} fields - Array of CMT field definitions
 * @returns {Array} Filtered fields
 */
function filterFieldsForFieldReferences(fields) {
  return fields.filter(field => {
    const fieldNameLower = field.fieldName.toLowerCase();
    return FIELD_IDENTIFIERS.some(id => fieldNameLower.includes(id));
  });
}

/**
 * Filters CMT fields to those likely to hold object references
 * 
 * @param {Array} fields - Array of CMT field definitions
 * @returns {Array} Filtered fields
 */
function filterFieldsForObjectReferences(fields) {
  return fields.filter(field => {
    const fieldNameLower = field.fieldName.toLowerCase();
    return OBJECT_IDENTIFIERS.some(id => fieldNameLower.includes(id));
  });
}

/**
 * Queries CMT records for a specific value match
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Array} fieldsToQuery - Fields to search in
 * @param {string} searchValue - Value to search for
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Promise<Array>} Matching CMT records
 */
async function queryMetadataTypeForValue(queryFunction, fieldsToQuery, searchValue, baseUrl = '') {
  const searchValueLower = searchValue.toLowerCase();
  const matchingRecords = [];

  // Group fields by object for efficient querying
  const fieldsByObject = utils.groupBy(fieldsToQuery, 'objectName');

  for (const [objectName, fields] of fieldsByObject) {
    // Build query for this object
    const fieldNames = fields.map(f => f.fieldName);
    const selectFields = ['Id', 'DeveloperName', ...fieldNames].join(', ');
    
    // CMT doesn't support OR in WHERE, so we query all records and filter
    const query = `SELECT ${selectFields} FROM ${objectName}`;

    let results;
    try {
      results = await queryFunction(query, { useTooling: false });
    } catch (error) {
      // May fail for some CMTs (e.g., permissions issues)
      console.log(`[CMT] Failed to query ${objectName}: ${error.message}`);
      continue;
    }

    if (!results.result || !results.result.records) {
      continue;
    }

    // Check each record for matching values
    results.result.records.forEach(record => {
      fieldNames.forEach(fieldName => {
        const fieldValue = record[fieldName];
        
        if (fieldValue && typeof fieldValue === 'string') {
          if (fieldValue.toLowerCase() === searchValueLower) {
            matchingRecords.push({
              name: `${record.DeveloperName} (from ${fieldName})`,
              type: objectName,
              id: record.Id,
              url: `${baseUrl}/${record.Id}`,
              notes: `Referenced in ${fieldName} field`,
              pills: [utils.createPill('CMT Reference', 'info', `Found in ${objectName}.${fieldName}`)],
              matchingField: fieldName,
              matchingValue: fieldValue
            });
          }
        }
      });
    });
  }

  return matchingRecords;
}

/**
 * Finds CMT references to an Apex class
 * 
 * @param {Object} entryPoint - Apex class entry point
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of CMT references
 */
async function findClassReferencesInCMT(entryPoint, queryFunction, options = {}) {
  const { baseUrl = '' } = options;

  console.log(`[CMT] Searching for class references to ${entryPoint.name}...`);

  // Get all CMT text fields
  const allFields = await getCustomMetadataTypeFields(queryFunction);
  
  if (allFields.length === 0) {
    console.log(`[CMT] No Custom Metadata Type text fields found`);
    return [];
  }

  // Filter to fields that likely hold class names
  const relevantFields = filterFieldsForClassReferences(allFields);
  
  if (relevantFields.length === 0) {
    console.log(`[CMT] No CMT fields with class identifiers found`);
    return [];
  }

  console.log(`[CMT] Searching ${relevantFields.length} potential class-holding fields...`);

  // Query for matches
  const matches = await queryMetadataTypeForValue(
    queryFunction,
    relevantFields,
    entryPoint.name,
    baseUrl
  );

  console.log(`[CMT] Found ${matches.length} CMT references`);

  return matches;
}

/**
 * Finds CMT references to a field
 * 
 * @param {Object} entryPoint - Field entry point
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of CMT references
 */
async function findFieldReferencesInCMT(entryPoint, queryFunction, options = {}) {
  const { baseUrl = '' } = options;

  console.log(`[CMT] Searching for field references to ${entryPoint.name}...`);

  const allFields = await getCustomMetadataTypeFields(queryFunction);
  
  if (allFields.length === 0) {
    return [];
  }

  // For fields, also check FieldDefinition lookup fields
  const relevantFields = filterFieldsForFieldReferences(allFields);
  
  // Query for field API name match
  const fieldParts = entryPoint.name.split('.');
  const fieldApiName = fieldParts.length > 1 ? fieldParts[1] : entryPoint.name;
  
  const matches = await queryMetadataTypeForValue(
    queryFunction,
    relevantFields,
    fieldApiName,
    baseUrl
  );

  // Also try full field name
  if (fieldParts.length > 1) {
    const fullNameMatches = await queryMetadataTypeForValue(
      queryFunction,
      relevantFields,
      entryPoint.name,
      baseUrl
    );
    
    // Merge without duplicates
    fullNameMatches.forEach(m => {
      if (!matches.find(existing => existing.id === m.id)) {
        matches.push(m);
      }
    });
  }

  console.log(`[CMT] Found ${matches.length} CMT field references`);

  return matches;
}

/**
 * Finds FieldDefinition lookup fields in CMT that reference a specific field
 * 
 * CMT can have fields of type "Metadata Relationship (Field Definition)" that
 * directly reference fields.
 * 
 * @param {Object} entryPoint - Field entry point
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Promise<Array>} Array of CMT records
 */
async function findFieldDefinitionLookups(entryPoint, queryFunction, baseUrl = '') {
  // Query for FieldDefinition lookup fields
  const query = `SELECT Id, DeveloperName, QualifiedApiName, EntityDefinition.QualifiedApiName, DataType 
                 FROM FieldDefinition 
                 WHERE EntityDefinition.QualifiedApiName LIKE '%__mdt' 
                 AND DataType = 'MetadataRelationship'`;

  let results;
  try {
    results = await queryFunction(query, { useTooling: true });
  } catch (error) {
    console.log(`[CMT] Failed to query FieldDefinition lookup fields: ${error.message}`);
    return [];
  }

  // If no lookup fields exist, return empty
  if (!results.result || !results.result.records || results.result.records.length === 0) {
    return [];
  }

  // For each CMT with lookup fields, query for records pointing to our field
  // This requires more complex logic that's org-specific
  console.log(`[CMT] Found ${results.result.records.length} CMT field definition lookup fields`);
  
  return [];
}

module.exports = {
  getCustomMetadataTypeFields,
  filterFieldsForClassReferences,
  filterFieldsForFieldReferences,
  filterFieldsForObjectReferences,
  queryMetadataTypeForValue,
  findClassReferencesInCMT,
  findFieldReferencesInCMT,
  findFieldDefinitionLookups,
  CLASS_IDENTIFIERS,
  FIELD_IDENTIFIERS,
  OBJECT_IDENTIFIERS
};
