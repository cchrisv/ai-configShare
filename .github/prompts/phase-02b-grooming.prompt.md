# Phase 02b – Grooming
Role: Business Architect
Mission: Transform requests into evidence-based requirements.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Constraints
- **Single ADO update** – one `ado_update --from-context` call at the end
- **CLI-only** – per util-base guardrails
- **Solution-neutral** – move "How" to solutioning hints; keep "What/Why" only
- **Template-engine only** – NEVER generate raw HTML. Run `template-tools scaffold-phase` [CLI] to get a fill spec, then fill slot values in the JSON [GEN] (there is NO `fill-slots` CLI command — this is AI reasoning), then save to context [IO]. The `--from-context` flag auto-renders and validates.
- **Fill slots, not HTML** – AI produces structured JSON slot values only. No HTML generation. No CLI command for filling — the AI writes the JSON directly.
- **Outputs to** {{context_file}}.grooming.*

## Prerequisites [IO]
A1: Load `#file:config/shared.json` → extract `paths.*`, `cli_commands.*`, `field_paths.*`, `tags.*`, `work_item_types.*`
A2: Load {{context_file}} → verify:
  - `.research.synthesis` exists with content
  - `.research.assumptions` exists
  - `.metadata.phases_completed` includes `"research"`
A3: **STOP** if any prerequisite missing. Log error to `run_state.errors[]` and save to disk.

---

## Step 1 [IO] – Load Research Context
B1: Read `.research.synthesis.unified_truth` — this is the consolidated understanding
B2: Read `.research.assumptions[]` — check confidence levels, unresolved items
B3: Read `.research.ado_workitem.scrubbed_data` — get current field values + work item type
B4: Determine work item type from `scrubbed_data.work_item_type`

## Step 2 [CLI] – Scaffold Fill Specs
C0: Run `{{cli.template_scaffold_phase}} --phase grooming --type "{{work_item_type}}" -w {{work_item_id}} --context {{context_file}} --json`
This produces a JSON fill spec describing every slot the AI must fill — variable names, types (text, list, table, repeatable_block), required flags, and hints. Review the output to understand the exact shape expected.

## Step 3 [GEN] – Analysis & Slot Filling
C1: **Organizational context** — match department, persona, strategic goals from research evidence
C2: **Classify** — determine WorkClass (`{{work_class_types}}`), Risk, Priority, Tags (business-driven, evidence available now). Mark Effort, Complexity, Feasibility as `"preliminary"` — these will be refined in phase 03b after technical research.
C3: **Solution neutrality** — identify any "How" statements; extract to `.grooming.solutioning_hints[]` for phase-03; keep only "What/Why"
C3.5: **Investigation refinement** — review `.research.solutioning_investigation` from phase 02a; resolve items answered during analysis; add new items surfaced. Output refined list to `.grooming.solutioning_investigation`.
C4: **Fill slot values** — for each template in the fill spec, populate slot values using research evidence:
  - `text` slots: plain text value string (will be HTML-escaped by renderer)
  - `html` slots: rich text value (use sparingly, only where template expects it)
  - `list` slots: array of string items (renderer generates `<li>` elements)
  - `table` slots: array of row objects matching column keys (renderer generates `<tr>` elements)
  - `repeatable_block` slots: array of block objects matching block_variable keys (renderer clones template blocks)
  - Include research-backed evidence for every requirement statement
  - **NEVER write HTML/CSS** — only fill the JSON slot values

## Step 4 [GEN] – Quality Gates
Run ALL gates on the filled slot values. Record pass/fail + evidence:

| Gate | Check | On Fail |
|------|-------|---------|
| **Slot completeness** | All required slots have non-null values | Fill from research or flag as unknown |
| **Solution leak** | No implementation details in description/AC slot values | Extract to solutioning_hints[], refill |
| **Clarity** | Every AC scenario block is testable and unambiguous | Rewrite with clear GIVEN/WHEN/THEN |
| **Logical fallacy** | No circular reasoning, false premises | Flag with `{{tags.logical_fallacy}}` tag |

**Max 3 iterations** — if gates still fail after 3 attempts, proceed with best effort and log warnings.

## Step 5 [IO] – Save Artifact
**GATE: write to disk before CLI call.**

Save → {{context_file}}.grooming:
```json
{
  "classification": {
    "work_class": "", "risk": "", "priority": "",
    "effort": "", "complexity": "", "feasibility": "", "preliminary_fields_note": "effort/complexity/feasibility are preliminary — refined in phase 03b after technical research",
    "tags": { "existing": [], "to_add": [], "final": [] },
    "quality_gates": {
      "slot_completeness": { "passed": true, "evidence": "" },
      "solution_leak": { "passed": true, "evidence": "" },
      "clarity": { "passed": true, "evidence": "" },
      "logical_fallacy": { "passed": true, "evidence": "" }
    },
    "unknowns": []
  },
  "organizational_context_match": {
    "department": { "primary": "", "confidence": 0, "additional": [] },
    "persona": { "primary": "", "confidence": 0, "task": "", "pain_point": "" },
    "strategic_goals": []
  },
  "filled_slots": {
    "field-user-story-description": {
      "summary_text": { "variable": "summary_text", "type": "text", "required": true, "hint": "Brief summary", "value": "As a registrar, I need...", "items": [], "rows": [] },
      "goals": { "variable": "goals", "type": "list", "required": true, "hint": "Business goals", "value": null, "items": ["Reduce processing time", "Improve accuracy"], "rows": [] },
      "assumptions": { "variable": "assumptions", "type": "table", "required": true, "hint": "Key assumptions", "value": null, "items": [], "rows": [{"id": "A1", "assumption": "...", "status": "Confirmed"}] }
    },
    "field-user-story-acceptance-criteria": {
      "scenarios": { "variable": "scenarios", "type": "repeatable_block", "required": true, "hint": "GWT scenario cards (min 3)", "value": null, "items": [], "rows": [], "blocks": [
        { "title": "Happy path enrollment", "given": "a student is eligible", "when": "they submit the form", "then": "enrollment is confirmed" },
        { "title": "Validation failure", "given": "required fields are empty", "when": "they submit the form", "then": "validation errors display" },
        { "title": "Duplicate detection", "given": "student is already enrolled", "when": "they attempt re-enrollment", "then": "a duplicate warning appears" }
      ]}
    }
  },
  "extra_fields": {
    "title": "",
    "tags": ["existing", "tags", "{{tags.groomed}}"],
    "work_class_type": "",
    "requires_qa": "Yes|No"
  },
  "solutioning_hints": [],
  "solutioning_investigation": {
    "assumptions_to_validate": [{ "id": "", "assumption": "", "source_stream": "", "why_matters": "" }],
    "questions_for_solutioning": [{ "id": "", "question": "", "context": "", "ac_reference": "" }],
    "unknowns": [{ "id": "", "description": "", "impact_if_unresolved": "" }],
    "scope_risks": [{ "id": "", "risk": "", "needs_investigation": "" }]
  },
  "triage_summary_narrative": ""
}
```
**CRITICAL — `filled_slots` structure:** Each slot MUST be a full FillSlot object with ALL fields (`variable`, `type`, `required`, `hint`, `value`, `items`, `rows`). For `repeatable_block` slots, also include `blocks` array. Copy the scaffold output and fill in the values — do NOT abbreviate or restructure. The template engine matches slots by variable name and reads `value`/`items`/`rows`/`blocks` depending on type.

Update `run_state`:
- Append `{"phase":"grooming","step":"analysis","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `completed_steps[]`
- Update `metrics.grooming.quality_gates_passed` / `quality_gates_failed` counts

**Save {{context_file}} to disk — GATE: do not proceed until confirmed written.**

## Step 6 [CLI] – Render & Push to ADO
The `--from-context` flag reads `filled_slots`, auto-renders each template via the template engine, validates structural integrity, then maps rendered HTML → ADO fields:

`{{cli.ado_update}} {{work_item_id}} --from-context "{{context_file}}" --phase grooming --json`

The CLI automatically:
1. Renders each template from filled_slots → final HTML
2. Validates: no unfilled tokens, sections present, gradients intact
3. Maps rendered HTML to ADO field paths via template registry `ado_field`
4. Reads `extra_fields` for non-template fields (title, tags, work_class_type, requires_qa)
5. Writes `templates_applied.applied_content` back to context for audit trail
6. Pushes all fields to ADO in a single update

On error: log to `run_state.errors[]`; save to disk; retry once; **STOP** on second failure.

## Step 7 [IO/GEN/CLI] – Wiki: Fill What
Ref: `#file:.github/prompts/util-wiki-base.prompt.md`

Fill sections where `filled_by_phase == "grooming"`:
- `executive_summary` (partial — challenge + discoveries only; no solution yet)
- `what_business_context` — from `research.ado_workitem.business_summary`, `research.business_context`, `grooming.organizational_context_match`, `research.journey_maps`
- `what_requirements` — from `grooming.templates_applied.applied_content` (description filled_slots), `research.synthesis.unified_truth.technical_requirements`
- `what_success_criteria` — from `grooming.templates_applied.applied_content` (AC filled_slots), `grooming.classification.quality_gates`
- `why_business_value` — from `grooming.organizational_context_match.strategic_goals`, `research.synthesis.unified_truth.business_goals`, `research.synthesis.swot_analysis`

Execute the 7-step fill workflow from util-wiki-base. Update status banner: **Grooming** ✅ | **Research** ⏸️ | **Solutioning** ⏸️ | **Testing** ⏸️

## Completion [IO/GEN]
Update {{context_file}}:
- `metadata.phases_completed` append `"grooming"`
- `metadata.current_phase` = `"solutioning_research"`
- `metadata.last_updated` = current ISO timestamp
- Save to disk

Tell user: **"Grooming complete. Use /phase-03a-solutioning-research."**
