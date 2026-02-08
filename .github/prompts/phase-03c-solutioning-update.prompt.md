# Phase 03c – Solutioning Update (Context7)
Role: Developer Assistant — Solution Reconciliation
Mission: Capture development-time changes to architecture/components (how only).
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **How only** – solutioning fields: DevelopmentSummary (HTML), SFComponents
- **Single ADO update** – one call; only changed fields
- **CLI-only** – per util-base guardrails
- **Re-runnable** – each run appends to {{context_file}}.dev_updates.updates[]
- **Graceful degradation** – proceed with reduced evidence if needed
- **For "what/why" updates** → use `/phase-02c-grooming-update`

## Execution

### Step 1 [IO/CLI] – Init
A1 [IO]: Load shared.json; ensure {{context_file}} exists
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A3 [CLI]: Find wiki: `{{cli.wiki_search}} "{{work_item_id}}" --json`
A4 [LOGIC]: Extract solutioning baseline from ADO + wiki
A5 [IO]: Count existing dev_updates.updates[]; set update_number

### Step 2 [CLI/GEN] – Evidence Gathering
B1 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --json` — filter PR links
B2 [CLI]: `{{cli.sf_query}} "SELECT Action, Section, Display, CreatedDate, CreatedBy.Name, DelegateUser FROM SetupAuditTrail WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC" --json`
B3 [CLI]: For SF components: `{{cli.sf_discover}}` / `{{cli.sf_describe}}` to get as-built state
B4 [GEN]: Compile evidence: PRs, SF audit, SF metadata

### Step 3 [GEN] – Technical Assumptions & Unknowns Resolution
C1 [GEN]: Extract technical assumptions/unknowns from wiki
C2 [GEN]: Cross-reference against evidence (SF metadata, PRs, audit)
C3 [GEN]: Present unresolved items to developer

### Step 4 [GEN] – Developer Questionnaire
Present evidence; ask about architecture/implementation:
1. "PRs found: [list]. Any others? Sandbox-only?"
2. "SF audit shows: [list]. Related to this work?"
3. "SF metadata vs wiki plan: built as designed?"
4. "New components not in plan?"
5. "New integration points/dependencies?"
6. "Standards deviations? Why?"
7. "New technical risks?"
8. Present unresolved technical assumptions/unknowns

**Do NOT ask** about requirements/business value.

### Step 5 [GEN/IO] – Delta & Artifact
E1 [GEN]: Compute solutioning deltas from questionnaire
E2 [GEN]: Produce updated DevelopmentSummary HTML
E3 [IO]: Append to {{context_file}}.dev_updates.updates[]:
```json
{
  "update_number": 1, "timestamp": "", "work_item_id": "",
  "areas_updated": ["solutioning"],
  "evidence_summary": {"prs_found": [], "sf_audit_relevant": [], "sf_current_state_notes": ""},
  "assumptions_resolved": [], "unknowns_resolved": [],
  "developer_input": {"solution_changes": [], "new_components": [], "new_integration_points": []},
  "fields_changed": {"Custom.DevelopmentSummary": {"old": "", "new": ""}}
}
```

### Step 6 [CLI] – Update ADO
F1 [IO]: Extract changed fields; save to temp file
F2 [CLI]: If changes exist: `{{cli.ado_update}} {{work_item_id}} --fields-file "<temp_payload>" --json`

## Completion [GEN]
Tell user: **"Solutioning update complete. For grooming updates, use /phase-02c-grooming-update."**
