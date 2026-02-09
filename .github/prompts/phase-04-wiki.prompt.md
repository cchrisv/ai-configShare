# Phase 04 – Wiki Documentation
Role: Technical Writer
Mission: Create wiki documentation from workflow artifacts.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`, `{{wiki_path}}` (optional)

## Constraints
- **Artifact-only content** – all content from verified research + grooming + solutioning artifacts
- **Idempotent** – update existing pages, never duplicate
- **CLI-only** – per util-base guardrails
- **Formatting** – follow `{{template_files.wiki_format}}` + `{{template_files.wiki_page_template}}`
- **Outputs to** {{context_file}}.wiki.*

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `template_files.*`, `ado_defaults.*`
A2 [IO]: Load {{context_file}} → verify:
  - `.research` exists (synthesis, salesforce_metadata, web_research)
  - `.grooming` exists (classification, templates_applied)
  - `.solutioning` exists (option_analysis, solution_design, traceability, testing)
  - `.metadata.phases_completed` includes `"solutioning"`
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Design Conventions (from `{{template_files.wiki_format}}`)
- **Header**: `# Autonomous Ticket Preparation - #{{work_item_id}}` only
- **`##`**: markdown heading + 6px gradient accent bar (color-coded by section semantic)
- **`###`**: markdown heading + 4px lighter gradient bar
- **Content**: white bordered cards (`background: #fff; border: 1px solid #dee2e6; border-radius: 8px;`)
- **Callouts**: colored left-border accent cards
- **Tables**: HTML styled (NOT markdown tables)
- **NO `<details>/<summary>`** – all content fully visible
- **Diagrams**: Mermaid `graph TD` only (no `classDef`, no `%%{init}%%`)
- **`[[_TOC_]]`**: own line, outside any HTML block
- **Narrative tone**: knowledgeable colleague sharing insights (see `{{template_files.wiki_format}}` for full guidance)

---

## Step 1 [IO] – Load Context
B1 [IO]: Read `.research.synthesis.unified_truth` — consolidated understanding
B2 [IO]: Read `.research.salesforce_metadata` — schema, triggers, dependencies
B3 [IO]: Read `.research.dependency_discovery` — high_risk_components
B4 [IO]: Read `.research.web_research` — industry_standards, identified_risks
B5 [IO]: Read `.grooming.classification` — effort, risk, tags
B6 [IO]: Read `.grooming.templates_applied.applied_content` — description, AC
B7 [IO]: Read `.solutioning.option_analysis` — options evaluated, recommended
B8 [IO]: Read `.solutioning.solution_design` — components, architecture, integration
B9 [IO]: Read `.solutioning.traceability` — AC mapping, gaps
B10 [IO]: Read `.solutioning.testing` — test cases, coverage matrix
B11 [IO]: Read `.solutioning.technical_spec` — markdown technical spec
B12 [IO]: Read `.research.team_impact` — impacted roles, coordination contacts, stakeholder summary
B13 [IO]: Read `.research.dependency_discovery.role_impact_analysis` — role-to-component mapping

## Step 2 [IO] – Load Templates
C1 [IO]: Load `{{paths.templates}}/{{template_files.wiki_format}}` — formatting standards + narrative guidelines
C2 [IO]: Load `{{paths.templates}}/{{template_files.wiki_page_template}}` — page structure template
C3 [IO]: Load `{{paths.templates}}/{{template_files.solution_design_wiki}}` — if Feature type, use this instead

## Step 3 [GEN] – Content Generation
D1 [GEN]: **Determine wiki template** — use `wiki_page_template` for work items, `solution_design_wiki` for Features
D2 [LOGIC]: **Derive wiki path** if not provided:
  - Primary object from `.research.salesforce_metadata.schema.objects[0].name`
  - Path: `/CRM-Home/{{primary_object_area}}/{{work_item_id}} {{sanitized_title}}`
  - Sanitize: replace special characters, limit length
D3 [GEN]: **Transform artifacts → wiki markdown** following template structure:
  - **Executive Summary** — from synthesis + grooming classification
  - **Understanding the Request** — from grooming applied_content (description, AC)
  - **Discovery & Research** — from research (wiki_search, salesforce_metadata, web_research)
  - **Investigation Trail** — from research.salesforce_metadata.investigation_trail + assumptions
  - **Stakeholders & Impact** — from research.team_impact (impacted_roles, coordination_contacts, stakeholder_summary) + dependency_discovery.role_impact_analysis
    - Impacted roles/profiles table (role, profile, impact type, affected components)
    - Coordination contacts table (name, title, reason for coordination)
    - Testing implications by role
  - **Solution Design** — from solutioning (option_analysis, components, architecture)
  - **Decision Rationale** — from solutioning.option_analysis (options, scores, eliminated)
  - **Quality & Validation** — from solutioning.testing (test cases, coverage matrix, test data)
D4 [GEN]: Apply formatting conventions from `wiki_format`:
  - Color-coded section headers (Green=Summary, Blue=Architecture, Purple=Analysis, etc.)
  - HTML styled tables (NOT markdown)
  - Mermaid `graph TD` diagrams for architecture and data flow
  - Narrative tone throughout

## Step 4 [IO] – Save Wiki Content
E1 [IO]: Save generated markdown → `.ai-artifacts/{{work_item_id}}/wiki-content.md`
E2 [IO]: Update {{context_file}}.wiki:
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
E3 [IO]: Append `{"phase":"wiki","step":"content_generated","completedAt":"<ISO>"}` to `run_state.completed_steps[]`

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Step 5 [CLI] – Publish to Wiki
F1 [CLI]: Check if page exists: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json`
F2 [CLI]: **If new** → `{{cli.wiki_create}} --path "{{wiki_path}}" --content ".ai-artifacts/{{work_item_id}}/wiki-content.md" --json`
   **If exists** → `{{cli.wiki_update}} --path "{{wiki_path}}" --content ".ai-artifacts/{{work_item_id}}/wiki-content.md" --json`
F3 [IO]: Capture response → update `wiki.creation_audit.page_id` and `wiki.creation_audit.url`

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

## Step 6 [CLI] – Verify Publication
G1 [CLI]: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json` — confirm page exists and has content
G2 [LOGIC]: Verify `page_id` matches, `content` length > 0
G3 [IO]: Save verification result to `run_state.completed_steps[]`

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"wiki"`
- `metadata.current_phase` = `"finalization"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"wiki","step":"wiki_published","completedAt":"<ISO>"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Wiki complete. Use /phase-05-finalization."**
