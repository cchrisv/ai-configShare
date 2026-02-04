# AI-Assisted Ticket Workflow Configuration

Autonomous Azure DevOps and Salesforce workflow automation with GitHub Copilot integration.

## Overview

This repository contains the AI configuration for automating ticket grooming, research, solutioning, and documentation workflows. The system uses a unified context file approach where all phase data is progressively accumulated in a single `ticket-context.json` file.

## Quick Start

```bash
# 1. Clone this repository into your Salesforce project
git clone https://github.com/cchrisv/ai-configShare.git .github-config
cp -r .github-config/.github .github
cp -r .github-config/.vscode .vscode

# 2. Authenticate
az login                        # Azure DevOps
sf org login web -a production  # Salesforce

# 3. Use the prompts with GitHub Copilot or Cursor
```

## Architecture

```
.github/
├── prompts/              # GitHub Copilot/Cursor prompts
│   ├── prepare-ticket.prompt.md    # Full workflow orchestrator
│   ├── research.prompt.md          # Research phase
│   ├── groom.prompt.md             # Grooming phase
│   ├── solution.prompt.md          # Solutioning phase
│   ├── create-wiki.prompt.md       # Wiki creation
│   └── finalize.prompt.md          # Finalization
├── config/               # Configuration files
│   ├── shared.json                 # Master configuration
│   ├── template-variables.json     # Template variable definitions
│   └── step-manifests.json         # Step execution manifests
├── scripts/              # Automation scripts
│   ├── calculate_estimation.py     # Story point estimation
│   ├── generate_snapshot.py        # Context snapshot generation
│   └── generate_wiki_content.py    # Wiki content generation
├── standards/            # Development standards
│   ├── apex-well-architected.md
│   ├── flow-well-architected.md
│   └── ...
├── templates/            # Document templates
│   ├── ticket-context-schema.json  # Unified context schema
│   ├── field-*.html                # ADO field templates
│   └── ...
└── copilot-instructions.md         # Agent instructions
```

## Unified Context File

All workflow phases read from and write to a single `ticket-context.json` file:

```json
{
  "metadata": { "work_item_id": "12345", "phases_completed": [...] },
  "run_state": { "current_phase": "...", "estimation": {...} },
  "research": { "ado_workitem": {...}, "salesforce_metadata": {...}, "synthesis": {...} },
  "grooming": { "classification": {...}, "templates_applied": {...} },
  "solutioning": { "solution_design": {...}, "testing": {...}, "traceability": {...} },
  "wiki": { "content_generated_at": "..." },
  "finalization": { "context_snapshot": {...} }
}
```

See `.github/templates/ticket-context-schema.json` for the full schema.

## Workflow Phases

### 1. Research Phase
Gathers context from multiple sources:
- Azure DevOps work items and comments
- Internal wiki documentation
- Salesforce metadata and dependencies
- Similar past work items
- Web best practices

### 2. Grooming Phase
- Classifies work item type and complexity
- Validates acceptance criteria
- Applies organization templates
- Identifies risks and dependencies

### 3. Solutioning Phase
- Generates solution options analysis
- Creates detailed solution design
- Produces comprehensive test cases with:
  - Happy and unhappy path coverage
  - Developer validation guidance (unit tests, mocks, assertions)
  - QA validation guidance (manual flows, data queries, environment setup)
- Maps traceability to acceptance criteria

### 4. Wiki Creation Phase
- Generates structured wiki documentation
- Includes business context, technical design, and testing details

### 5. Finalization Phase
- Calculates story point estimation
- Generates context snapshot
- Prepares ADO field updates

## Prompts

| Prompt | Purpose |
|--------|---------|
| `prepare-ticket.prompt.md` | Full lifecycle orchestration |
| `research.prompt.md` | Execute all research sub-phases |
| `groom.prompt.md` | Grooming and classification |
| `solution.prompt.md` | Solution design and testing |
| `create-wiki.prompt.md` | Wiki documentation generation |
| `finalize.prompt.md` | Estimation and finalization |

### Re-run Prompts
Use `re-*.prompt.md` variants to re-execute phases with existing context.

## Configuration

### shared.json
Master configuration including:
- Artifact paths
- CLI command templates
- Feature flags
- Organization context

### template-variables.json
Variable definitions for template resolution:
- Work item fields
- Artifact locations
- Estimation factors

## Standards

Development standards are documented in `.github/standards/`:
- Apex Well-Architected patterns
- Flow best practices
- Trigger Actions Framework
- Naming conventions
- Feature flag usage

## Scripts

Python scripts for automated processing:

| Script | Purpose |
|--------|---------|
| `calculate_estimation.py` | Compute story points based on complexity |
| `generate_snapshot.py` | Create finalization context snapshot |
| `generate_wiki_content.py` | Generate wiki markdown from context |

## Output Artifacts

The workflow produces:
1. **`ticket-context.json`** - Unified context file with all phase data
2. **`solution-summary.md`** - HTML summary for ADO Developer Summary field
3. **`wiki-content.md`** - Markdown content for ADO Wiki page

## Requirements

- Azure CLI (authenticated)
- Salesforce CLI (authenticated)
- GitHub Copilot or Cursor IDE
- Python 3.x (for scripts)

## License

Internal use only.
