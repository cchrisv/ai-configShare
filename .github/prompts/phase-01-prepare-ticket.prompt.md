# Prepare Ticket (Full Workflow)

Role: Workflow Orchestrator
Mission: Execute complete ticket preparation lifecycle.
Output: Refined work item with research, grooming, solution design, wiki, and ADO updates.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Load: `#file:config/shared.json`
Input: `{{work_item_id}}`

## Protocol
1. Sequential execution - each phase depends on previous
2. Update run-state.json after each phase
3. Fail fast - stop on phase failure
4. All phases required for complete workflow

## Execution

Phases 1-6 map to prompt files phase-02 through phase-07.

### Phase 1: Initialize [CLI] (phase-02)
Command: `{{cli.workflow_prepare}} -w {{work_item_id}} --json`
Verify: `success: true` in response

### Phase 2: Research [GEN] (phase-03)
Execute in sequence:
1. `#file:.github/prompts/phase-03a-research-organization-dictionary.prompt.md`
2. `#file:.github/prompts/phase-03b-research-ado.prompt.md`
3. `#file:.github/prompts/phase-03c-research-wiki.prompt.md`
4. `#file:.github/prompts/phase-03d-research-business-context.prompt.md`
5. `#file:.github/prompts/phase-03e-research-salesforce.prompt.md`
6. `#file:.github/prompts/phase-03f-research-similar-workitems.prompt.md`
7. `#file:.github/prompts/phase-03g-research-code.prompt.md`
8. `#file:.github/prompts/phase-03h-research-web.prompt.md`
9. `#file:.github/prompts/phase-03z-research-synthesis.prompt.md`

### Phase 3: Grooming [GEN] (phase-04)
Execute: `#file:.github/prompts/phase-04-grooming.prompt.md`

### Phase 4: Solutioning [GEN] (phase-05)
Execute: `#file:.github/prompts/phase-05-solutioning.prompt.md`

### Phase 5: Wiki [GEN] (phase-06)
Execute: `#file:.github/prompts/phase-06-wiki.prompt.md`

### Phase 6: Finalization [API] (phase-07)
Execute: `#file:.github/prompts/phase-07-finalization.prompt.md`

### Verification [CLI]
Command: `{{cli.workflow_status}} -w {{work_item_id}} --json`
Verify: All phases complete, no errors

## Output
```
{{paths.artifacts_root}}/{{work_item_id}}/
├── run-state.json
├── research/
├── grooming/
├── solutioning/
├── wiki/
└── finalization/
```

## Error Handling
- Phase failure: Log to run-state.json, report error, STOP
- Recovery: Use `#file:.github/prompts/re-phase.prompt.md` to re-run failed phase
