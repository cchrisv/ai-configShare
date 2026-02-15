# Apply Template (Reformat Only)
Mission: Re-apply HTML templates to ADO work item or wiki page. Preserve meaning; fix formatting only.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}` (work item) OR `{{wiki_page_id}}` (wiki) — one required.

## Constraints (STRICT)
- **Content preservation** – preserve all meaning, facts, data. Never invent.
- **Light copy-editing only** – fix typos, grammar, punctuation. Never rewrite.
- **No metadata changes** – never modify Title, Tags, State, WorkClassType.
- **Empty = skip** – if field/section empty, skip it.
- **Never add** AC, goals, assumptions, scope items.
- **Wiki: update by page ID only** – never create new pages.
- **CLI-only** – per util-base guardrails
- **Template-engine only** – per util-base guardrails #7-8. NEVER generate raw HTML. Use `template-tools scaffold` → fill JSON slots → `template-tools render` → `template-tools validate` for all ADO field updates.

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `template_files.*`, `field_paths.*`

## Work Item Field Templates
Load from `{{paths.templates}}/` (use `{{template_files.*}}` keys):

| Type | Fields → Template Keys |
|------|----------------------|
| User Story | Description → `{{template_files.field_user_story_description}}` · AC → `{{template_files.field_user_story_acceptance_criteria}}` |
| Bug/Defect | Description → `{{template_files.field_bug_description}}` · Repro → `{{template_files.field_bug_repro_steps}}` · SysInfo → `{{template_files.field_bug_system_info}}` · AC → `{{template_files.field_bug_acceptance_criteria}}` |
| Feature | Description → `{{template_files.field_feature_description}}` · BV → `{{template_files.field_feature_business_value}}` · Objectives → `{{template_files.field_feature_objectives}}` · AC → `{{template_files.field_feature_acceptance_criteria}}` |
| All types | DevelopmentSummary → `{{template_files.field_solution_design}}` · ReleaseNotes → `{{template_files.field_release_notes}}` |

## Wiki Page Templates
| Type | Template Key | Detection |
|------|-------------|-----------|
| Work Item Wiki | `{{template_files.wiki_page_template}}` | Path contains `/WorkItems/` or header "Autonomous Ticket Preparation" |
| Feature Solution Design | `{{template_files.solution_design_wiki}}` | Path contains `/Features/` or header "Feature Solution Design" |
| **General (fallback)** | `{{template_files.wiki_general_template}}` | Any page not matching above — pattern reference only |

## Design Conventions (from `{{template_files.wiki_format}}`)
- **Header**: single gradient bar — ticket # + title only
- **`##`**: markdown + 6px gradient accent bar
- **`###`**: markdown + 4px gradient accent bar (lighter)
- **Content**: white bordered cards (`#fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px`)
- **Callouts**: colored left-border accent cards
- **Tables**: HTML styled (NOT markdown) — `#f8f9fa` headers, `1px solid #dee2e6` borders
- **Status badges**: `<span style="background:COLOR;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;">LABEL</span>`
- **Sub-labels**: `font-weight:600;color:COLOR;border-bottom:1px solid #dee2e6`
- **NO `<details>/<summary>`**; **Diagrams**: Mermaid `graph TD` only; **`[[_TOC_]]`**: own line outside HTML

## Color Palette (Wiki — semantic)
| Color | ## gradient | ### gradient | Sections |
|-------|-----------|-------------|----------|
| Green | `#2e7d32→#1b5e20` | `#43a047→#2e7d32` | Summary, Overview, Goals |
| Blue | `#1565c0→#0d47a1` | `#42a5f5→#1565c0` | Architecture, Design, Current State |
| Purple | `#7b1fa2→#4a148c` | `#ab47bc→#7b1fa2` | Analysis, Research, Discovery |
| Orange | `#e65100→#bf360c` | `#ef6c00→#e65100` | Issues, Warnings, Recommendations |
| Red | `#c62828→#b71c1c` | `#ef5350→#c62828` | Critical, Risks, Security, Blockers |
| Indigo | `#303f9f→#1a237e` | `#5c6bc0→#303f9f` | Solution, Implementation, Technical |
| Teal | `#00796b→#004d40` | `#26a69a→#00796b` | Testing, Quality, Validation |
| Brown | `#5d4037→#3e2723` | `#795548→#5d4037` | Appendix, References, Changelog |

Rotation (no semantic match): Green, Blue, Purple, Orange, Indigo, Teal, Brown, Red.

---

## Execution — Work Item Mode

### Step 1 [IO/CLI] – Fetch & Detect
A1 [IO]: Load `#file:config/shared.json`
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A3 [LOGIC]: Extract `System.WorkItemType` → select template set from table above → **STOP** if unsupported type
A4 [LOGIC]: Extract current content for each mapped field (Description, AC, DevelopmentSummary, etc.)
A5 [IO]: Load field HTML templates from `{{paths.templates}}/` for the detected type

### Step 2 [CLI/GEN] – Scaffold & Fill
Per field with existing content:
B1 [CLI]: `{{cli.template_scaffold}} --template <template_key> --json` → get fill spec with slot shapes
B2 [GEN]: Extract raw text/data from current field HTML into fill spec JSON slots:
  - Fix typos, grammar, punctuation only — never rewrite
  - Preserve all data (IDs, error messages, GWT clauses, steps)
  - Same item count — never add/remove
  - Fill `text` slots with plain text; `html` slots with existing HTML content
  - Fill `list` items, `table` rows, `repeatable_block` blocks matching current content
B3 [IO]: Save filled spec to temp file (e.g., `.temp/{{work_item_id}}-<field>-filled.json`)

Skip empty/missing fields entirely.

### Step 3 [CLI] – Render, Validate & Update
Per filled field:
C1 [CLI]: `{{cli.template_render}} --template <template_key> --fill-spec "<filled_spec_file>" --json` → rendered HTML
C2 [CLI]: `{{cli.template_validate}} --template <template_key> --rendered "<rendered_file>" --json` → confirm no unfilled tokens, gradients intact
C3 [LOGIC]: If validation fails → review fill spec, fix, re-render. **STOP** after 2 failures.

After all fields rendered and validated:
C4 [IO]: Build JSON payload — `{ "<field_path>": "<rendered_html>", ... }` for each field
  - Use `{{field_paths.*}}` for ADO field paths (e.g., `{{field_paths.description}}`, `{{field_paths.acceptance_criteria}}`)
C5 [IO]: Save payload to temp `.json` file
C6 [CLI]: `{{cli.ado_update}} {{work_item_id}} --fields-file "<temp_file>" --json`

On error: log error; retry once; **STOP** on second failure.

### Step 4 [CLI] – Verify
D1 [CLI]: `{{cli.ado_get}} {{work_item_id}} --fields "System.Description,Microsoft.VSTS.Common.AcceptanceCriteria" --json`
D2 [LOGIC]: Confirm fields contain the new HTML structure (gradient headers, styled cards)

---

## Execution — Wiki Mode

### Step 1 [IO/CLI] – Fetch & Detect
W1 [IO]: Load `#file:config/shared.json`
W2 [CLI]: `{{cli.wiki_get_by_id}} {{wiki_page_id}} --json` → extract path, id, content; **STOP** if not found
W3 [LOGIC]: Classify page type from table above; load corresponding template from `{{paths.templates}}/`

### Step 2 [GEN] – Reformat

**Work Item / Feature Solution Design wiki:**
1. Extract raw text/data from each section
2. Fix typos, grammar, punctuation only
3. Re-populate HTML template; preserve all data
4. Never add/remove sections, rows, or items
5. Preserve `{{placeholder}}` tokens and `[[_TOC_]]` directives

**General wiki:**
1. Extract title from `#` heading or derive from path
2. Parse headings, prose, tables, code blocks, mermaid, lists, callouts
3. Fix typos/grammar only — never rewrite, add, remove, or reorder
4. Apply design system: gradient header → `[[_TOC_]]` → accent bars → content cards → HTML tables → callouts → expand `<details>` → `graph LR` → `graph TD`
5. Assign colors by semantic palette; rotate when no match
6. Never change section names, order, or remove content

### Step 3 [IO/CLI] – Save & Update
W4 [IO]: Save reformatted content → temp `.md` file
W5 [CLI]: `{{cli.wiki_update_by_id}} {{wiki_page_id}} --content "<temp_file>" --comment "Reformat: re-applied HTML template" --json`

On error: log error; retry once; **STOP** on second failure.

### Step 4 [CLI] – Verify
W6 [CLI]: `{{cli.wiki_get_by_id}} {{wiki_page_id}} --no-content --json` — confirm page exists and was updated
