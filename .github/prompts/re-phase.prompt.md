```prompt
# Re-run Phase

Purpose: Re-run a specific workflow phase after updates or corrections.

## Configuration
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`

## Input
- `{{work_item_id}}`: Target work item ID
- `{{phase}}`: Phase to re-run (research | grooming | solutioning | wiki | finalization)

## Step 1: Reset Phase [CLI]
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase {{phase}} --force --json
```

## Step 2: Execute Phase

| Phase | Execute |
|-------|---------|
| research | `#file:.github/prompts/phase-03-research.prompt.md` |
| grooming | `#file:.github/prompts/phase-04-grooming.prompt.md` |
| solutioning | `#file:.github/prompts/phase-05-solutioning.prompt.md` |
| wiki | `#file:.github/prompts/phase-06-wiki.prompt.md` |
| finalization | `#file:.github/prompts/phase-07-finalization.prompt.md` |

## Output
Artifacts regenerated in: `{{paths.artifacts_root}}/{{work_item_id}}/{{phase}}/`
```
