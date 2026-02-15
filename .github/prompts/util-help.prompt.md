# Util – Help (Context7)
Role: Help Assistant
Mission: Explain available prompts and system architecture.

## Quick Start
New users → `/util-setup`. Full workflow → `/phase-01-initialize` with work item ID, then phases sequentially.

## Docs
`#file:README.md` (catalog + CLI) · `#file:config/shared.json` (config) · `#file:.github/prompts/util-base.prompt.md` (Context7 defs)

## Prompts

**Workflow:** `phase-01-initialize` — creates ticket-context.json

**Grooming (02):**
- `phase-02a-grooming-research` — business research → context.research
- `phase-02b-grooming` — refine requirements → context.grooming
- `phase-02c-grooming-update` — iterative updates → context.dev_updates

**Solutioning (03):**
- `phase-03a-solutioning-research` — technical research → context.research
- `phase-03b-solutioning` — design solution → context.solutioning
- `phase-03c-solutioning-update` — iterative updates → context.dev_updates
- `phase-03d-test-cases` — test case generation → context.solutioning.testing

**Completion (04–06):**
- `phase-04-wiki` — wiki documentation → context.wiki
- `phase-05-finalization` — WSJF scoring → context.finalization
- `phase-06-dev-closeout` — planned vs actual → context.closeout

**Feature/Epic:** `util-feature-solution-design` — aggregate children → context.solution_design

**Utilities:**
`util-help` · `util-setup` · `util-activity-report` (CSV) · `util-apply-template` (HTML reformat) · `util-sequence-tickets` (dependencies) · `util-repeat-phase` (re-run phase)

## Context7 Pattern
Single `ticket-context.json` per work item:
```json
{
  "metadata": {"work_item_id": "", "current_phase": "", "phases_completed": []},
  "research": {}, "grooming": {}, "solutioning": {},
  "wiki": {}, "finalization": {}, "dev_updates": {}, "closeout": {}
}
```
Replaces ALL separate artifact files.

## CLI Tools
**workflow-tools**: prepare, status, reset
**ado-tools**: get, update, create, search, link, relations
**sf-tools**: query, describe, discover, apex, triggers, flows, validation
**wiki-tools**: get, update, create, list, search, delete
**report-tools**: activity

## Templates
All in `config/templates/`:
- **Field HTML**: field-*.html files
- **Wiki HTML**: wiki-*.html files
- **Guides**: *.md files including field-mappings, templates
- **Schema**: ticket-context-schema.json (Context7 structure)
