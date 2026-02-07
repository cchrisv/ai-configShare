````prompt
# Prepare Ticket (Full Workflow - Parallel Research)

Role: Workflow Orchestrator
Mission: Execute complete ticket preparation lifecycle with parallelized research.
Output: Refined work item with research, grooming, solution design, wiki, and ADO updates.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Load: `#file:config/shared.json`
Input: `{{work_item_id}}`

## Protocol
1. Research phases parallelized using subagents (50% faster)
2. Update run-state.json after each phase
3. Fail fast - stop on critical phase failure
4. All phases required for complete workflow

## Execution

### Phase 1: Initialize [CLI]
Command: `{{cli.workflow_prepare}} -w {{work_item_id}} --json`
Verify: `success: true` in response

### Phase 2: Research [PARALLEL SUBAGENTS]
Execute: `#file:.github/prompts/phase-03-research-parallel.prompt.md`

**Wave 1 (Parallel - No Dependencies):**
- 03a: Organization Dictionary
- 03b: ADO Work Item
- 03c: Wiki Research
- 03d: Business Context

**Wave 2 (Parallel - Depends on Wave 1):**
- 03e: Salesforce Metadata
- 03f: Similar Work Items
- 03g: Code Analysis
- 03h: Web Research

**Wave 3 (Sequential - Synthesis):**
- 03z: Research Synthesis

Expected completion: 8-12 minutes (vs 15-25 sequential)

### Phase 3: Grooming [GEN]
Execute: `#file:.github/prompts/phase-04-grooming.prompt.md`

### Phase 4: Solutioning [GEN]
Execute: `#file:.github/prompts/phase-05-solutioning.prompt.md`

### Phase 5: Wiki [GEN]
Execute: `#file:.github/prompts/phase-06-wiki.prompt.md`

### Phase 6: Finalization [API]
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

## Performance

| Phase | Sequential | Parallel | Improvement |
|-------|-----------|----------|-------------|
| Research | 15-25 min | 8-12 min | ~50% faster |
| Total | 25-40 min | 18-30 min | ~35% faster |

## Error Handling
- Wave 1 failure: STOP (critical foundation)
- Wave 2 failure: Continue, flag missing data
- Phase failure: Log to run-state.json, report error
- Recovery: Use `#file:.github/prompts/re-phase.prompt.md` to re-run failed phase

## Trade-offs

**Pros:**
- Significant time savings (50% on research phase)
- Better isolation of research concerns
- Independent failure handling per subagent

**Cons:**
- Higher token usage (~2-3x during research)
- More complex coordination logic
- Requires careful dependency management

````