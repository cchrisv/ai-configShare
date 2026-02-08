# Phase 05 – Finalization
Role: QA Lead
Mission: Complete work item updates, link related items, score WSJF, ensure traceability.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **WSJF mandatory** – never skip scoring; all 4 dimensions required
- **Single ADO update** – one `ado_update` call for fields (links are separate)
- **Idempotent linking** – check existing relations first, skip if link exists
- **Artifact verification** – verify prerequisites before ADO ops
- **CLI-only** – per util-base guardrails
- **Outputs to** {{context_file}}.finalization.*

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `field_paths.*`, `tags.*`, `template_files.*`
A2 [IO]: Load {{context_file}} → verify:
  - `.research` exists (synthesis, ado_workitem, salesforce_metadata)
  - `.grooming` exists (classification, templates_applied)
  - `.solutioning` exists (option_analysis, solution_design, traceability, testing)
  - `.wiki` exists (creation_audit)
  - `.metadata.phases_completed` includes `"wiki"`
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Templates
Load from `{{paths.templates}}/` (use `{{template_files.*}}` keys):
- `{{template_files.wsjf_scoring}}` — WSJF scoring anchors and Fibonacci mapping
- `{{template_files.field_mappings}}` — field mapping reference
- `{{template_files.audit_task}}` — audit task template (if audit tasks needed)

---

## Step 1 [IO] – Load Context
B1 [IO]: Read `.research.synthesis.unified_truth` — consolidated understanding
B2 [IO]: Read `.research.ado_workitem` — deadlines, sprint goals, related items, tags
B3 [IO]: Read `.grooming.classification` — effort, risk, complexity, unknowns, priority
B4 [IO]: Read `.grooming.templates_applied.applied_content` — description, AC
B5 [IO]: Read `.solutioning.option_analysis` — recommended option, scores (trusted/easy/adaptable)
B6 [IO]: Read `.solutioning.solution_design` — components, architecture, quality_bar
B7 [IO]: Read `.solutioning.traceability` — AC coverage, gaps, orphans
B8 [IO]: Read `.solutioning.testing` — test cases, ac_coverage_matrix
B9 [IO]: Read `.wiki.creation_audit` — wiki page path, page_id, url

## Step 2 [IO/LOGIC] – Evidence Gathering
C1 [LOGIC]: **Extract link candidates** from `.research.ado_workitem`:
  - Related work items referenced in description, comments, or tags
  - Similar work items from `.research.similar_workitems[]`
  - Companion stories identified during research/solutioning
  - Deduplicate and exclude `{{work_item_id}}` itself
C2 [IO]: Load `{{paths.templates}}/{{template_files.wsjf_scoring}}` — scoring anchors
C3 [LOGIC]: **Extract WSJF input signals**:
  - **BV**: grooming.classification (effort, risk, priority) + applied_content (user impact, scope)
  - **TC**: research.ado_workitem (deadlines, sprint goals, iteration_path, tags)
  - **RR/OE**: solutioning.option_analysis (pillar scores) + traceability (gaps) + solution_design (quality_bar)
  - **JD**: grooming.classification (complexity, unknowns) + solutioning.solution_design (components count) + traceability (gaps count)

## Step 3 [LOGIC] – WSJF Scoring (MANDATORY)
D1: **Business Value** (Fibonacci 1-20) — cite grooming evidence (user impact, scope, severity)
D2: **Time Criticality** (Fibonacci 1-20) — cite ADO evidence (deadlines, sprint goals)
  **Guardrail**: TC >= 8 → verify date/event evidence exists; if none → downgrade to 5 + add warning
D3: **Risk Reduction / Opportunity Enablement** (Fibonacci 1-13) — cite solutioning evidence
  **Guardrail**: RR/OE >= 8 → verify named risk type (Security/Compliance/Data Integrity/Incident Recurrence); if none → add warning
D4: **Job Duration** (Fibonacci 1-13) — also used as **Story Points**:
  - Complexity (1-3): from grooming.classification.complexity (Low=1, Medium=2, High=3)
  - Risk (0-3): +1 per pillar score ≤2 from solutioning; +1 if "High-Risk" tag
  - Uncertainty (0-3): +1 if unknowns > 0; +1 if traceability.gaps.length > 0
  - Sum → Fibonacci mapping (see `{{template_files.wsjf_scoring}}`)
D5: **Calculate WSJF** = `(BV + TC + RR/OE) / JD`
D6: **Derive ADO fields** from WSJF score (see scoring anchors):

| WSJF Range | Priority | Class of Service |
|------------|----------|------------------|
| ≥ 15.0 | 1 | Expedite |
| 8.0 – 14.9 | 1 | ExpediteCandidate |
| 4.0 – 7.9 | 2 | ExpediteCandidate |
| 1.5 – 3.9 | 3 | Standard |
| < 1.5 | 4 | Standard |

D7: **Assign overall confidence** (High/Medium/Low) based on weakest dimension confidence

## Step 4 [IO] – Save WSJF Artifact
Save → {{context_file}}.finalization.wsjf_evidence:
```json
{
  "dimensions": {
    "business_value": { "score": 0, "evidence": "", "confidence": "" },
    "time_criticality": { "score": 0, "evidence": "", "confidence": "" },
    "risk_reduction": { "score": 0, "evidence": "", "confidence": "" },
    "job_duration": { "score": 0, "factors": { "complexity": 0, "risk": 0, "uncertainty": 0, "sum": 0 }, "evidence": "", "confidence": "" }
  },
  "wsjf_score": 0.0,
  "story_points": 0,
  "priority": 0,
  "severity": "",
  "class_of_service": "",
  "overall_confidence": "",
  "guardrails": {
    "tc_date_verified": false,
    "rr_risk_type_verified": false,
    "guardrail_warnings": []
  },
  "warnings": [],
  "link_candidates": [
    { "target_id": 0, "link_type": "related", "reason": "" }
  ]
}
```

Save → {{context_file}}.finalization.context_snapshot:
```json
{
  "research_summary": { "sources_used": 0, "evidence_strength": "", "key_findings": [] },
  "ai_refinement_summary": { "fields_updated": [], "templates_applied": [], "phases_completed": [] },
  "solutioning_summary": { "recommended_option": "", "components_count": 0, "test_cases_count": 0, "ac_coverage": "" },
  "quality_bar": { "all_ac_covered": false, "test_coverage": "", "gaps_count": 0, "unknowns_count": 0 },
  "state_tracking": { "total_phases": 5, "completed_phases": 5, "wiki_url": "", "wsjf_score": 0.0 }
}
```

Update `run_state`:
- Append `{"phase":"finalization","step":"wsjf_scored","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `completed_steps[]`
- Save to disk

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Step 5 [CLI] – ADO Link Operations
E1 [CLI]: Check existing relations: `{{cli.ado_relations}} {{work_item_id}} --json`
E2 [LOGIC]: Filter link_candidates — remove any that already exist as relations
E3 [CLI]: For each remaining candidate: `{{cli.ado_link}} {{work_item_id}} {{target_id}} --type {{link_type}} --json`
  - Skip on conflict (already linked); log warning
  - On error: log to `run_state.errors[]`; continue with next candidate

## Step 6 [CLI] – ADO Field Update
Build fields payload from WSJF results. Field path mapping:

| Source | ADO Field Path |
|--------|---------------|
| `story_points` (= JD) | `{{field_paths.story_points}}` |
| `priority` | `{{field_paths.priority}}` |
| existing tags + `{{tags.refined}}` | `{{field_paths.tags}}` (joined with "; ") |

F1 [CLI]: `{{cli.ado_update}} {{work_item_id}} --story-points {{story_points}} --priority {{priority}} --tags "{{final_tags}}" --json`

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

## Step 7 [CLI/GEN] – Verify & Complete
G1 [CLI]: `{{cli.ado_relations}} {{work_item_id}} --json` — verify links applied
G2 [CLI]: `{{cli.ado_get}} {{work_item_id}} --fields "System.Tags,Microsoft.VSTS.Scheduling.StoryPoints,Microsoft.VSTS.Common.Priority" --json` — verify fields
G3 [GEN]: Generate completion summary narrative
G4 [IO]: Save verification to `run_state.completed_steps[]`

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"finalization"`
- `metadata.current_phase` = `"complete"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"finalization","step":"ado_updated","completedAt":"<ISO>"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Workflow complete. Work item ready for development. Use /phase-06-dev-closeout after development."**
