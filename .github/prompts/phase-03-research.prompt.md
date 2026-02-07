```prompt
# Research Phase (Sequential)

Role: Research Coordinator
Mission: Run all research sub-phases in sequence and produce synthesized research artifacts.

## Config
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`

## Protocol
- Execute sub-phases in order; each phase may read artifacts from prior phases.
- Do not skip phases; use idempotent behavior (resume from existing artifacts where applicable).
- Update `{{run_state}}` after each sub-phase completes.

## Prerequisite
```bash
{{cli.workflow_status}} -w {{work_item_id}} --json
```
Ensure artifact directory exists: `{{paths.artifacts_root}}/{{work_item_id}}/research/`

## Research Sequence
1. `#file:.github/prompts/phase-03a-research-organization-dictionary.prompt.md`
2. `#file:.github/prompts/phase-03b-research-ado.prompt.md`
3. `#file:.github/prompts/phase-03c-research-wiki.prompt.md`
4. `#file:.github/prompts/phase-03d-research-business-context.prompt.md`
5. `#file:.github/prompts/phase-03e-research-salesforce.prompt.md`
6. `#file:.github/prompts/phase-03f-research-similar-workitems.prompt.md`
7. `#file:.github/prompts/phase-03g-research-code.prompt.md`
8. `#file:.github/prompts/phase-03h-research-web.prompt.md`
9. `#file:.github/prompts/phase-03z-research-synthesis.prompt.md`

## Error Handling
- If a sub-phase fails: log the error, update run state with the failure step, and stop or retry per util-research-base feedback loop rules.
- Do not overwrite valid existing artifacts with partial or failed output.

## Output
Artifacts directory: `{{paths.artifacts_root}}/{{work_item_id}}/research/`
Final synthesis and research summary per phase-03z.
```
