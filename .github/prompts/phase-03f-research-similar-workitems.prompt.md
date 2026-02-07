# Research: Similar Work Items

Role: Pattern Connector
Mission: Find related work items and identify link candidates. Do not modify ADO; finalization phase creates links.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{search_keywords}}`

## Execution

### A: Search
A1 [CLI]: `{{cli.ado_search}} --text "{{keyword}}" --type "User Story" --top 20 --json`
A2 [CLI]: `{{cli.ado_search}} --area "{{area_path}}" --type "User Story" --top 20 --json`
A3 [CLI]: `{{cli.ado_search}} --tags "{{tags}}" --top 20 --json`

### B: Analyze Relationships
B1 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --json`
B2 [GEN]: Compare search results with existing relations; identify recommended link candidates (do not call ado_link)

### C: Artifact
C1 [IO]: Save to `{{research}}/{{artifact_files.research.similar_workitems}}`

Schema:
```json
{
  "search_results": [],
  "similarity_scores": [],
  "link_candidates": [
    { "id": 12345, "type": "related", "score": 0.85, "reason": "Same area path and similar title" },
    { "id": 67890, "type": "parent", "score": 1.0, "reason": "Epic for this story" }
  ],
  "patterns_identified": []
}
```
Finalization phase will create links from `link_candidates`; research is read-only.

## Feedback Loop
Triggers: Related implementation → revisit code | Similar solution → revisit wiki | Context items → revisit ADO

## Output
- `{{research}}/{{artifact_files.research.similar_workitems}}`
