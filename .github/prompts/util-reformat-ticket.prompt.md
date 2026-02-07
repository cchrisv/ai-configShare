# Reformat Ticket (Apply Templates Only)

Purpose: Re-apply rich HTML templates to an existing ADO work item without changing content. Preserve all meaning and data; only fix formatting, structure, and light copy-edits (typos, grammar). Do not add, remove, or alter substantive content.

## Config
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`

## Input
- `{{work_item_id}}`: Target work item ID

## Guardrails (STRICT)
- **Content preservation**: Extract existing text; preserve all meaning, facts, and data. Do not invent content.
- **Light copy-editing only**: Fix typos, grammar, and punctuation. Do not rewrite, add, or remove substantive content.
- **No metadata changes**: Do NOT modify Title, Tags, State, WorkClassType, or any classification. Only reformat content fields.
- **Empty fields**: If a field is empty or missing, skip it; do not invent content.
- **Do NOT**: Add new acceptance criteria, goals, assumptions, or scope items; remove existing content; change business meaning or intent.

## Work Item Type -> Fields -> HTML Templates

| Type | Field | Template File |
|------|--------|---------------|
| User Story | Description | `{{paths.templates}}/{{template_files.field_user_story_description}}` |
| User Story | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_user_story_acceptance_criteria}}` |
| Bug / Defect | Description | `{{paths.templates}}/{{template_files.field_bug_description}}` |
| Bug / Defect | Repro Steps | `{{paths.templates}}/{{template_files.field_bug_repro_steps}}` |
| Bug / Defect | System Info | `{{paths.templates}}/{{template_files.field_bug_system_info}}` |
| Bug / Defect | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_bug_acceptance_criteria}}` |
| Feature | Description | `{{paths.templates}}/{{template_files.field_feature_description}}` |
| Feature | Business Value | `{{paths.templates}}/{{template_files.field_feature_business_value}}` |
| Feature | Objectives | `{{paths.templates}}/{{template_files.field_feature_objectives}}` |
| Feature | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_feature_acceptance_criteria}}` |

Template guides (section structure reference): `{{paths.templates}}/{{template_files.user_story}}`, `{{paths.templates}}/{{template_files.bug}}`, `{{paths.templates}}/{{template_files.feature}}`. See also `{{paths.templates}}/{{template_files.field_mappings}}`.

## Execution

### A: Init [IO]
A1: Load shared.json (paths, template_files, cli_commands)
A2: Create `{{root}}/reformat` directory if needed (`{{root}}` = `{{paths.artifacts_root}}/{{work_item_id}}`)

### B: Fetch Work Item [CLI]
B1: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
B2: Extract `System.WorkItemType` (User Story | Bug | Defect | Feature)
B3: Extract current values for all content fields applicable to that type (Description, Repro Steps, System Info, Acceptance Criteria, Business Value, Objectives as per table above). If type is unsupported, STOP.

### C: Template Selection [LOGIC]
C1: Branch on work item type
C2: Load the field HTML templates for that type from `{{paths.templates}}/`
C3: Load the corresponding template guide (user-story-templates.md, bug-templates.md, or feature-templates.md) for section structure

### D: Reformat [GEN]
For each applicable field that has existing content:
1. Parse existing content: strip old HTML, extract raw text/data per section (Summary, User Story, Goals, steps, GWT clauses, etc.)
2. Fix typos, grammar, and punctuation in the extracted text only
3. Re-populate the rich HTML template with the corrected content; preserve all original data (record IDs, error messages, steps, Given/When/Then, etc.)
4. Do not add or remove items (e.g., same number of AC scenarios, same goals, same steps)

Omit any field that is empty or missing; do not generate content for it.

### E: Artifact [IO]
E1: Build payload with only content fields (no Title, Tags, State, or other metadata). Include only fields that were reformatted.
E2: Save to `{{root}}/reformat/reformat-result.json`

Payload format (include only keys that were reformatted; use exact field paths from shared.json):

```json
{
  "fields": {
    "System.Description": "<html>",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<html>",
    "Microsoft.VSTS.TCM.ReproSteps": "<html>",
    "Microsoft.VSTS.TCM.SystemInfo": "<html>",
    "Custom.BusinessProblemandValueStatement": "<html>",
    "Custom.BusinessObjectivesandImpact": "<html>"
  }
}
```

### F: Update ADO [CLI]
F1: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{root}}/reformat/reformat-result.json" --json`

## Output
- `{{root}}/reformat/reformat-result.json` (content fields only)
- ADO work item updated with reformatted HTML; meaning and data unchanged
