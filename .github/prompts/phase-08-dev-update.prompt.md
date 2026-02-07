# Development Update (Iterative)

Role: Developer Assistant
Mission: Capture development-time changes by asking targeted questions, then selectively update grooming, solutioning, and/or ADO fields.
Output: Incremental change log and targeted ADO field updates.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`, optional: `{{areas}}` (grooming | solutioning | both; default: both)

## Prerequisites
- `{{grooming}}/grooming-result.json` exists
- `{{solutioning}}/solution-design.json` exists (or `{{solutioning}}/templates-applied.json`)
- Run state shows at least grooming complete

## Standard Paths (extension)
| Variable | Value |
|----------|-------|
| `{{dev_updates}}` | `{{root}}/dev-updates` |

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Create `{{dev_updates}}` if missing
A3 [IO]: Load `{{grooming}}/grooming-result.json`, `{{solutioning}}/solution-design.json`, and current work item via `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A4 [LOGIC]: Determine which areas to update from input `{{areas}}` (default: both grooming and solutioning)
A5 [IO]: List existing `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-*.json`; set `update_number` = count + 1 (zero-pad as 001, 002, …)

### B: Developer Questionnaire [GEN]

Present the developer with the current planned state (from loaded artifacts), then ask questions **contextually** based on `{{areas}}`. Do not ask every question every time; ask only those relevant to the area(s) being updated.

**Scope / Grooming (when updating grooming):**
- Did any requirements change from what's documented? (Show current AC from grooming-result.json for reference.)
- Were any acceptance criteria added, removed, or modified?
- Did any assumptions from grooming prove incorrect?
- Did the effort level or risk level change? Why?
- Were any items descoped or added to scope?

**Solutioning (when updating solutioning):**
- Did the architecture change from the solution design? How?
- Which planned components were built as designed vs. modified?
- Were any new components created that weren't in the original plan?
- Were there new integration points or dependencies discovered?
- Did you deviate from any referenced standards? Why?
- Were there new risks encountered during development?

Capture the developer's answers in a structured form for the artifact.

### C: Delta and Artifacts [GEN]
C1 [GEN]: From questionnaire answers, compute deltas for the selected areas (grooming and/or solutioning).
C2 [GEN]: For grooming delta: produce updated field values for `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.Tags`, and classification (WorkClassType, RequiresQA) as needed. Use field HTML templates from `{{paths.templates}}/` per work item type (see phase-04-grooming.prompt.md Field HTML Templates table).
C3 [GEN]: For solutioning delta: produce updated `solution-design.json` content and, if applicable, updated `Custom.DevelopmentSummary` HTML using `{{template_files.field_solution_design}}`.
C4 [IO]: Save dev-update artifact to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`

Schema for dev-update artifact:
```json
{
  "update_number": 1,
  "timestamp": "{{iso_timestamp}}",
  "work_item_id": "{{work_item_id}}",
  "areas_updated": ["grooming", "solutioning"],
  "developer_input": {
    "scope_changes": [],
    "ac_changes": [],
    "solution_changes": [],
    "new_risks": []
  },
  "fields_changed": {
    "System.Description": { "old": "", "new": "" },
    "Microsoft.VSTS.Common.AcceptanceCriteria": { "old": "", "new": "" },
    "Custom.DevelopmentSummary": { "old": "", "new": "" },
    "System.Tags": { "old": "", "new": "" }
  }
}
```
Include only keys for fields that actually changed. Omit unchanged fields.

C5 [IO]: If grooming was updated, merge updated fields into a payload and save to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-grooming-payload.json` (format acceptable to `--fields-file`). If solutioning was updated, merge updated solution-design and DevelopmentSummary into a payload and save to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-solutioning-payload.json`.

### D: Update ADO [CLI]
D1 [LOGIC]: Build single combined payload from all updated areas (grooming + solutioning) for this run. Use only fields that changed; include no null/empty overwrites unless intentionally clearing.
D2 [IO]: Save combined payload to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
D3 [CLI]: If any fields changed: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json" --json`
D4 [IO]: Optionally update local artifacts: write back to `{{grooming}}/grooming-result.json` and/or `{{solutioning}}/solution-design.json` (and templates-applied if used) so subsequent runs see the latest state.

## Output
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
- ADO work item updated with changed fields only
- Optional: updated `{{grooming}}/grooming-result.json` and/or `{{solutioning}}/solution-design.json`

## Notes
- This phase is re-runnable. Each run appends a new dev-update-NNN artifact.
- Ask questions contextually: only for the area(s) being updated in this run.
- Single ADO update call per run; batch all field changes into one payload.
