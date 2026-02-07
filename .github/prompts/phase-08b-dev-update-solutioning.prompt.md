# Development Update — Solutioning (How)

Role: Developer Assistant — Solution Reconciliation
Mission: Capture development-time changes to **architecture, components, and technical approach** by gathering evidence from ADO, wiki, pull requests, and Salesforce, then asking targeted questions to update solution design and related ADO fields. This phase is strictly about **how** it was built — no requirements or business value narrative.
Output: Incremental change log and targeted solutioning field updates.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Content Discipline: How Only
- **This phase updates solutioning fields only:** `Custom.DevelopmentSummary` (solution design HTML) and `Custom.SFComponents`.
- All content must express *how* the solution was built — architecture, components, technical approach, integration points, data flows.
- Reference what/why only to motivate the design ("To meet the requirement for real-time sync, we…"), not to duplicate grooming content.
- **Do not** update Description, Acceptance Criteria, Tags, or classification in this phase — those belong in phase-08a.

## Prerequisites
- None. This phase does not require local artifact files from prior phases. It fetches the current ticket and wiki from ADO.

## Standard Paths (extension)
| Variable | Value |
|----------|-------|
| `{{dev_updates}}` | `{{root}}/dev-updates` |
| `{{root}}` | `{{paths.artifacts_root}}/{{work_item_id}}` |

## Execution

### A: Init
A1 [IO]: Load `#file:config/shared.json`
A2 [IO]: Create `{{dev_updates}}` if missing
A3 [CLI]: Fetch current work item: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A4 [CLI]: Find wiki page: `{{cli.wiki_search}} "{{work_item_id}}" --json`; if pages found, pick the matching path. If none found, try `{{cli.wiki_list}} --path "/WorkItems" --json` and match by path pattern. Set `{{wiki_path}}` to the discovered path.
A5 [CLI]: If `{{wiki_path}}` is set: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`; else proceed without wiki (graceful degradation).
A6 [LOGIC]: Extract solutioning baseline from live ADO fields: DevelopmentSummary, SFComponents. Parse wiki content (if loaded) to extract planned solution design, components, architecture, and integration points.
A7 [IO]: List existing `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-*.json` (only those matching the log prefix, not payload files); set `update_number` = count + 1 (zero-pad as 001, 002, …).
A8 [LOGIC]: If local `{{solutioning}}/solution-design.json` exists, load as optional supplementary context; never required.

### B: Evidence Gathering (Implementation-Focused)
B1 [CLI]: Fetch PRs linked to the work item: `{{cli.ado_relations}} {{work_item_id}} --json`. Filter for ArtifactLink types referencing pull requests. Record linked PR IDs and URLs. PRs are the primary evidence for *how* something was built — files changed, approach taken, code patterns used.
B2 [CLI]: Query Salesforce audit trail via `{{cli.sf_query}}` (SOQL):
```sql
SELECT Action, Section, Display, CreatedDate, CreatedBy.Name, DelegateUser
FROM SetupAuditTrail
WHERE CreatedDate = LAST_N_DAYS:30
ORDER BY CreatedDate DESC
```
Filter or annotate results relevant to components mentioned in the wiki or work item (object names, flow names, Apex class names).
B3 [CLI]: If specific Salesforce objects or components are identified in the wiki or work item (e.g. from Custom.SFComponents or solution design text), run `{{cli.sf_discover}}` or `{{cli.sf_describe}}` for those components to get current as-built metadata state. Compare against the documented plan.
B4 [GEN]: Compile an implementation-focused evidence summary: PRs (what they changed), SF audit trail (what was configured/deployed), SF current metadata state vs. planned architecture. This is the primary source of truth for what was actually built.

### C: Assumptions and Unknowns Resolution (Technical)
C1 [GEN]: Parse wiki content (from A5) to extract assumptions and open unknowns that are **technically-focused** (e.g. architecture assumptions, integration assumptions, performance assumptions, component design assumptions). Skip requirements-related assumptions — those belong in phase-08a.
C2 [GEN]: Cross-reference technical assumptions against gathered evidence: Does SF current metadata validate or refute architecture assumptions? Do PRs confirm or contradict assumptions about components or approach? Does the audit trail show configurations that resolved unknowns?
C3 [GEN]: For each technical assumption still "Open", present the developer with evidence and ask: "This assumption was: [statement]. Our evidence suggests [finding]. Is this validated, refuted, or still open?"
C4 [GEN]: For each technical unknown, ask: "This was flagged as unknown: [statement]. Was this resolved during development? What was the answer?"
C5 [GEN]: Compile resolution updates for inclusion in the delta artifact.

### D: Developer Questionnaire [GEN]
Present the gathered evidence and ask **targeted** questions about architecture and implementation only.

- "We found these PRs linked to this work item: [list]. Are there any others? Any sandbox-only changes not in PRs?"
- "The Salesforce audit trail shows these changes: [list]. Do these relate to this work item?"
- "The current SF metadata shows [findings]. The wiki planned [plan]. Which components were built as designed vs. modified?"
- "Were any new components created that weren't in the original plan?"
- "Were there new integration points or dependencies discovered?"
- "Did you deviate from any referenced standards? Why?"
- "Were there new technical risks encountered?"
- Present remaining unresolved technical assumptions/unknowns from section C.

**Do not ask** about requirements, business value, acceptance criteria, or scope — those belong in phase-08a.

Capture answers in structured form.

### E: Delta and Artifacts [GEN + IO]
E1 [GEN]: From questionnaire answers and evidence summary, compute solutioning deltas.
E2 [GEN]: Produce updated solution-design content and updated `Custom.DevelopmentSummary` HTML using `{{template_files.field_solution_design}}`. Keep all content in **how** terms (architecture, components, technical approach). Reference what/why only to motivate design choices.
E3 [IO]: Save dev-update artifact to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`

Schema for dev-update artifact:
```json
{
  "update_number": 1,
  "timestamp": "{{iso_timestamp}}",
  "work_item_id": "{{work_item_id}}",
  "areas_updated": ["solutioning"],
  "evidence_summary": {
    "prs_found": [],
    "sf_audit_relevant": [],
    "sf_current_state_notes": "",
    "sf_planned_vs_actual": ""
  },
  "assumptions_resolved": [],
  "unknowns_resolved": [],
  "developer_input": {
    "solution_changes": [],
    "new_components": [],
    "new_integration_points": [],
    "standards_deviations": [],
    "new_risks": []
  },
  "fields_changed": {
    "Custom.DevelopmentSummary": { "old": "", "new": "" },
    "Custom.SFComponents": { "old": "", "new": "" }
  }
}
```
Include only keys for fields that actually changed. Omit unchanged fields.

E4 [IO]: Save solutioning payload to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-solutioning-payload.json` (format acceptable to `--fields-file`).

### F: Update ADO [CLI]
F1 [LOGIC]: Build payload from solutioning fields only. Use only fields that changed; no null/empty overwrites unless intentionally clearing.
F2 [IO]: Save payload to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
F3 [CLI]: If any fields changed: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json" --json`
F4 [IO]: Optionally update `{{solutioning}}/solution-design.json` if it exists so subsequent runs see the latest state.

## Output
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
- ADO work item updated with changed solutioning fields only
- Optional: updated local `solution-design.json` if present

## Notes
- This phase is re-runnable. Each run appends a new dev-update-NNN artifact.
- No local artifact files from prior phases are required; current state is retrieved from ADO and wiki.
- If wiki page is not found, no PRs are linked, or SF audit returns no results, proceed with reduced evidence and rely more on the developer questionnaire.
- **Only solutioning (how) content is updated in this phase.** For grooming (what/why) updates, use phase-08a.
- Single ADO update call per run; batch all solutioning field changes into one payload.
