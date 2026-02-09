# Phase 04 – Wiki Documentation (Multi-Pass)
Role: Technical Writer
Mission: Create wiki documentation from workflow artifacts using incremental generation passes.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`, `{{wiki_path}}` (optional)

## Constraints
- **Multi-pass generation** – generate wiki in 5 discrete passes; each pass loads only the context it needs
- **Selective context loading** – NEVER load all context sections at once; each pass specifies exactly what to read
- **Resumable** – track each pass completion in `run_state.completed_steps[]`; on re-entry, skip completed passes
- **Artifact-only content** – all content from verified research + grooming + solutioning artifacts
- **Idempotent** – update existing pages, never duplicate
- **CLI-only** – per util-base guardrails
- **Outputs to** `{{context_file}}.wiki.*` and `.ai-artifacts/{{work_item_id}}/wiki-content.md`

## Design Conventions
Per `{{template_files.wiki_format}}` — load the relevant section of this file for each pass to get color codes, card styles, callout patterns, Mermaid rules, and narrative tone guidelines. Do NOT load the entire format file at once.

---

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `template_files.*`, `ado_defaults.*`
A2 [IO]: Load {{context_file}} → verify:
  - `.research` exists (synthesis, salesforce_metadata, web_research)
  - `.grooming` exists (classification, templates_applied)
  - `.solutioning` exists (option_analysis, solution_design, traceability, testing)
  - `.metadata.phases_completed` includes `"solutioning"`
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

### Resume Check
A4 [LOGIC]: Scan `run_state.completed_steps[]` for wiki pass markers:
  - `pass_1_structure_summary`
  - `pass_2_research_investigation`
  - `pass_3_solution_decisions`
  - `pass_4_quality_testing`
  - `pass_5_assembly_publish`

If markers found, **skip to the first incomplete pass**. The wiki-content.md file on disk contains all previously generated content. Do NOT re-generate completed passes.

A5 [LOGIC]: **Determine wiki template** — use `wiki_page_template` for work items, `solution_design_wiki` for Features.

A6 [LOGIC]: **Derive wiki path** if not provided:
  - Primary object from `.research.salesforce_metadata.schema.objects[0].name`
  - Path: `/CRM-Home/{{primary_object_area}}/{{work_item_id}} {{sanitized_title}}`
  - Sanitize: replace special characters, limit length

---

## Pass 1 [IO/GEN] – Page Structure, Executive Summary, Understanding the Request

### Context to Load
P1-A [IO]: Read `.research.synthesis.unified_truth`
P1-B [IO]: Read `.grooming.classification`
P1-C [IO]: Read `.grooming.templates_applied.applied_content`

### Template to Reference
P1-D [IO]: Load page header and Executive Summary section structure from `{{template_files.wiki_page_template}}`
P1-E [IO]: Load Executive Summary and Understanding the Request formatting guidance from `{{template_files.wiki_format}}` (Green + Blue color sections only)

### Generate
P1-F [GEN]: Transform artifacts into wiki markdown for these sections:
  - **Page Header** — gradient bar with `#{{work_item_id}} — {{title}}`, `[[_TOC_]]`
  - **Executive Summary** — from synthesis + classification: challenge, discoveries, recommended approach, path forward
  - **Understanding the Request** — from applied_content: business context, stakeholders, current situation, success criteria, functional requirements, quality attributes

### Save
P1-G [IO]: Write generated content to `.ai-artifacts/{{work_item_id}}/wiki-content.md` (create/overwrite)
P1-H [IO]: Append `{"phase":"wiki","step":"pass_1_structure_summary","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

---

## Pass 2 [IO/GEN] – Research, Investigation Trail, Stakeholders & Impact

### Context to Load
P2-A [IO]: Read `.research.salesforce_metadata`
P2-B [IO]: Read `.research.dependency_discovery`
P2-C [IO]: Read `.research.web_research`
P2-D [IO]: Read `.research.team_impact`
P2-E [IO]: Read `.research.dependency_discovery.role_impact_analysis`

### Template to Reference
P2-F [IO]: Load Discovery & Research, Investigation Trail, and Stakeholders section structure from `{{template_files.wiki_page_template}}`
P2-G [IO]: Load Purple (Research) and Orange (Investigation) formatting guidance from `{{template_files.wiki_format}}`

### Generate
P2-H [GEN]: Transform artifacts into wiki markdown for these sections:
  - **Discovery & Research** — from wiki_search, salesforce_metadata, web_research: existing knowledge, technical environment, metadata dependencies, codebase components, related work items, potential duplicates
  - **Investigation & Discovery Trail** — from salesforce_metadata.investigation_trail + assumptions: journey narrative, hypothesis testing, rethinks, conflicting info resolution, confidence assessment
  - **Stakeholders & Impact** — from team_impact + role_impact_analysis: impacted roles/profiles table, coordination contacts table, testing implications by role

### Save
P2-I [IO]: **Append** generated content to `.ai-artifacts/{{work_item_id}}/wiki-content.md`
P2-J [IO]: Append `{"phase":"wiki","step":"pass_2_research_investigation","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

---

## Pass 3 [IO/GEN] – Solution Design, Decision Rationale

### Context to Load
P3-A [IO]: Read `.solutioning.option_analysis`
P3-B [IO]: Read `.solutioning.solution_design`
P3-C [IO]: Read `.solutioning.technical_spec`

### Template to Reference
P3-D [IO]: Load Solution Design and Decision Rationale section structure from `{{template_files.wiki_page_template}}`
P3-E [IO]: Load Indigo (Solution) and Brown (Decision) formatting guidance from `{{template_files.wiki_format}}`

### Generate
P3-F [GEN]: Transform artifacts into wiki markdown for these sections:
  - **Solution Design** — from solution_design + technical_spec: overview narrative, architectural approach, component table, data flow, integration points, security considerations. Include Mermaid `graph TD` diagram for architecture.
  - **Decision Rationale** — from option_analysis: options evaluated with Trusted/Easy/Adaptable scoring, recommended option, eliminated options with reasoning, standards influence, trade-offs, roads not taken

### Save
P3-G [IO]: **Append** generated content to `.ai-artifacts/{{work_item_id}}/wiki-content.md`
P3-H [IO]: Append `{"phase":"wiki","step":"pass_3_solution_decisions","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

---

## Pass 4 [IO/GEN] – Quality & Validation (Testing)

### Context to Load
P4-A [IO]: Read `.solutioning.testing` (test_data_matrix, test_cases, ac_coverage_matrix)
P4-B [IO]: Read `.solutioning.traceability`
P4-C [IO]: Read `.grooming.templates_applied.applied_content.acceptance_criteria`

### Template to Reference
P4-D [IO]: Load Quality & Validation section structure from `{{template_files.wiki_page_template}}` (lines 403+)
P4-E [IO]: Load Teal (Quality/Testing) formatting guidance and full test case template from `{{template_files.wiki_format}}` (Quality & Validation section onward)

### Generate
P4-F [GEN]: Generate the complete Quality & Validation section following the testing structure defined in the loaded templates. This is the largest section — follow the template precisely for each subsection:

  1. **How We'll Know We're Successful** — user-facing + system requirements from AC
  2. **Testing Strategy & Coverage** — 2-3 paragraph testing philosophy narrative
  3. **AC-Centric Test Coverage Matrix** — every AC mapped to happy/unhappy path tests with coverage status (Full/Partial/Gap) and path type legend
  4. **Test Data Matrix** — personas, profiles, permissions, record contexts, feature flags. Detailed per-persona breakdowns with setup instructions
  5. **P1 Critical Path Tests** — summary table + detailed per-test-case format: objective, path type, AC coverage, pre-conditions, step-by-step execution table, verification checklist, telemetry/logs, cleanup, Developer Validation (unit test pattern + assertions + mocks), QA Validation (navigation + data query + visual checkpoints + environment)
  6. **P2 Important Tests** — same detailed format as P1
  7. **P3 Additional Coverage** — same detailed format as P1
  8. **Test Data Setup Guide** — actionable setup procedure for testers
  9. **Requirements Traceability Matrix** — AC-to-test cross-reference
  10. **Assumptions Resolution Log** — from all phases with status tracking
  11. **Quality Corrections Applied** — solution bias removed, template fidelity, logical fallacies
  12. **Open Unknowns** — items requiring human input

**Key requirements for every test case:**
- Step-by-step execution table with Action, Input/Data, Expected Result columns
- Both Developer Validation AND QA Validation subsections
- Every AC has at least one happy path AND one unhappy path test for full coverage
- Test cases are self-contained — no external file references
- All test case references use IDs (TC-XXX), not file paths
- No timeline estimates, sprint assignments, or duration estimates in testing content

### Save
P4-G [IO]: **Append** generated content to `.ai-artifacts/{{work_item_id}}/wiki-content.md`
P4-H [IO]: Append `{"phase":"wiki","step":"pass_4_quality_testing","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

---

## Pass 5 [IO/CLI] – Assembly, Footer, Publish

### Context to Load
P5-A [IO]: Read `.wiki.creation_audit` (if exists, for path/metadata)
P5-B [IO]: Read the completed `.ai-artifacts/{{work_item_id}}/wiki-content.md`

### Validate & Finalize
P5-C [LOGIC]: Verify structural integrity of wiki-content.md:
  - `[[_TOC_]]` present on its own line outside any HTML block
  - All major sections present: Executive Summary, Understanding, Discovery, Investigation, Solution Design, Decision Rationale, Quality & Validation
  - Section headers use markdown `##`/`###` (for TOC detection)
  - No local file paths, no artifact references, no timeline estimates
  - HTML tables used (not markdown tables)
  - Mermaid diagrams use `graph TD` only

P5-D [GEN]: Append footer to wiki-content.md:
  - Related Work Items section (from ADO relations if available)
  - Timestamp and attribution footer

### Save Wiki Audit
P5-E [IO]: Update {{context_file}}.wiki:
```json
{
  "creation_audit": {
    "path": "{{wiki_path}}",
    "page_id": null,
    "url": null,
    "wiki_identifier": "{{ado_defaults.wiki}}",
    "taxonomy": {
      "primary_object": "{{primary_object}}",
      "parent_path": "{{parent_path}}"
    },
    "sections_generated": {
      "executive_summary": true,
      "understanding_request": true,
      "discovery_research": true,
      "investigation_trail": true,
      "stakeholders_impact": true,
      "solution_design": true,
      "decision_rationale": true,
      "quality_validation": true
    }
  },
  "content_generated_at": "<ISO>"
}
```

### Publish to Wiki
P5-F [CLI]: Check if page exists: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json`
P5-G [CLI]: **If new** → `{{cli.wiki_create}} --path "{{wiki_path}}" --content ".ai-artifacts/{{work_item_id}}/wiki-content.md" --json`
   **If exists** → `{{cli.wiki_update}} --path "{{wiki_path}}" --content ".ai-artifacts/{{work_item_id}}/wiki-content.md" --json`
P5-H [IO]: Capture response → update `wiki.creation_audit.page_id` and `wiki.creation_audit.url`

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

### Verify Publication
P5-I [CLI]: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json` — confirm page exists and has content
P5-J [LOGIC]: Verify `page_id` matches, `content` length > 0

### Save
P5-K [IO]: Append `{"phase":"wiki","step":"pass_5_assembly_publish","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

---

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"wiki"`
- `metadata.current_phase` = `"finalization"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"wiki","step":"wiki_published","completedAt":"<ISO>"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Wiki complete. Use /phase-05-finalization."**
