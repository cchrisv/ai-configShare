# Research: Business Context

Role: Investigator
Mission: Query Salesforce data to understand business context and validate requirements.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{queries}}`
Artifact file: `{{artifact_files.research.business_context}}` (see shared.json)

## Protocol
- Read-only research; do not modify ADO work item or wiki.
- Use `{{cli.sf_query}}` for SOQL and tooling queries; respect rate limits.

## Execution

### A: Query Execution
A1 [CLI]: For each business query: `{{cli.sf_query}} "{{soql_query}}" --json`
A2 [CLI]: For metadata queries: `{{cli.sf_query}} "{{tooling_query}}" --tooling --json`

### B: Analysis
B1 [GEN]: Analyze query results, extract business patterns
B2 [GEN]: Combine with research artifacts, generate context summary

### C: Artifact
C1 [IO]: Save to `{{research}}/{{artifact_files.research.business_context}}`

Schema for artifact:
```json
{
  "source": "business-context",
  "work_item_id": "{{work_item_id}}",
  "queries_run": [],
  "business_patterns": [],
  "data_summary": {},
  "recommendations": [],
  "research_complete": true
}
```

## Feedback Loop
Triggers: User impact data → revisit ADO | Business rules → revisit SF | Data patterns → revisit code

## Output
- `{{research}}/{{artifact_files.research.business_context}}`
