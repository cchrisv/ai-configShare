````prompt
# Subagent Research Template

**Purpose:** Standard template for invoking research sub-phases as subagents.

## Usage

This template shows how to invoke any research sub-phase (03a-03h) as an autonomous subagent.

## Invocation Pattern

```javascript
const result = await runSubagent({
  description: "Research: {{PHASE_NAME}}",
  prompt: `
# Research Sub-Phase: {{PHASE_ID}} - {{PHASE_NAME}}

## Context
Work Item ID: {{work_item_id}}
Artifacts Root: {{paths.artifacts_root}}/{{work_item_id}}/research/
Prompt File: #file:.github/prompts/phase-{{PHASE_ID}}-research-{{phase_name}}.prompt.md

## Task
Execute the referenced prompt file completely and autonomously:
1. Load all required configuration and prerequisites
2. Execute all steps in the prompt (A, B, C, D sections)
3. Generate and save the required artifact(s)
4. Update run-state.json to mark step complete
5. Perform feedback loop evaluation

## Input Artifacts (if applicable)
{{#if dependencies}}
Available for your use:
${dependencies.map(d => `- ${d.name}: ${d.path}`).join('\n')}
{{/if}}

## Requirements
✓ Follow prompt instructions EXACTLY
✓ Use CLI commands from config/shared.json (never raw shell commands)
✓ Save artifact to correct location with correct filename
✓ Include all required schema fields in artifact
✓ Evaluate feedback loop triggers (5 types)
✓ Update run-state.json with completion data

## Output Format
Return ONLY this JSON structure as your final message:

\`\`\`json
{
  "phase": "{{PHASE_ID}}",
  "phaseName": "{{PHASE_NAME}}",
  "success": true,
  "artifact": "{{artifact_filename}}",
  "artifactPath": "{{full_artifact_path}}",
  "executionTime": "{{duration}}",
  "keyFindings": [
    "Finding 1 (most important)",
    "Finding 2",
    "Finding 3"
  ],
  "feedbackLoops": [
    {
      "finding": "Description",
      "trigger": "New Topic|Evidence Gap|Contradiction|High-Value|Missing Context",
      "targetStep": "03x",
      "priority": "high|medium|low",
      "action": "What should be revisited"
    }
  ],
  "issues": [
    "Any problems encountered (empty if none)"
  ],
  "statistics": {
    "itemsAnalyzed": 0,
    "cliCommandsRun": 0,
    "artifactSizeKb": 0
  }
}
\`\`\`

## Error Handling
If you encounter an error:
1. Attempt to resolve it using available tools/commands
2. If unresolvable, set success: false and document in issues[]
3. Save partial artifact if any work was completed
4. Do NOT stop without returning the JSON output structure
  `
});
```

## Wave-Based Execution

### Wave 1: Foundation (No Dependencies)

```javascript
// All run in parallel
const [dict, ado, wiki, business] = await Promise.all([
  runSubagent({
    description: "Research: Organization Dictionary",
    prompt: buildResearchPrompt("03a", "organization-dictionary", [])
  }),
  runSubagent({
    description: "Research: ADO Work Item",
    prompt: buildResearchPrompt("03b", "ado", [])
  }),
  runSubagent({
    description: "Research: Wiki",
    prompt: buildResearchPrompt("03c", "wiki", [])
  }),
  runSubagent({
    description: "Research: Business Context",
    prompt: buildResearchPrompt("03d", "business-context", [])
  })
]);
```

### Wave 2: Technical (Depends on Wave 1)

```javascript
// After Wave 1 completes
const dependencies = [
  { name: "ADO Work Item", path: `${research}/01-ado-workitem.json` },
  { name: "Organization Dictionary", path: `${research}/00-organization-dictionary.json` }
];

const [sf, similar, code, web] = await Promise.all([
  runSubagent({
    description: "Research: Salesforce",
    prompt: buildResearchPrompt("03e", "salesforce", dependencies)
  }),
  runSubagent({
    description: "Research: Similar Work Items",
    prompt: buildResearchPrompt("03f", "similar-workitems", dependencies)
  }),
  runSubagent({
    description: "Research: Code Analysis",
    prompt: buildResearchPrompt("03g", "code", dependencies)
  }),
  runSubagent({
    description: "Research: Web",
    prompt: buildResearchPrompt("03h", "web", dependencies)
  })
]);
```

## Coordinator Responsibilities

When using subagents, the coordinator (main agent) must:

1. **Pre-flight Checks:**
   - Verify research directory exists
   - Confirm work item ID is valid
   - Check run-state.json current phase

2. **Wave 1 Execution:**
   - Launch all 4 subagents simultaneously
   - Wait for all to complete
   - Collect and validate results
   - Check for critical failures

3. **Wave 2 Execution:**
   - Verify Wave 1 artifacts exist
   - Launch all 4 subagents simultaneously
   - Wait for all to complete
   - Collect and validate results

4. **Post-Processing:**
   - Aggregate all subagent results
   - Consolidate feedback loops
   - Update run-state.json with wave completion
   - Report summary to user

5. **Synthesis:**
   - Execute phase-03z directly (not subagent)
   - Use all artifacts from waves 1-2

## Benefits

| Metric | Sequential | Parallel | Improvement |
|--------|-----------|----------|-------------|
| **Execution Time** | 15-25 min | 8-12 min | 40-60% faster |
| **Parallelization** | 1x | 4x per wave | 4x throughput |
| **Failure Isolation** | Blocks all | Isolated | Better resilience |
| **Resource Usage** | Low | Higher | Trade-off |

## Considerations

**Pros:**
- Massive time savings (50%+ reduction)
- Better failure isolation
- Cleaner separation of concerns
- Each subagent focuses on single task

**Cons:**
- Higher token usage (multiple agents)
- More complex coordination logic
- Potential for duplicate CLI calls
- Harder to debug cross-phase issues

## Feedback Loop Handling

Feedback loops identified by subagents:
- **High Priority:** Execute immediately in coordination phase
- **Medium Priority:** Queue for synthesis phase
- **Low Priority:** Document for future reference

Coordinator aggregates all feedback loops and executes high-priority revisits before proceeding to next wave.

```
````