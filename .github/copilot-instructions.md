# GitHub Copilot Instructions – Autonomous Ticket Workflow

## Configuration

**All paths, CLI commands, and settings:** `#file:config/shared.json`

**Shared prompt definitions:** `#file:.github/prompts/util-base.prompt.md`

## Entry Points

| Task | Prompt |
|------|--------|
| Full workflow | `#file:.github/prompts/phase-01-prepare-ticket.prompt.md` |
| Full workflow (parallel) | `#file:.github/prompts/phase-01-prepare-ticket.prompt.md` (use with phase-03-research-parallel for parallel research) |
| Dev update (grooming) | `#file:.github/prompts/phase-08a-dev-update-grooming.prompt.md` |
| Dev update (solutioning) | `#file:.github/prompts/phase-08b-dev-update-solutioning.prompt.md` |
| Dev closeout | `#file:.github/prompts/phase-09-dev-closeout.prompt.md` |
| Feature/Epic solution design | `#file:.github/prompts/phase-10-feature-solution-design.prompt.md` |
| Reformat ticket or wiki | `#file:.github/prompts/util-reformat-ticket.prompt.md` |
| Sequence tickets | `#file:.github/prompts/util-sequence-tickets.prompt.md` |
| Activity report | `#file:.github/prompts/util-activity-report.prompt.md` |
| Re-run phase | `#file:.github/prompts/re-phase.prompt.md` |
| Help | `#file:.github/prompts/util-help.prompt.md` |
| Setup | `#file:.github/prompts/util-setup.prompt.md` |

## Workflow Phases

### Ticket Preparation (phases 02-07, run via phase-01)

1. **Initialize** (02) → Creates artifact structure
2. **Research** (03a-03z) → Gathers context from ADO, SF, wiki, code
   - Sequential: `phase-03-research.prompt.md` (15-25 min)
   - Parallel: `phase-03-research-parallel.prompt.md` (8-12 min, 50% faster)
3. **Grooming** (04) → Refines requirements (what & why)
4. **Solutioning** (05) → Designs technical approach (how)
5. **Wiki** (06) → Generates documentation
6. **Finalization** (07) → Updates ADO work item

### Development Phases (standalone, post-handoff)

These phases fetch current state directly from ADO and wiki — no local artifacts from prior phases required.

7. **Dev Update — Grooming** (08a) → Iterative requirements/scope updates (what & why). Updates Description, AC, Tags, classification.
8. **Dev Update — Solutioning** (08b) → Iterative solution design updates (how). Updates DevelopmentSummary, SFComponents.
9. **Dev Closeout** (09) → Full closeout: planned vs actual reconciliation, release notes, assumptions/unknowns resolution, ADO + wiki update, Dev-Complete tag.

### Feature / Epic-Level Phases

10. **Feature Solution Design** (10) → Aggregates child work items into a solution design document and wiki page. Supports Feature (1-level: Feature → User Stories) and Epic (2-level: Epic → Features → User Stories) hierarchies.

### Utility Prompts

- `util-reformat-ticket` → Re-apply rich HTML templates to a work item or wiki page (formatting only, no content changes). Supports User Story, Bug, Feature types, plus three wiki page types (work item, feature solution design, general).
- `util-sequence-tickets` → Analyze dependencies among child work items under a Feature or Epic, recommend execution order, and create predecessor/successor links in ADO.
- `util-activity-report` → Generate CSV activity reports for specified users.

## Mandatory Rules

1. **NO RAW SHELL** – Use CLI tools from `shared.json`, never curl/az/git/npm directly
2. **NO SCRIPT EDITS** – Don't modify `scripts/workflow/` without explicit request
3. **NO HARDCODED PATHS** – Use `{{paths.*}}`, `{{cli.*}}` from shared.json
4. **CONFIG READ-ONLY** – Don't modify shared.json unless asked
5. **NO COMMENTS** – Never post comments to work items unless requested

## Folder Structure

```
project-root/
├── .github/prompts/         # Prompt definitions
├── config/
│   ├── shared.json          # Master configuration
│   ├── templates/           # ADO field & wiki HTML templates
│   └── standards/           # Development standards
├── scripts/workflow/        # TypeScript CLI tools
└── .ai-artifacts/           # Runtime artifacts (gitignored)
    ├── {id}/                # Per-work-item artifacts
    │   ├── run-state.json
    │   ├── research/
    │   ├── grooming/
    │   ├── solutioning/
    │   ├── wiki/
    │   ├── finalization/
    │   ├── dev-updates/     # Phase 08a/08b incremental logs
    │   ├── closeout/        # Phase 09 closeout artifacts
    │   ├── solution-design/ # Phase 10 solution design doc + wiki
    │   ├── sequencing/      # util-sequence-tickets artifacts
    │   └── reformat/        # util-reformat-ticket artifacts
    └── reports/             # Activity report CSVs
```

## CLI Tools

All commands are invoked via `npx --prefix scripts/workflow <tool> <command>` and support `--json` for structured output and `-v` for verbose logging. Use `{{cli.*}}` template variables from shared.json in prompts.

### Summary

| Tool | Commands | Batch Support |
|------|----------|---------------|
| workflow-tools | prepare, status, reset | N/A |
| ado-tools | get, update, create, search, link, unlink, relations | No |
| sf-tools | query, describe, discover, apex-classes, apex-triggers, validation-rules, flows, custom-objects | **Yes** (describe, discover, validation-rules) |
| wiki-tools | get, update, create, search, list, delete | No |
| report-tools | activity | No |

---

### workflow-tools

Manage the workflow lifecycle (artifact directories, run state).

| Command | When to Use | Syntax |
|---------|-------------|--------|
| `prepare` | Start a new workflow for a work item. Creates artifact directories and run-state.json. | `{{cli.workflow_prepare}} -w <id> [--force] --json` |
| `status` | Check current phase, completed steps, artifact counts, and errors for a work item. | `{{cli.workflow_status}} -w <id> --json` |
| `reset` | Clear artifacts for a specific phase or the entire workflow. Requires `--force`. | `workflow-tools reset -w <id> [--phase <phase>] --force --json` |

Valid reset phases: `research`, `grooming`, `solutioning`, `wiki`

---

### ado-tools

Read, write, link, and search Azure DevOps work items.

| Command | When to Use | Syntax |
|---------|-------------|--------|
| `get` | Fetch a work item by ID. Use `--expand All` to include relations. Use `--comments` to include comment history. | `{{cli.ado_get}} <id> [--expand All\|Relations\|Fields] [--comments] [--fields <csv>] --json` |
| `update` | Modify work item fields. Supports inline values, file-based content (for large HTML), arbitrary field paths, and bulk JSON. | `{{cli.ado_update}} <id> [field options] --json` |
| `create` | Create a new work item of any type. Optionally set parent, area path, iteration, assignee, tags. | `{{cli.ado_create}} <type> --title "<title>" [--parent <id>] [--area <path>] [--iteration <path>] [--assigned-to <user>] [--tags <csv>] --json` |
| `search` | Find work items by text, type, state, or raw WIQL query. | `{{cli.ado_search}} [--text "<keyword>"] [--type "<type>"] [--state "<state>"] [--wiql "<wiql>"] [--top <n>] --json` |
| `link` | Create a link between two work items. | `{{cli.ado_link}} <sourceId> <targetId> --type <linkType> [--comment "<text>"] --json` |
| `unlink` | Remove a link between two work items. | `{{cli.ado_unlink}} <sourceId> <targetId> --type <linkType> --json` |
| `relations` | Get all relations/links for a work item. Optionally filter by link type. | `{{cli.ado_relations}} <id> [--type <types>] --json` |

**Link types:** `parent`, `child`, `related`, `predecessor`, `successor`

**Update field options (ado-tools update):**

| Option | Field | Notes |
|--------|-------|-------|
| `--title <text>` | System.Title | |
| `--description <html>` | System.Description | Inline HTML; use `--description-file` for large content |
| `--state <state>` | System.State | New, Active, Resolved, Closed |
| `--tags <tags>` | System.Tags | Semicolon-separated |
| `--ac <html>` | AcceptanceCriteria | Alias: `--acceptance-criteria` |
| `--repro-steps <html>` | ReproSteps | Bugs only |
| `--system-info <html>` | SystemInfo | Bugs only |
| `--story-points <n>` | StoryPoints | Numeric |
| `--priority <1-4>` | Priority | |
| `--work-class <type>` | Custom.WorkClassType | |
| `--requires-qa <Yes\|No>` | Custom.RequiresQA | |
| `--field <path> --value <val>` | Any field path | Arbitrary field; use `--value-file` for file content |
| `--fields-file <json>` | Multiple fields | Bulk update from JSON `{ "fields": { ... } }` |
| `--description-file <file>` | System.Description | Read from file |
| `--ac-file <file>` | AcceptanceCriteria | Read from file |
| `--repro-steps-file <file>` | ReproSteps | Read from file |
| `--system-info-file <file>` | SystemInfo | Read from file |
| `--comment <text>` | Comment/history | Adds a discussion comment |

---

### sf-tools

Query Salesforce data, describe metadata, discover dependencies, and list automation components.

| Command | When to Use | Syntax |
|---------|-------------|--------|
| `query` | Execute a SOQL query. Use `--tooling` for Tooling API (ApexClass, FlowDefinition, etc.). Use `--all` for pagination. | `{{cli.sf_query}} "<SOQL>" [--tooling] [--all] [--org <alias>] --json` |
| `describe` | Get SObject metadata (fields, relationships, record types). Supports batch with comma-separated names. | `{{cli.sf_describe}} <objectName> [--field <fieldName>] [--fields-only] [--batch] --json` |
| `discover` | Traverse dependency graph for a metadata component. Returns nodes, edges, pills, warnings. | `{{cli.sf_discover}} --type <metadataType> --name <componentName> [--depth <n>] [--include-standard] [--batch] --json` |
| `apex-classes` | List Apex classes. Optionally filter by name pattern (use `%` wildcard). | `{{cli.sf_apex}} [--pattern <pattern>] --json` |
| `apex-triggers` | List Apex triggers. Optionally filter by SObject. | `{{cli.sf_triggers}} [--object <name>] --json` |
| `validation-rules` | List validation rules for an SObject. Supports batch with comma-separated names. | `{{cli.sf_validation}} <objectName> [--all] [--batch] --json` |
| `flows` | List flows. Optionally filter by trigger object. `--all` includes inactive. | `{{cli.sf_flows}} [--object <name>] [--all] --json` |
| `custom-objects` | List all custom objects in the org. | `sf-tools custom-objects --json` |

**Batch operations** (describe, discover, validation-rules): Pass comma-separated names or add `--batch`. Executes in parallel, returns array of `{ objectName/componentName, success, data/error }`.

```bash
# Batch describe (parallel)
{{cli.sf_describe}} Account,Contact,Opportunity --batch --json

# Batch discover (parallel)
{{cli.sf_discover}} --type CustomObject --name Account,Contact --batch --json

# Batch validation rules (parallel)
{{cli.sf_validation}} Account,Contact --batch --json
```

---

### wiki-tools

Read, write, search, and manage Azure DevOps wiki pages.

| Command | When to Use | Syntax |
|---------|-------------|--------|
| `get` | Fetch a wiki page by path or page ID. Use `--page-id` when you have the numeric ID (e.g., for reformatting). Use `--path` when you know the page location. | `{{cli.wiki_get}} --path "<pagePath>" --json` or `{{cli.wiki_get_by_id}} <pageId> --json` |
| `update` | Update an existing wiki page. By path (PUT, create-or-update) or by page ID (PATCH, update-only — safer for reformatting). | `{{cli.wiki_update}} --path "<pagePath>" --content "<fileOrText>" --json` or `{{cli.wiki_update_by_id}} <pageId> --content "<fileOrText>" --json` |
| `create` | Create a new wiki page at a specific path. | `{{cli.wiki_create}} --path "<pagePath>" --content "<fileOrText>" --json` |
| `search` | Search wiki pages by keyword. Returns matching pages with paths. | `{{cli.wiki_search}} "<query>" --json` |
| `list` | List wiki pages under a parent path. Useful for browsing wiki structure. | `{{cli.wiki_list}} [--path <basePath>] --json` |
| `delete` | Delete a wiki page. Requires `--force`. | `{{cli.wiki_delete}} --path "<pagePath>" --force` |

**Page ID vs Path:** Use `--page-id` (PATCH) when updating existing pages to avoid accidental creation. Use `--path` (PUT) when you need create-or-update semantics. The `get` command accepts either.

---

### report-tools

Generate Azure DevOps activity reports as CSV files.

| Command | When to Use | Syntax |
|---------|-------------|--------|
| `activity` | Generate a CSV report of a user's work item edits, comments, assignments, and mentions over a time period. | `{{cli.report_activity}} -p "Name\|email@domain.com" [-p "Name2\|email2@domain.com"] [-d <days>] [-o <dir>] --json` |

**Options:** `-d/--days <n>` (default 30), `-o/--output <dir>` (default `.ai-artifacts/reports`), `--no-wiki` (exclude wiki), `--no-prs` (exclude PRs), `--fast` (quick mode ~20s, lower accuracy), `-q/--quiet`, `-v/--verbose`.

**People format:** `"Display Name|email@domain.com"`. Multiple `-p` values supported.

## Performance Optimization

### Parallel Research Execution

Use subagents to parallelize research phases (50% time reduction):

**Wave 1 (Parallel):** Organization Dict, ADO, Wiki, Business Context
**Wave 2 (Parallel):** Salesforce, Similar Work Items, Code, Web Research
**Wave 3 (Sequential):** Research Synthesis

See: `#file:.github/prompts/util-subagent-research.prompt.md`

### Batch API Operations

SF tools support batch operations for 70% speedup when researching multiple objects:

**Phase 03e (Salesforce):**
- Sequential: `#file:.github/prompts/phase-03e-research-salesforce.prompt.md` (one object at a time)
- Parallel: `#file:.github/prompts/phase-03e-research-salesforce-parallel.prompt.md` (batch + subagents per object)

Batch operations combine multiple CLI calls into one:
```bash
# Old: 3 separate calls (6-8 seconds total)
sf-tools describe Account --json
sf-tools describe Contact --json
sf-tools describe Opportunity --json

# New: 1 batch call (2-3 seconds total)
sf-tools describe Account,Contact,Opportunity --batch --json
```

Then spawns subagents to discover dependencies per object in parallel.

See: `#file:.github/prompts/util-subagent-sf-discovery.prompt.md`

## Extending the Workflow

### Add New CLI Command

1. Add to `scripts/workflow/cli/{tool}-tools.ts`
2. Register in `shared.json` under `cli_commands`
3. Rebuild: `cd scripts/workflow && npm run build`

### Add New Phase

1. Create `phase-XX-{name}.prompt.md`
2. Add to `phase-01-prepare-ticket.prompt.md` sequence
3. Register artifacts in `shared.json` under `artifact_files.{phase}`

### Add New Research Sub-Phase

1. Create `phase-03X-research-{name}.prompt.md` (use letter suffix a-z)
2. Add to `phase-03-research.prompt.md` (sequential) or appropriate wave in parallel version
3. Register artifact in `shared.json`

## Checklist for Changes

- [ ] Paths use template variables from shared.json
- [ ] New commands registered in shared.json
- [ ] CLI tools rebuilt after changes
- [ ] Prompts reference util-base.prompt.md for shared definitions
