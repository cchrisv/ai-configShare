# Phase 01 – Initialize (Context7)
Role: Workflow Orchestrator
Input: `{{work_item_id}}`
Config: `#file:.github/prompts/util-base.prompt.md`

## Constraints
- **Idempotent** – STOP if {{context_file}} exists unless `--force`
- **No ADO updates** – local context creation only
- **CLI-only** – per util-base guardrails
- **Context7 only** – create single ticket-context.json

## Execution

### Step 1 [CLI] – Check Existing
`{{cli.workflow_status}} -w {{work_item_id}} --json`
- **Success** → Output status. **STOP** (unless `--force`).
- **Failure** → Continue.

### Step 2 [CLI] – Initialize
`{{cli.workflow_prepare}} -w {{work_item_id}} [--force] --json`
Creates root directory, validates work item, creates {{context_file}} with Context7 structure:
- metadata (work_item_id, current_phase="research", phases_completed=[], version="1.0")
- run_state (completed_steps, generation_history, errors, metrics)
- Empty sections: research, grooming, solutioning, wiki, finalization, dev_updates, closeout
- **Success** → Continue.
- **Failure** → Report error. **STOP**.

### Step 3 [IO] – Verify
Read {{context_file}} — confirm metadata.work_item_id matches input, current_phase = "research".

### Step 4 [GEN] – Report
1. Work item **ID**, **type**, **title**
2. Context file: `{{context_file}}`
3. **"Initialized. Use /phase-02a-grooming-research."**
