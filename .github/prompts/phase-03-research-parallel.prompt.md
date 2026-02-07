```prompt
# Research Phase (Parallel Execution with Subagents)

Role: Research Coordinator
Mission: Execute research sub-phases in parallel using subagents for maximum efficiency.

## Config
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`

## Prerequisite
```bash
{{cli.workflow_status}} -w {{work_item_id}} --json
```

## Parallel Execution Strategy

### Wave 1: Foundation Research (Parallel)
**Dependencies:** None - can run simultaneously

Launch subagents for:
1. **Organization Dictionary** - `#file:.github/prompts/phase-03a-research-organization-dictionary.prompt.md`
2. **ADO Work Item** - `#file:.github/prompts/phase-03b-research-ado.prompt.md`
3. **Wiki Research** - `#file:.github/prompts/phase-03c-research-wiki.prompt.md`
4. **Business Context** - `#file:.github/prompts/phase-03d-research-business-context.prompt.md`

**Execution:**
```
Subagent 1: Execute phase-03a and save artifact to research/
Subagent 2: Execute phase-03b and save artifact to research/
Subagent 3: Execute phase-03c and save artifact to research/
Subagent 4: Execute phase-03d and save artifact to research/
```

Wait for all Wave 1 subagents to complete before proceeding.

### Wave 2: Technical Discovery (Parallel)
**Dependencies:** Requires ADO work item (03b) for keywords/metadata references

Launch subagents for:
5. **Salesforce Metadata** - `#file:.github/prompts/phase-03e-research-salesforce-parallel.prompt.md`
6. **Similar Work Items** - `#file:.github/prompts/phase-03f-research-similar-workitems.prompt.md`
7. **Code Analysis** - `#file:.github/prompts/phase-03g-research-code.prompt.md`
8. **Web Research** - `#file:.github/prompts/phase-03h-research-web.prompt.md`

**Execution:**
```
Subagent 5: Execute phase-03e (SF parallel with batch + subagents per object)
Subagent 6: Execute phase-03f using work item type from 03b
Subagent 7: Execute phase-03g using metadata from 03e (if ready) or keywords from 03b
Subagent 8: Execute phase-03h using terms from 03a and keywords from 03b
```

**Note:** SF research (03e) uses batch operations and spawns additional subagents per object (70% faster).

Wait for all Wave 2 subagents to complete before proceeding.

### Wave 3: Synthesis (Sequential)
**Dependencies:** All previous research phases

9. **Research Synthesis** - `#file:.github/prompts/phase-03z-research-synthesis.prompt.md`

Execute directly (not as subagent) to aggregate all findings.

## Subagent Invocation Pattern

For each subagent in a wave:

```typescript
await runSubagent({
  description: "Research {{phase_name}}",
  prompt: `
Execute: #file:.github/prompts/phase-{{id}}-research-{{name}}.prompt.md

Work Item: {{work_item_id}}
Artifacts Path: {{paths.artifacts_root}}/{{work_item_id}}/research/

REQUIREMENTS:
1. Follow prompt instructions exactly
2. Save artifact to specified path
3. Update run-state.json with completion
4. Return summary of:
   - Key findings (3-5 bullets)
   - Artifact file created
   - Any blocking issues
   - Suggested feedback loops

INPUT ARTIFACTS (if needed):
${wave === 2 ? '- ADO Work Item: {{research}}/01-ado-workitem.json' : ''}
${wave === 2 ? '- Organization Dictionary: {{research}}/00-organization-dictionary.json' : ''}

OUTPUT:
Return JSON summary only:
{
  "phase": "{{id}}",
  "success": true/false,
  "artifact": "filename",
  "keyFindings": [],
  "feedbackLoops": [],
  "issues": []
}
  `
});
```

## Error Handling

- If any Wave 1 subagent fails: Stop entire process, report failure
- If any Wave 2 subagent fails: Continue with others, flag missing data for synthesis
- Log all subagent results to run-state.json

## Progress Tracking

After each wave completion:
```bash
{{cli.workflow_status}} -w {{work_item_id}} --json
```

Verify artifacts created and update metrics.

## Output

Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/research/`

All research artifacts from sub-phases (03a-03z).

## Performance Comparison

| Approach | Estimated Time | Parallelization |
|----------|----------------|-----------------|
| Sequential (original) | 15-25 minutes | None |
| Wave 1 Parallel | 3-5 minutes | 4x |
| Wave 2 Parallel | 4-6 minutes | 4x |
| Total Parallel | 8-12 minutes | ~60% reduction |

```