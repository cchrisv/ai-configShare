# Util – Solution Design Document (Context7)
Role: Solution Architect
Mission: Generate Solution Design Document by aggregating child work item data from ADO + wiki. Supports Feature (1-level) and Epic (2-level).
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **ADO-only data** – all data from ADO APIs and wiki; no local artifacts
- **Cacheable** – save to collected-data.json; re-runs skip to synthesis if cache exists
- **Synthesize across stories** – do NOT produce per-story summaries; aggregate
- **Dual audience** – business sections lead with value; developer sections lead with architecture
- **Single wiki page** – Epic groups by Feature within Requirements Inventory and Appendix
- **CLI-only** – per util-base guardrails
- **Feature or Epic only** – **STOP** if work item type is neither

## Prerequisites [IO]
- `{{work_item_id}}` is a Feature or Epic in ADO
- Children groomed (Description, AC) and solutioned (DevelopmentSummary)
- Child wiki pages at `/WorkItems/{{child_id}}-{{sanitized_title}}` (supplementary)
- **STOP** if type invalid or no children found.

## Templates
Load from `{{paths.templates}}/`:
solution_design_document · solution_design_wiki · wiki_format · field_mappings

## Design Conventions
- **Header**: single gradient bar — `#{{feature_id}} — {{title}}` only
- **`##`**: markdown + 6px gradient accent bar; **`###`**: markdown + 4px lighter accent bar
- **Content**: white bordered cards (`#fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px`)
- **Callouts**: colored left-border accent cards; **Tables**: HTML styled (NOT markdown) — `#f8f9fa` headers
- **NO `<details>/<summary>`**; **Diagrams**: Mermaid `graph TD` only; **`[[_TOC_]]`**: own line outside HTML

## Data Collection Rules
1. **Batching allowed** – combine fetches; process features sequentially
2. **Use arrays + objects** – avoid hashtables with non-string keys
3. **JSON depth 10** – for nested objects
4. **String keys** – if using hashtable, always string keys

## Execution

### Step 1 [IO/CLI] – Init
A1 [IO]: Load shared.json
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --json` — detect type
A3 [LOGIC]: If not Feature/Epic → **STOP**
A4 [IO]: Create temp directory
A5 [LOGIC]: If collected-data.json exists → skip to Step 3

### Step 2 [CLI] – Data Collection

**Feature path** (1-level):
B1 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
B2 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --type child --json` → extract child IDs; **STOP** if none
B3 [CLI]: Per child: `{{cli.ado_get}} {{child_id}} --expand All --comments --json`
B4 [CLI]: Per child: `{{cli.wiki_get}} --path "/WorkItems/{{child_id}}-{{sanitized_title}}" --json`
B5 [IO]: Save → collected-data.json (type="Feature", epic=null, features=[single entry + child_stories])

**Epic path** (2-level):
B6 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
B7 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --type child --json` → extract Feature IDs; **STOP** if none
B8 [CLI]: Per Feature: `{{cli.ado_get}} {{feature_id}} --expand All --comments --json`
B9 [CLI]: Per Feature: `{{cli.ado_relations}} {{feature_id}} --type child --json` → child stories
B10 [CLI]: Per story: `{{cli.ado_get}} {{child_id}} --expand All --comments --json` + `{{cli.wiki_get}}`
B11 [IO]: Save → collected-data.json (type="Epic", epic=populated, features=[each with child_stories])

**Schema:**
```json
{
  "work_item_id": "", "work_item_type": "Epic|Feature", "collected_at": "",
  "epic": { "id": 0, "title": "", "description": "", "business_value": "", "business_objectives": "", "acceptance_criteria": "", "tags": "", "comments": [] },
  "features": [{ "id": 0, "title": "", "description": "", "business_value": "", "business_objectives": "", "acceptance_criteria": "", "tags": "", "comments": [],
    "child_stories": [{ "id": 0, "title": "", "state": "", "description": "", "acceptance_criteria": "", "development_summary": "", "sf_components": "", "tags": "", "comments": [], "wiki_content": null }]
  }],
  "collection_warnings": [],
  "wiki_metadata": { "wiki_path": "", "published_at": "", "feature_count": 0, "child_story_count": 0, "feature_ids": [], "child_story_ids": [] }
}
```
Feature: `epic`=null, `features` has 1 entry. Epic: `epic` populated, `features` has all children.

### Step 3 [GEN] – Analysis & Synthesis
C1 [IO]: Load collected data + document template guide
C2 [GEN]: **Group stories** — Feature: by functional area. Epic: by Feature → functional area.
C3 [GEN]: **Current State** — scan ALL child Descriptions + wiki Research. Single end-to-end narrative.
C4 [GEN]: **Future State** — scan ALL child Descriptions (Goals/BV) + wiki Solution Design. Single narrative.
C5 [GEN]: **Solution Architecture** — extract ALL components from DevelopmentSummary. Unified component table.
C6 [GEN]: **Cross-Concerns** — inter-story/feature dependencies, foundation components, coordination.
C7 [GEN]: **Risks** — collect from wiki + DevelopmentSummary. Deduplicate, aggregate-level risks.

### Step 4 [GEN] – Document Generation
Load wiki HTML template + format guide.
Generate:
1. **Executive Summary** — Feature: from Description/BV/Objectives + child count. Epic: strategic context + features list.
2. **Current State** — from C3. End-to-end narrative.
3. **Future State** — from C4. End-to-end narrative.
4. **Requirements Inventory** — from C2. Feature: by functional area. Epic: by Feature → functional area.
5. **Solution Architecture** — from C5. Unified components. Epic: cross-feature shared + integration.
6. **Implementation Considerations** — from C6. Sequencing, foundations, coordination.
7. **Testing Strategy** — from wiki Testing sections. Cross-story/feature integration needs.
8. **Risks & Dependencies** — from C7. Risk register, external deps.
9. **Appendix: Per-Story Details** — Feature: per-story callout cards. Epic: per Feature → per story.

D1 [IO]: Save document → temp file
D2 [IO]: Save wiki content → temp file

### Step 5 [CLI] – Wiki Publishing
E1 [LOGIC]: Wiki path: Feature → `/Features/{{work_item_id}}-{{sanitized_title}}`; Epic → `/Epics/{{work_item_id}}-{{sanitized_title}}`
E2 [CLI]: `{{cli.wiki_get}} --path "{{wiki_path}}" --json` — check existing
E3 [CLI]: New → `{{cli.wiki_create}} --path "{{wiki_path}}" --content "<temp_file>" --json`
  Existing → `{{cli.wiki_update}} --path "{{wiki_path}}" --content "<temp_file>" --json`
E4 [IO]: Update wiki_metadata in collected-data.json
E5 [CLI]: `{{cli.wiki_get}} --path "{{wiki_path}}" --json` — verify
