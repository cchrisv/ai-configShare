# Phase 02b – Grooming
Role: Business Architect
Mission: Transform requests into evidence-based requirements.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Single ADO update** – one `ado_update` call at the end
- **CLI-only** – per util-base guardrails
- **Solution-neutral** – move "How" to solutioning hints; keep "What/Why" only
- **Template-verbatim** – COPY field HTML templates from `{{paths.templates}}/` exactly; ONLY replace `{{variable}}` tokens. NEVER write HTML/CSS from memory.
- **Outputs to** {{context_file}}.grooming.*

## Prerequisites [IO]
A1: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `field_paths.*`, `tags.*`, `template_files.*`, `work_item_types.*`
A2: Load {{context_file}} → verify:
  - `.research.synthesis` exists with content
  - `.research.assumptions` exists
  - `.metadata.phases_completed` includes `"research"`
A3: **STOP** if any prerequisite missing. Log error to `run_state.errors[]` and save to disk.

## Templates
Load HTML templates from `{{paths.templates}}/` by work item type (use `{{template_files.*}}` keys):

| Type | Description | AC | Repro Steps | System Info | Business Value | Objectives |
|------|-------------|----|-------------|-------------|----------------|------------|
| User Story | `{{template_files.field_user_story_description}}` | `{{template_files.field_user_story_acceptance_criteria}}` | — | — | — | — |
| Bug/Defect | `{{template_files.field_bug_description}}` | `{{template_files.field_bug_acceptance_criteria}}` | `{{template_files.field_bug_repro_steps}}` | `{{template_files.field_bug_system_info}}` | — | — |
| Feature | `{{template_files.field_feature_description}}` | `{{template_files.field_feature_acceptance_criteria}}` | — | — | `{{template_files.field_feature_business_value}}` | `{{template_files.field_feature_objectives}}` |

---

## Step 1 [IO] – Load Research Context
B1: Read `.research.synthesis.unified_truth` — this is the consolidated understanding
B2: Read `.research.assumptions[]` — check confidence levels, unresolved items
B3: Read `.research.ado_workitem.scrubbed_data` — get current field values + work item type
B4: Determine work item type from `scrubbed_data.work_item_type` → select template set

## Step 2 [GEN] – Analysis & Content Generation
C1: **Organizational context** — match department, persona, strategic goals from research evidence
C2: **Classify** — determine WorkClass (`{{work_class_types}}`), Effort, Risk, Priority, Complexity, Feasibility, Tags
C3: **Solution neutrality** — identify any "How" statements in description/AC; extract to `.grooming.solutioning_hints[]` for phase-03; keep only "What/Why"
C4: **Generate HTML content** — populate selected field templates using research evidence:
  - Fill template placeholders with scrubbed business content
  - Preserve template HTML structure exactly
  - Include research-backed evidence for every requirement statement
C5: **Map to ADO field paths** — use `{{field_paths.*}}` for the update payload:
  - `{{field_paths.description}}` → generated description HTML
  - `{{field_paths.acceptance_criteria}}` → generated AC HTML
  - `{{field_paths.tags}}` → semicolon-separated tag string (merge existing + new, include `{{tags.groomed}}`)
  - `{{field_paths.work_class_type}}` → classified work class
  - `{{field_paths.requires_qa}}` → Yes/No based on risk assessment
  - Bug-only: `{{field_paths.repro_steps}}`, `{{field_paths.system_info}}`
  - Feature-only: `{{field_paths.business_problem_and_value}}`, `{{field_paths.business_objectives_and_impact}}`

## Step 3 [GEN] – Quality Gates
Run ALL gates. Record pass/fail + evidence for each:

| Gate | Check | On Fail |
|------|-------|---------|
| **Template fidelity** | HTML structure matches template exactly | Re-generate from template |
| **Solution leak** | No implementation details in description/AC | Extract to solutioning_hints, re-generate |
| **Clarity** | Every AC is testable and unambiguous | Rewrite with GIVEN/WHEN/THEN if needed |
| **Logical fallacy** | No circular reasoning, false premises | Flag with `{{tags.logical_fallacy}}` tag |
| **Completeness** | All required template sections populated | Fill gaps from research or flag as unknown |

**Max 3 iterations** — if gates still fail after 3 attempts, proceed with best effort and log warnings.

## Step 4 [IO] – Save Artifact
**GATE: write to disk before CLI call.**

Save → {{context_file}}.grooming (HTML content goes **inline** in `applied_content`):
```json
{
  "classification": {
    "work_class": "", "effort": "", "risk": "", "priority": "",
    "complexity": "", "feasibility": "",
    "tags": { "existing": [], "to_add": [], "final": [] },
    "quality_gates": {
      "template_fidelity": { "passed": true, "evidence": "" },
      "solution_leak": { "passed": true, "evidence": "" },
      "clarity": { "passed": true, "evidence": "" },
      "logical_fallacy": { "passed": true, "evidence": "" },
      "completeness": { "passed": true, "evidence": "" }
    },
    "unknowns": []
  },
  "organizational_context_match": {
    "department": { "primary": "", "confidence": 0, "additional": [] },
    "persona": { "primary": "", "confidence": 0, "task": "", "pain_point": "" },
    "strategic_goals": []
  },
  "templates_applied": {
    "field_mappings": { "description": "{{field_paths.description}}", "acceptance_criteria": "{{field_paths.acceptance_criteria}}" },
    "applied_content": {
      "title": "",
      "description": "<full generated HTML inline>",
      "acceptance_criteria": "<full generated HTML inline>",
      "tags": ["existing", "tags", "{{tags.groomed}}"],
      "work_class_type": "",
      "qa_requirement": { "requires_qa": "Yes|No", "reason": "" }
    },
    "disclaimer_status": { "ai_generated": true, "review_required": true },
    "template_fidelity_verified": true
  },
  "solutioning_hints": [],
  "triage_summary_narrative": ""
}
```

Update `run_state`:
- Append `{"phase":"grooming","step":"analysis","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `completed_steps[]`
- Update `metrics.grooming.quality_gates_passed` / `quality_gates_failed` counts

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Step 5 [CLI] – Update ADO
The CLI reads `applied_content` from the context file and maps friendly names → ADO field paths automatically:

`{{cli.ado_update}} {{work_item_id}} --from-context "{{context_file}}" --json`

The `--from-context` flag maps: `description` → `{{field_paths.description}}`, `acceptance_criteria` → `{{field_paths.acceptance_criteria}}`, `tags` → `{{field_paths.tags}}` (joined with "; "), `work_class_type` → `{{field_paths.work_class_type}}`, `qa_requirement.requires_qa` → `{{field_paths.requires_qa}}`, plus bug/feature-specific fields when present.

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"grooming"`
- `metadata.current_phase` = `"solutioning"`
- `metadata.last_updated` = current ISO timestamp
- Save to disk

Tell user: **"Grooming complete. Use /phase-03a-solutioning-research."**
