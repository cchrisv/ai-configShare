# Research Phase Base Reference

Shared patterns for all research sub-prompts (phase-03a through phase-03z).

**Extends:** `#file:.github/prompts/util-base.prompt.md`

## Prerequisites

Before any research sub-phase:
1. [IO] Verify `{{research}}` directory exists
2. [IO] Load `{{run_state}}` - confirm `currentPhase` = "research"
3. [LOGIC] Check prerequisite artifacts exist (varies by sub-phase)

## Standard Artifact Schema

All research artifacts must include:
```json
{
  "workItemId": "{{work_item_id}}",
  "generatedAt": "{{iso_timestamp}}",
  "research_complete": true|false,
  "feedback_loops": []
}
```

## Feedback Loop Protocol

After completing each research step, evaluate findings against 5 triggers:

| Trigger | Definition | Action |
|---------|------------|--------|
| New Topic | Found tech/term/component not previously identified | Revisit relevant step |
| Evidence Gap | Claim lacks supporting evidence | Revisit to fill gap |
| Contradiction | New info conflicts with earlier findings | Revisit to resolve |
| High-Value | Discovery significantly impacts solution | Revisit to validate |
| Missing Context | Info needs more context to be actionable | Revisit to contextualize |

**Execution:**
1. Evaluate all findings against triggers
2. Execute high-priority revisits immediately
3. Log low-priority for synthesis phase
4. Max 3 iterations per step

**Document each loop:**
```json
{
  "finding": "description",
  "trigger": "trigger_type",
  "target_step": "step_to_revisit",
  "priority": "high|medium|low"
}
```

## Run State Update Pattern

After completing a research sub-phase:
```json
{
  "phase": "research",
  "step": "{{step_id}}",
  "completedAt": "{{iso_timestamp}}",
  "artifact": "{{research}}/{{artifact_file}}"
}
```

Add to `completedSteps[]`, increment `metrics.phases.research.stepsCompleted`.

## Research Sub-Phase Order

| Order | ID | Artifact |
|-------|-----|----------|
| 1 | 03a | 00-organization-dictionary.json |
| 2 | 03b | 01-ado-workitem.json |
| 3 | 03c | 02-wiki-research.json |
| 4 | 03d | 05-business-context.json |
| 5 | 03e | 03a-dependency-discovery.json |
| 6 | 03f | 04-similar-workitems.json |
| 7 | 03g | 06-code-analysis.json |
| 8 | 03h | 07-web-research.json |
| 9 | 03z | research-summary.json, assumptions.json |

## Common CLI Commands

| Action | Command |
|--------|---------|
| Get work item | `{{cli.ado_get}} {{work_item_id}} --expand All --json` |
| Get comments | `{{cli.ado_get}} {{work_item_id}} --comments --json` |
| Search wiki | `{{cli.wiki_search}} "{{keywords}}" --json` |
| Get wiki page | `{{cli.wiki_get}} --path "{{path}}" --json` |
| SF describe | `{{cli.sf_describe}} {{object}} --json` |
| SF discover | `{{cli.sf_discover}} --type {{type}} --name {{name}} --depth 3 --json` |
| Search ADO | `{{cli.ado_search}} --text "{{text}}" --top 20 --json` |
