```prompt
# Salesforce Object Dependency Subagent Template

**Purpose:** Template for discovering dependencies for a single Salesforce object.

## Usage

This template is invoked by the parallel SF research coordinator for each object.

## Invocation

```javascript
runSubagent({
  description: `SF Discover: ${objectName}`,
  prompt: `
# Salesforce Dependency Discovery: ${objectName}

## Context
- Work Item: ${workItemId}
- Object: ${objectName}
- Artifacts Path: ${artifactsPath}/research/

## Task
Discover all metadata dependencies for ${objectName}.

## Execution Steps

### 1. Dependency Discovery
Execute: {{cli.sf_discover}} --type CustomObject --name ${objectName} --depth 3 --json

Parse output for:
- Total components discovered
- Component types (Apex, Flow, Trigger, etc.)
- Dependency depth
- Circular dependencies (check warnings)

### 2. Related Apex Classes
Execute: {{cli.sf_apex}} --pattern "%${objectName}%" --json

Filter for:
- Classes with object name in class name
- Service classes, handlers, controllers
- Test classes (count separately)

### 3. Apex Triggers
Execute: {{cli.sf_triggers}} --object ${objectName} --json

Check for:
- Multiple triggers (flag as non-compliant)
- Trigger naming convention compliance
- Active vs inactive triggers

### 4. Flows
Execute: {{cli.sf_flows}} --object ${objectName} --json

Analyze:
- Record-triggered flows
- Platform event flows
- Process builders (deprecated)

### 5. Complexity Assessment

Categorize based on total components:
- **Low**: <50 components
- **Medium**: 50-100 components
- **High**: 100-500 components
- **Critical**: >500 components

### 6. Integration Detection

Scan apex class names and descriptions for:
- "Integration", "Callout", "REST", "SOAP", "API"
- External system names (SAP, Workday, etc.)
- Middleware patterns (MuleSoft, Dell Boomi)

### 7. Standards Compliance

Check against:
- Trigger Actions Framework (TAF): Is AccountTriggerHandler present?
- Multiple triggers: More than 1 trigger = non-compliant
- Naming conventions: Does trigger follow ${objectName}Trigger pattern?

## Output Format

Return ONLY this JSON (no other text):

\`\`\`json
{
  "objectName": "${objectName}",
  "success": true,
  "executionTime": "45 seconds",
  
  "dependencies": {
    "totalComponents": 0,
    "graph": { /* dependency graph */ },
    "pills": { /* component counts by type */ },
    "circularDependencies": [],
    "maxDepth": 0
  },
  
  "relatedCode": {
    "apexClasses": [
      {
        "name": "AccountService",
        "type": "service",
        "isTest": false,
        "apiVersion": "62.0"
      }
    ],
    "triggers": [
      {
        "name": "AccountTrigger",
        "isActive": true,
        "compliant": true
      }
    ],
    "flows": [
      {
        "apiName": "Account_Before_Save",
        "processType": "RecordTriggered",
        "status": "Active"
      }
    ]
  },
  
  "complexity": "low|medium|high|critical",
  
  "integrationPoints": [
    {
      "component": "AccountIntegrationService",
      "type": "REST Callout",
      "externalSystem": "SAP",
      "pattern": "Synchronous"
    }
  ],
  
  "standardsCompliance": {
    "triggerActionsFramework": true,
    "multipleTriggers": false,
    "namingConventions": true,
    "issues": []
  },
  
  "warnings": [
    "Circular dependency detected: Account -> Contact -> Account"
  ],
  
  "statistics": {
    "cliCommandsExecuted": 4,
    "componentsAnalyzed": 0,
    "integrationPointsFound": 0
  }
}
\`\`\`

## Error Handling

If discovery fails:
1. Set success: false
2. Include error message
3. Return partial data if any commands succeeded

Example error response:
\`\`\`json
{
  "objectName": "${objectName}",
  "success": false,
  "error": "Object does not exist",
  "partialData": {
    "apexClasses": [] // if this succeeded before error
  }
}
\`\`\`

## Requirements

✓ Execute all 4 CLI commands (discover, apex, triggers, flows)
✓ Assess complexity accurately
✓ Detect integration points
✓ Check standards compliance
✓ Return valid JSON only (no markdown, no explanations)
✓ Complete within 1-2 minutes

## Do NOT

✗ Return markdown formatting around JSON
✗ Include explanatory text before/after JSON
✗ Stop on first error (attempt all commands)
✗ Modify local files (read-only operation)
✗ Skip complexity or compliance checks
  `
})
```

## Coordinator Integration

After launching all subagents:

```javascript
// Launch subagents for all objects
const subagentPromises = objectNames.map(objName => 
  runSubagent({
    description: `SF Discover: ${objName}`,
    prompt: buildSFSubagentPrompt(objName, workItemId, artifactsPath)
  })
);

// Wait for all
const results = await Promise.all(subagentPromises);

// Process results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

if (failed.length > 0) {
  console.warn(`${failed.length} object(s) failed discovery: ${failed.map(f => f.objectName).join(', ')}`);
}

// Aggregate data
const aggregated = {
  objectsAnalyzed: successful.map(r => r.objectName),
  totalComplexity: calculateTotalComplexity(successful),
  allIntegrations: successful.flatMap(r => r.integrationPoints),
  crossObjectDependencies: findSharedDependencies(successful),
  complianceIssues: successful.flatMap(r => r.standardsCompliance.issues)
};
```

## Benefits

| Metric | Value |
|--------|-------|
| **Parallel Execution** | N objects in ~1-2 min (vs N × 2-3 min sequential) |
| **Isolation** | One object failure doesn't block others |
| **Clarity** | Each subagent has single responsibility |
| **Debugging** | Easy to re-run single object if needed |

```