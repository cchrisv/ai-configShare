# Phase 03b – Solutioning
Role: Solution Architect
Mission: Design technical solutions meeting requirements and standards.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Extend over new** – prefer existing components; avoid net-new when platform supports it
- **Standards-driven** – reference `{{paths.standards}}/` for compliance
- **No timelines** – do not produce sprint estimates, delivery dates, schedule commitments, or task-level duration estimates. Capture high-level LOE only (component `complexity_estimate` as Simple/Medium/Complex) for Phase 5 WSJF scoring. Story points are derived exclusively in Phase 5 finalization.
- **Single ADO update** – one `ado_update --from-context` call at the end
- **CLI-only** – per util-base guardrails
- **Template-engine only** – NEVER generate raw HTML. Run `template-tools scaffold` [CLI] for Development Summary fill spec, then fill JSON slot values [GEN] (there is NO `fill-slots` CLI command — this is AI reasoning), save to context [IO]. The `--from-context` flag auto-renders and validates.
- **Outputs to** {{context_file}}.solutioning.*

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `field_paths.*`, `tags.*`, `template_files.*`
A2 [IO]: Load {{context_file}} → verify:
  - `.research.synthesis` exists with `research_phase_complete = true`
  - `.research.salesforce_metadata` exists (schema, logic, dependencies)
  - `.research.dependency_discovery` exists (high_risk_components, regression_candidates)
  - `.grooming` exists (classification, templates_applied, solutioning_hints)
  - `.metadata.phases_completed` includes `"research"` AND `"grooming"`
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Templates
Templates are managed by the template engine. The CLI scaffolds fill specs, AI fills slots, CLI renders:
- `field-solution-design` — ADO Development Summary HTML (rendered by template engine via `--from-context`)

Reference docs (not engine-rendered — used for guidance only):
- `{{template_files.solution_design}}` — solution design structure reference
- `{{template_files.solution_design_document}}` — feature-level solution design document (used in Phase 04, not here)

---

## Step 1 [IO] – Load Context
B1 [IO]: Read `.research.synthesis.unified_truth` — consolidated understanding
B2 [IO]: Read `.research.salesforce_metadata` — schema, triggers, flows, platform events
B3 [IO]: Read `.research.dependency_discovery` — high_risk_components, regression_candidates
B4 [IO]: Read `.grooming.classification` — work_class, effort, risk, quality_gates
B5 [IO]: Read `.grooming.solutioning_hints[]` — extracted implementation clues from grooming
B6 [IO]: Read `.grooming.templates_applied.applied_content.acceptance_criteria` — what we must trace to

## Step 2 [GEN/CLI] – Option Analysis
C0 [GEN]: **Refine preliminary classifications** — load `.grooming.classification` (effort, complexity, feasibility are marked `"preliminary"` from phase 02b). Using technical evidence from 03a research, produce evidence-based values to replace the preliminaries.
C1 [GEN]: Enumerate solution options — score each on **Trusted** / **Easy** / **Adaptable** (1–5):
  - **OOTB**: Out-of-the-box platform capability (declarative)
  - **Extension**: Extend existing components (modify trigger action, update CMT, adjust flow)
  - **Custom**: Net-new development (new Apex, new objects, new integrations)
C2 [GEN]: For each option, assess: effort, risk, standards compliance, regression surface
C3 [CLI]: If additional metadata needed: `{{cli.sf_describe}} {{object_name}} --json`
C4 [GEN]: Recommend best option with decision rationale; document eliminated options with reasons

## Step 3 [GEN] – Solution Design
D1 [GEN]: **Component design** — for recommended option, define components:
  - component_id, name, type, complexity_estimate, responsibility
  - Map each component to the AC it satisfies
D2 [GEN]: **Architecture decisions** — document key decisions with rationale
D3 [GEN]: **Integration points** — identify system boundaries, API contracts, event flows
D4 [GEN]: **Standards compliance** — load relevant standards from `{{paths.standards}}/`:
  - `apex-well-architected.md` — if Apex changes
  - `trigger-actions-framework-standards.md` — if trigger actions modified
  - `flow-well-architected.md` — if flows modified
  - `event-driven-architecture-standards.md` — if platform events involved
  - `metadata-naming-conventions.md` — always
D5 [GEN]: **Quality bar** — define code review, test coverage, performance thresholds

## Step 4 [GEN] – Traceability & LOE
E1 [GEN]: **AC traceability** — map every acceptance criterion → component_ids that implement it
E2 [GEN]: **Gap analysis** — identify ACs not covered by any component; flag as gaps
E3 [GEN]: **Orphan detection** — identify components not traced to any AC
E4 [GEN]: **Level of effort summary** — capture high-level LOE signals for Phase 5 WSJF scoring:
  - overall_complexity (Simple | Medium | Complex) — derived from component count and architecture decisions
  - risk_surface (Low | Medium | High) — derived from integration points, dependency depth, standards deviations
  - uncertainty_flags[] — list any unresolved assumptions, traceability gaps, or untested patterns

## Step 5 [GEN] – Quality Gates
Run ALL gates before saving:

| Gate | Check | On Fail |
|------|-------|---------|
| **AC coverage** | Every AC maps to ≥1 component | Flag gaps, attempt to fill |
| **Standards compliance** | All components comply with loaded standards | Adjust design or document exception |
| **Risk alignment** | Solution risk ≤ grooming risk classification | Escalate if solution is riskier |
| **No orphans** | Every component traces to ≥1 AC | Remove or justify orphan components |

**Max 3 iterations** — proceed with best effort and log warnings if gates still fail.

## Step 6 [IO] – Save Artifact
**GATE: write to disk before CLI call.**

Save → {{context_file}}.solutioning:
```json
{
  "option_analysis": {
    "options": [
      { "id": "", "name": "", "type": "OOTB|Extension|Custom",
        "description": "", "scores": { "trusted": 0, "easy": 0, "adaptable": 0 } }
    ],
    "recommended_option": { "option_id": "", "rationale": "" },
    "decision_summary": "",
    "eliminated_options": [{ "option_id": "", "reason": "" }]
  },
  "solution_design": {
    "components": [
      { "component_id": "", "name": "", "type": "", "complexity_estimate": "", "responsibility": "" }
    ],
    "architecture_decisions": [{ "id": "", "decision": "", "rationale": "", "alternatives_considered": [] }],
    "integration_points": [{ "source": "", "target": "", "mechanism": "", "contract": "" }],
    "quality_bar": { "code_review": true, "test_coverage_min": 80, "performance_threshold": "" },
    "applied_standards": [""]
  },
  "traceability": {
    "acceptance_criteria": [{ "ac_id": "", "description": "", "component_ids": [] }],
    "telemetry": [],
    "gaps": [],
    "orphans": []
  },
  "level_of_effort": {
    "overall_complexity": "Simple|Medium|Complex",
    "component_count": 0,
    "risk_surface": "Low|Medium|High",
    "uncertainty_flags": [],
    "loe_notes": "",
    "refined_from_grooming": { "effort": "", "complexity": "", "feasibility": "", "note": "Replaces preliminary values from phase 02b classification" }
  },
  "filled_slots": {
    "field-solution-design": {
      "business_problem_statement": { "variable": "business_problem_statement", "type": "text", "required": true, "hint": "The business problem being solved", "value": "Current manual process causes...", "items": [], "rows": [] },
      "solution_approach_narrative": { "variable": "solution_approach_narrative", "type": "text", "required": true, "hint": "High-level solution approach", "value": "Extend existing trigger action to...", "items": [], "rows": [] },
      "technical_narrative": { "variable": "technical_narrative", "type": "text", "required": true, "hint": "Technical implementation narrative", "value": "The solution modifies the existing...", "items": [], "rows": [] },
      "components": { "variable": "components", "type": "table", "required": true, "hint": "Key components of the solution", "value": null, "items": [], "rows": [
        { "name": "AccountTriggerAction", "type": "Apex Trigger Action", "responsibility": "Validates enrollment eligibility" },
        { "name": "EnrollmentService", "type": "Apex Service", "responsibility": "Processes enrollment records" }
      ]},
      "integration_points_brief": { "variable": "integration_points_brief", "type": "text", "required": false, "hint": "Brief integration points summary", "value": "Integrates with Student API via platform events", "items": [], "rows": [] }
    }
  },
  "extra_fields": {
    "story_points": null,
    "tags": ["existing", "tags", "{{tags.solutioned}}"]
  }
}
```

Update `run_state`:
- Append `{"phase":"solutioning","step":"solution_design","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `completed_steps[]`
- Save to disk

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Step 7 [CLI] – Render & Push to ADO
The `--from-context` flag reads `filled_slots`, auto-renders via the template engine, validates, then pushes:

`{{cli.ado_update}} {{work_item_id}} --from-context "{{context_file}}" --phase solutioning --json`

The CLI automatically:
1. Renders `field-solution-design` template from filled_slots → final HTML
2. Validates: no unfilled tokens, sections present, gradients intact
3. Maps rendered HTML → `{{field_paths.development_summary}}`
4. Reads `extra_fields` for story_points, tags
5. Writes `templates_applied.applied_content` back to context for audit trail
6. Pushes all fields to ADO in a single update

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

## Step 8 [IO/GEN/CLI] – Wiki: Fill Why Decisions + How Solution
Ref: `#file:.github/prompts/util-wiki-base.prompt.md`

Fill sections where `filled_by_phase == "solutioning"`:
- `why_decisions` — from `solutioning.option_analysis`, `solutioning.solution_design.applied_standards`, `research.synthesis.unified_truth.risks`
- `how_solution` — from `solutioning.solution_design`, `solutioning.traceability`
- `executive_summary` (finalize — add recommended approach + path forward from `solutioning.option_analysis.decision_summary`)

Execute the 7-step fill workflow from util-wiki-base. Update status banner: **Grooming** ✅ | **Research** ✅ | **Solutioning** ✅ | **Testing** ⏸️

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"solutioning"`
- `metadata.current_phase` = `"test_cases"`
- `metadata.last_updated` = current ISO timestamp
- Append `{"phase":"solutioning","step":"ado_update","completedAt":"<ISO>"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Solutioning complete. Use /phase-04-test-cases."**
