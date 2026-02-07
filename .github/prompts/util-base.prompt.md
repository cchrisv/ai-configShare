# Prompt Base Reference

Shared definitions for all workflow prompts. Reference this file instead of repeating common patterns.

## Configuration

Load `#file:config/shared.json` first. Extract:
- `paths.*` - Directory paths
- `cli_commands.*` - CLI commands  
- `artifact_files.*` - Output filenames
- `field_paths.*` - ADO field paths
- `tags.*` - Tag names

## Standard Paths

| Variable | Value |
|----------|-------|
| `{{root}}` | `{{paths.artifacts_root}}/{{work_item_id}}` |
| `{{research}}` | `{{root}}/research` |
| `{{grooming}}` | `{{root}}/grooming` |
| `{{solutioning}}` | `{{root}}/solutioning` |
| `{{wiki}}` | `{{root}}/wiki` |
| `{{finalization}}` | `{{root}}/finalization` |
| `{{run_state}}` | `{{root}}/run-state.json` |

## Standard Guardrails

1. **NO COMMENTS** - Never post comments to work items unless explicitly requested
2. **CLI-ONLY** - Use CLI commands from `shared.json`, never raw shell commands (curl, az, git, npm)
3. **NO HARDCODED PATHS** - Use template variables from shared.json
4. **CONFIG READ-ONLY** - Do not modify shared.json or CLI scripts unless explicitly asked
5. **LOAD CONFIG FIRST** - Always load shared.json before execution

## Step Type Annotations

| Type | Description |
|------|-------------|
| `[IO]` | File read/write |
| `[CLI]` | Tool execution |
| `[API]` | Remote API calls |
| `[LOGIC]` | Conditional branching |
| `[GEN]` | AI reasoning |

## Run State Schema

```json
{
  "workItemId": "{{work_item_id}}",
  "version": 1,
  "currentPhase": "research|grooming|solutioning|wiki|finalization|complete",
  "phaseOrder": ["research", "grooming", "solutioning", "wiki", "finalization"],
  "completedSteps": [],
  "errors": [],
  "metrics": { "phases": {} },
  "lastUpdated": "{{iso_timestamp}}"
}
```

## CLI Quick Reference

| Action | Command |
|--------|---------|
| Init workflow | `{{cli.workflow_prepare}} -w {{work_item_id}} --json` |
| Check status | `{{cli.workflow_status}} -w {{work_item_id}} --json` |
| Reset phase | `{{cli.workflow_reset}} -w {{work_item_id}} --phase {{phase}} --force --json` |
| Get work item | `{{cli.ado_get}} {{work_item_id}} --expand All --json` |
| Update work item | `{{cli.ado_update}} {{work_item_id}} --fields-file "{{file}}" --json` |
