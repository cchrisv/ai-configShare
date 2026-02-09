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
  - **Quality & Validation** — comprehensive testing section (see D3-QV sub-steps below)

### D3-QV: Quality & Validation — Robust Step-by-Step Testing

**Input:** `.solutioning.testing` (test_data_matrix, test_cases, ac_coverage_matrix), `.grooming.templates_applied.applied_content.acceptance_criteria`, `.solutioning.traceability`

**Goal:** Create a comprehensive, visually-organized testing section with step-by-step executable test cases that serve both developers and QA.

**D3-QV1 [GEN]: Testing Philosophy Narrative**
- Write 2-3 paragraphs explaining the testing approach for this work item:
  - What testing approach was taken and why?
  - What categories of tests are most critical for this feature?
  - What risks are we specifically testing against?
- This sets the stage for the detailed test content that follows.

**D3-QV2 [GEN]: AC-Centric Test Coverage Matrix**
- Lead with narrative explaining how each AC is validated through both happy and unhappy paths.
- Generate summary table: `| AC ID | Acceptance Criteria | Happy Path Tests | Unhappy Path Tests | Coverage Status |`
- Use visual indicators: ✅ Full (has both happy + unhappy), ⚠️ Partial (missing one path type), ❌ Gap (no tests)
- Include **Path Type Legend:**
  - **Happy Path (✓):** Validates AC works as expected under normal conditions
  - **Negative (✗):** Validates error handling, invalid inputs, permission failures
  - **Edge Case (⚡):** Validates boundary conditions, bulk operations, timing
  - **Security (🔒):** Validates access controls, data isolation, FLS/CRUD

**D3-QV3 [GEN]: Test Data Matrix**
- Lead with narrative explaining the personas and scenarios covered.
- Generate summary table: `| Row ID | Persona | Profile/Permissions | Record Context | Key Conditions | Notes |`
- Group by scenario category (Happy Path, Edge Cases, Negative Tests).
- For each data row, document:
  - User setup details (username, profile, permission sets, role)
  - Required test records with specific field values
  - Feature flag configuration
  - Why this scenario matters

**D3-QV4 [GEN]: Test Cases by Priority with Step-by-Step Execution**
For each priority tier, generate a summary table followed by detailed test cases:

- **🔴 P1 (Critical Path):** Prominent section — these are release blockers.
- **🟡 P2 (Important):** Standard section — key alternate flows and negatives.
- **🟢 P3 (Nice to Have):** Lower-priority edge cases and cosmetic checks.

Summary table per tier: `| ID | Test Scenario | Path Type | Covers AC | Steps Summary | Expected Outcome | Data Row |`

**Detailed per-test-case format** (each test case MUST include all of the following):

1. **Objective / Oracle** — What observable outcome proves success? Be specific: exact field values, record counts, events emitted.
2. **Path Type** — Happy Path / Negative / Edge Case / Security
3. **AC Coverage** — Which acceptance criteria this validates
4. **Pre-conditions & Setup Checklist:**
   - User persona and permissions required
   - Required test records with specific attributes
   - Feature flags / settings enabled
   - Environment configuration prerequisites
5. **Step-by-Step Execution Table:**

   | Step | Action | Input/Data | Expected Result | ✓ |
   |:----:|--------|------------|-----------------|:-:|
   | 1 | [Navigate to specific page/record] | [URL or path] | [Page loads, correct data] | ☐ |
   | 2 | [Perform specific action] | [Exact values] | [Immediate feedback] | ☐ |
   | 3 | [Verify outcome] | [What to check] | [Expected state] | ☐ |

   Each step must be atomic and independently verifiable.

6. **Verification Checklist:**
   - **UI Verification:** specific elements, toasts, navigation
   - **Data Verification:** record field values, record counts, formula calculations
   - **Related Records:** child/related records created or updated
   - **Notifications:** emails, platform events, log entries
7. **Telemetry & Logs to Verify:**

   | Log Type | What to Look For | Where to Find It |
   |----------|------------------|------------------|
   | Debug Log | [Specific log pattern] | Developer Console |
   | Platform Event | [Event name] | Event Monitoring |

8. **Cleanup Steps:** Delete test records, reset settings, restore original state.
9. **Developer Validation:**
   - Unit test method pattern: `@IsTest static void test_[scenario]() { ... }`
   - Assertions to implement: `System.assertEquals([expected], [actual], '[message]')`
   - Mocks required for external dependencies
   - Integration points to verify programmatically
10. **QA Validation:**
    - Step-by-step navigation: App Launcher → [App] → [Object] → [Action]
    - Data verification query: `SELECT ... FROM ... WHERE ...`
    - Visual verification checkpoints: [UI elements to confirm]
    - Environment prerequisites: [Feature flags, permissions, test data rows]

**D3-QV5 [GEN]: Traceability Matrix**
- Create cross-reference table linking tests to requirements.
- Format: `| Acceptance Criteria | Description | Happy Path Tests | Unhappy Path Tests | Coverage Status |`
- Use visual indicators: ✅ Fully Covered, ⚠️ Partially Covered, ❌ Not Covered
- Add narrative explaining any gaps or deliberate omissions.

**D3-QV6 [GEN]: Test Data Setup Guide**
- Generate an actionable checklist for test environment setup:
  - Required configuration (feature flags, custom settings, CMT records)
  - Test records to create with specific attributes
  - Environment prerequisites (sandbox type, permission sets to assign)
  - Dependencies between test data items
- Format as a step-by-step setup procedure a tester can follow.

### Testing Content Constraints
- Every test case MUST have a step-by-step execution table with Action, Input/Data, and Expected Result columns.
- Every test case MUST include both Developer Validation and QA Validation subsections.
- Every AC must have at least one Happy Path AND one Unhappy Path test for full coverage.
- Test cases must be self-contained in the wiki — no external file references or local paths.
- All test case references use IDs (TC-XXX), not file paths.
- Do NOT include timeline estimates, sprint assignments, or duration estimates in any testing content.

---

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
