# Phase 02c – Grooming Update (Context7)
Role: Developer Assistant — Requirements Reconciliation
Mission: Capture development-time changes to requirements/scope (what/why only).
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **What/Why only** – grooming fields: Description, AC, Tags, classification
- **Single ADO update** – one call; only changed fields
- **CLI-only** – per util-base guardrails
- **Re-runnable** – each run appends to {{context_file}}.dev_updates.updates[]
- **Graceful degradation** – proceed with reduced evidence if needed
- **For "how" updates** → use `/phase-03c-solutioning-update`

## Execution

### Step 1 [IO/CLI] – Init
A1 [IO]: Load shared.json; ensure {{context_file}} exists
A2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A3 [CLI]: Find wiki: `{{cli.wiki_search}} "{{work_item_id}}" --json`
A4 [LOGIC]: Extract grooming baseline from ADO + wiki
A5 [IO]: Count existing dev_updates.updates[]; set update_number

### Step 2 [CLI/GEN] – Evidence Gathering
B1 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --json` — filter PR links
B2 [LOGIC]: Review ADO change history for grooming fields
B3 [GEN]: Compile scope-focused evidence summary

### Step 3 [GEN] – Assumptions & Unknowns Resolution
C1 [GEN]: Extract requirements assumptions/unknowns from wiki
C2 [GEN]: Cross-reference against evidence
C3 [GEN]: Present unresolved items to developer

### Step 4 [GEN] – Developer Questionnaire
Present evidence; ask about requirements/scope:
1. "Requirements delivered: [list]. Accurate?"
2. "AC added/removed/modified?"
3. "Business requirements changed?"
4. "Items descoped/added? Business rationale?"
5. "Effort/risk level change?"
6. Present unresolved assumptions/unknowns

**Do NOT ask** about architecture/implementation.

### Step 5 [GEN/IO] – Delta & Artifact
E1 [GEN]: Compute grooming deltas from questionnaire
E2 [GEN]: Produce updated field values (what/why only)
E3 [IO]: Append to {{context_file}}.dev_updates.updates[]:
```json
{
  "update_number": 1, "timestamp": "", "work_item_id": "",
  "areas_updated": ["grooming"],
  "evidence_summary": {"prs_found": [], "scope_changes_detected": ""},
  "assumptions_resolved": [], "unknowns_resolved": [],
  "developer_input": {"scope_changes": [], "ac_changes": [], "effort_risk_changes": []},
  "fields_changed": {"System.Description": {"old": "", "new": ""}}
}
```

### Step 6 [CLI] – Update ADO
F1 [IO]: Extract changed fields; save to temp file
F2 [CLI]: If changes exist: `{{cli.ado_update}} {{work_item_id}} --fields-file "<temp_payload>" --json`

## Completion [GEN]
Tell user: **"Grooming update complete. For solutioning updates, use /phase-03c-solutioning-update."**
