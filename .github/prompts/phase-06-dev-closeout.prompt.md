# Phase 06 – Development Closeout (Context7)
Role: Closeout Coordinator
Mission: Reconcile planned vs actual; update ADO, wiki, context.
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **What/Why vs How** – Grooming = what/why only; Solutioning = how only
- **All assumptions resolved** – no Open status at closeout
- **Single ADO update** – one combined payload
- **Preserve investigation trail** – add as-built alongside planned
- **CLI-only** – per util-base guardrails
- **Template-engine only** – NEVER generate raw HTML. Use `template-tools scaffold-phase` for fill specs, fill JSON slots, save to context. The CLI renders and validates.
- **No prior artifacts required** – fetch from ADO + wiki
- **Graceful degradation** – proceed with reduced evidence if needed
- **Tag**: append {{tags.dev_complete}} to tags
- **Context7 only** – outputs to {{context_file}}.closeout.*

## Templates
Templates are managed by the template engine. Use `template-tools scaffold-phase --phase closeout` to get fill specs for:
- `field-solution-design` — ADO Development Summary HTML
- `field-release-notes` — ADO Release Notes HTML
- Grooming field templates (description, AC, etc.) per work item type
- `wiki-page-template` — Wiki page markdown

## Execution

### Step 1 [IO/CLI] – Init
A1 [IO]: Load shared.json; ensure {{context_file}} exists
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json`
A3 [CLI]: Find wiki: `{{cli.wiki_search}} "{{work_item_id}}" --json`
A4 [LOGIC]: Extract current state from ADO + wiki
A5 [IO]: Load dev_updates.updates[] (optional context)
A6 [LOGIC]: Extract child IDs from relations (`System.LinkTypes.Hierarchy-Forward`)
A7 [CLI]: Per child: `{{cli.ado_get}} {{child_id}} --expand Relations --comments --json`
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
C1 [GEN]: Extract all assumptions + unknowns from wiki
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
G2 [GEN]: Build DevelopmentSummary HTML.
G3 [IO]: Save technical spec → {{context_file}}.closeout.technical_spec_final

### Step 8 [GEN/CLI] – Update Wiki
Produce updated wiki with:
**1. What/Why vs How** — distinct sections
**2. End-to-End Flow** — problem → requirements → solution → outcome
**3. Previous vs Current** — preserve planned alongside as-built

H1 [IO]: Save → {{context_file}}.closeout.wiki_closeout_content
H2 [CLI]: If wiki_path set: `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{context_file}}.closeout.wiki_closeout_content" --json`

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
    "testing_actual": {"types_performed": [], "p1_results": ""},
    "effort_final": {"story_points": 0, "effort_level": ""},
    "lessons_learned": [], "follow_up_work_items": []
  },
  "assumptions_resolved": [], "unknowns_resolved": [],
  "grooming_final": {"fields": {}},
  "solutioning_final": {"solution_design": {}, "development_summary_html": ""},
  "release_notes_html": ""
}
```

### Step 11 [CLI] – Update ADO
`{{cli.ado_update}} {{work_item_id}} --fields-file "<temp_payload>" --json`

### Step 12 [GEN/IO] – Closeout Summary
E1 [GEN]: Generate narrative summary
E2 [IO]: Save → {{context_file}}.closeout.summary_generated_at
E3 [IO]: Update {{context_file}}.metadata.current_phase = "complete"

## Completion [GEN]
Tell user: **"Development closeout complete. Work item lifecycle finished."**
