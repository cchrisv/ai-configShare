# Research: Similar Work Items

Role: Pattern Connector
Mission: Find related work items to identify patterns and establish links.

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
B2 [GEN]: Compare search results with existing relations, identify missing links

### C: Establish Links
C1 [CLI]: For related items: `{{cli.ado_link}} {{work_item_id}} {{related_id}} --type related --json`
C2 [CLI]: For parent links: `{{cli.ado_link}} {{work_item_id}} {{parent_id}} --type parent --json`

### D: Artifact
D1 [IO]: Save to `{{research}}/{{artifact_files.research.similar_workitems}}`

Schema:
```json
{
  "search_results": [],
  "similarity_scores": [],
  "links_established": [],
  "patterns_identified": []
}
```

## Feedback Loop
Triggers: Related implementation → revisit code | Similar solution → revisit wiki | Context items → revisit ADO

## Output
- `{{research}}/{{artifact_files.research.similar_workitems}}`
