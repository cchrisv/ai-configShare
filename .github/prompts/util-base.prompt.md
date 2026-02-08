# Util – Base Reference (Context7)
Shared definitions for all workflow prompts. Uses unified ticket-context.json.

## Config
Load `#file:config/shared.json`. Extract: `paths.*` · `cli_commands.*` (use as `{{cli.*}}`) · `artifact_files.*` · `field_paths.*` · `tags.*` · `template_files.*`

## Guardrails
1. **No comments** – never post to work items unless explicitly requested
2. **CLI-only** – use CLI commands; NEVER raw shell (curl, az, git, npm)
3. **No hardcoded paths** – use template variables; NEVER absolute paths
4. **Config read-only** – NEVER modify shared.json or CLI scripts unless asked
5. **Load config first** – always load shared.json before execution
6. **Context7 only** – ALWAYS use {{root}}/ticket-context.json; NO separate artifacts

## Step Types
`[IO]` file read/write · `[CLI]` tool execution · `[API]` remote API · `[LOGIC]` conditional · `[GEN]` AI reasoning

## Context7 Paths
`{{root}}` = `{{paths.artifacts_root}}/{{work_item_id}}`
`{{context_file}}` = `{{root}}/ticket-context.json`  (SINGLE SOURCE OF TRUTH)

| Phase | Context Section |
|-------|----------------|
| Research | `.research` |
| Grooming | `.grooming` |
| Solutioning | `.solutioning` |
| Wiki | `.wiki` |
| Finalization | `.finalization` |
| Dev Updates | `.dev_updates` |
| Closeout | `.closeout` |

## Context7 Structure
```json
{
  "metadata": {
    "work_item_id": "", "created_at": "", "last_updated": "",
    "current_phase": "research|grooming|solutioning|wiki|finalization|complete",
    "phases_completed": [], "version": "1.0"
  },
  "run_state": {
    "completed_steps": [], "generation_history": [], "errors": [],
    "metrics": { "research": {}, "grooming": {}, "solutioning": {} }
  },
  "research": {}, "grooming": {}, "solutioning": {},
  "wiki": {}, "finalization": {}, "dev_updates": {},
  "closeout": {}
}
```
**Valid `current_phase` values:** `research` · `grooming` · `solutioning` · `wiki` · `finalization` · `complete`
**Valid `phases_completed` values:** `research` · `grooming` · `solutioning` · `wiki` · `finalization`
Full schema: `#file:config/templates/ticket-context-schema.json`

## CLI Quick Reference
| Action | Command |
|--------|---------|
| Init workflow | `{{cli.workflow_prepare}} -w {{work_item_id}} --json` |
| Check status | `{{cli.workflow_status}} -w {{work_item_id}} --json` |
| Reset phase | `{{cli.workflow_reset}} -w {{work_item_id}} --phase {{phase}} --force --json` |
| Get work item | `{{cli.ado_get}} {{work_item_id}} --expand All --json` |
| Update work item | `{{cli.ado_update}} {{work_item_id}} --fields-file "{{file}}" --json` |

## Context7 Operations
- Load: `[IO]` read {{context_file}}
- Update: `[IO]` modify section → write {{context_file}}
- Phase complete: update `metadata.current_phase` + `metadata.phases_completed`
- Always validate schema after writes
