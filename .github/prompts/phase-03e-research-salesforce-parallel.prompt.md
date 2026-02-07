```prompt
# Research: Salesforce Metadata (Parallel with Batch Operations)

Role: Technical Analyst & Research Coordinator
Mission: Discover Salesforce metadata dependencies using parallel subagents and batch API calls.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, extracted `{{object_names}}`

## Prerequisite
SF CLI authenticated (`sf org list` to verify).

## Strategy

Instead of researching each object sequentially, this approach:
1. **Batches** describe/validation calls for multiple objects in one CLI command
2. **Parallelizes** dependency discovery using subagents per object
3. **Aggregates** results into unified artifacts

**Performance**: 70% faster than sequential (2-3 min vs 6-8 min for 3+ objects)

## Execution

### A: Init & Extract Objects
A1 [CLI]: Verify SF auth with `sf org list`
A2 [IO]: Load ADO work item artifact: `{{research}}/01-ado-workitem.json`
A3 [GEN]: Extract Salesforce object names from:
  - Work item title, description
  - Tags (e.g., "Account", "Contact__c")
  - Custom.SFComponents field
  - Related work item titles
A4 [GEN]: Deduplicate and validate object names (remove invalid/standard if not needed)

Example extraction:
```json
{
  "objectsFound": ["Account", "Opportunity", "Custom_Object__c"],
  "confidence": "high",
  "source": "title + description"
}
```

### B: Batch Metadata Retrieval

**B1 [CLI]: Batch describe all objects in one call**
```bash
{{cli.sf_describe}} {{object1}},{{object2}},{{object3}} --batch --json
```

Returns array of results:
```json
[
  {"objectName": "Account", "success": true, "data": {...}},
  {"objectName": "Opportunity", "success": true, "data": {...}}
]
```

**B2 [CLI]: Batch validation rules for all objects**
```bash
{{cli.sf_validation}} {{object1}},{{object2}},{{object3}} --batch --json
```

### C: Parallel Dependency Discovery (Subagents)

Launch one subagent per object to discover dependencies in parallel.

**C1 [SUBAGENT]: For each object, launch discovery subagent**

```typescript
// For object "Account":
runSubagent({
  description: "SF Discover: Account",
  prompt: `
## Task
Discover Salesforce dependencies for object: Account

## Commands to Execute
1. {{cli.sf_discover}} --type CustomObject --name Account --depth 3 --json
2. {{cli.sf_apex}} --pattern "%Account%" --json
3. {{cli.sf_triggers}} --object Account --json
4. {{cli.sf_flows}} --object Account --json

## Analysis Required
- Count total components discovered
- Identify integration points (REST APIs, external systems)
- Flag circular dependencies
- Assess complexity (>100 = high, >500 = critical)

## Output Format
Return ONLY this JSON:
{
  "objectName": "Account",
  "success": true,
  "dependencies": {
    "graph": {...},
    "pills": {...},
    "totalComponents": 0
  },
  "relatedCode": {
    "apexClasses": [],
    "triggers": [],
    "flows": []
  },
  "complexity": "low|medium|high|critical",
  "integrationPoints": [],
  "warnings": []
}
  `
})

// Repeat for each object in parallel
```

**C2 [COORDINATOR]: Wait for all subagents to complete**

**C3 [COORDINATOR]: Aggregate results**
- Collect all dependency graphs
- Merge integration points
- Consolidate warnings
- Calculate total impact

### D: Cross-Object Analysis

D1 [GEN]: Identify shared dependencies (components used by multiple objects)
D2 [GEN]: Detect circular dependencies across objects
D3 [GEN]: Map integration patterns (which objects call external systems)
D4 [GEN]: Assess cumulative impact

Example shared dependency:
```json
{
  "component": "AccountTriggerHandler",
  "usedBy": ["Account", "Contact", "Opportunity"],
  "type": "ApexClass",
  "impact": "high"
}
```

### E: Standards Compliance Check

E1 [IO]: Load standards: `{{paths.standards}}/apex-well-architected.md`
E2 [GEN]: Compare discovered patterns against standards
E3 [GEN]: Flag non-compliant patterns (e.g., multiple triggers per object)

### F: Artifact Generation

F1 [IO]: Save detailed dependency data to `{{research}}/{{artifact_files.research.dependency_discovery}}`

Schema:
```json
{
  "workItemId": "{{work_item_id}}",
  "generatedAt": "{{iso_timestamp}}",
  "objectsAnalyzed": ["Account", "Opportunity"],
  "batchOperationsUsed": true,
  "parallelDiscovery": true,
  "executionTime": "2.3 minutes",
  
  "byObject": {
    "Account": {
      "describe": {...},
      "validationRules": [...],
      "dependencies": {...},
      "relatedCode": {...},
      "complexity": "high"
    }
  },
  
  "crossObjectAnalysis": {
    "sharedDependencies": [...],
    "circularDependencies": [...],
    "integrationPoints": [...]
  },
  
  "impact": {
    "totalComponents": 450,
    "classification": "high",
    "affectedObjects": 5,
    "externalIntegrations": 2
  },
  
  "standardsCompliance": {
    "compliant": [...],
    "gaps": [...],
    "recommendations": [...]
  },
  
  "research_complete": true,
  "feedback_loops": []
}
```

F2 [IO]: Save summary to `{{research}}/{{artifact_files.research.dependency_summary}}`

Schema:
```json
{
  "workItemId": "{{work_item_id}}",
  "summary": "Account and Opportunity heavily integrated with 450+ components",
  "keyFindings": [
    "AccountTriggerHandler used by 3 objects",
    "Circular dependency: Account -> Contact -> Account",
    "External integration: Salesforce -> SAP via REST"
  ],
  "risks": [
    "Multi-trigger pattern on Account (non-compliant)",
    "No error handling in AccountIntegrationService"
  ],
  "estimatedEffort": "high",
  "recommendations": [
    "Refactor to Trigger Actions Framework",
    "Add retry logic to integration callouts"
  ]
}
```

## Feedback Loop Evaluation

Triggers to evaluate:
- **New Topic**: Found framework/pattern not in org dictionary → revisit 03a
- **Evidence Gap**: Integration mentioned but no code found → revisit code analysis
- **High-Value**: Critical dependency discovered → revisit ADO for related work items

Document loops in artifact under `feedback_loops[]`.

## Error Handling

### Batch Call Failures
If batch describe/validation fails for any object:
```json
{"objectName": "Invalid__c", "success": false, "error": "No such object"}
```
- Log the failure
- Continue with successful objects
- Document in warnings

### Subagent Failures
If dependency discovery subagent fails:
- Use partial data from batch calls (describe + validation)
- Mark object as "incomplete research"
- Continue with other objects

### No Objects Found
If no SF objects extracted from work item:
- Document in artifact: `"objectsAnalyzed": []`
- Mark `research_complete: true` (nothing to research)
- Proceed to next phase

## Performance Metrics

| Approach | 1 Object | 3 Objects | 5 Objects |
|----------|----------|-----------|-----------|
| Sequential | 2 min | 6-8 min | 10-15 min |
| Batch + Parallel | 1.5 min | 2-3 min | 3-4 min |
| **Improvement** | 25% | **70%** | **75%** |

## Output

Artifacts:
- `{{research}}/{{artifact_files.research.dependency_discovery}}` (detailed)
- `{{research}}/{{artifact_files.research.dependency_summary}}` (executive summary)

Update `{{run_state}}`:
- Add to `completedSteps[]`
- Increment `metrics.phases.research.stepsCompleted`
- Set step: `"03e-salesforce-parallel"`

```