# Util – Help (Context7)
Role: Help Assistant
Mission: Explain available prompts and system architecture.

## Quick Start
New users → `/util-setup`. Full workflow → `/ticket-grooming-phase-01-research` with work item ID, then phases sequentially.

## Docs
`#file:README.md` (catalog + CLI) · `#file:config/shared.json` (config) · `#file:.github/prompts/util-base.prompt.md` (Context7 defs)

## Prompts

**Phase 01 – Research:** `ticket-grooming-phase-01-research` — initialize workflow + business research → context.research

**Phase 02 – Grooming:** `ticket-grooming-phase-02-grooming` — refine requirements → context.grooming

**Phase 03 – Solutioning Research:** `ticket-grooming-phase-03-solutioning-research` — technical research → context.research

**Phase 04 – Solutioning:** `ticket-grooming-phase-04-solutioning` — design solution → context.solutioning

**Phase 05 – Finalization:** `ticket-grooming-phase-05-finalization` — WSJF scoring → context.finalization

**Phase 06 – Dev Closeout:** `ticket-grooming-phase-06-dev-closeout` — planned vs actual → context.closeout

**Feature/Epic:** `util-feature-solution-design` — aggregate children → context.solution_design

**Utilities:**
`util-grooming-update` (iterative requirements/scope updates → context.dev_updates) · `util-solutioning-update` (iterative solution design updates → context.dev_updates) · `util-help` · `util-setup` · `util-activity-report` (CSV) · `util-apply-template` (HTML reformat) · `util-sequence-tickets` (dependencies) · `util-repeat-phase` (re-run phase)

## Context7 Pattern
Single `ticket-context.json` per work item:
```json
{
  "metadata": {"work_item_id": "", "current_phase": "", "phases_completed": []},
  "research": {}, "grooming": {}, "solutioning": {},
  "finalization": {}, "dev_updates": {}, "closeout": {}
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
