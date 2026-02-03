```prompt
# Re-Research (Phase 03)

Purpose: Re-run the research phase after new information or changes.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Step 1: Reset Research Phase
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase research --force --json
```

## Step 2: Execute Research
Execute: #file:.github/prompts/phase-03-research.prompt.md

This will run all research sub-prompts (phase-03a through phase-03z) in sequence.
```
