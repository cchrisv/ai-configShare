```prompt
# Research

Purpose: Run **only the research phase** of the workflow.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Prerequisites
```bash
{{cli.workflow_status}} -w {{work_item_id}} --json
```

## Research Prompts (Sequential)
1. Execute #file:.github/prompts/phase-03a-research-organization-dictionary.prompt.md
2. Execute #file:.github/prompts/phase-03b-research-ado.prompt.md
3. Execute #file:.github/prompts/phase-03c-research-wiki.prompt.md
4. Execute #file:.github/prompts/phase-03d-research-business-context.prompt.md
5. Execute #file:.github/prompts/phase-03e-research-salesforce.prompt.md
6. Execute #file:.github/prompts/phase-03f-research-similar-workitems.prompt.md
7. Execute #file:.github/prompts/phase-03g-research-code.prompt.md
8. Execute #file:.github/prompts/phase-03h-research-web.prompt.md
9. Execute #file:.github/prompts/phase-03z-research-synthesis.prompt.md

## Output
Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/research/`
```
