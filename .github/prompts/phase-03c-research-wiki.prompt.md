# Research: Wiki Search

Role: Detective
Mission: Search ADO Wiki for documentation, validate ADO hypotheses.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{metadata_keywords}}`

## Prerequisite (parallel-safe)
Optional: If `{{research}}/{{artifact_files.research.ado_workitem}}` exists, use its `keywords` and `technical_context` for `{{metadata_keywords}}`; otherwise call `{{cli.ado_get}} {{work_item_id}} --expand All --json` and extract search terms from title, description, and tags. This allows 03c to run in Wave 1 alongside 03b.

## Execution

### A: Init
A1 [IO]: Load metadata_keywords: from ado_workitem artifact if present, else from fresh `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A2 [IO]: Ensure `{{research}}` exists

### B: Evidence Gathering
B1 [CLI]: `{{cli.wiki_search}} "{{metadata_keywords}}" --json`
B2 [CLI]: `{{cli.wiki_get}} --path "{{page_path}}" --json` for relevant pages

### C: Analysis
C1 [GEN]: Extract from wiki pages:
  - SF metadata (objects, flows, apex classes)
  - Integration points
  - Business context and architecture decisions
C2 [GEN]: Cross-examine wiki vs ADO ticket, validate hypotheses
C3 [GEN]: Identify documentation gaps

### D: Artifact
D1 [IO]: Save to `{{research}}/{{artifact_files.research.wiki_research}}`

Schema:
```json
{
  "search_results": [],
  "metadata_references": [],
  "detective_correlation": {},
  "unknowns": [],
  "next_phase_recommendation": "",
  "research_complete": true
}
```

## Feedback Loop
Triggers: New SF metadata → revisit salesforce | Related work items → revisit ADO | New terms → revisit dictionary

## Output
- `{{research}}/{{artifact_files.research.wiki_research}}`
