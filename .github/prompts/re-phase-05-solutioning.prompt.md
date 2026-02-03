```prompt
# Re-Solutioning (Phase 05)

Purpose: Re-run the solutioning phase after feedback or new constraints.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Input
- work_item_id: {{work_item_id}}

## Step 1: Reset Solutioning Phase
Clear existing solutioning artifacts to allow fresh execution:
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase solutioning --force --json
```

## Step 2: Execute Solutioning
Execute: #file:.github/prompts/phase-05-solutioning.prompt.md

## Output
Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/solutioning/`
- solution-design.json
- technical-spec.md
- templates-applied.json
```
