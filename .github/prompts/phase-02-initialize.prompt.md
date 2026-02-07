# Initialize Work Item Workflow

Role: Workflow Orchestrator
Mission: Initialize artifact folder structure and run state.
Output: Prepared directory structure with initialized run-state.json.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Protocol
1. Idempotent - don't reinitialize unless --force
2. No ADO updates in this phase
3. CLI-first for all operations

## Execution

### Step 1: Check Existing [CLI]
Command: `{{cli.workflow_status}} -w {{work_item_id}} --json`
- If success: Workflow exists, output status and STOP (unless --force)
- If failure: Continue to Step 2

### Step 2: Initialize [CLI]
Command: `{{cli.workflow_prepare}} -w {{work_item_id}} --json`

On success, CLI automatically:
- Validates work item exists in ADO
- Creates directory structure
- Initializes run-state.json
- Saves work item snapshot

### Step 3: Verify [GEN]
Output confirmation:
- Work item ID and type
- Title
- Run state path
- Next step: "Run research phase"

## Output
```
{{paths.artifacts_root}}/{{work_item_id}}/
├── run-state.json
├── research/
│   └── 01-ado-workitem.json
├── grooming/
├── solutioning/
└── wiki/
```

## CLI Reference
| Command | Purpose |
|---------|---------|
| `{{cli.workflow_prepare}} -w <id>` | Initialize |
| `{{cli.workflow_prepare}} -w <id> --force` | Reinitialize |
| `{{cli.workflow_status}} -w <id>` | Check status |
| `{{cli.workflow_reset}} -w <id> --force` | Delete all |
