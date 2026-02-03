```prompt
# Re-Wiki (Phase 06)

Purpose: Re-run wiki creation after solution or documentation changes.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Input
- work_item_id: {{work_item_id}}
- wiki_path: {{wiki_path}} (optional - derived from work item if not provided)

## Step 1: Reset Wiki Phase
Clear existing wiki artifacts to allow fresh execution:
```bash
{{cli.workflow_reset}} -w {{work_item_id}} --phase wiki --force --json
```

## Step 2: Execute Wiki Creation
Execute: #file:.github/prompts/phase-06a-wiki-creation.prompt.md

## Output
Artifacts: `{{paths.artifacts_root}}/{{work_item_id}}/wiki/`
- generated-content.md
- wiki-metadata.json

External: Wiki page published to Azure DevOps Wiki
```
