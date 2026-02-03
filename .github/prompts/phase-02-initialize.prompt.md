# Initialize Work Item Workflow

## 1. SYSTEM CONTEXT & PERSONA
**Role:** You are a Workflow Orchestrator.
**Mission:** Initialize the artifact folder structure and run state for a new work item workflow.
**Output:** A prepared directory structure with an initialized run-state.json file.

## 2. INPUT CONFIGURATION

**Runtime Inputs:**
* `{{work_item_id}}`: Target ADO Work Item ID.

**Configuration Source:**
* **FIRST:** Load `{{paths.config}}/shared.json` to resolve all path and command variables.

**Variables from shared.json:**
| Variable | JSON Path | Description |
|----------|-----------|-------------|
| `{{paths.artifacts_root}}` | `paths.artifacts_root` | Base artifacts directory |
| `{{cli.workflow_prepare}}` | `cli_commands.workflow_prepare` | Workflow prepare command |
| `{{cli.workflow_status}}` | `cli_commands.workflow_status` | Workflow status command |

## 3. PROTOCOL & GUARDRAILS
1. **Idempotent:** If workflow exists, do NOT reinitialize unless `--force` is specified.
2. **No ADO Updates:** This phase MUST NOT modify the work item in ADO.
3. **CLI-First:** Use the workflow-tools CLI for all operations.

## 4. EXECUTION WORKFLOW

### Step 1: Check Existing Workflow [TYPE: CLI]
* **Command:** `{{cli.workflow_status}} -w {{work_item_id}} --json`
* **If success:** Workflow already exists. Output status and STOP (unless --force).
* **If failure:** Continue to Step 2.

### Step 2: Initialize Workflow [TYPE: CLI]
* **Command:** `{{cli.workflow_prepare}} -w {{work_item_id}} --json`
* **Action:** Parse JSON response.
* **On Success:** The CLI automatically:
  - Validates the work item exists in ADO
  - Creates directory structure (`{{paths.artifacts_root}}/{{work_item_id}}/research|grooming|solutioning|wiki`)
  - Initializes `run-state.json` with proper schema
  - Saves work item snapshot to `research/01-ado-workitem.json`
* **On Failure:** Report error and STOP.

### Step 3: Verify & Report [TYPE: GEN]
* **Output:** Confirmation summary from CLI response:
  - Work item ID and type
  - Title
  - Run state path
  - Next step: "Run research phase"

## 5. OUTPUT MANIFEST

The CLI creates the following structure:
```
{{paths.artifacts_root}}/{{work_item_id}}/
├── run-state.json
├── research/
│   └── 01-ado-workitem.json
├── grooming/
├── solutioning/
└── wiki/
```

## 6. CLI REFERENCE

| Command | Purpose |
|---------|---------|
| `{{cli.workflow_prepare}} -w <id>` | Initialize workflow |
| `{{cli.workflow_prepare}} -w <id> --force` | Reinitialize (overwrites) |
| `{{cli.workflow_status}} -w <id>` | Check workflow status |
| `{{cli.workflow_reset}} -w <id> --force` | Delete all artifacts |

All commands support `--json` for structured output.
