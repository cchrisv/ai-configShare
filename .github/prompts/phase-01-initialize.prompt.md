# Phase 01 – Initialize (Context7)
Role: Workflow Orchestrator
Input: `{{work_item_id}}`
Config: `#file:.github/prompts/util-base.prompt.md`

## Constraints
- **Idempotent** – STOP if {{context_file}} exists unless `--force`
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

### Step 4 [GEN/IO] – Derive Wiki Path
Compute wiki path: `{{ado_defaults.wiki_copilot_root}}/{{work_item_id}} {{sanitized_title}}`
- Sanitize title: replace characters invalid in ADO wiki paths (`/`, `\`, `#`, `?`, `%`) with spaces, collapse multiple spaces.

### Step 5 [IO] – Scaffold Wiki Content
Copy `{{template_files.wiki_page_template}}` → `{{root}}/wiki-content.md`
- Replace `{{work_item_id}}` and `{{work_item_title}}` tokens with actual values from work item.
- Replace `{{timestamp}}` with current ISO 8601 timestamp.
- Result: full What/Why/How skeleton with placeholder sections and `<!-- SECTION:id -->` markers.

### Step 6 [CLI] – Publish Wiki Skeleton
`{{cli.wiki_create}} --path "{{wiki_path}}" --content "{{root}}/wiki-content.md" --json`
- Parse response for `page_id`, `url`, `wiki_identifier`.
- **Failure** → Log error to `run_state.errors[]`, continue (wiki can be retried).

### Step 7 [IO] – Store Wiki Metadata
Update `{{context_file}}.wiki`:
```json
{
  "path": "{{wiki_path}}",
  "creation_audit": {
    "path": "{{wiki_path}}",
    "page_id": "{{page_id}}",
    "url": "{{url}}",
    "wiki_identifier": "{{wiki_identifier}}",
    "sections_generated": {
      "executive_summary": false, "what_business_context": false,
      "what_requirements": false, "what_success_criteria": false,
      "why_business_value": false, "why_discovery": false,
      "why_investigation": false, "why_decisions": false,
      "how_solution": false, "how_quality": false
    }
  }
}
```
Log `"wiki_scaffold"` to `run_state.completed_steps[]`.

### Step 8 [GEN] – Report
1. Work item **ID**, **type**, **title**
2. Context file: `{{context_file}}`
3. Wiki page: `{{wiki_path}}` (page_id: `{{page_id}}`)
4. **"Initialized with wiki skeleton. Use /phase-02a-grooming-research."**
