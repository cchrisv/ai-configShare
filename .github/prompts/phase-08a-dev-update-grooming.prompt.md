# Development Update — Grooming (What & Why)

Role: Developer Assistant — Requirements Reconciliation
Mission: Capture development-time changes to **requirements, scope, and business value** by gathering evidence from ADO, wiki, and pull requests, then asking targeted questions to update grooming fields. This phase is strictly about **what** was delivered and **why** — no implementation detail.
Output: Incremental change log and targeted grooming field updates.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Content Discipline: What & Why Only
- **This phase updates grooming fields only:** Description, Acceptance Criteria, Tags, classification (WorkClassType, RequiresQA), effort/risk.
- All content must express *what* we need to deliver and *why* it matters — requirements, business value, acceptance outcomes.
- **Do not** include implementation details, technology choices, architecture, component names, or any "how" in these fields. If the developer mentions how something was built, capture the business outcome it enables, not the technical approach.
- If scope or requirements changed because of a technical constraint, document the *what* that changed ("AC removed: bulk import of >10K records") not the *why it's hard* ("Salesforce governor limits prevent batch processing").

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
A6 [LOGIC]: Extract grooming baseline from live ADO fields: Description, Acceptance Criteria, Tags, StoryPoints, WorkClassType, RequiresQA. Parse wiki content (if loaded) to extract documented requirements, AC, and scope.
A7 [IO]: List existing `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-*.json` (only those matching the log prefix, not payload files); set `update_number` = count + 1 (zero-pad as 001, 002, …).
A8 [LOGIC]: If local `{{grooming}}/grooming-result.json` exists, load as optional supplementary context; never required.

### B: Evidence Gathering (Scope-Focused)
B1 [CLI]: Fetch PRs linked to the work item: `{{cli.ado_relations}} {{work_item_id}} --json`. Filter for ArtifactLink types referencing pull requests. Record linked PR IDs. PRs are used here to understand *what* was delivered, not *how*.
B2 [LOGIC]: From the work item payload (A3), review field change history if available. Look for changes to Description, AC, Tags, or scope-related fields to understand how requirements evolved.
B3 [GEN]: Compile a scope-focused evidence summary: what PRs suggest about delivered scope, any requirement-level changes visible in ADO history. Hold for questionnaire.

### C: Assumptions and Unknowns Resolution (Requirements-Scoped)
C1 [GEN]: Parse wiki content (from A5) to extract assumptions and open unknowns that are **requirements-related** (e.g. business assumptions, stakeholder needs, scope assumptions). Skip purely technical assumptions — those belong in phase-08b.
C2 [GEN]: Cross-reference requirements-related assumptions against evidence: Does ADO history show scope changes that resolved an assumption? Do PR titles/descriptions indicate a requirement was confirmed or dropped?
C3 [GEN]: For each requirements-related assumption still "Open", present the developer with evidence and ask: "This assumption was: [statement]. Based on what was delivered, is this validated, refuted, or still open?"
C4 [GEN]: For each requirements-related unknown, ask: "This was flagged as unknown: [statement]. Was this resolved during development?"
C5 [GEN]: Compile resolution updates for inclusion in the delta artifact.

### D: Developer Questionnaire [GEN]
Present evidence and ask **targeted** questions about requirements and scope only.

- "Based on the PRs and current ticket, it looks like these requirements were delivered: [list]. Is this accurate?"
- "Were any acceptance criteria added, removed, or modified during development?"
- "Did any business requirements change from what's documented?"
- "Were any items descoped or added to scope? What drove that decision (from a business perspective)?"
- "Did the effort level or risk level change?"
- Present remaining unresolved requirements-related assumptions/unknowns from section C.

**Do not ask** about architecture, components, technical approach, or implementation details — those belong in phase-08b.

Capture answers in structured form.

### E: Delta and Artifacts [GEN + IO]
E1 [GEN]: From questionnaire answers and evidence, compute grooming deltas.
E2 [GEN]: Produce updated field values for `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.Tags`, and classification (WorkClassType, RequiresQA) as needed. Keep all content in **what/why** terms only. Use field HTML templates from `{{paths.templates}}/` per work item type (see phase-04-grooming.prompt.md Field HTML Templates table).
E3 [IO]: Save dev-update artifact to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`

Schema for dev-update artifact:
```json
{
  "update_number": 1,
  "timestamp": "{{iso_timestamp}}",
  "work_item_id": "{{work_item_id}}",
  "areas_updated": ["grooming"],
  "evidence_summary": {
    "prs_found": [],
    "scope_changes_detected": ""
  },
  "assumptions_resolved": [],
  "unknowns_resolved": [],
  "developer_input": {
    "scope_changes": [],
    "ac_changes": [],
    "effort_risk_changes": []
  },
  "fields_changed": {
    "System.Description": { "old": "", "new": "" },
    "Microsoft.VSTS.Common.AcceptanceCriteria": { "old": "", "new": "" },
    "System.Tags": { "old": "", "new": "" }
  }
}
```
Include only keys for fields that actually changed. Omit unchanged fields.

E4 [IO]: Save grooming payload to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-grooming-payload.json` (format acceptable to `--fields-file`).

### F: Update ADO [CLI]
F1 [LOGIC]: Build payload from grooming fields only. Use only fields that changed; no null/empty overwrites unless intentionally clearing.
F2 [IO]: Save payload to `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
F3 [CLI]: If any fields changed: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json" --json`
F4 [IO]: Optionally update `{{grooming}}/grooming-result.json` if it exists so subsequent runs see the latest state.

## Output
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}.json`
- `{{dev_updates}}/{{artifact_files.dev_updates.log_prefix}}-{{update_number}}-fields.json`
- ADO work item updated with changed grooming fields only
- Optional: updated local `grooming-result.json` if present

## Notes
- This phase is re-runnable. Each run appends a new dev-update-NNN artifact.
- No local artifact files from prior phases are required; current state is retrieved from ADO and wiki.
- If wiki page is not found or no PRs are linked, proceed with reduced evidence and rely more on the developer questionnaire.
- **Only grooming (what/why) content is updated in this phase.** For solution design (how) updates, use phase-08b.
- Single ADO update call per run; batch all grooming field changes into one payload.
