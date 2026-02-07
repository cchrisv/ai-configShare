# Research: ADO Extraction

Role: Detective (Business Analyst)
Mission: Extract work item data, scrub PII, segregate business needs from technical hints.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`

## Prerequisite
`{{research}}/{{artifact_files.research.organization_dictionary}}` must exist.

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [LOGIC]: Verify dictionary exists, STOP if missing
A3 [IO]: Ensure `{{research}}` exists

### B: Evidence Gathering
B1 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
B2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --comments --json`

### C: Sanitization
C1 [GEN]: Scrub PII - replace with tokens ([User], [Email])
C2 [GEN]: Segregate "How" (technical) from "What/Why" (business)
  - Extract technical terms to `technical_context`
  - Create `business_summary` with pure requirements

### D: Analysis
D1 [GEN]: Detective Pattern Analysis on business_summary:
  - Clarify case, identify unspoken needs, form hypotheses
D2 [GEN]: Extract keywords from technical_context

### E: Artifact
E1 [IO]: Save to `{{research}}/{{artifact_files.research.ado_workitem}}`

Schema:
```json
{
  "scrubbed_data": {},
  "business_summary": "",
  "technical_context": {},
  "detective_analysis": {},
  "keywords": []
}
```

## Feedback Loop
See `#file:.github/prompts/util-research-base.prompt.md#feedback-loop-protocol`

## Output
- `{{research}}/{{artifact_files.research.ado_workitem}}`
