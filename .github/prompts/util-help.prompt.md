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

**Workflow:**
- `phase-01-prepare-ticket` - Full workflow (all phases)
- `phase-02-initialize` - Initialize only

**Research (03a-03z):**
- `phase-03-research` - All research sub-prompts
- Individual: organization-dictionary, ado, wiki, business-context, salesforce, similar-workitems, code, web, synthesis

**Main Phases:**
- `phase-04-grooming` - Refine requirements
- `phase-05-solutioning` - Design solution
- `phase-06-wiki` - Create documentation
- `phase-07-finalization` - Complete workflow

**Utilities:**
- `util-help` - This help
- `util-setup` - First-time setup
- `util-activity-report` - Generate activity reports
- `re-phase` - Re-run any phase

## CLI Tools

| Tool | Purpose |
|------|---------|
| workflow-tools | prepare, status, reset |
| ado-tools | get, update, search, link |
| sf-tools | query, describe, discover |
| wiki-tools | get, update, create, search |
