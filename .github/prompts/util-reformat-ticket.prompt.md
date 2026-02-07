# Reformat Ticket (Apply Templates Only)

Purpose: Re-apply rich HTML templates to an existing ADO work item **or wiki page** without changing content. Preserve all meaning and data; only fix formatting, structure, and light copy-edits (typos, grammar). Do not add, remove, or alter substantive content.

## Config
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`

## Input
- `{{work_item_id}}`: Target work item ID (for work item mode)
- `{{wiki_page_id}}`: Target wiki page ID (for wiki mode — mutually exclusive with `{{work_item_id}}`)

**Mode detection**: If `{{wiki_page_id}}` is provided, run in **Wiki mode** (Section W below). If `{{work_item_id}}` is provided, run in **Work Item mode** (Sections B–F below). Exactly one must be provided.

## Guardrails (STRICT)
- **Content preservation**: Extract existing text; preserve all meaning, facts, and data. Do not invent content.
- **Light copy-editing only**: Fix typos, grammar, and punctuation. Do not rewrite, add, or remove substantive content.
- **No metadata changes**: Do NOT modify Title, Tags, State, WorkClassType, or any classification. Only reformat content fields.
- **Empty fields / sections**: If a field or section is empty or missing, skip it; do not invent content.
- **Do NOT**: Add new acceptance criteria, goals, assumptions, or scope items; remove existing content; change business meaning or intent.
- **Wiki pages**: Always update by page ID (`--page-id`) to ensure existing pages are updated — never create new pages.

## Work Item Type -> Fields -> HTML Templates

| Type | Field | Template File |
|------|--------|---------------|
| User Story | Description | `{{paths.templates}}/{{template_files.field_user_story_description}}` |
| User Story | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_user_story_acceptance_criteria}}` |
| Bug / Defect | Description | `{{paths.templates}}/{{template_files.field_bug_description}}` |
| Bug / Defect | Repro Steps | `{{paths.templates}}/{{template_files.field_bug_repro_steps}}` |
| Bug / Defect | System Info | `{{paths.templates}}/{{template_files.field_bug_system_info}}` |
| Bug / Defect | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_bug_acceptance_criteria}}` |
| Feature | Description | `{{paths.templates}}/{{template_files.field_feature_description}}` |
| Feature | Business Value | `{{paths.templates}}/{{template_files.field_feature_business_value}}` |
| Feature | Objectives | `{{paths.templates}}/{{template_files.field_feature_objectives}}` |
| Feature | Acceptance Criteria | `{{paths.templates}}/{{template_files.field_feature_acceptance_criteria}}` |
| All | Development Summary | `{{paths.templates}}/{{template_files.field_solution_design}}` |
| All | Release Notes | `{{paths.templates}}/{{template_files.field_release_notes}}` |

## Wiki Page -> HTML Templates

| Wiki Page Type | Template File | Detection Heuristic |
|----------------|---------------|---------------------|
| Work Item Wiki (Autonomous Ticket Prep) | `{{paths.templates}}/{{template_files.wiki_page_template}}` | Path contains `/WorkItems/` or page header contains "Autonomous Ticket Preparation" |
| Feature Solution Design Wiki | `{{paths.templates}}/{{template_files.feature_solution_design_wiki}}` | Path contains `/Features/` or page header contains "Feature Solution Design" |
| **General Wiki Page** | `{{paths.templates}}/{{template_files.wiki_general_template}}` | **Fallback — any page not matching above patterns** |

Template guides (section structure reference): `{{paths.templates}}/{{template_files.user_story}}`, `{{paths.templates}}/{{template_files.bug}}`, `{{paths.templates}}/{{template_files.feature}}`. See also `{{paths.templates}}/{{template_files.field_mappings}}`.

---

## Execution — Work Item Mode

### A: Init [IO]
A1: Load shared.json (paths, template_files, cli_commands)
A2: Create `{{root}}/reformat` directory if needed (`{{root}}` = `{{paths.artifacts_root}}/{{work_item_id}}`)

### B: Fetch Work Item [CLI]
B1: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
B2: Extract `System.WorkItemType` (User Story | Bug | Defect | Feature)
B3: Extract current values for all content fields applicable to that type (Description, Repro Steps, System Info, Acceptance Criteria, Business Value, Objectives as per table above), plus `Custom.DevelopmentSummary` and `Custom.ReleaseNotes` (apply to all types when present). If type is unsupported, STOP.

### C: Template Selection [LOGIC]
C1: Branch on work item type
C2: Load the field HTML templates for that type from `{{paths.templates}}/`
C3: Load the corresponding template guide (user-story-templates.md, bug-templates.md, or feature-templates.md) for section structure
C4: For Development Summary and Release Notes: load `{{paths.templates}}/{{template_files.field_solution_design}}` and `{{paths.templates}}/{{template_files.field_release_notes}}` when those fields have content (they apply to all work item types).

### D: Reformat [GEN]
For each applicable field that has existing content:
1. Parse existing content: strip old HTML, extract raw text/data per section (Summary, User Story, Goals, steps, GWT clauses, etc.)
2. Fix typos, grammar, and punctuation in the extracted text only
3. Re-populate the rich HTML template with the corrected content; preserve all original data (record IDs, error messages, steps, Given/When/Then, etc.)
4. Do not add or remove items (e.g., same number of AC scenarios, same goals, same steps)

Omit any field that is empty or missing; do not generate content for it.

### E: Artifact [IO]
E1: Build payload with only content fields (no Title, Tags, State, or other metadata). Include only fields that were reformatted.
E2: Save to `{{root}}/reformat/reformat-result.json`

Payload format (include only keys that were reformatted; use exact field paths from shared.json):

```json
{
  "fields": {
    "System.Description": "<html>",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<html>",
    "Microsoft.VSTS.TCM.ReproSteps": "<html>",
    "Microsoft.VSTS.TCM.SystemInfo": "<html>",
    "Custom.BusinessProblemandValueStatement": "<html>",
    "Custom.BusinessObjectivesandImpact": "<html>",
    "Custom.DevelopmentSummary": "<html>",
    "Custom.ReleaseNotes": "<html>"
  }
}
```

### F: Update ADO [CLI]
F1: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{root}}/reformat/reformat-result.json" --json`

---

## Execution — Wiki Mode

### W-A: Init [IO]
W-A1: Load shared.json (paths, template_files, cli_commands)
W-A2: Create `{{wiki_root}}/reformat` directory if needed (`{{wiki_root}}` = `{{paths.artifacts_root}}/wiki-{{wiki_page_id}}`)

### W-B: Fetch Wiki Page [CLI]
W-B1: `{{cli.wiki_get_by_id}} {{wiki_page_id}} --json`
W-B2: Extract the page `path`, `id`, and `content` from the response
W-B3: If the page does not exist or has no content, STOP with error "Wiki page not found or empty"

### W-C: Template Selection [LOGIC]
W-C1: Determine wiki page type using the detection heuristics in the Wiki Page table above:
  - Check the page `path` and content header to classify as **Work Item Wiki**, **Feature Solution Design Wiki**, or **General Wiki Page** (fallback)
  - If the page doesn't match Work Item or Feature Solution Design heuristics, classify as **General Wiki Page**
W-C2: Load the corresponding HTML template from `{{paths.templates}}/`
W-C3: For **General Wiki Page** type, the template (`wiki-general-template.html`) is a **pattern reference**, not a fill-in-the-blanks template. Use it as a design guide to apply the visual conventions to the page's existing structure.

### W-D: Reformat [GEN]

**For Work Item Wiki and Feature Solution Design Wiki templates:**
1. Parse existing wiki content: extract the raw text/data from each section (headers, cards, tables, callouts, etc.)
2. Fix typos, grammar, and punctuation in the extracted text only
3. Re-populate the rich HTML template with the corrected content; preserve all original data (work item IDs, URLs, dates, metrics, table rows, test cases, etc.)
4. Do not add or remove sections, table rows, or list items
5. Preserve all `{{placeholder}}` tokens that are still unfilled (they indicate sections intentionally left for future population)
6. Preserve `[[_TOC_]]` directives exactly as they appear

**For General Wiki Page templates (content-agnostic reformatting):**
1. Extract the page title from the first `#` heading or derive from the page path (replace hyphens with spaces, title-case)
2. Parse existing wiki content: identify all `##` and `###` headings, prose blocks, tables, code blocks, mermaid diagrams, lists, and callouts
3. Fix typos, grammar, and punctuation in the extracted text only — do NOT rewrite, add, remove, or reorder substantive content or section headings
4. Apply the design system from the general template pattern reference:
   - Wrap the title in a gradient header bar (blue gradient: `#1565c0 → #0d47a1`)
   - Add `[[_TOC_]]` on its own line if not already present
   - Add gradient accent bars under every `##` heading (6px) and `###` heading (4px)
   - Wrap all prose, lists, and table content in white bordered content cards
   - Convert all markdown tables to HTML styled tables with `#f8f9fa` header rows
   - Preserve code blocks as-is (they stay outside content cards — ADO Wiki styles them)
   - Preserve mermaid diagrams as-is but change `graph LR` to `graph TD`
   - Remove any `<details>/<summary>` collapsed sections — expand the content to be fully visible
   - Use callout cards (colored left-border) for important notes, warnings, or key insights
5. Do not change section names, section order, or remove any content
6. Do not add new sections or content beyond what already exists on the page

**Color Assignment Strategy (General Wiki Pages):**
Assign accent bar and sub-label colors by semantic meaning of each `##` section heading. If no semantic match, rotate through the palette in order.

| Color | Gradient (##: 6px) | Gradient (###: 4px) | Semantic Match |
|-------|-------------------|---------------------|----------------|
| Green | `#2e7d32 → #1b5e20` | `#43a047 → #2e7d32` | Summary, Overview, Executive Summary, Introduction, Goals |
| Blue | `#1565c0 → #0d47a1` | `#42a5f5 → #1565c0` | Architecture, Design, Information, Current State |
| Purple | `#7b1fa2 → #4a148c` | `#ab47bc → #7b1fa2` | Analysis, Research, Investigation, Discovery, Code Analysis |
| Orange | `#e65100 → #bf360c` | `#ef6c00 → #e65100` | Issues, Warnings, Considerations, Recommendations |
| Red | `#c62828 → #b71c1c` | `#ef5350 → #c62828` | Critical, Risks, Security, Blockers |
| Indigo | `#303f9f → #1a237e` | `#5c6bc0 → #303f9f` | Solution, Implementation, Components, Technical |
| Teal | `#00796b → #004d40` | `#26a69a → #00796b` | Testing, Quality, Validation, Metrics, Logging |
| Brown | `#5d4037 → #3e2723` | `#795548 → #5d4037` | Appendix, References, History, Changelog, Conclusion |

Rotation order when no semantic match: Green, Blue, Purple, Orange, Indigo, Teal, Brown, Red (repeat cycle for additional sections).

**Wiki Template Design Conventions (STRICT):**
- **Page header**: Single gradient bar with ticket # and title only — `<div style="background: linear-gradient(...); border-radius: 8px; padding: 14px 16px;">`. No "View Work Item" links. No Work Item Details section.
- **`##` section headers**: Use markdown `##` (for TOC detection), followed immediately by a **6px** gradient accent bar: `<div style="height: 6px; background: linear-gradient(135deg, COLOR1 0%, COLOR2 100%); border-radius: 3px; margin: 0 0 16px 0;"></div>`
- **`###` subsection headers**: Use markdown `###` (for TOC detection), followed immediately by a **4px** gradient accent bar: `<div style="height: 4px; background: linear-gradient(135deg, COLOR1 0%, COLOR2 100%); border-radius: 2px; margin: 0 0 12px 0;"></div>`
- **Content cards**: ALL content must be inside white bordered cards: `background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #333;`
- **Callout cards**: Colored left-border accent cards inside content cards: `background: TINT; border-left: 4px solid ACCENT; border-radius: 0 8px 8px 0; padding: 14px;`
- **Tables**: ALL tables must use HTML styled tables (NOT markdown tables) with `#f8f9fa` header rows, `1px solid #dee2e6` borders, `padding: 10px`
- **Status badges**: Use colored spans: `<span style="background: COLOR; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 11px;">LABEL</span>`
- **Section sub-labels**: Bold colored text with border-bottom: `font-weight: 600; color: COLOR; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #dee2e6;`
- **NO collapsed sections**: Never use `<details>/<summary>` — all content must be fully visible
- **Mermaid diagrams**: Always use `graph TD` (top-down), never `graph LR`

### W-E: Artifact [IO]
W-E1: Save the reformatted wiki content to `{{wiki_root}}/reformat/wiki-reformat-result.md`

### W-F: Update Wiki Page [CLI]
W-F1: `{{cli.wiki_update_by_id}} {{wiki_page_id}} --content "{{wiki_root}}/reformat/wiki-reformat-result.md" --comment "Reformat: re-applied HTML template" --json`

**Important**: The `--page-id` flag uses the PATCH API endpoint which only updates existing pages. It will fail if the page does not exist, ensuring no accidental page creation.

## Output

### Work Item Mode
- `{{root}}/reformat/reformat-result.json` (content fields only)
- ADO work item updated with reformatted HTML; meaning and data unchanged

### Wiki Mode
- `{{wiki_root}}/reformat/wiki-reformat-result.md` (reformatted wiki content)
- Wiki page updated in-place with reformatted HTML; meaning and data unchanged
