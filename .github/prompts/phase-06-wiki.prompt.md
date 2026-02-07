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

## Protocol
1. Follow `{{paths.templates}}/{{template_files.wiki_format}}`
2. Content from verified artifacts only
3. Idempotent - update existing pages, don't duplicate
4. Link back to source work item

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
