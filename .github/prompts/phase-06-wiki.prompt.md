# Wiki Documentation Creation

Role: Technical Writer
Mission: Create wiki documentation from workflow artifacts.
Output: Wiki page published to Azure DevOps Wiki.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`, `{{wiki_path}}` (optional)

## Prerequisites
- `{{solutioning}}/solution-design.json` exists
- `{{solutioning}}/technical-spec.md` exists
- `{{grooming}}/grooming-result.json` exists

## Templates
| Type | File |
|------|------|
| Wiki Format Guide | `{{paths.templates}}/{{template_files.wiki_format}}` |
| Wiki Page HTML | `{{paths.templates}}/{{template_files.wiki_page_template}}` |

## Protocol
1. Follow `{{paths.templates}}/{{template_files.wiki_format}}` for formatting standards
2. Use `{{paths.templates}}/{{template_files.wiki_page_template}}` for rich HTML styling (see design conventions below)
3. Content from verified artifacts only
4. Idempotent - update existing pages, don't duplicate

## Wiki Template Design Conventions
- **Page header**: Single gradient bar with `#{{work_item_id}} — {{title}}` only. No "View Work Item" links, no metadata.
- **`##` section headers**: Markdown `##` for TOC + **6px** gradient accent bar immediately below
- **`###` subsection headers**: Markdown `###` for TOC + **4px** gradient accent bar immediately below (lighter shade of parent)
- **Content**: ALL content in white bordered cards (`background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;`)
- **Callouts**: Colored left-border accent cards inside content cards
- **Tables**: HTML styled (NOT markdown) with `#f8f9fa` header rows, `1px solid #dee2e6` borders
- **NO collapsed sections**: Never use `<details>/<summary>` — all content fully visible
- **Diagrams**: Mermaid `graph TD` (top-down), never `graph LR`
- **`[[_TOC_]]`**: Must be on its own line outside any HTML block

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Load run state, verify solutioning complete
A3 [LOGIC]: If prerequisites missing, STOP
A4 [IO]: Create `{{wiki}}`, load solution artifacts

### B: Content Generation [GEN]
B1 [IO]: Load wiki template
B2 [GEN]: Transform artifacts to wiki markdown:
  - Overview (from grooming)
  - Technical Solution (from solution design)
  - Component Details
  - Implementation Notes (from tech spec)
  - Related Work Items
B3 [LOGIC]: Derive wiki path if not provided: `/WorkItems/{{work_item_id}}-{{sanitized_title}}`

### C: Wiki Operations
C1 [IO]: Save to `{{wiki}}/{{artifact_files.wiki.generated_content}}`
C2 [CLI]: Check existing: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`
C3 [CLI]: Create or update:
  - New: `{{cli.wiki_create}} --path "{{wiki_path}}" --content "{{wiki}}/{{artifact_files.wiki.generated_content}}" --json`
  - Existing: `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{wiki}}/{{artifact_files.wiki.generated_content}}" --json`
C4 [IO]: Save metadata to `{{wiki}}/{{artifact_files.wiki.wiki_metadata}}`

### D: Verify
D1 [CLI]: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`
D2 [IO]: Update run state

## Output
- `{{wiki}}/generated-content.md`
- `{{wiki}}/wiki-metadata.json`
- Wiki page at `{{wiki_path}}`
