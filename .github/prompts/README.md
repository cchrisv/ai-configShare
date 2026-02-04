# Prompt Catalog

This folder contains GitHub Copilot prompts that drive the autonomous ticket workflow. All prompt logic is defined directly in this folder.

## 1. Full Workflow

- `prepare-ticket.prompt.md`  
  Runs the **entire lifecycle** for a work item: research → grooming → solutioning → wiki creation → finalization.

## 2. Phase Prompts (First Run)

Use these when you want to run a single phase of the lifecycle.

- `research.prompt.md`  
  Runs the **research** phase, composing all research prompts (code, business, ADO, Salesforce, wiki, web, etc.).

- `groom.prompt.md`  
  Runs the **grooming** phase to clarify scope, risks, tradeoffs, and acceptance criteria.

- `solution.prompt.md`  
  Runs the **solutioning** phase to design the technical/functional solution and implementation approach.

- `create-wiki.prompt.md`  
  Runs the **wiki creation** phase to generate or update the canonical wiki page for the work item.

- `finalize.prompt.md`  
  Runs the **finalization** phase to produce final summary, status, and checklists.

## 3. Phase Prompts (Re-run / Re-do)

Use these when a phase has already been completed once and you need to **re-run** it after new information, feedback, or changes.

- `re-research.prompt.md`  
  Re-runs the research phase to refresh findings after new information, code changes, or clarifications.

- `re-groom.prompt.md`  
  Re-runs the grooming phase to refine scope, risks, and acceptance criteria based on updated context.

- `re-solution.prompt.md`  
  Re-runs the solutioning phase to adjust the proposed design and implementation approach after feedback or new constraints.

- `re-create-wiki.prompt.md`  
  Re-runs the wiki creation phase to regenerate or update the wiki page after solution or documentation changes.

- `re-finalize.prompt.md`  
  Re-runs the finalization phase to refresh the final summary, status, and checklist after late-breaking changes.

## 4. Specialized Research Prompts

These prompts target **specific research channels**. They're typically orchestrated by `research.prompt.md` but can also be run individually when you want deeper investigation in a single area.

- `research-ado.prompt.md`  
  Inspect Azure DevOps work items, boards, and links to understand current scope, history, and dependencies.

- `research-business-context.prompt.md`  
  Extract the underlying business problem, goals, constraints, and success metrics.

- `research-code.prompt.md`  
  Scan the codebase for relevant modules, patterns, and extension points and summarize current behavior.

- `research-context7.prompt.md`  
  Pull in authoritative library and framework documentation plus example usages via Context7.

- `research-organization-dictionary.prompt.md`  
  Translate organization-specific acronyms, systems, and domain terms into a work-item-specific glossary.

- `research-salesforce.prompt.md`  
  Analyze Salesforce metadata, automation (flows, triggers, Apex), and configuration affected by this change.

- `research-similar-workitems.prompt.md`  
  Find and summarize similar past work items, including their solutions and pitfalls.

- `research-web.prompt.md`  
  Search the broader web for best practices, design patterns, and reference implementations.

- `research-wiki.prompt.md`  
  Locate and summarize internal wiki or knowledge-base content defining policies, standards, or decisions.

- `research-orchestrator.prompt.md`  
  Coordinates all research sub-phases with feedback loops and iteration tracking.

- `research-analysis-synthesis.prompt.md`  
  Synthesizes findings from all research phases into a unified understanding.

## 5. Utility Prompts

These prompts perform specific operational tasks outside the main workflow.

- `update-feature-progress.prompt.md`  
  Updates Progress, Planned Work, and Blockers fields on a Feature by analyzing child work items and comments. Generates leadership-ready summaries with completion metrics, upcoming work, and active impediments.

- `generate-activity-report.prompt.md`  
  Generates CSV activity reports for specified users showing edits, comments, assignments, and mentions.

- `format-fields.prompt.md`  
  Apply HTML templates to existing ADO work item fields without changing content. Fixes grammar/typos and applies consistent formatting structure.

- `initialize.prompt.md`  
  Initialize the artifact folder structure and run state for a new work item.

- `research-and-solution.prompt.md`  
  Combined research and solutioning workflow that bypasses formal grooming.

## 6. Templates

The `templates/` subfolder contains reusable templates for research patterns:

- `research-feedback-loop.md` - Decision template for iterative research
- `detective-pattern.md` - Investigation pattern for research phases
- `mermaid-examples.md` - Mermaid diagram examples for ADO Wiki compatibility

## 7. Configuration

Prompts reference configuration files in `.github/config/` and templates in `.github/templates/` for field formatting, standards, and organizational context.

## 8. Implementation Notes

- All prompts are self-contained with full execution logic.
- Automation (e.g., CI, DevOps pipelines, editor tasks) should reference these `.github/prompts` files as stable entry points.
