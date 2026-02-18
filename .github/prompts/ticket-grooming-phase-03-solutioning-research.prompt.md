# Phase 03 – Solutioning Research
Role: Technical Research Coordinator
Mission: Gather technical depth — SF metadata, dependencies, standards compliance.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Write-enabled** – context updates are allowed for this phase
- **CLI-only** – per util-base guardrails (SF operations use `{{cli.*}}` commands only)
- **Outputs to** {{context_file}}.research.salesforce_metadata + .dependency_discovery
- **Rolling synthesis** – extend research.synthesis with new findings
- **Feedback loops** – max 3 iterations

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
1. [IO] Write {{context_file}}.research.[stream_name] → save to disk
2. [GEN] Extend research.synthesis + research.assumptions with new evidence
3. [IO] Append to {{context_file}}.run_state.completed_steps[]
4. [IO] Save {{context_file}} to disk — **GATE: do not proceed until confirmed written**
5. On batch failure: log failed objects to run_state.errors[]; save to disk; continue with successes

## Prerequisites [IO/CLI]
A1 [CLI]: `{{cli.workflow_status}} -w {{work_item_id}} --json`
A2 [IO]: Verify {{context_file}}:
  - `.research.ado_workitem` exists (keywords, technical_context)
  - `.research.wiki_search` exists (search results from Phase 01 research)
  - `.research.synthesis` exists (unified_truth from Phase 01 research)
  - `.research.team_impact` exists (impacted_roles, coordination_contacts)
  - `.grooming` exists (solutioning_hints from Phase 02)
  - `.grooming.solutioning_investigation` exists (assumptions, questions, unknowns, scope_risks from Phase 02)
  - `.metadata.phases_completed` includes `"grooming"`
A3 [CLI]: Verify SF auth: `{{cli.sf_query}} "SELECT Id FROM Organization LIMIT 1" --json`
A3.5 [CLI]: `{{cli.ado_get}} {{work_item_id}} --comments --json` — **Comment Refresh**
A3.6 [LOGIC]: Compare against {{context_file}}.research.ado_workitem.comments[]:
  - Identify new comments since Phase 01 research
  - Classify new comments; update {{context_file}}.research.ado_workitem.comments[]
  - Update {{context_file}}.research.ado_workitem.comment_summary with new decisions
  - If new comments contain technical direction, requirements changes, or blockers → flag for Stream 1 consideration
A4: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Research Schema Extension
Add to {{context_file}}.research:
- `salesforce_metadata` — schema (objects, fields, record_types), graph, logic, integration, investigation_trail, pii_stats
- `dependency_discovery` — usage_tree, dependency_tree, stats, object_describe, high_risk_components, regression_candidates, role_impact_analysis
- Extend existing `synthesis` + `assumptions`

---

## Stream 1 [CLI/GEN] – Salesforce Metadata & Dependencies
**Goal:** Discover SF schema, dependencies, automation → {{context_file}}.research.salesforce_metadata + .dependency_discovery

### Init
B1 [IO]: Load domain keywords from `.research.ado_workitem.domain_keywords` + `.research.wiki_search`
B2 [IO]: Load `.grooming.solutioning_hints[]` — these are implementation clues extracted during grooming
B2.5 [IO]: Load `.grooming.solutioning_investigation` — these are deliberate items Phase 02 flagged for technical investigation. Log count: assumptions_to_validate, questions_for_solutioning, unknowns, scope_risks. Use these to guide investigation priorities in this stream.
B3 [GEN]: Extract SF object/field names from domain keywords + hints + solutioning_investigation items; also extract any technical/implementation keywords that Phase 01 identified as in-scope but did not investigate (Phase 01 focuses on what/why only)
B3.5 [CLI]: If metadata investigation needed: `{{cli.sf_query}} "{{tooling_query}}" --tooling --json` — tooling API queries live here, not in Phase 01

### Discovery (batch when multiple objects)
C1 [CLI]: `{{cli.sf_describe}} {{object}} --json` (batch: `{{obj1}},{{obj2}} --batch --json`)
C2 [CLI]: `{{cli.sf_discover}} --type CustomObject --name {{object}} --depth 3 --json`
C3 [CLI]: `{{cli.sf_apex}} --pattern "%{{object}}%" --json`
C4 [CLI]: `{{cli.sf_apex_triggers}} --object {{object}} --json`
C5 [CLI]: `{{cli.sf_flows}} --object {{object}} --json`
C6 [CLI]: `{{cli.sf_validation}} {{object}} --json` (batch: `{{obj1}},{{obj2}} --batch --json`)

### Analysis
D1 [GEN]: **Impact assessment** — count downstream dependencies per component:
  - Low: <50 references
  - Medium: 50–100 references
  - High: 100–500 references
  - Critical: >500 references
D2 [GEN]: Categorize components by type (triggers, flows, validation, Apex, platform events)
D3 [GEN]: Identify circular dependencies, high-risk regression candidates
D4 [GEN]: Assess cumulative impact — if multiple components change, compound risk
D5 [GEN]: **Role-based impact mapping** — load `.research.team_impact.impacted_roles[]`:
  - For each SF profile/role, determine which discovered components they interact with
  - Flag profiles that need specific regression testing (e.g., a profile that uses a modified flow)
  - Identify permission/sharing implications if object access patterns change
  - Output to `dependency_discovery.role_impact_analysis[]`:
    `{ role, profile, affected_components[], test_coverage_needed, permission_implications }`

### Standards Comparison
E1 [IO]: Load relevant standards from `{{paths.standards}}/`:
  - `apex-well-architected.md` — if Apex classes found
  - `flow-well-architected.md` + `flow-naming-conventions.md` — if flows found
  - `trigger-actions-framework-standards.md` — if triggers found
  - `async-processing-standards.md` — if platform events or batch jobs found
  - `event-driven-architecture-standards.md` — if event-driven patterns detected
  - `metadata-naming-conventions.md` — always (naming compliance check)
E2 [GEN]: Compare discovered patterns against loaded standards; flag non-compliance with severity

---

## Completion [IO/GEN]
Update {{context_file}}:
- `research.synthesis.research_phase_complete` = `true`
- Extend `research.synthesis.unified_truth` with SF metadata + standards comparison findings
- **Investigation resolution** — for each item in `.grooming.solutioning_investigation`:
  - Mark as `resolved` (with evidence/answer) or `unresolved` (with reason)
  - Store resolution status in `research.investigation_resolution[]`:
    `{ id, original_item, status: "resolved"|"unresolved", evidence: "", resolved_in_stream: "" }`
  - Unresolved items carry forward as risks for Phase 04 to address
- `metadata.phases_completed` append `"solutioning_research"`
- `metadata.current_phase` = `"solutioning"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"solutioning_research","step":"solutioning_research_complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Solutioning research complete. Use /ticket-grooming-phase-04-solutioning."**
