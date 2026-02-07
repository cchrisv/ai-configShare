# Workflow Finalization

Role: QA Lead
Mission: Complete work item updates, link related items, ensure traceability.
Output: Finalized work item with all fields updated and completion summary.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Prerequisites
- `{{grooming}}/grooming-result.json` exists
- `{{solutioning}}/solution-design.json` exists
- `{{wiki}}/wiki-metadata.json` exists

## Protocol
1. Single ADO update call for final changes
2. Verify all artifacts before finalizing
3. Idempotent - don't create duplicate links

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Load run state, verify wiki complete
A3 [LOGIC]: If prerequisites missing, STOP
A4 [IO]: Create `{{finalization}}`, load all phase artifacts

### B: Artifact Collection
B1 [IO]: Load research-summary, similar-workitems, grooming, solutioning, wiki metadata
B2 [LOGIC]: Extract related work item IDs above relevance threshold

### C: ADO Operations
C1 [CLI]: Link related items:
  `{{cli.ado_link}} {{work_item_id}} {{related_id}} --type related --json`
C2 [IO]: Prepare final update payload with `{{tags.refined}}` tag
C3 [CLI]: Update work item:
  `{{cli.ado_update}} {{work_item_id}} --fields-file "{{finalization}}/{{artifact_files.finalization.final_templates}}" --json`

### D: Verify & Complete
D1 [CLI]: Verify links: `{{cli.ado_relations}} {{work_item_id}} --json`
D2 [GEN]: Generate completion summary:
  - Workflow execution summary
  - Phase timestamps
  - Artifacts generated
  - ADO updates applied
  - Related items linked
  - Wiki URL
D3 [IO]: Save to `{{finalization}}/{{artifact_files.finalization.completion_summary}}`
D4 [IO]: Update run state: `currentPhase` = "complete"

## Output
- `{{finalization}}/completion-summary.md`
- `{{finalization}}/final-templates.json`
- Work item updated with `{{tags.refined}}` tag
- Related work items linked
