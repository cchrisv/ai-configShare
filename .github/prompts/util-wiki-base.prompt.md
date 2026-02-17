# Util – Wiki Base
Shared wiki section fill workflow. Referenced by all phase prompts that update wiki content.

## Config

Load `wiki_sections` from `{{shared_config}}` → keys = section IDs, each has `filled_by_phase`, `heading`, `emoji`, `level`, `color_from`, `color_to`.

Load `{{paths.standards}}/wiki-section-content-guide.md` for section-specific data sources and content expectations.

## Section Markers

Wiki content uses `<!-- SECTION:id -->` / `<!-- /SECTION:id -->` pairs. Content between markers is replaced; markers themselves are preserved. IDs match `wiki_sections` keys + `status_banner` + `footer`.

## Fill Workflow

Every phase uses this identical 7-step workflow for its wiki sections:

1. **[IO]** Read `{{root}}/wiki-content.md`
2. **[GEN]** For each section where `wiki_sections[id].filled_by_phase` matches current phase:
   - Skip if `{{context_file}}.wiki.creation_audit.sections_generated.{id}` is already `true` (idempotent)
   - Load context fields per `wiki-section-content-guide.md`
   - Generate narrative-first content: 2-4 sentence opening → callouts/tables → transition
   - Use card/callout patterns from `{{template_files.wiki_page_template}}`; colors from `wiki_sections[id]`
   - Omit empty subsections (if context data is absent, skip sub-label — do not render empty cards)
   - Replace content between `<!-- SECTION:id -->` and `<!-- /SECTION:id -->` markers
3. **[IO]** Update status banner between `<!-- SECTION:status_banner -->` markers:
   - Phase done → ✅ | Phase in-progress → ⏳ | Phase pending → ⏸️
4. **[IO]** Write updated `wiki-content.md`
5. **[CLI]** `{{cli.wiki_update}} --path "{{wiki.path}}" --content "{{root}}/wiki-content.md" --json`
6. **[IO]** For each filled section: set `{{context_file}}.wiki.creation_audit.sections_generated.{id}` = `true`
7. **[IO]** Log `"wiki_fill_{phase}"` to `run_state.completed_steps[]`

## Content Rules

- **Narrative-first** — every section leads with 2-4 sentence narrative, then supporting tables/callouts
- **Educational tone** — knowledgeable colleague sharing insights; see `{{template_files.wiki_format}}`
- **No empty sections** — if data is insufficient, omit the sub-label entirely
- **Mermaid** — `::: mermaid` / `:::`, `graph TD` only, no `%%{init}%%` or `classDef`
- **HTML tables** — styled (`#f8f9fa` header, `1px solid #dee2e6` borders), never markdown tables
- **Cards** — white bordered cards (`background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px`)
- **Callouts** — colored left-border accent cards (`border-left: 4px solid ACCENT`)
- **Status badges** — colored spans (`padding: 2px 8px; border-radius: 3px; font-size: 11px`)
