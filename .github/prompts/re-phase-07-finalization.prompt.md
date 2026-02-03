```prompt
# Re-Finalization (Phase 07)

Purpose: Re-run finalization after late-breaking changes or to update links.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Input
- work_item_id: {{work_item_id}}

## Step 1: Reset Finalization Phase
Clear existing finalization artifacts to allow fresh execution:
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase finalization --force --json
```

## Step 2: Execute Finalization
Execute: #file:.github/prompts/phase-07-finalization.prompt.md

## Output
Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/finalization/`
- completion-summary.md
- final-templates.json

External:
- Work item updated with final tags (AI-Refined)
- Related work items linked
```
