/**
 * Utility functions for Salesforce metadata dependency analysis
 * Ported and adapted from sfdc-soup patterns
 */

/**
 * Detects if a dependency reference is dynamic (only known at runtime)
 * 
 * The MetadataComponentDependency API returns references to objects that are only 
 * known at run time. For example, a test class that queries the Profile object.
 * You can tell a reference is dynamic if the id is exactly the same as the name.
 * 
 * @param {Object} dep - Dependency object with name and id properties
 * @returns {boolean} True if this is a dynamic reference
 */
function isDynamicReference(dep) {
  const { name, id } = dep;

  if (name && id) {
    const nameLower = name.toLowerCase();
    const idLower = id.toLowerCase();
    if (idLower === nameLower) {
      return true;
    }
  }

  return false;
}

/**
 * Formats IDs for use in SOQL IN clauses
 * Joins array of IDs with quotes for filtering
 * 
 * @param {string|string[]} ids - Single ID or array of IDs
 * @returns {string} Formatted string for SOQL IN clause
 */
function filterableId(ids) {
  if (Array.isArray(ids)) {
    return ids.join("','");
  }
  return ids;
}

/**
 * Groups an array of objects by a key property
 * 
 * @param {Array} array - Array of objects to group
 * @param {string} key - Property name to group by
 * @returns {Map} Map of key values to arrays of matching objects
 */
function groupBy(array, key) {
  const map = new Map();
  
  array.forEach(item => {
    const keyValue = item[key];
    if (map.has(keyValue)) {
      map.get(keyValue).push(item);
    } else {
      map.set(keyValue, [item]);
    }
  });
  
  return map;
}

/**
 * Returns the code-containing field name for a given metadata type
 * Used to determine which field contains parseable code/markup
 * 
 * @param {string} metadataType - The metadata type name
 * @returns {string|null} The field name containing code, or null if not applicable
 */
function getCodeBasedField(metadataType) {
  const codeFields = {
    'ApexClass': 'Body',
    'ApexTrigger': 'Body',
    'ApexPage': 'Markup',
    'ApexComponent': 'Markup',
    'AuraDefinitionBundle': 'Source',
    'LightningComponentBundle': 'Source',
    'Flow': 'Metadata',
    'FlowDefinition': 'Metadata',
    'EmailTemplate': 'Body',
    'ValidationRule': 'ErrorConditionFormula',
    'WorkflowRule': 'Formula'
  };

  return codeFields[metadataType] || null;
}

/**
 * Strips comments from code to prevent false positives in analysis
 * Handles both single-line (//) and multi-line (/* *\/) comments
 * 
 * @param {string} code - Source code with potential comments
 * @returns {string} Code with comments removed
 */
function stripComments(code) {
  if (!code) return '';
  
  // Remove multi-line comments
  let stripped = code.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove single-line comments
  stripped = stripped.replace(/\/\/.*$/gm, '');
  
  return stripped;
}

/**
 * Removes all whitespace from a string for pattern matching
 * 
 * @param {string} str - String to process
 * @returns {string} String with all whitespace removed
 */
function removeWhitespace(str) {
  if (!str) return '';
  return str.replace(/\s/g, '');
}

/**
 * Finds all values for a given key in a nested object structure
 * Useful for finding all references to a specific property in Flow metadata
 * 
 * @param {Object} obj - Object to search
 * @param {string} key - Key to find values for
 * @returns {Array} Array of all values found for the key
 */
function findAllValuesByKey(obj, key) {
  const values = [];
  
  function search(current) {
    if (current === null || current === undefined) return;
    
    if (typeof current === 'object') {
      if (Array.isArray(current)) {
        current.forEach(item => search(item));
      } else {
        Object.keys(current).forEach(k => {
          if (k === key) {
            values.push(current[k]);
          }
          search(current[k]);
        });
      }
    }
  }
  
  search(obj);
  return values;
}

/**
 * Creates a standardized pill object for usage context
 * 
 * @param {string} label - Display label
 * @param {string} type - Type: 'success', 'warning', 'error', 'standard', 'info'
 * @param {string} description - Detailed description
 * @returns {Object} Pill object
 */
function createPill(label, type, description) {
  const colors = {
    success: '#3c9662',
    warning: '#d63031',
    error: '#d63031',
    standard: '#7f766c',
    info: '#0070d2'
  };

  return {
    label,
    type,
    color: colors[type] || colors.standard,
    description
  };
}

/**
 * Parses a fully qualified field name into object and field parts
 * 
 * @param {string} fieldName - Fully qualified field name (e.g., 'Account.Industry')
 * @returns {Object} Object with objectName and fieldName properties
 */
function parseFieldName(fieldName) {
  const parts = fieldName.split('.');
  if (parts.length !== 2) {
    return { objectName: null, fieldName: fieldName };
  }
  return {
    objectName: parts[0],
    fieldName: parts[1]
  };
}

/**
 * Checks if a metadata type is a custom field
 * 
 * @param {string} type - Metadata type name
 * @returns {boolean} True if it's a custom field type
 */
function isCustomField(type) {
  const fieldTypes = ['CustomField', 'Field'];
  return fieldTypes.includes(type);
}

/**
 * Checks if a metadata type is a custom object
 * 
 * @param {string} type - Metadata type name
 * @returns {boolean} True if it's a custom object type
 */
function isCustomObject(type) {
  const objectTypes = ['CustomObject', 'Entity', 'EntityDefinition'];
  return objectTypes.includes(type);
}

/**
 * Creates a simplified dependency object from raw API response
 * 
 * @param {Object} record - Raw API record
 * @param {string} baseUrl - Salesforce instance URL
 * @param {Object} referencedBy - Object describing what references this item
 * @returns {Object} Simplified dependency object
 */
function simplifyDependency(record, baseUrl, referencedBy) {
  return {
    name: record.RefMetadataComponentName || record.MetadataComponentName,
    type: record.RefMetadataComponentType || record.MetadataComponentType,
    id: record.RefMetadataComponentId || record.MetadataComponentId,
    repeated: false,
    url: `${baseUrl}/${record.RefMetadataComponentId || record.MetadataComponentId}`,
    notes: null,
    namespace: record.RefMetadataComponentNamespace || record.MetadataComponentNamespace || null,
    pills: [],
    referencedBy: referencedBy || null
  };
}

/**
 * Creates a simplified usage object from raw API response
 * 
 * @param {Object} record - Raw API record
 * @param {string} baseUrl - Salesforce instance URL
 * @returns {Object} Simplified usage object
 */
function simplifyUsage(record, baseUrl) {
  return {
    name: record.MetadataComponentName,
    type: record.MetadataComponentType,
    id: record.MetadataComponentId,
    url: `${baseUrl}/${record.MetadataComponentId}`,
    notes: null,
    namespace: record.MetadataComponentNamespace || null,
    pills: [],
    sortOrder: null
  };
}

/**
 * Batches an array into chunks of specified size
 * Useful for API calls with batch limits
 * 
 * @param {Array} array - Array to batch
 * @param {number} size - Maximum batch size
 * @returns {Array[]} Array of batched arrays
 */
function batchArray(array, size) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

/**
 * Safely parses JSON, returning null on error
 * 
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|null} Parsed object or null
 */
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

module.exports = {
  isDynamicReference,
  filterableId,
  groupBy,
  getCodeBasedField,
  stripComments,
  removeWhitespace,
  findAllValuesByKey,
  createPill,
  parseFieldName,
  isCustomField,
  isCustomObject,
  simplifyDependency,
  simplifyUsage,
  batchArray,
  safeJsonParse
};
