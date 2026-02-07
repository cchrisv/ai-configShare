```prompt
# Research Phase

Run all research sub-phases in sequence.

## Config
Load: `#file:config/shared.json`
Base: `#file:.github/prompts/util-base.prompt.md`

## Prerequisite
```bash
{{cli.workflow_status}} -w {{work_item_id}} --json
```

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

## Output
Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/research/`
```
