# Help - Autonomous Ticket Workflow

Role: Help Assistant
Mission: Explain available prompts and system architecture.

## Quick Start

New users: Run `/util-setup` first.

Full workflow: `/phase-01-prepare-ticket` with work item ID.

## Documentation

| Resource | File |
|----------|------|
| Prompt catalog & CLI | `#file:README.md` |
| Configuration | `#file:config/shared.json` |
| Shared definitions | `#file:.github/prompts/util-base.prompt.md` |

## Available Prompts

### Workflow

- `phase-01-prepare-ticket` - Full workflow (phases 02-07, all in sequence)
- `phase-02-initialize` - Initialize artifact folder only

### Research (03a-03z)

- `phase-03-research` - All research sub-prompts (sequential)
- `phase-03-research-parallel` - All research sub-prompts (parallel for speed)
- Individual: organization-dictionary, ado, wiki, business-context, salesforce, similar-workitems, code, web, synthesis
- Parallel SF variant: `phase-03e-research-salesforce-parallel`

### Ticket Preparation Phases

- `phase-04-grooming` - Refine requirements (what & why)
- `phase-05-solutioning` - Design solution (how)
- `phase-06-wiki` - Create wiki documentation
- `phase-07-finalization` - Final validation and ADO update

### Development Phases (post-handoff, standalone)

These phases do not require local artifacts from prior phases — they fetch current state directly from ADO and wiki.

- `phase-08a-dev-update-grooming` - Iterative requirements/scope updates (what & why)
- `phase-08b-dev-update-solutioning` - Iterative solution design updates (how)
- `phase-09-dev-closeout` - Full closeout: planned vs actual, release notes, assumptions resolution, ADO + wiki update, Dev-Complete tag

### Feature / Epic-Level Phases

- `phase-10-feature-solution-design` - Aggregate child work items into a solution design document and wiki page. Supports Feature (1-level) and Epic (2-level) hierarchies.

### Utilities

- `util-help` - This help
- `util-setup` - First-time setup
- `util-activity-report` - Generate CSV activity reports
- `util-reformat-ticket` - Re-apply rich HTML templates to a work item or wiki page (formatting only, no content changes). Supports User Story, Bug, and Feature types, plus wiki pages.
- `util-sequence-tickets` - Analyze dependencies among child work items under a Feature or Epic, recommend execution order, and create predecessor/successor links in ADO
- `re-phase` - Re-run any individual phase (03-07)

## CLI Tools

| Tool | Purpose |
|------|---------|
| workflow-tools | prepare, status, reset |
| ado-tools | get, update, create, search, link, unlink, relations |
| sf-tools | query, describe, discover, apex-classes, apex-triggers, flows, validation-rules |
| wiki-tools | get, get (by page-id), update, update (by page-id), create, list, search, delete |
| report-tools | activity (CSV reports for specified users) |

## Templates

All templates live in `config/templates/`. Key categories:

| Category | Templates |
|----------|-----------|
| Work item field HTML | `field-user-story-*.html`, `field-bug-*.html`, `field-feature-*.html`, `field-solution-design.html`, `field-release-notes.html`, `field-blockers.html`, `field-planned-work.html`, `field-progress.html` |
| Wiki page HTML | `wiki-page-template.html` (work item), `feature-solution-design-wiki.html` (Feature/Epic), `wiki-general-template.html` (general/fallback) |
| Guides | `wiki-page-format.md`, `field-mappings.md`, `user-story-templates.md`, `bug-templates.md`, `feature-templates.md`, `solution-design-template.md`, `feature-solution-design-document-template.md` |
| Other | `validation-checklist.md`, `wsjf-scoring-anchors.md`, `test-case-template.md`, `audit-task-template.md`, `comment-formats.md`, `research-iteration-tracking.md`, `ticket-context-schema.json` |
