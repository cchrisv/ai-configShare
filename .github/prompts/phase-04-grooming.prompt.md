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
| Disclaimer | `{{paths.templates}}/{{template_files.disclaimer}}` |
| Validation | `{{paths.templates}}/{{template_files.validation}}` |

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
B5: Generate content using template, fill from research
B6: Quality gates (template fidelity, solution leak, clarity, logical fallacy, completeness)

### C: Artifact
C1 [IO]: Save to `{{grooming}}/grooming-result.json`

Schema:
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
    "System.Tags": ""
  },
  "solution_scents": []
}
```

### D: Update ADO [CLI]
D1: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{grooming}}/grooming-result.json" --json`
D2 [IO]: Update run state with phase completion

## Output
- `{{grooming}}/grooming-result.json`
