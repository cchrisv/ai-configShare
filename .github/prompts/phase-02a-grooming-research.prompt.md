# Phase 02a – Grooming Research
Role: Business Research Coordinator
Mission: Gather business context for evidence-based requirements.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Read-only** – NO ADO/wiki modifications
- **CLI-only** – per util-base guardrails
- **Outputs to** {{context_file}}.research.*
- **All streams mandatory** – parallel/batch when beneficial
- **Feedback loops** – max 3 iterations/stream

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
1. [IO] Write {{context_file}}.research.[stream_name] → save to disk
2. [GEN] Update {{context_file}}.research.synthesis + .assumptions with new evidence
3. [IO] Append to {{context_file}}.run_state.completed_steps[]
4. [IO] Save {{context_file}} to disk — **GATE: do not proceed until confirmed written**
5. On error: log to run_state.errors[]; save to disk; retry

## Prerequisite [CLI]
`{{cli.workflow_status}} -w {{work_item_id}} --json`
Verify {{context_file}} exists. **STOP** on failure.

## Research Schema
All outputs to {{context_file}}.research:
- organization_dictionary (terms, acronyms, undefined_terms)
- ado_workitem (scrubbed_data, business_summary, technical_context, detective_analysis, keywords)
- similar_workitems (similar_items_found, duplicate_assessment, pattern_analysis)
- wiki_search (search_results, metadata_references, detective_correlation)
- business_context (organizational_context, business_rules, detective_cues)
- team_impact (team_members_file, impacted_roles[], coordination_contacts[], stakeholder_summary)
- assumptions[] (id, assumption, category, confidence, source, phase_identified)
- synthesis (unified_truth, conflict_log, swot_analysis, reusable_assets)

---

## Stream 1 [IO/GEN] – Organization Dictionary
**Goal:** Establish shared vocabulary → {{context_file}}.research.organization_dictionary

A1 [IO]: Load `{{paths.standards}}/organization-dictionary.json`
A2 [IO]: Skip if already populated
B1 [GEN]: Cross-reference work item terms; verify acronyms
B2 [GEN]: List undefined terms needing clarification

---

## Stream 2 [CLI/GEN] – ADO Work Item + Similar Items
**Goal:** Extract, scrub PII, find related items → {{context_file}}.research.ado_workitem + .similar_workitems

**Field Categories** (from `{{field_paths.*}}`):
- **Business content** → scrubbed_data: `title`, `description`, `acceptance_criteria`, `business_problem_and_value`, `business_objectives_and_impact`, `technical_notes`, `sf_components`, `repro_steps`, `system_info`
- **Classification** → scrubbed_data: `work_item_type`, `tags`, `story_points`, `priority`, `severity`, `work_class_type`, `state`
- **Routing** (use for search only, NOT in scrubbed_data): `area_path`, `iteration_path`, `assigned_to`
- **Output fields** (skip — written by later phases): `development_summary`, `release_notes`, `root_cause_detail`, `requires_qa`

A1 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand Relations --json`
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --comments --json`
B1 [GEN]: Scrub PII → tokens (`[User]`, `[Email]`)
B2 [GEN]: Extract **business content** + **classification** fields into scrubbed_data; discard routing/output fields
B3 [GEN]: Segregate business vs technical content
C1 [GEN]: Detective analysis on business content
C2 [GEN]: Extract keywords from technical context
D1 [CLI]: `{{cli.ado_search}} --text "{{keyword}}" --type "User Story" --top 20 --json`
D2 [CLI]: `{{cli.ado_search}} --area "{{area_path}}" --type "User Story" --top 20 --json`
D3 [CLI]: `{{cli.ado_search}} --tags "{{tags}}" --top 20 --json`
D4 [GEN]: Identify link candidates (NO ado_link calls)

---

## Stream 3 [CLI/GEN] – Wiki Research
**Goal:** Search ADO Wiki, review ALL results, retrieve relevant pages → {{context_file}}.research.wiki_search

**Search** — run keyword queries from Stream 2 (returns ALL results, no artificial limits):
A1 [IO]: Load keywords from .research.ado_workitem.keywords (requires Stream 2 written to disk)
A2 [CLI]: `{{cli.wiki_search}} "{{keyword_1}}" --json` (primary term, e.g. object name)
A3 [CLI]: `{{cli.wiki_search}} "{{keyword_2}}" --json` (secondary term, if distinct from A2)

**Relevance determination** — review ALL returned results and classify each:
B1 [GEN]: Review every result path + highlights; determine relevance to this ticket
B2 [GEN]: Classify: **relevant** (directly about the feature/object), **contextual** (related system/integration), **noise** (unrelated match)
B3 [GEN]: Deduplicate across queries by path

**Content retrieval** — read ALL relevant + contextual pages, capture page IDs:
C1 [CLI]: For each relevant page: `{{cli.wiki_get}} --path "{{page_path}}" --no-content --json` → capture `id`
C2 [CLI]: For top relevant pages: `{{cli.wiki_get}} --path "{{page_path}}" --json` → read full content
C3 [GEN]: Extract architecture, field references, business rules, integration points from content
Store each page as `{ pageId, path, summary }` in wiki_search.pages_reviewed — page IDs are needed for wiki updates in later phases.

**Analysis:**
D1 [GEN]: Extract SF metadata references, integrations, business context from page content
D2 [GEN]: Cross-examine wiki findings vs ADO ticket; validate/challenge assumptions
D3 [GEN]: Identify documentation gaps (missing pages for key concepts)

---

## Stream 4 [CLI/GEN] – Business Context
**Goal:** Query Salesforce data → {{context_file}}.research.business_context

A1 [CLI]: `{{cli.sf_query}} "{{soql_query}}" --json` (business)
A2 [CLI]: `{{cli.sf_query}} "{{tooling_query}}" --tooling --json` (metadata)
B1 [GEN]: Analyze results; extract business patterns
B2 [GEN]: Combine with prior streams; generate context summary

---

## Stream 5 [CLI/GEN] – Team & Stakeholder Discovery
**Goal:** Identify impacted people, roles, and coordination contacts → {{context_file}}.research.team_impact

A1 [CLI]: `{{cli.team_discover}} --salesforce --json`
A2 [IO]: Parse result → extract members[], summary, SF profiles/roles

**Cross-reference sources** (from prior streams — all must be written to disk first):
B1 [IO]: Load `.research.organization_dictionary` — department names, role terminology, acronyms
B2 [IO]: Load `.research.ado_workitem.scrubbed_data` — `business_problem_and_value`, `business_objectives_and_impact`, `sf_components`
B3 [IO]: Load `.research.ado_workitem.comments` — original submitted request (typically lists impacted departments per requester)
B4 [IO]: Load `.research.business_context` — organizational context, business rules from SF data

**Analysis:**
C1 [GEN]: Extract impacted departments/groups from comments (original request) + business_problem_and_value + business_objectives_and_impact
C2 [GEN]: Match extracted departments/roles against team members using org dictionary terms, SF profiles, and department fields
C3 [GEN]: Classify impacted_roles[]:
  - `{ role, profile, impact_type (direct_user | admin | downstream), members[] }`
C4 [GEN]: Identify coordination_contacts[]:
  - `{ name, email, title, reason, coordination_type (approver | domain_expert | downstream_owner | tester) }`
C5 [GEN]: Generate stakeholder_summary — narrative of who is affected and why, sourced from the original request and business context

---

## Completion [GEN]
Update {{context_file}}:
- metadata.phases_completed append "research"
- metadata.current_phase = "grooming"
- research.synthesis.research_phase_complete = true
Tell user: **"Research complete. Use /phase-02b-grooming."**
