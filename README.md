# Autonomous Ticket Workflow

Azure DevOps and Salesforce workflow automation with GitHub Copilot integration.

## Quick Start

```bash
# 1. Install dependencies
cd scripts/workflow
npm install

# 2. Build CLI tools
npm run build

# 3. Authenticate
az login                        # Azure DevOps
sf org login web -a production  # Salesforce

# 4. Run a workflow
# Use /phase-01-prepare-ticket prompt with a work item ID
```

## Architecture

All configuration and tooling lives in `.github/`:

```
.github/
├── prompts/          # GitHub Copilot prompts (phase-XX-*.prompt.md)
├── ARCHITECTURE.md   # Full architecture guide
└── copilot-instructions.md

config/               # Configuration files
├── shared.json       # Master configuration
├── templates/        # Work item and documentation templates
└── standards/        # Development standards

scripts/workflow/     # TypeScript CLI tools
├── cli/              # CLI entry points
├── src/              # Source code
└── dist/             # Compiled output
```

Runtime artifacts are stored in `.ai-artifacts/<work_item_id>/`.

## Prompts

### Utility Prompts

- `util-help.prompt.md` - Overview of all prompts and system architecture
- `util-setup.prompt.md` - First-time setup guide
- `util-activity-report.prompt.md` - Generate CSV activity reports

### Full Workflow

- `phase-01-prepare-ticket.prompt.md` - Runs the entire lifecycle: initialize → research → grooming → solutioning → wiki → finalization
- `phase-02-initialize.prompt.md` - Initializes artifact folder structure

### Phase Prompts

| Phase | First Run | Re-run |
|-------|-----------|--------|
| Research | `phase-03-research.prompt.md` | `re-phase-03-research.prompt.md` |
| Grooming | `phase-04-grooming.prompt.md` | `re-phase-04-grooming.prompt.md` |
| Solutioning | `phase-05-solutioning.prompt.md` | `re-phase-05-solutioning.prompt.md` |
| Wiki | `phase-06-wiki.prompt.md` | `re-phase-06-wiki.prompt.md` |
| Finalization | `phase-07-finalization.prompt.md` | `re-phase-07-finalization.prompt.md` |

### Research Sub-Prompts (Phase 03)

- `phase-03a-research-organization-dictionary.prompt.md` - Organization terminology
- `phase-03b-research-ado.prompt.md` - Azure DevOps work items
- `phase-03c-research-wiki.prompt.md` - Internal wiki content
- `phase-03d-research-business-context.prompt.md` - Business problem analysis
- `phase-03e-research-salesforce.prompt.md` - Salesforce metadata
- `phase-03f-research-similar-workitems.prompt.md` - Related work items
- `phase-03g-research-code.prompt.md` - Codebase analysis
- `phase-03h-research-web.prompt.md` - Web best practices
- `phase-03z-research-synthesis.prompt.md` - Analysis synthesis

## CLI Tools

All commands support `--json` for structured output and `-v` for verbose logging.

**Important:** Commands are defined in `config/shared.json` under `cli_commands`. Use template variables like `{{cli.ado_get}}` in prompts.

### Quick Reference

```bash
npx --prefix scripts/workflow workflow-tools prepare -w <id> --json
npx --prefix scripts/workflow workflow-tools status -w <id> --json
npx --prefix scripts/workflow ado-tools get <id> --json
npx --prefix scripts/workflow sf-tools query "<SOQL>" --json
npx --prefix scripts/workflow wiki-tools search "<term>" --json
```

### workflow-tools

Workflow lifecycle management.

```bash
# Initialize workflow for a work item
npx --prefix scripts/workflow workflow-tools prepare -w <id> [--force] [--json]

# Check workflow status
npx --prefix scripts/workflow workflow-tools status -w <id> [--json]

# Reset specific phase (clears artifacts, updates run-state)
npx --prefix scripts/workflow workflow-tools reset -w <id> --phase <phase> --force [--json]

# Reset entire workflow (deletes all artifacts)
npx --prefix scripts/workflow workflow-tools reset -w <id> --force [--json]
```

**Valid phases:** `research`, `grooming`, `solutioning`, `wiki`

### ado-tools

Azure DevOps work item operations.

```bash
# Get work item
npx --prefix scripts/workflow ado-tools get <id> [--expand All|Relations|Fields] [--comments] [--json]

# Update work item - Basic fields
npx --prefix scripts/workflow ado-tools update <id> --title "New Title" [--json]
npx --prefix scripts/workflow ado-tools update <id> --description "<html>" [--json]
npx --prefix scripts/workflow ado-tools update <id> --state "Active" [--json]
npx --prefix scripts/workflow ado-tools update <id> --tags "Tag1; Tag2" [--json]

# Update work item - Acceptance criteria
npx --prefix scripts/workflow ado-tools update <id> --ac "<html>" [--json]
npx --prefix scripts/workflow ado-tools update <id> --acceptance-criteria "<html>" [--json]

# Update work item - Bug fields
npx --prefix scripts/workflow ado-tools update <id> --repro-steps "<html>" [--json]
npx --prefix scripts/workflow ado-tools update <id> --system-info "<html>" [--json]

# Update work item - Numeric/picklist fields
npx --prefix scripts/workflow ado-tools update <id> --story-points 5 [--json]
npx --prefix scripts/workflow ado-tools update <id> --priority 2 [--json]
npx --prefix scripts/workflow ado-tools update <id> --work-class "Development" [--json]
npx --prefix scripts/workflow ado-tools update <id> --requires-qa "Yes" [--json]

# Update work item - File-based content (for large HTML)
npx --prefix scripts/workflow ado-tools update <id> --description-file ./description.html [--json]
npx --prefix scripts/workflow ado-tools update <id> --ac-file ./acceptance-criteria.html [--json]
npx --prefix scripts/workflow ado-tools update <id> --repro-steps-file ./repro.html [--json]
npx --prefix scripts/workflow ado-tools update <id> --system-info-file ./sysinfo.html [--json]

# Update work item - Arbitrary field
npx --prefix scripts/workflow ado-tools update <id> --field "Custom.TechnicalNotes" --value "Notes" [--json]
npx --prefix scripts/workflow ado-tools update <id> --field "Custom.SFComponents" --value-file ./components.txt [--json]

# Update work item - Bulk from JSON file (grooming-result.json)
npx --prefix scripts/workflow ado-tools update <id> --fields-file "./grooming/grooming-result.json" [--json]

# Update work item - Add comment
npx --prefix scripts/workflow ado-tools update <id> --comment "Status update here" [--json]

# Create work item
npx --prefix scripts/workflow ado-tools create <type> --title "<title>" [--parent <id>] [--json]

# Search work items (WIQL)
npx --prefix scripts/workflow ado-tools search --wiql "<wiql>" [--json]
npx --prefix scripts/workflow ado-tools search --text "keyword" --type "User Story" [--json]

# Get relations/links
npx --prefix scripts/workflow ado-tools relations <id> [--json]

# Link work items
npx --prefix scripts/workflow ado-tools link <sourceId> <targetId> --type <relationType> [--json]
```

**Supported Update Parameters:**

| Parameter | Field Path | Description |
|-----------|------------|-------------|
| `--title` | `System.Title` | Work item title |
| `--description` | `System.Description` | Description (HTML) |
| `--state` | `System.State` | State (New, Active, etc.) |
| `--tags` | `System.Tags` | Tags (semicolon-separated) |
| `--ac`, `--acceptance-criteria` | `Microsoft.VSTS.Common.AcceptanceCriteria` | Acceptance criteria (HTML) |
| `--repro-steps` | `Microsoft.VSTS.TCM.ReproSteps` | Bug repro steps (HTML) |
| `--system-info` | `Microsoft.VSTS.TCM.SystemInfo` | Bug system info (HTML) |
| `--story-points` | `Microsoft.VSTS.Scheduling.StoryPoints` | Story points |
| `--priority` | `Microsoft.VSTS.Common.Priority` | Priority (1-4) |
| `--work-class` | `Custom.WorkClassType` | Work class type |
| `--requires-qa` | `Custom.RequiresQA` | Requires QA (Yes/No) |
| `--field` + `--value` | Any field path | Arbitrary field update |
| `--fields-file` | Multiple fields | Bulk update from JSON |

### sf-tools

Salesforce query and metadata operations.

```bash
# Execute SOQL query
npx --prefix scripts/workflow sf-tools query "<soql>" [--tooling] [--json]

# Describe object/metadata
npx --prefix scripts/workflow sf-tools describe <objectName> [--json]

# Discover dependencies
npx --prefix scripts/workflow sf-tools discover <componentName> [--depth <n>] [--json]

# List Apex classes
npx --prefix scripts/workflow sf-tools apex-classes [--json]

# List Apex triggers
npx --prefix scripts/workflow sf-tools apex-triggers [--json]

# List flows
npx --prefix scripts/workflow sf-tools flows [--json]

# List validation rules
npx --prefix scripts/workflow sf-tools validation-rules <objectName> [--json]
```

### wiki-tools

Azure DevOps wiki operations.

```bash
# Get wiki page
npx --prefix scripts/workflow wiki-tools get <pagePath> [--json]

# Create/update wiki page
npx --prefix scripts/workflow wiki-tools update <pagePath> --content "<content>" [--json]
npx --prefix scripts/workflow wiki-tools create <pagePath> --content "<content>" [--json]

# Search wiki
npx --prefix scripts/workflow wiki-tools search "<query>" [--json]

# List wiki pages
npx --prefix scripts/workflow wiki-tools list [--path <basePath>] [--json]

# Delete wiki page
npx --prefix scripts/workflow wiki-tools delete <pagePath> [--json]
```

## Authentication

### Azure DevOps

Uses Azure CLI. No PAT tokens required.

```bash
az login
az account show
```

### Salesforce

Uses SF CLI authentication.

```bash
sf org login web -a production
sf org list
```

## Configuration

All paths, CLI commands, and settings are in `config/shared.json`.

Use template variables in prompts:
- `{{cli.workflow_prepare}}` - Initialize workflow
- `{{cli.ado_get}}` - Get ADO work item
- `{{cli.sf_query}}` - Run SOQL query
- `{{paths.artifacts_root}}` - Artifacts directory

## Development

```bash
cd scripts/workflow
npm install      # Install dependencies
npm run build    # Build TypeScript
npm test         # Run tests
npm run lint     # Lint code
```

## Documentation

- [Architecture Guide](.github/ARCHITECTURE.md)
- [Configuration](config/shared.json)
