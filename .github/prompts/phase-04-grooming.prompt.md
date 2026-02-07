# Grooming Phase

Role: Business Architect
Mission: Transform raw requests into evidence-based requirements.
Output: Refined ADO Work Item (User Story or Bug) with templates applied.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Prerequisites
- `{{research}}/research-summary.json` exists
- `{{research}}/assumptions.json` exists
- Run state shows research phase complete

## Templates
| Type | File |
|------|------|
| User Story | `{{paths.templates}}/{{template_files.user_story}}` |
| Bug/Defect | `{{paths.templates}}/{{template_files.bug}}` |
| Feature | `{{paths.templates}}/{{template_files.feature}}` |
| Validation | `{{paths.templates}}/{{template_files.validation}}` |
| Field Mappings | `{{paths.templates}}/{{template_files.field_mappings}}` |

## Field HTML Templates (rich formatting)

Use these templates when generating HTML content for ADO fields. Load from `{{paths.templates}}/` and apply structure/styling from the template; fill with generated content from research.

| Work Item Type | Field | Template File |
|----------------|-------|---------------|
| User Story | Description | `{{template_files.field_user_story_description}}` |
| User Story | Acceptance Criteria | `{{template_files.field_user_story_acceptance_criteria}}` |
| Bug/Defect | Description | `{{template_files.field_bug_description}}` |
| Bug/Defect | Repro Steps | `{{template_files.field_bug_repro_steps}}` |
| Bug/Defect | System Info | `{{template_files.field_bug_system_info}}` |
| Bug/Defect | Acceptance Criteria | `{{template_files.field_bug_acceptance_criteria}}` |
| Feature | Description | `{{template_files.field_feature_description}}` |
| Feature | Business Value | `{{template_files.field_feature_business_value}}` |
| Feature | Objectives | `{{template_files.field_feature_objectives}}` |
| Feature | Acceptance Criteria | `{{template_files.field_feature_acceptance_criteria}}` |

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Load run state, verify research complete
A3 [LOGIC]: If prerequisites missing, STOP
A4 [IO]: Create `{{grooming}}` directory, load research artifacts

### B: Analysis [GEN]
B1: Select template based on work item type
B2: Match organizational context (department, persona, strategy)
B3: Neutralize solution bias - move "How" to Assumptions, keep "What/Why"
B4: Classify: Work Class, Effort, Risk, Tags
B5: Generate content using template and field HTML templates (see Field HTML Templates table) for each target field; fill from research
B6: Quality gates (template fidelity, solution leak, clarity, logical fallacy, completeness)

### C: Artifact
C1 [IO]: Save to `{{grooming}}/grooming-result.json`

Schema (include only fields applicable to work item type; use `field_paths` from shared.json):

**All types:** `System.Title`, `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.Tags`, classification and WorkClassType/RequiresQA as needed.

**Bug/Defect only:** Also include `Microsoft.VSTS.TCM.ReproSteps`, `Microsoft.VSTS.TCM.SystemInfo` (use field HTML templates for structure).

**Feature only:** Also include `Custom.BusinessProblemandValueStatement` (or `field_paths.business_problem_and_value`), `Custom.BusinessObjectivesandImpact` (or `field_paths.business_objectives_and_impact`).

```json
{
  "work_item_id": "{{work_item_id}}",
  "generated_at": "{{iso_timestamp}}",
  "classification": {},
  "organizational_context": {},
  "fields": {
    "System.Title": "",
    "System.Description": "<html>",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<html>",
    "System.Tags": "",
    "Microsoft.VSTS.TCM.ReproSteps": "<html>",
    "Microsoft.VSTS.TCM.SystemInfo": "<html>",
    "Custom.BusinessProblemandValueStatement": "",
    "Custom.BusinessObjectivesandImpact": ""
  },
  "solution_scents": []
}
```
Omit Bug-only or Feature-only keys when not applicable.

### D: Update ADO [CLI]
D1: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{grooming}}/grooming-result.json" --json`
D2 [IO]: Update run state with phase completion

## Output
- `{{grooming}}/grooming-result.json`
