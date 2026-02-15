# Phase 03d – Test Cases
Role: Test Engineer
Mission: Generate high-quality test cases following the Salesforce Test Cases Playbook.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Playbook-driven** – all test cases follow `{{paths.standards}}/test-cases-playbook.md`
- **AC-centric** – every test traces to ≥1 acceptance criterion
- **Measurable** – expected results use exact values, never vague language ("works correctly")
- **No timelines** – do not produce duration estimates, sprint assignments, or schedule commitments
- **Re-runnable** – safe to re-run after solution updates; overwrites previous test data
- **CLI-only** – per util-base guardrails
- **Outputs to** {{context_file}}.solutioning.testing

## ⛔ Completeness Guardrails — NEVER Reduce Test Coverage
> **This phase produces the FULL test suite. Do NOT abbreviate, summarize, or reduce output due to length or effort.**

- **NEVER skip paths** — if a path type (A–F) applies to an AC, generate the test case. Do not say "similar to TC-001" or "additional edge cases would follow the same pattern." Write every test.
- **NEVER use placeholders** — do not write "...additional test cases..." or "repeat for other ACs." Every test case must be fully materialized with all fields from the F2 table.
- **NEVER merge tests to reduce count** — each AC × path combination that applies gets its own TC-XXX. Do not combine ACs into a single test to save space.
- **NEVER defer to QA** — do not write "QA team should determine additional tests." Generate them now.
- **NEVER summarize steps** — every test case must have numbered, deterministic steps. Not "follow standard login procedure" — write out each click.
- **NEVER omit Developer/QA Validation** — both subsections are mandatory for every test case, even P3.
- **NEVER reference other tests instead of writing content** — "Same as TC-001 but for Profile B" is not acceptable. Write the full test with the correct persona, data, and expected results.
- **Minimum thresholds** — the suite MUST contain:
  - ≥2 test cases per AC (at least 1 happy + 1 unhappy)
  - ≥1 UAT script per user-facing AC
  - ≥3 smoke checks
  - Every applicable path type from the six-path model
- **Output length is not a concern** — this artifact is consumed by Phase 04 (wiki) which renders it in full. A thorough test suite is the primary deliverable of this phase. Prefer 40 detailed test cases over 10 abbreviated ones.

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `template_files.*`
A2 [IO]: Load {{context_file}} → verify:
  - `.solutioning.solution_design` exists (components, architecture_decisions, integration_points)
  - `.solutioning.traceability` exists (acceptance_criteria mappings, gaps, orphans)
  - `.grooming.templates_applied.applied_content.acceptance_criteria` exists
  - `.metadata.phases_completed` includes `"solutioning"`
  - NOTE: `"test_cases"` MAY already be in `phases_completed` — this is a re-run, not an error
A3: **STOP** if any prerequisite missing (except `"test_cases"` in phases_completed). Log to `run_state.errors[]` and save.

## Templates & Standards
Load from `{{paths.templates}}/` and `{{paths.standards}}/`:
- `{{template_files.test_case}}` — test case structure (markdown)
- `{{paths.standards}}/test-cases-playbook.md` — Salesforce Test Cases Playbook methodology

---

## Step 1 [IO] – Load Context
B1 [IO]: Read `.solutioning.solution_design` — components, architecture decisions, integration points, applied standards
B2 [IO]: Read `.solutioning.traceability` — AC → component mappings, gaps, orphans
B3 [IO]: Read `.grooming.templates_applied.applied_content.acceptance_criteria` — what we must trace to
B4 [IO]: Read `.grooming.classification` — work_class, effort, risk, quality_gates
B5 [IO]: Read `.solutioning.level_of_effort` — complexity, risk surface, uncertainty flags
B6 [IO]: If `.solutioning.testing` already exists (re-run):
  - Snapshot previous stats into `run_state`: `{ "previous_test_count": N, "previous_coverage_pct": N }`
  - Log: `"Re-running test case generation — previous data will be overwritten"`
  - Continue — do NOT stop

## Step 2 [GEN] – Testing Strategy (Playbook §1)
Before writing individual cases, define the testing strategy:

C1 [GEN]: **Test objectives** — what the test suite proves:
  - Functional correctness (AC satisfaction)
  - Data integrity (CRUD operations, field values, relationships)
  - Performance (governor limits, bulk operations, responsiveness)
  - Security (CRUD/FLS, sharing, profile enforcement)
  - Derive from AC list + solution components + integration points

C2 [GEN]: **Scope** — what is in-scope vs. explicitly out-of-scope:
  - In-scope: features/modules/integrations touched by this work item
  - Out-of-scope: existing functionality not modified, upstream/downstream systems not changed
  - Derive from `solution_design.components` and `integration_points`

C3 [GEN]: **Suite organization** — classify planned tests:
  - **Smoke**: post-deployment sanity checks (core flows work)
  - **Regression**: existing behavior not broken by changes
  - **Feature**: new/modified functionality validation
  - **UAT**: business verification using real workflows

C4 [GEN]: **Entry points** — which channels each test targets:
  - Lightning UI / Experience Cloud / Mobile / API / Integration User
  - Derive from solution components and their exposure surfaces

## Step 3 [GEN] – Test Type Coverage Checklist (Playbook §2)
D1 [GEN]: For the solution, determine which test types apply. Generate at least one case per applicable type:

| Type | Owner | Applies When | Generate |
|------|-------|-------------|----------|
| **Unit testing** | Dev | Apex code changes (classes, triggers, actions) | Apex unit test patterns with assertions |
| **Smoke testing** | QA | Any change to core flows | High-level checks that core flows still work |
| **Integration testing** | QA | System boundary changes (API, events, external) | Data flow validation across boundaries |
| **System testing** | QA | End-to-end journeys affected | Full journey validation across Salesforce |
| **UAT** | Business | User-facing changes | Business verification with real workflows |
| **Performance testing** | QA/Dev | Bulk operations, governor limits, queries | Governor limit validation, bulk scenarios |
| **Security testing** | QA/Dev | Permission/sharing changes, new objects/fields | CRUD/FLS, sharing rules, profile enforcement |

D2 [GEN]: Flag which types are **N/A** with justification (e.g., "No integration testing — no external system boundaries touched").

## Step 4 [GEN] – Test Data Matrix (Playbook §3, §9)
E1 [GEN]: Generate reusable test data matrix with rows `D1`, `D2`, `D3`, etc. Each row defines:

| Column | Content |
|--------|---------|
| **Row ID** | D1, D2, D3... with emoji prefix (👤 persona, 📊 data variation, ⚠️ negative) |
| **Persona** | Profile, permission sets, role, license type |
| **Record context** | Record type, key field values, parent/child relationships |
| **Feature flags** | Custom settings, custom metadata, feature toggles |
| **Boundary values** | Min/max, null/blank, long strings, special characters |
| **External IDs** | For integration/identity resolution scenarios |
| **Error injection** | Downstream failures, timeouts, missing data (for resilience tests) |

E2 [GEN]: For each persona row (👤), define:
  - Test user setup (username, profile, permission sets, role)
  - Required test records (object, record name, key field values, purpose)
  - Feature flag configuration (flag name, value, reason)

## Step 5 [GEN] – Test Case Generation (Playbook §3–§5, §7)
F1 [GEN]: Generate test cases per AC using the **six-path coverage model**:

- **A) Happy path** — simplest successful scenario; validates AC works as designed
- **B) Negative path** — validation rules, required fields, duplicate rules, permission denials
- **C) Edge cases** — null/blank, long strings, picklist mismatches, time zones, bulk (1/2/200), record types, dynamic forms
- **D) Security** — CRUD/FLS per persona, sharing (ownership + role hierarchy + manual shares), data isolation between users
- **E) Automation behavior** — order-of-execution (flows/triggers/validation rules), recursion guards, idempotency
- **F) Integration + async** — external system down/slow, retry logic, error logging, eventual consistency, platform event delivery

Not every path applies to every AC — generate only where relevant. At minimum, every AC gets paths A + B.

**⛔ Do NOT reduce test count for brevity.** If an AC touches automation (flows/triggers), generate path E. If it has integration points, generate path F. If it involves permissions, generate path D. Evaluate each AC × path independently — do not batch-skip paths across ACs.

F2 [GEN]: Each test case MUST include all of the following fields:

| Field | Requirement |
|-------|-------------|
| **ID** | `TC-XXX` sequential |
| **Title** | Outcome-based (not "click button" — use "Verify record creation succeeds for standard user") |
| **Objective** | One sentence: "Validate X happens when Y under Z context" |
| **Persona / security context** | Profile, perm sets, role, license, sharing considerations |
| **Entry point** | Lightning UI / Experience Cloud / Mobile / API / Integration User |
| **Test type** | Smoke / QA / UAT |
| **Path type** | ✓ Happy / ✗ Negative / ⚡ Edge / 🔒 Security / ⚙️ Automation / 🔄 Integration |
| **Mapped requirement** | Work item ID |
| **Mapped AC** | AC-1, AC-2, etc. |
| **Priority** | 🔴 P1 / 🟡 P2 / 🟢 P3 |
| **Data row** | D1, D2, etc. |
| **Preconditions / test data** | Exact records, key field values, data row reference |
| **Steps** | One action per step, numbered, deterministic |
| **Expected results per step** | Measurable, exact values (not "routed correctly" → "Owner = Queue X; Priority = Medium") |
| **Pass/fail criteria** | What specifically constitutes a fail |
| **Verification checklist** | UI, data, related records, notifications |
| **Post-conditions / cleanup** | Records to delete, settings to reset |
| **Telemetry & logs** | Debug logs, platform events, custom logs, flow debug entries to verify |
| **Developer Validation** | Unit test pattern (Apex), assertions to implement, mocks required, integration points to verify |
| **QA Validation** | Step-by-step navigation, data verification query (SOQL), visual checkpoints, environment prerequisites |

F3 [GEN]: Organize test cases by priority:
  - **🔴 P1 Critical Path** — core functionality, release blockers
  - **🟡 P2 Important** — alternate paths, key negative scenarios
  - **🟢 P3 Additional Coverage** — edge cases, long-tail, security hardening

## Step 6 [GEN] – UAT Scripts (Playbook §6)
G1 [GEN]: For applicable ACs, generate business-friendly UAT scripts:
  - **Clear test steps** — non-technical language, business terminology
  - **Expected results** — what the user should observe (not system internals)
  - **Data requirements** — what records/users must exist before starting
  - **Acceptance criteria** — explicit pass/fail decision for each script
  - **Persona** — which business role executes this script

G2 [GEN]: UAT scripts are separate from QA test cases — they target business stakeholders who validate the feature meets their needs, not technical correctness.

## Step 7 [GEN] – Smoke Test Pack (Playbook §8)
H1 [GEN]: Generate a minimum smoke test pack for post-deployment verification:

| Check | What to Verify | Pass Criteria |
|-------|---------------|---------------|
| Login + navigation | Core app loads, affected tabs accessible | No errors, pages render within 3s |
| Create key record | Create/update records affected by the change | Record saves successfully, fields populated |
| Automation sanity | Routing/assignment/approval rules fire | Expected automation triggers observed |
| Integration handshake | Queues/logging for external systems | No errors in integration logs, events published |
| Report/dashboard | Representative report loads (if applicable) | Data displays correctly, no timeouts |

H2 [GEN]: Smoke tests are intentionally shallow — they confirm "the org is healthy after deployment," not full functional coverage.

## Step 8 [GEN] – AC Coverage Matrix
I1 [GEN]: Compute coverage for every AC:
  - Map each AC to its happy path test(s) and unhappy path test(s)
  - Assign coverage status: **Full** (happy + unhappy), **Partial** (one type only), **Gap** (none)
  - Include coverage notes for Partial/Gap entries

I2 [GEN]: Compute summary:
  - `total_ac` — count of all acceptance criteria
  - `fully_covered` — ACs with both happy + unhappy path tests
  - `partially_covered` — ACs with only one path type
  - `not_covered` — ACs with no test coverage (blocker)

## Step 9 [GEN] – Quality Gates (Playbook §11)
Run ALL gates before saving. **⛔ Do NOT weaken or skip gates to reduce output size.**

| Gate | Check | On Fail |
|------|-------|---------|
| **AC coverage** | Every AC has ≥1 happy path AND ≥1 unhappy path test | Generate missing tests — BLOCKER |
| **Persona coverage** | Tests exercise more than just admin persona | Add persona-specific cases |
| **Measurable results** | No vague expected results ("works correctly", "displays properly") | Rewrite with exact values |
| **Explicit test data** | All test data is explicit and repeatable (no "create a record") | Add specific field values and setup |
| **Requirement mapping** | Every test traces to AC + component | Add missing traceability |
| **Negative coverage** | Negative/resilience tests exist for failure scenarios | Generate missing negatives |
| **No mega-tests** | No single test covers >3 ACs (hard to isolate failures) | Split into focused tests |
| **Full materialization** | Every TC-XXX has ALL fields from F2 table populated (no blanks, no "N/A" unless genuinely not applicable) | Fill missing fields — BLOCKER |
| **No cross-references** | No test says "same as TC-XXX" or "see above" — each is self-contained | Rewrite as standalone — BLOCKER |
| **UAT completeness** | ≥1 UAT script per user-facing AC | Generate missing UAT scripts |
| **Smoke pack** | ≥3 smoke checks covering login, CRUD, automation | Generate missing checks |

**Max 3 iterations** — proceed with best effort and log warnings if gates still fail.

**⛔ BLOCKER gates cannot be bypassed.** If a BLOCKER gate fails after 3 iterations, STOP and report the specific failures to the user. Do not save a partial suite that fails BLOCKER gates.

## Step 10 [IO] – Save Artifact
**GATE: write to disk before proceeding.**

Save → {{context_file}}.solutioning.testing (overwrite entire block):
```json
{
  "testing_strategy": {
    "test_objectives": ["functional_correctness", "data_integrity", "..."],
    "scope": {
      "in_scope": ["component_a", "integration_x"],
      "out_of_scope": ["existing_module_y"]
    },
    "suite_organization": {
      "smoke": ["TC-001"],
      "regression": ["TC-005"],
      "feature": ["TC-002", "TC-003"],
      "uat": ["TC-010"]
    },
    "applicable_test_types": [
      { "type": "unit", "applicable": true, "justification": "" },
      { "type": "smoke", "applicable": true, "justification": "" },
      { "type": "integration", "applicable": false, "justification": "No external boundaries" }
    ],
    "entry_points": ["Lightning UI", "API"]
  },
  "test_data_matrix": {
    "rows": [
      { "id": "D1", "type": "persona", "persona": "", "profile": "", "permission_sets": [],
        "role": "", "license": "", "record_context": {}, "feature_flags": {},
        "boundary_values": {}, "error_injection": {} }
    ],
    "columns": ["id", "type", "persona", "profile", "permission_sets", "role", "license",
                 "record_context", "feature_flags", "boundary_values", "error_injection"]
  },
  "test_cases": [
    {
      "id": "TC-001", "title": "", "objective": "",
      "persona_security_context": { "profile": "", "permission_sets": [], "role": "", "license": "", "sharing": "" },
      "entry_point": "Lightning UI",
      "test_type": "QA",
      "path_type": "happy_path",
      "covers_ac": ["AC-1"], "mapped_requirement": "",
      "priority": "P1", "data_row": "D1",
      "preconditions": [], "steps": [],
      "expected_results_per_step": [],
      "pass_fail_criteria": "",
      "verification_checklist": [],
      "post_conditions_cleanup": [],
      "telemetry_logs": [],
      "developer_validation": { "unit_test_pattern": "", "assertions": [], "mocks": [], "integration_points": [] },
      "qa_validation": { "navigation": [], "data_query": "", "visual_checkpoints": [], "environment_prereqs": [] }
    }
  ],
  "uat_scripts": [
    {
      "id": "UAT-001", "title": "", "persona": "", "covers_ac": [],
      "steps": [], "expected_results": [], "data_requirements": [],
      "acceptance_criteria": ""
    }
  ],
  "smoke_pack": [
    {
      "id": "SMK-001", "check": "", "what_to_verify": "", "pass_criteria": ""
    }
  ],
  "ac_coverage_matrix": {
    "coverage_summary": {
      "total_ac": 0, "fully_covered": 0, "partially_covered": 0, "not_covered": 0
    },
    "acceptance_criteria": [
      {
        "ac_id": "AC-1", "description": "",
        "happy_path_tests": [], "unhappy_path_tests": [],
        "coverage_status": "full|partial|none", "coverage_notes": ""
      }
    ]
  }
}
```

Update `run_state`:
- Append `{"phase":"test_cases","step":"test_case_generation","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `completed_steps[]`
- If re-run: append `{"phase":"test_cases","step":"re_run_delta","previous_test_count":N,"new_test_count":N,"completedAt":"<ISO>"}` to `completed_steps[]`
- Save to disk

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"test_cases"` (if not already present)
- `metadata.current_phase` = `"wiki"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"test_cases","step":"complete","completedAt":"<ISO>"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Test case generation complete. Use /phase-04-wiki."**
