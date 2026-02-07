# Parallel Research Implementation Guide

This guide shows how to implement the parallel research workflow using GitHub Copilot's subagent feature.

## Quick Start

To use parallel research instead of sequential:

**Before:**
```
Execute: #file:.github/prompts/phase-03-research.prompt.md
```

**After:**
```
Execute: #file:.github/prompts/phase-03-research-parallel.prompt.md
```

## Detailed Implementation

### 1. Wave 1: Foundation Research (Parallel)

Launch 4 subagents simultaneously:

```typescript
// Subagent 1: Organization Dictionary
runSubagent({
  description: "Research: Dictionary",
  prompt: `
Execute: #file:.github/prompts/phase-03a-research-organization-dictionary.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

Return JSON summary with:
- phase: "03a"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 2: ADO Work Item
runSubagent({
  description: "Research: ADO",
  prompt: `
Execute: #file:.github/prompts/phase-03b-research-ado.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

Return JSON summary with:
- phase: "03b"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 3: Wiki Research
runSubagent({
  description: "Research: Wiki",
  prompt: `
Execute: #file:.github/prompts/phase-03c-research-wiki.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

Return JSON summary with:
- phase: "03c"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 4: Business Context
runSubagent({
  description: "Research: Business",
  prompt: `
Execute: #file:.github/prompts/phase-03d-research-business-context.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

Return JSON summary with:
- phase: "03d"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})
```

**Wait for all Wave 1 subagents to complete before proceeding to Wave 2.**

### 2. Validate Wave 1 Results

After Wave 1 completes:

```typescript
// Check that critical artifacts exist
const requiredArtifacts = [
  'research/00-organization-dictionary.json',
  'research/01-ado-workitem.json',
  'research/02-wiki-research.json',
  'research/05-business-context.json'
];

// Verify each artifact
for (const artifact of requiredArtifacts) {
  const exists = await fileExists(`${artifactsPath}/${artifact}`);
  if (!exists) {
    throw new Error(`Critical artifact missing: ${artifact}`);
  }
}
```

### 3. Wave 2: Technical Discovery (Parallel)

Launch 4 more subagents, providing Wave 1 artifacts as input:

```typescript
// Subagent 5: Salesforce Metadata
runSubagent({
  description: "Research: Salesforce",
  prompt: `
Execute: #file:.github/prompts/phase-03e-research-salesforce.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

INPUT ARTIFACTS:
- ADO Work Item: ${artifactsPath}/research/01-ado-workitem.json
- Organization Dict: ${artifactsPath}/research/00-organization-dictionary.json

Use these artifacts to extract keywords and metadata references.

Return JSON summary with:
- phase: "03e"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 6: Similar Work Items
runSubagent({
  description: "Research: Similar Items",
  prompt: `
Execute: #file:.github/prompts/phase-03f-research-similar-workitems.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

INPUT ARTIFACTS:
- ADO Work Item: ${artifactsPath}/research/01-ado-workitem.json

Use work item type and area path for similarity search.

Return JSON summary with:
- phase: "03f"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 7: Code Analysis
runSubagent({
  description: "Research: Code",
  prompt: `
Execute: #file:.github/prompts/phase-03g-research-code.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

INPUT ARTIFACTS:
- ADO Work Item: ${artifactsPath}/research/01-ado-workitem.json
- SF Metadata: ${artifactsPath}/research/03a-dependency-discovery.json (if available)

Use these to identify code to analyze.

Return JSON summary with:
- phase: "03g"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})

// Subagent 8: Web Research
runSubagent({
  description: "Research: Web",
  prompt: `
Execute: #file:.github/prompts/phase-03h-research-web.prompt.md

Work Item ID: ${workItemId}
Artifacts Path: ${artifactsPath}/research/

INPUT ARTIFACTS:
- Organization Dict: ${artifactsPath}/research/00-organization-dictionary.json
- ADO Work Item: ${artifactsPath}/research/01-ado-workitem.json

Use these to extract search terms.

Return JSON summary with:
- phase: "03h"
- success: true/false
- artifact: filename
- keyFindings: top 3 findings
- issues: any problems
  `
})
```

**Wait for all Wave 2 subagents to complete.**

### 4. Aggregate Results

```typescript
// Collect all subagent results
const wave1Results = [dictResult, adoResult, wikiResult, businessResult];
const wave2Results = [sfResult, similarResult, codeResult, webResult];

// Check for failures
const failedPhases = [...wave1Results, ...wave2Results]
  .filter(r => !r.success)
  .map(r => r.phase);

if (failedPhases.length > 0) {
  console.warn(`Failed phases: ${failedPhases.join(', ')}`);
  // Decide whether to continue or abort
}

// Aggregate feedback loops
const allFeedbackLoops = [...wave1Results, ...wave2Results]
  .flatMap(r => r.feedbackLoops || [])
  .filter(fl => fl.priority === 'high');

// Execute high-priority feedback loops
for (const loop of allFeedbackLoops) {
  console.log(`Executing feedback loop: ${loop.finding}`);
  // Re-run the target phase with additional context
}
```

### 5. Wave 3: Synthesis (Sequential)

Execute directly, not as subagent:

```typescript
// This runs in the main agent context
Execute: #file:.github/prompts/phase-03z-research-synthesis.prompt.md
```

The synthesis phase aggregates all findings from waves 1-2.

## Performance Metrics

Expected timing for research phase:

| Approach | Time | Breakdown |
|----------|------|-----------|
| **Sequential** | 15-25 min | 8 phases × 2-3 min each |
| **Parallel (Wave 1)** | 3-5 min | 4 parallel × 1 longest |
| **Parallel (Wave 2)** | 4-6 min | 4 parallel × 1 longest |
| **Parallel (Wave 2 + Batch SF)** | 2-3 min | SF optimized from 6 min to 2 min |
| **Synthesis** | 2-3 min | 1 sequential |
| **Total Parallel** | 9-14 min | ~45-60% reduction |
| **Total with Batch SF** | 7-11 min | ~65% reduction |

## Error Handling

### Wave 1 Failures (Critical)
```typescript
if (wave1Results.some(r => !r.success)) {
  throw new Error('Wave 1 failure - cannot proceed without foundation research');
}
```

### Wave 2 Failures (Non-Critical)
```typescript
if (wave2Results.some(r => !r.success)) {
  console.warn('Wave 2 partial failure - proceeding with available data');
  // Log missing data for synthesis phase
}
```

## Tips for Success

1. **Clear Subagent Prompts:** Each subagent prompt should be self-contained with all context needed
2. **Explicit Return Format:** Always specify the JSON format you expect back
3. **Artifact Validation:** Check that each subagent created its artifact before proceeding
4. **Feedback Loop Priority:** Only execute high-priority loops immediately; defer others
5. **Error Tolerance:** Wave 2 can tolerate some failures; Wave 1 cannot
6. **Use Batch Operations:** For SF research, always use batch describe/validation for 2-3x speedup
7. **Parallel Discovery:** Spawn subagents per SF object for dependency discovery (70% faster)

## When to Use Parallel vs Sequential

**Use Parallel When:**
- Time is critical (user waiting for results)
- Research phases are independent
- Token budget allows higher usage
- Team is comfortable with subagent debugging

**Use Sequential When:**
- Research phases have tight dependencies
- Token budget is limited
- Debugging simplicity is priority
- Single-threaded execution is preferred

## Debugging Tips

If a subagent fails:

1. Check the subagent's returned `issues` array
2. Verify input artifacts exist and are valid JSON
3. Run the phase manually (non-subagent) to see detailed output
4. Check run-state.json for completion status
5. Use `workflow-tools status` to verify artifacts

## Future Enhancements

Potential optimizations:

- **Dynamic Wave Sizing:** Adjust parallelization based on complexity
- **Adaptive Retry:** Auto-retry failed subagents with adjusted parameters
- **Smart Caching:** Cache repeated ADO/SF queries across subagents
- **Progress Streaming:** Real-time updates from subagents to coordinator
- **Cost Optimization:** Skip low-value research based on work item type

