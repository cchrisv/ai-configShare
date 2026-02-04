/**
 * Workflow Analysis Module
 * 
 * Analyzes workflow rules and process automation to extract:
 * - Field references in criteria formulas
 * - Field updates
 * - Referenced fields in conditions
 * - Email alerts and task assignments
 * 
 * Ported from sfdc-soup workflow analysis patterns.
 */

const utils = require('../utils.cjs');

/**
 * Operators used in workflow criteria formulas
 */
const CRITERIA_OPERATORS = [
  '=', '!=', '<>', '<', '>', '<=', '>=',
  'EQUALS', 'NOT EQUAL TO', 'STARTS WITH', 'CONTAINS', 'DOES NOT CONTAIN',
  'LESS THAN', 'GREATER THAN', 'LESS OR EQUAL', 'GREATER OR EQUAL',
  'INCLUDES', 'EXCLUDES', 'WITHIN'
];

/**
 * Parses workflow rule criteria formula to extract field references
 * 
 * @param {string} formula - Criteria formula string
 * @param {string} objectName - SObject name for context
 * @returns {Array<string>} Array of field API names
 */
function parseWorkflowCriteriaFormula(formula, objectName) {
  if (!formula) return [];
  
  const fields = new Set();
  
  // Remove string literals to avoid false positives
  const sanitized = formula.replace(/'[^']*'/g, '');
  
  // Match field patterns: ObjectName.FieldName or just FieldName
  // Standard pattern: SObject.Field or just Field
  const patterns = [
    new RegExp(`\\b${objectName}\\.([A-Za-z_][A-Za-z0-9_]*)\\b`, 'gi'),
    /\b([A-Za-z_][A-Za-z0-9_]*__c)\b/gi,  // Custom fields
    /\b([A-Za-z_][A-Za-z0-9_]*__r\.[A-Za-z_][A-Za-z0-9_]*)\b/gi,  // Relationship fields
    /\$RecordType\./gi  // Record type references
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(sanitized)) !== null) {
      if (match[1]) {
        fields.add(match[1]);
      }
    }
  });
  
  // Also extract from $ObjectType.SObject.Fields.FieldName pattern
  const objectTypePattern = /\$ObjectType\.([A-Za-z_][A-Za-z0-9_]*)\.Fields\.([A-Za-z_][A-Za-z0-9_]*)/gi;
  let match;
  while ((match = objectTypePattern.exec(formula)) !== null) {
    fields.add(`${match[1]}.${match[2]}`);
  }
  
  return Array.from(fields);
}

/**
 * Parses workflow rule entry criteria (filter criteria format)
 * 
 * @param {Array} criteriaItems - Array of filter criteria items
 * @returns {Array<string>} Array of field API names
 */
function parseFilterCriteria(criteriaItems) {
  if (!criteriaItems || !Array.isArray(criteriaItems)) return [];
  
  const fields = new Set();
  
  criteriaItems.forEach(item => {
    if (item.field) {
      // Remove object prefix if present
      const fieldParts = item.field.split('.');
      const fieldName = fieldParts.length > 1 ? fieldParts[1] : item.field;
      fields.add(fieldName);
    }
  });
  
  return Array.from(fields);
}

/**
 * Extracts field update information from workflow actions
 * 
 * @param {Object} workflowRule - Workflow rule metadata
 * @returns {Array} Field update details
 */
function extractFieldUpdates(workflowRule) {
  const updates = [];
  
  // Check for field updates in actions
  const actions = workflowRule.actions || [];
  const fieldUpdates = Array.isArray(actions) 
    ? actions.filter(a => a.type === 'FieldUpdate')
    : [];
  
  fieldUpdates.forEach(update => {
    updates.push({
      name: update.name,
      type: 'WorkflowFieldUpdate',
      field: update.field,
      operation: update.operation,
      value: update.literalValue || update.formula,
      isFormula: !!update.formula,
      pills: [utils.createPill('Write', 'warning', `Updates ${update.field}`)]
    });
  });
  
  return updates;
}

/**
 * Analyzes a workflow rule for all references
 * 
 * @param {Object} workflowRule - Workflow rule metadata
 * @returns {Object} Analysis results
 */
function analyzeWorkflowRule(workflowRule) {
  const analysis = {
    name: workflowRule.fullName,
    type: 'WorkflowRule',
    active: workflowRule.active,
    triggerType: workflowRule.triggerType,
    criteriaType: null,
    fieldReferences: [],
    fieldUpdates: [],
    emailAlerts: [],
    outboundMessages: [],
    tasks: [],
    pills: []
  };
  
  // Determine criteria type and extract field references
  if (workflowRule.formula) {
    analysis.criteriaType = 'formula';
    analysis.fieldReferences = parseWorkflowCriteriaFormula(
      workflowRule.formula,
      workflowRule.object || ''
    );
    analysis.pills.push(utils.createPill('Formula Criteria', 'info'));
  } else if (workflowRule.criteriaItems) {
    analysis.criteriaType = 'filter';
    analysis.fieldReferences = parseFilterCriteria(workflowRule.criteriaItems);
    analysis.pills.push(utils.createPill('Filter Criteria', 'info'));
  }
  
  // Extract field updates
  analysis.fieldUpdates = extractFieldUpdates(workflowRule);
  if (analysis.fieldUpdates.length > 0) {
    analysis.pills.push(utils.createPill('Field Updates', 'warning', 
      `${analysis.fieldUpdates.length} field(s)`));
  }
  
  // Check for email alerts
  const actions = workflowRule.actions || [];
  analysis.emailAlerts = (Array.isArray(actions) ? actions : [])
    .filter(a => a.type === 'Alert')
    .map(a => ({ name: a.name, type: 'WorkflowAlert' }));
  
  // Check for outbound messages
  analysis.outboundMessages = (Array.isArray(actions) ? actions : [])
    .filter(a => a.type === 'OutboundMessage')
    .map(a => ({ name: a.name, type: 'WorkflowOutboundMessage' }));
  
  // Check for tasks
  analysis.tasks = (Array.isArray(actions) ? actions : [])
    .filter(a => a.type === 'Task')
    .map(a => ({ name: a.name, type: 'WorkflowTask' }));
  
  // Add active/inactive pill
  if (workflowRule.active) {
    analysis.pills.push(utils.createPill('Active', 'success'));
  } else {
    analysis.pills.push(utils.createPill('Inactive', 'neutral'));
  }
  
  return analysis;
}

/**
 * Analyzes process builder metadata
 * 
 * @param {Object} flowMetadata - Process builder flow metadata
 * @returns {Object} Analysis results
 */
function analyzeProcessBuilder(flowMetadata) {
  const analysis = {
    name: flowMetadata.fullName,
    type: 'Flow',
    processType: flowMetadata.processType,
    status: flowMetadata.status,
    fieldReferences: new Set(),
    recordCreates: [],
    recordUpdates: [],
    actionCalls: [],
    pills: []
  };
  
  // Add status pill
  if (flowMetadata.status === 'Active') {
    analysis.pills.push(utils.createPill('Active', 'success'));
  } else {
    analysis.pills.push(utils.createPill(flowMetadata.status, 'neutral'));
  }
  
  // Add process type pill
  if (flowMetadata.processType) {
    analysis.pills.push(utils.createPill(flowMetadata.processType, 'info'));
  }
  
  // Extract field references from decisions
  if (flowMetadata.decisions) {
    const decisions = Array.isArray(flowMetadata.decisions) 
      ? flowMetadata.decisions 
      : [flowMetadata.decisions];
    
    decisions.forEach(decision => {
      if (decision.rules) {
        const rules = Array.isArray(decision.rules) ? decision.rules : [decision.rules];
        rules.forEach(rule => {
          if (rule.conditions) {
            const conditions = Array.isArray(rule.conditions) ? rule.conditions : [rule.conditions];
            conditions.forEach(condition => {
              if (condition.leftValueReference) {
                analysis.fieldReferences.add(condition.leftValueReference);
              }
              if (condition.rightValue && condition.rightValue.elementReference) {
                analysis.fieldReferences.add(condition.rightValue.elementReference);
              }
            });
          }
        });
      }
    });
  }
  
  // Extract record updates
  if (flowMetadata.recordUpdates) {
    const updates = Array.isArray(flowMetadata.recordUpdates) 
      ? flowMetadata.recordUpdates 
      : [flowMetadata.recordUpdates];
    
    updates.forEach(update => {
      analysis.recordUpdates.push({
        name: update.name,
        object: update.object,
        inputAssignments: update.inputAssignments || []
      });
    });
    
    if (updates.length > 0) {
      analysis.pills.push(utils.createPill('Record Updates', 'warning', 
        `${updates.length} update action(s)`));
    }
  }
  
  // Extract record creates
  if (flowMetadata.recordCreates) {
    const creates = Array.isArray(flowMetadata.recordCreates) 
      ? flowMetadata.recordCreates 
      : [flowMetadata.recordCreates];
    
    creates.forEach(create => {
      analysis.recordCreates.push({
        name: create.name,
        object: create.object,
        inputAssignments: create.inputAssignments || []
      });
    });
    
    if (creates.length > 0) {
      analysis.pills.push(utils.createPill('Record Creates', 'warning', 
        `${creates.length} create action(s)`));
    }
  }
  
  // Extract action calls (invocable actions)
  if (flowMetadata.actionCalls) {
    const calls = Array.isArray(flowMetadata.actionCalls) 
      ? flowMetadata.actionCalls 
      : [flowMetadata.actionCalls];
    
    calls.forEach(call => {
      analysis.actionCalls.push({
        name: call.name,
        actionType: call.actionType,
        actionName: call.actionName
      });
    });
  }
  
  // Convert Set to Array
  analysis.fieldReferences = Array.from(analysis.fieldReferences);
  
  return analysis;
}

/**
 * Checks if a workflow/process references a specific field
 * 
 * @param {Object} analysis - Workflow/process analysis object
 * @param {string} fieldName - Field API name to check
 * @returns {boolean} True if field is referenced
 */
function referencesField(analysis, fieldName) {
  const fieldNameLower = fieldName.toLowerCase();
  
  // Check field references
  if (analysis.fieldReferences) {
    const refs = Array.isArray(analysis.fieldReferences) 
      ? analysis.fieldReferences 
      : Array.from(analysis.fieldReferences);
    
    if (refs.some(f => f.toLowerCase().includes(fieldNameLower))) {
      return true;
    }
  }
  
  // Check field updates
  if (analysis.fieldUpdates) {
    if (analysis.fieldUpdates.some(u => 
      u.field && u.field.toLowerCase() === fieldNameLower
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generates usage context for workflow/process referencing a field
 * 
 * @param {Object} analysis - Workflow/process analysis
 * @param {string} fieldName - Field being referenced
 * @returns {Array} Usage pills
 */
function getFieldUsageContext(analysis, fieldName) {
  const pills = [];
  const fieldNameLower = fieldName.toLowerCase();
  
  // Check if in criteria
  if (analysis.fieldReferences) {
    const refs = Array.isArray(analysis.fieldReferences) 
      ? analysis.fieldReferences 
      : Array.from(analysis.fieldReferences);
    
    if (refs.some(f => f.toLowerCase().includes(fieldNameLower))) {
      pills.push(utils.createPill('In Criteria', 'info', 'Used in filter/formula criteria'));
    }
  }
  
  // Check if being updated
  if (analysis.fieldUpdates) {
    const update = analysis.fieldUpdates.find(u => 
      u.field && u.field.toLowerCase() === fieldNameLower
    );
    
    if (update) {
      const detail = update.isFormula ? 'Formula update' : `Set to: ${update.value || 'value'}`;
      pills.push(utils.createPill('Write', 'warning', detail));
    }
  }
  
  return pills;
}

/**
 * Queries workflow rules for an object
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} objectName - SObject name
 * @returns {Promise<Array>} Workflow rules
 */
async function queryWorkflowRulesForObject(queryFunction, objectName) {
  // MetadataComponentDependency should already capture these,
  // but we can enhance with more detail
  const query = `SELECT Id, Name, TableEnumOrId, CreatedDate, LastModifiedDate 
                 FROM WorkflowRule 
                 WHERE TableEnumOrId = '${objectName}'`;
  
  try {
    const result = await queryFunction(query, { useTooling: true });
    return result.result?.records || [];
  } catch (error) {
    console.log(`[Workflow] Failed to query workflow rules: ${error.message}`);
    return [];
  }
}

/**
 * Queries workflow field updates for an object
 * 
 * @param {Function} queryFunction - Function to execute SOQL queries
 * @param {string} objectName - SObject name
 * @returns {Promise<Array>} Field updates
 */
async function queryFieldUpdatesForObject(queryFunction, objectName) {
  const query = `SELECT Id, Name, FieldDefinitionId, SourceTableEnumOrId, Operation, LiteralValue 
                 FROM WorkflowFieldUpdate 
                 WHERE SourceTableEnumOrId = '${objectName}'`;
  
  try {
    const result = await queryFunction(query, { useTooling: true });
    return result.result?.records || [];
  } catch (error) {
    console.log(`[Workflow] Failed to query field updates: ${error.message}`);
    return [];
  }
}

module.exports = {
  parseWorkflowCriteriaFormula,
  parseFilterCriteria,
  extractFieldUpdates,
  analyzeWorkflowRule,
  analyzeProcessBuilder,
  referencesField,
  getFieldUsageContext,
  queryWorkflowRulesForObject,
  queryFieldUpdatesForObject,
  CRITERIA_OPERATORS
};
