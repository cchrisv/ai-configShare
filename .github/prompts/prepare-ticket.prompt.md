# Copilot Refinement: Full Workflow

## Overview

Execute the complete **Copilot Refinement** workflow for work item **{{runtime.work_item_id}}**. This command orchestrates the 5-phase pipeline by executing specific prompt files in sequence.

## Workflow Summary

1.  **Research Phase** - Build context.
2.  **Grooming Phase** - Classify and template.
3.  **Solutioning Phase** - Architect and design.
4.  **Wiki Creation Phase** - Document.
5.  **Finalization Phase** - Audit and handoff.

**Output:** Ticket fully prepared with comprehensive Wiki documentation, ready for developer pickup.

## Todo Creation Protocol

**CRITICAL:** Before executing any phase, you MUST create todos for all workflow steps to ensure comprehensive execution tracking.

### Todo Requirements

1. **Phase-Level Todos:** Create a todo for each of the 5 phases (Research, Grooming, Solutioning, Wiki Creation, Finalization).
2. **Sub-Step Todos:** Within each phase, create todos for all sub-steps as specified in the phase prompt.
3. **Execution Order:** Create all todos for a phase before beginning execution of that phase.
4. **Status Tracking:** Mark todos as `in_progress` when starting a step, then `completed` when finished.
5. **Verification:** Before proceeding to the next phase, verify all todos for the current phase are `completed`.

### Todo Structure

- Each todo must have a clear description mapping to the workflow step
- Use phase identifiers (e.g., "Phase 1: Research", "Phase 2: Grooming")
- Include sub-step identifiers where applicable (e.g., "Research: Step 1 - ADO Work Item")
- Track dependencies to enforce step ordering

### Example Todo Creation

Before executing Phase 1 (Research), create todos for:
- Phase 1: Research (parent todo)
  - Research: Execute research-ado.prompt.md
  - Research: Execute research-wiki.prompt.md
  - Research: Execute research-business-context.prompt.md
  - ... (all 10 research prompts)

Repeat this pattern for all 5 phases.

## Execution

Execute each phase in sequence using the prompt files:

### Phase 1: Research

Run 10 sequential research prompts to build context:
1.  Execute #file:.github/prompts/research-ado.prompt.md
2.  Execute #file:.github/prompts/research-wiki.prompt.md
3.  Execute #file:.github/prompts/research-business-context.prompt.md
4.  Execute #file:.github/prompts/research-salesforce.prompt.md
5.  Execute #file:.github/prompts/research-code.prompt.md
6.  Execute #file:.github/prompts/research-web.prompt.md
7.  Execute #file:.github/prompts/research-context7.prompt.md
8.  Execute #file:.github/prompts/research-similar-workitems.prompt.md
9.  Execute #file:.github/prompts/research-organization-dictionary.prompt.md
10. Execute #file:.github/prompts/research-analysis-synthesis.prompt.md

**Output:** `{{artifact_paths.research}}/` artifacts.

### Phase 2: Grooming

Execute #file:.github/prompts/groom.prompt.md

**Output:** `{{artifact_paths.grooming}}/` artifacts and updated Work Item fields.

### Phase 3: Solutioning

Execute #file:.github/prompts/solution.prompt.md

**Output:** `{{artifact_paths.solutioning}}/` artifacts including Solution Design and Test Cases.

### Phase 4: Wiki Creation

Execute #file:.github/prompts/create-wiki.prompt.md

**Output:** `{{artifact_paths.wiki}}/` artifacts and published Azure DevOps Wiki Page.

### Phase 5: Finalization

Execute #file:.github/prompts/finalize.prompt.md

**Output:** Context Snapshot, WSJF Evidence, Audit Task, Priority/Story Points, and WSJF Summary in Development Summary.

## Core Principles

- ✅ **Fully Autonomous** - No approval gates; execute entire workflow
- ✅ **Artifact Persistence** - Save all decisions as JSON + markdown
- ✅ **Single Update** - Minimize API chatter (One update per phase)
- ✅ **Context Recovery** - Reload from snapshots if interrupted
- ✅ **Wiki First** - Documentation is the source of truth
- ⛔ **NO COMMENTS** - Comments are STRICTLY PROHIBITED throughout the entire workflow (unless explicitly requested by user)

## Artifact Storage

All artifacts saved to: `{{artifact_path}}/`

**Key files:**
- `{{artifact_files.research_summary_md}}`
- `{{artifact_files.grooming_triage_summary_md}}`
- `{{artifact_files.solutioning_summary_md}}`
- `{{artifact_files.finalization_context_snapshot}}`
