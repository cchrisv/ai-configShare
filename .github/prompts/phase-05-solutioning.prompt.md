# Solutioning Phase

Role: Solution Architect
Mission: Design technical solutions meeting requirements and organizational standards.
Output: Solution design with component specs and technical specification.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Prerequisites
- `{{grooming}}/grooming-result.json` exists
- `{{research}}/research-summary.json` exists
- `{{research}}/{{artifact_files.research.dependency_discovery}}` exists

## Templates
| Type | File |
|------|------|
| Solution Design (HTML) | `{{paths.templates}}/{{template_files.field_solution_design}}` |
| Solution Design (Guide) | `{{paths.templates}}/{{template_files.solution_design}}` |
| Field Mappings | `{{paths.templates}}/{{template_files.field_mappings}}` |
| Test Case | `{{paths.templates}}/{{template_files.test_case}}` |

## Protocol
1. Reference standards in `{{paths.standards}}/`
2. Consider dependency impact from research
3. Prefer extending existing components over new ones
4. Single ADO update call

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Load run state, verify grooming complete
A3 [LOGIC]: If prerequisites missing, STOP
A4 [IO]: Create `{{solutioning}}`, load grooming and dependency artifacts

### B: Solution Design [GEN]
B1 [CLI]: If needed: `{{cli.sf_describe}} {{object_name}} --json`
B2 [GEN]: Component analysis - map requirements to components, identify reuse vs new
B3 [GEN]: Architecture design - interactions, data flow, integration points, risks

### C: Artifacts
C1 [IO]: Save to `{{solutioning}}/{{artifact_files.solutioning.solution_design}}`

Schema:
```json
{
  "work_item_id": "{{work_item_id}}",
  "generated_at": "{{iso_timestamp}}",
  "components": {"existing": [], "new": []},
  "architecture": {"data_flow": "", "integration_points": [], "design_decisions": []},
  "risks": []
}
```

C2 [IO]: Save technical spec to `{{solutioning}}/{{artifact_files.solutioning.technical_spec}}`
C3 [IO]: Prepare ADO update payload

### D: Update ADO [CLI]
D1: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{solutioning}}/{{artifact_files.solutioning.templates_applied}}" --json`
D2 [IO]: Update run state

## Output
- `{{solutioning}}/solution-design.json`
- `{{solutioning}}/technical-spec.md`
- `{{solutioning}}/templates-applied.json`
