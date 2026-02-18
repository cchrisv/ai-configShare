# Phase 06 – Development Closeout (Context7)
Role: Closeout Coordinator
Mission: Reconcile planned vs actual; update ADO and context.
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **What/Why vs How** – Grooming = what/why only; Solutioning = how only
- **All assumptions resolved** – no Open status at closeout
- **Single ADO update** – one combined payload
- **Preserve investigation trail** – add as-built alongside planned
- **CLI-only** – per util-base guardrails
- **Template-engine only** – NEVER generate raw HTML. Use `template-tools scaffold-phase` for fill specs, fill JSON slots, save to context. The CLI renders and validates.
- **No prior artifacts required** – fetch from ADO and context
- **Graceful degradation** – proceed with reduced evidence if needed
- **Tag**: append {{tags.dev_complete}} to tags
- **Context7 only** – outputs to {{context_file}}.closeout.*

## Templates
Templates are managed by the template engine. Use `template-tools scaffold-phase --phase closeout` to get fill specs for:
- `field-solution-design` — ADO Development Summary HTML
- `field-release-notes` — ADO Release Notes HTML
- Grooming field templates (description, AC, etc.) per work item type

## Execution

### Step 1 [IO/CLI] – Init
A1 [IO]: Load shared.json; ensure {{context_file}} exists
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
A3 [IO]: Load dev_updates.updates[] (optional context)
A4 [LOGIC]: Extract current state from ADO
A5 [LOGIC]: Extract child IDs from relations (`System.LinkTypes.Hierarchy-Forward`)
A6 [CLI]: Per child: `{{cli.ado_get}} {{child_id}} --expand Relations --comments --json`
A8 [GEN]: Per child: extract state, key fields, classify comments (decisions, scope changes, lessons learned)
A9 [GEN]: **Comment mining** across all comments (self + children):
  - Final decisions made during development
  - Scope changes documented in discussions
  - Meeting transcripts and action item resolutions
  - Lessons learned mentioned in comments
  - Blocker resolutions

### Step 2 [CLI/GEN] – Evidence Gathering
B1 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --json` — filter PR links
B2 [CLI]: `{{cli.sf_query}} "SELECT Action, Section, Display, CreatedDate, CreatedBy.Name, DelegateUser FROM SetupAuditTrail WHERE CreatedDate = LAST_N_DAYS:90 ORDER BY CreatedDate DESC" --json`
B3 [CLI]: `{{cli.sf_discover}}` / `{{cli.sf_describe}}` on SF components
B4 [LOGIC]: Extract ADO revision history
B4.5 [GEN]: **Child reconciliation** — compare child states against planned components:
  - Map children to solutioning.solution_design.components[] where possible
  - Identify: completed children, modified children, new children not in plan, removed/cancelled children
  - Use child comments + states as evidence for planned-vs-actual delta
B5 [GEN]: Compile evidence: PRs, SF audit, SF as-built vs planned, child reconciliation

### Step 3 [GEN] – Assumptions & Unknowns Resolution (Final)
C1 [GEN]: Extract all assumptions + unknowns from context
C2 [GEN]: Cross-reference against evidence
C3 [GEN]: Auto-resolve where conclusive
C4 [GEN]: Present remaining items to developer — require resolution

### Step 4 [GEN] – Developer Questionnaire
Present evidence; ask for:
1. Confirmation/correction of findings
2. Resolution of remaining assumptions/unknowns (until none Open)
3. Lessons learned, effort assessment, test results
4. Sandbox-only changes not in PRs/audit
5. Follow-up work items needed

### Step 5 [GEN] – Delta Analysis
Build planned-vs-actual from questionnaire + evidence + resolved items

### Step 6 [GEN] – Update Grooming
Regenerate grooming fields with final requirements (what was delivered). **What/why only**.
Append {{tags.dev_complete}} to tags.

### Step 7 [GEN] – Update Solutioning
G1 [GEN]: Regenerate solution design with as-built architecture. **How only**.
G2 [GEN]: Prepare as-built solution design data for template rendering in Step 8.
G3 [IO]: Save technical spec → {{context_file}}.closeout.technical_spec_final

### Step 8 [GEN/CLI] – Update Developer Summary
H1 [CLI]: `{{cli.template_scaffold_phase}} --phase closeout --type "{{work_item_type}}" -w {{work_item_id}} --context {{context_file}} --json` — get fill spec for `field-solution-design`
H2 [GEN]: Fill slot values from `closeout.delta` (as-built components, scope changes) and `closeout.solutioning_final` (solution_design, architecture_decisions):
  - `business_problem_statement` — refined from delivered scope
  - `solution_approach_narrative` — as-built approach reflecting actual implementation
  - `technical_narrative` — final technical details from Step 7 solution design
  - `components` — reconciled component table from closeout delta
  - `integration_points_brief` — as-built integration points
H3 [IO]: Save filled_slots → {{context_file}}.closeout.filled_slots
H4 [IO]: Save to disk — **GATE: do not proceed until confirmed written.**

### Step 9 [GEN] – Release Notes
Build polished release note for field_paths.release_notes using field_release_notes template.
**Audience:** end users, stakeholders, QA — not developers.
**Sections:** Summary, What's New/Changed, Impact, Known Limitations (optional), Related Items (optional).

### Step 10 [IO] – Artifact
Save → {{context_file}}.closeout:
```json
{
  "questionnaire": {},
  "delta": {
    "components": [], "acceptance_criteria": [],
    "scope_changes": {"added": [], "removed": [], "modified": []},
    "effort_final": {"story_points": 0, "effort_level": ""},
    "lessons_learned": [], "follow_up_work_items": []
  },
  "assumptions_resolved": [], "unknowns_resolved": [],
  "grooming_final": {"fields": {}},
  "solutioning_final": {"solution_design": {}, "development_summary_html": ""},
  "filled_slots": {},
  "release_notes_html": ""
}
```

### Step 11 [CLI] – Update ADO
`{{cli.ado_update}} {{work_item_id}} --from-context "{{context_file}}" --phase closeout --json`

The CLI automatically:
1. Renders `field-solution-design` template from closeout.filled_slots → final HTML
2. Validates: no unfilled tokens, sections present
3. Maps rendered HTML + grooming_final fields + release_notes_html → ADO field paths
4. Reads extra_fields for non-template fields (tags, story_points)
5. Pushes all fields to ADO in a single update

### Step 12 [GEN/IO] – Closeout Summary
E1 [GEN]: Generate narrative summary
E2 [IO]: Save → {{context_file}}.closeout.summary_generated_at
E3 [IO]: Update {{context_file}}.metadata.current_phase = "complete"

## Completion [GEN]
Tell user: **"Development closeout complete. Work item lifecycle finished."**
