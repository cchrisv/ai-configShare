# Solution Design Document

Role: Solution Architect
Mission: Generate a comprehensive Solution Design Document by aggregating all child work item data from ADO and wiki. Supports Feature (1-level: Feature -> User Stories) and Epic (2-level: Epic -> Features -> User Stories) hierarchies.
Output: Solution design document (local artifact) and published wiki page.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Load: `#file:config/shared.json`
Input: `{{work_item_id}}`

## Prerequisites
- `{{work_item_id}}` is a Feature or Epic work item in ADO
- All child user stories have been groomed (Description, AC populated) and solutioned (DevelopmentSummary populated)
- Child user story wiki pages exist at `/WorkItems/{{child_id}}-{{sanitized_title}}`

## Templates
| Type | File |
|------|------|
| Document Guide | `{{paths.templates}}/{{template_files.solution_design_document}}` |
| Wiki HTML | `{{paths.templates}}/{{template_files.solution_design_wiki}}` |
| Wiki Format Guide | `{{paths.templates}}/{{template_files.wiki_format}}` |
| Field Mappings | `{{paths.templates}}/{{template_files.field_mappings}}` |

## Protocol
1. All data comes from ADO APIs and wiki -- no local artifacts expected
2. Cache fetched data in `collected-data.json` so re-runs can skip re-fetching
3. Synthesize across stories -- do NOT produce per-story summaries in main sections
4. Dual-audience document: business sections lead with value/impact, developer sections lead with architecture/components
5. Follow narrative-first writing style from `{{paths.templates}}/{{template_files.wiki_format}}`
6. Follow wiki template design conventions (see below)

## Wiki Template Design Conventions
- **Page header**: Single gradient bar with `#{{feature_id}} — {{title}}` only. No links, no metadata.
- **`##` section headers**: Markdown `##` for TOC + **6px** gradient accent bar immediately below
- **`###` subsection headers**: Markdown `###` for TOC + **4px** gradient accent bar immediately below (lighter shade of parent)
- **Content**: ALL content in white bordered cards (`background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;`)
- **Callouts**: Colored left-border accent cards inside content cards
- **Tables**: HTML styled (NOT markdown) with `#f8f9fa` header rows, `1px solid #dee2e6` borders
- **NO collapsed sections**: Never use `<details>/<summary>` — all content fully visible
- **Diagrams**: Mermaid `graph TD` (top-down), never `graph LR`
- **`[[_TOC_]]`**: Must be on its own line outside any HTML block
6. Single ADO wiki page output (no multi-page structure)
7. When operating at Epic level, group by Feature within Requirements Inventory and Appendix sections

## Data Collection Guidelines

**IMPORTANT:** Data collection involves many CLI calls across potentially dozens of work items. Follow these rules to avoid scripting errors:

1. **Batching is allowed** -- You may combine fetches into a single loop script for efficiency. Process features sequentially within the loop, fetching each feature's children before moving to the next.
2. **Use arrays and `[PSCustomObject]`** for accumulating results -- Do NOT use `Hashtable` or `@{}` dictionaries as data containers for JSON serialization. `ConvertTo-Json` does not support non-string dictionary keys and will throw a serialization error. Use `@()` arrays with `[PSCustomObject]` entries instead.
3. **Use `ConvertTo-Json -Depth 10`** (or higher) -- Nested objects require sufficient depth for proper serialization.
4. **If you must use a dictionary/hashtable**, always use **string keys** (e.g., `$map["$id"]` not `$map[$id]`).

## Execution

### A: Init
A1 [IO]: Load shared.json, extract paths, CLI commands, artifact file names
A2 [CLI]: Fetch work item and detect type: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A3 [LOGIC]: Extract `System.WorkItemType`. If type is not "Feature" AND not "Epic", STOP with error: "Phase 10 requires a Feature or Epic work item."
A3a [LOGIC]: Set `{{work_item_type}}` to "Feature" or "Epic" for branching logic throughout execution
A4 [IO]: Create output directory `{{root}}/solution-design/`
A5 [LOGIC]: If `{{root}}/solution-design/{{artifact_files.solution_design.collected_data}}` exists, skip to Step C (use cached data)

### B: Data Collection [CLI]

#### B-Feature: Feature Path (1-level)
_Execute this block when `{{work_item_type}}` == "Feature"_

B1 [CLI]: Fetch feature with comments: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
B2 [CLI]: Get child relations: `{{cli.ado_relations}} {{work_item_id}} --type child --json`
B3 [LOGIC]: Extract child work item IDs from relations. If no children found, STOP with error
B4 [CLI]: For each child ID, fetch full work item with comments:
  `{{cli.ado_get}} {{child_id}} --expand All --comments --json`
B5 [CLI]: For each child, attempt to fetch wiki page:
  `{{cli.wiki_get}} --path "/WorkItems/{{child_id}}-{{sanitized_title}}" --json`
  Note: Sanitize title by replacing spaces with hyphens, removing special characters. If wiki page not found, log warning and continue -- wiki content is supplementary.
B6 [IO]: Save to collected-data.json. Set `work_item_type` to "Feature", set `epic` to null, populate `features` array with a single entry containing the feature data and its `child_stories`.

#### B-Epic: Epic Path (2-level)
_Execute this block when `{{work_item_type}}` == "Epic"_

B7 [CLI]: Fetch epic with comments: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
B8 [CLI]: Get child features: `{{cli.ado_relations}} {{work_item_id}} --type child --json`
B9 [LOGIC]: Extract child Feature IDs from relations. If no children found, STOP with error
B10 [CLI]: For each Feature ID, fetch full work item with comments:
  `{{cli.ado_get}} {{feature_id}} --expand All --comments --json`
B11 [CLI]: For each Feature, get its child user stories:
  `{{cli.ado_relations}} {{feature_id}} --type child --json`
B12 [CLI]: For each user story under each Feature, fetch work item and wiki page:
  `{{cli.ado_get}} {{child_id}} --expand All --comments --json`
  `{{cli.wiki_get}} --path "/WorkItems/{{child_id}}-{{sanitized_title}}" --json`
  Note: Same sanitization and graceful degradation as B5.
B13 [IO]: Save to collected-data.json. Set `work_item_type` to "Epic", populate `epic` with the epic data, populate `features` array with each feature and its `child_stories`.


#### Collected Data Schema (unified)

```json
{
  "work_item_id": "{{work_item_id}}",
  "work_item_type": "Epic|Feature",
  "collected_at": "{{iso_timestamp}}",
  "epic": null,
  "features": [
    {
      "id": 0,
      "title": "",
      "description": "",
      "business_value": "",
      "business_objectives": "",
      "acceptance_criteria": "",
      "tags": "",
      "comments": [],
      "child_stories": [
        {
          "id": 0,
          "title": "",
          "state": "",
          "description": "",
          "acceptance_criteria": "",
          "development_summary": "",
          "sf_components": "",
          "tags": "",
          "comments": [],
          "wiki_content": null
        }
      ]
    }
  ],
  "collection_warnings": []
}
```

When `work_item_type` is "Feature": `epic` is null, `features` contains one entry (the feature itself with its child stories).
When `work_item_type` is "Epic": `epic` is populated with the epic's data, `features` contains all child features each with their own child stories.

Epic schema (when populated):
```json
{
  "id": 0,
  "title": "",
  "description": "",
  "business_value": "",
  "business_objectives": "",
  "acceptance_criteria": "",
  "tags": "",
  "comments": []
}
```

### C: Analysis and Synthesis [GEN]
C1 [IO]: Load collected data from `{{root}}/solution-design/{{artifact_files.solution_design.collected_data}}`
C2 [IO]: Load document template guide: `{{paths.templates}}/{{template_files.solution_design_document}}`
C3 [GEN]: **Group user stories.** When Feature: group by functional area (analyze Tags, SFComponents, Description). When Epic: group first by Feature, then by functional area within each Feature. Each group should have a name and brief description.
C4 [GEN]: **Synthesize Current State.** Scan ALL child story Descriptions and wiki Research sections across ALL features for current-state references (existing processes, pain points, "today" language). Merge into a single end-to-end narrative organized by process flow, not by story or feature. When Epic: the narrative should span the entire initiative.
C5 [GEN]: **Synthesize Future State.** Scan ALL child story Descriptions (Goals & Business Value) and wiki Solution Design sections across ALL features for future-state references. Merge into a single end-to-end narrative showing how things will work after implementation. When Epic: describe the full transformation across all features.
C6 [GEN]: **Aggregate Solution Architecture.** Extract all components from ALL child DevelopmentSummary fields across ALL features. Build unified component table, identify shared components (appearing in multiple stories or across multiple features), merge integration points, consolidate design decisions. When Epic: explicitly note cross-feature shared components and cross-feature integration points.
C7 [GEN]: **Identify Cross-Story and Cross-Feature Concerns.** Analyze dependencies between stories (and between features when Epic), identify foundation components to build first, note coordination points between developers. When Epic: identify inter-feature dependencies and sequencing.
C8 [GEN]: **Aggregate Risks.** Collect risks from all wiki pages and DevelopmentSummary fields across ALL features. Deduplicate, identify risks visible only at aggregate level (feature-level or epic-level), list external dependencies. When Epic: identify cross-feature risks.

### D: Document Generation [GEN]
D1 [IO]: Load wiki HTML template: `{{paths.templates}}/{{template_files.solution_design_wiki}}`
D2 [IO]: Load wiki format guide: `{{paths.templates}}/{{template_files.wiki_format}}`
D3 [GEN]: Generate the solution design document following the template guide structure:
  1. **Executive Summary** -- When Feature: from feature Description, Business Value, Objectives. When Epic: from epic's strategic context, list constituent features with brief descriptions. Add total child story count and functional area summary.
  2. **Current State - End-to-End** -- From C4 synthesis. Describe business processes today, current system landscape, pain points. Narrative spans the entire scope regardless of Feature or Epic level.
  3. **Future State - End-to-End** -- From C5 synthesis. Describe future business processes, new system landscape, capabilities gained. Narrative spans the entire scope.
  4. **Requirements Inventory** -- From C3 grouping. When Feature: stories grouped by functional area. When Epic: stories grouped by Feature first (separate section per Feature), then by functional area within each Feature. Include inter-story and inter-feature dependencies.
  5. **Solution Architecture** -- From C6 aggregation. Unified component landscape, cross-story integration points, design decisions. When Epic: identify cross-feature shared components (components appearing in stories under different features) and cross-feature integration points.
  6. **Implementation Considerations** -- From C7 analysis. Sequencing, foundation stories, standards, coordination points. When Epic: include inter-feature sequencing and coordination.
  7. **Testing Strategy Overview** -- From wiki Testing sections. Test approach, cross-story integration testing needs. When Epic: cross-feature integration testing needs.
  8. **Risks and Dependencies** -- From C8 aggregation. Risk register, external dependencies, open unknowns. When Epic: cross-feature risks.
  9. **Appendix: Per-Story Solution Details** -- When Feature: per-story callout card with its DevelopmentSummary (all visible, no collapsed sections). When Epic: section per Feature, containing per-story cards within each Feature.
D4 [IO]: Save document as `{{root}}/solution-design/{{artifact_files.solution_design.solution_design_doc}}`
D5 [IO]: Save wiki-formatted content as `{{root}}/solution-design/{{artifact_files.solution_design.wiki_content}}`

### E: Wiki Publishing [CLI]
E1 [LOGIC]: Derive wiki path based on type:
  - Feature: `/Features/{{work_item_id}}-{{sanitized_title}}`
  - Epic: `/Epics/{{work_item_id}}-{{sanitized_title}}`
E2 [CLI]: Check if wiki page exists: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`
E3 [CLI]: Create or update wiki page:
  - New: `{{cli.wiki_create}} --path "{{wiki_path}}" --content "{{root}}/solution-design/{{artifact_files.solution_design.wiki_content}}" --json`
  - Existing: `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{root}}/solution-design/{{artifact_files.solution_design.wiki_content}}" --json`
E4 [IO]: Save wiki metadata to `{{root}}/solution-design/{{artifact_files.solution_design.wiki_metadata}}`

Wiki metadata schema:
```json
{
  "work_item_id": "{{work_item_id}}",
  "work_item_type": "Feature|Epic",
  "wiki_path": "{{wiki_path}}",
  "published_at": "{{iso_timestamp}}",
  "feature_count": 0,
  "child_story_count": 0,
  "feature_ids": [],
  "child_story_ids": []
}
```

E5 [CLI]: Verify wiki page: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`

## Output
- `{{root}}/solution-design/collected-data.json`
- `{{root}}/solution-design/solution-design.md`
- `{{root}}/solution-design/wiki-content.md`
- `{{root}}/solution-design/wiki-metadata.json`
- Wiki page at `/Features/{{work_item_id}}-{{sanitized_title}}` (Feature) or `/Epics/{{work_item_id}}-{{sanitized_title}}` (Epic)
