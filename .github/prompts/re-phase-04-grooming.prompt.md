```prompt
# Re-Grooming (Phase 04)

Purpose: Re-run the grooming phase after updated research or direction.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Step 1: Reset Grooming Phase
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase grooming --force --json
```

## Step 2: Execute Grooming
Execute: #file:.github/prompts/phase-04-grooming.prompt.md
```
