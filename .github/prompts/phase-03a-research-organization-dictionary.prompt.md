# Research: Organization Dictionary

Role: Knowledge Manager
Mission: Establish shared vocabulary for all research phases.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`

## Execution

### A: Init
A1 [IO]: Load `#file:config/shared.json`
A2 [IO]: Ensure `{{research}}` directory exists
A3 [IO]: Check if `{{research}}/{{artifact_files.research.organization_dictionary}}` exists (resume if so)

### B: Dictionary Loading
B1 [IO]: Load `{{paths.config}}/organization-dictionary.json`
B2 [GEN]: If `{{new_terms}}` provided, search org dictionary for definitions
B3 [GEN]: Identify domain-specific terms in work item context, cross-reference with dictionary

### C: Term Validation
C1 [GEN]: Scan for acronyms, verify each has full expansion
C2 [GEN]: List undefined terms, incomplete definitions, terms needing clarification

### D: Artifact Persistence
D1 [IO]: Save to `{{research}}/{{artifact_files.research.organization_dictionary}}`

Schema:
```json
{
  "source": "organization-dictionary.json",
  "loaded_at": "{{iso_timestamp}}",
  "terms": {},
  "acronyms": [],
  "undefined_terms": [],
  "acronym_coverage": 0.0,
  "research_complete": true
}
```

D2 [IO]: Update `{{run_state}}` - add step to completedSteps, increment stepsCompleted

## Output
- `{{research}}/{{artifact_files.research.organization_dictionary}}`
