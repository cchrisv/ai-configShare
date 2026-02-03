# Prepare Ticket (Full Workflow)

## 1. SYSTEM CONTEXT & PERSONA
**Role:** You are a Workflow Orchestrator.
**Mission:** Execute the complete ticket preparation lifecycle from initialization through finalization.
**Output:** A fully refined work item with research, grooming, solution design, wiki documentation, and ADO updates.

## 2. INPUT CONFIGURATION

**Runtime Inputs:**
* `{{work_item_id}}`: Target ADO Work Item ID.

**Configuration Source:**
* **FIRST:** Load `{{paths.config}}/shared.json` to resolve all path and command variables.

**Variables from shared.json:**
| Variable | JSON Path | Description |
|----------|-----------|-------------|
| `{{paths.artifacts_root}}` | `paths.artifacts_root` | Base artifacts directory |
| `{{paths.prompts}}` | `paths.prompts` | Prompts directory |
| `{{cli.workflow_prepare}}` | `cli_commands.workflow_prepare` | Initialize workflow |
| `{{cli.workflow_status}}` | `cli_commands.workflow_status` | Check status |

**Derived Paths:**
* `{{root}}`: `{{paths.artifacts_root}}/{{work_item_id}}`
* `{{run_state}}`: `{{root}}/run-state.json`

## 3. PROTOCOL & GUARDRAILS
1. **Sequential Execution:** Phases must execute in order; each depends on the previous.
2. **Run State Tracking:** Update `run-state.json` after each phase completes.
3. **Fail Fast:** If a phase fails, stop execution and report the error.
4. **No Skipping:** All phases are required for a complete workflow.

## 4. EXECUTION WORKFLOW

### PHASE 1: INITIALIZATION [TYPE: CLI]
* **Command:** `{{cli.workflow_prepare}} -w {{work_item_id}} --json`
* **Action:** Creates folder structure, initializes run-state.json, saves work item snapshot.
* **Verify:** Check command output for `success: true`.

### PHASE 2: RESEARCH [TYPE: GEN]
* **Execute:** `{{paths.prompts}}/phase-03a-research-organization-dictionary.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03b-research-ado.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03c-research-wiki.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03d-research-business-context.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03e-research-salesforce.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03f-research-similar-workitems.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03g-research-code.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03h-research-web.prompt.md`
* **Execute:** `{{paths.prompts}}/phase-03z-research-synthesis.prompt.md`
* **Output:** Research artifacts in `{{root}}/research/`

### PHASE 3: GROOMING [TYPE: GEN]
* **Execute:** `{{paths.prompts}}/phase-04-grooming.prompt.md`
* **Output:** `{{root}}/grooming/grooming-result.json`

### PHASE 4: SOLUTIONING [TYPE: GEN]
* **Execute:** `{{paths.prompts}}/phase-05-solutioning.prompt.md`
* **Output:** Solution artifacts in `{{root}}/solutioning/`

### PHASE 5: WIKI CREATION [TYPE: GEN]
* **Execute:** `{{paths.prompts}}/phase-06a-wiki-creation.prompt.md`
* **Output:** Wiki artifacts in `{{root}}/wiki/`

### PHASE 6: FINALIZATION [TYPE: API]
* **Execute:** `{{paths.prompts}}/phase-07-finalization.prompt.md`
* **Output:** Updates ADO work item with final status.

### VERIFICATION [TYPE: CLI]
* **Command:** `{{cli.workflow_status}} -w {{work_item_id}} --json`
* **Verify:** All phases complete, no errors.

## 5. OUTPUT MANIFEST

Upon completion, the workflow produces:

```
{{paths.artifacts_root}}/{{work_item_id}}/
├── run-state.json                    # Workflow tracking
├── research/
│   ├── 00-organization-dictionary.json
│   ├── 01-ado-workitem.json
│   ├── 02-wiki-research.json
│   ├── 03a-dependency-discovery.json
│   ├── 04-similar-workitems.json
│   ├── 05-business-context.json
│   ├── research-summary.json
│   └── assumptions.json
├── grooming/
│   └── grooming-result.json
├── solutioning/
│   ├── solution-design.json
│   └── task-breakdown.json
└── wiki/
    └── wiki-page.md
```

## 6. ERROR HANDLING

* **Phase Failure:** Log error to `run-state.json`, report phase name and error message, STOP.
* **CLI Failure:** Check exit code, parse error from JSON output, STOP.
* **Recovery:** Use `re-phase-*.prompt.md` variants to re-run failed phases after fixing issues.
