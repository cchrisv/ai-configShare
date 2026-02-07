# GitHub Copilot Instructions – Autonomous Ticket Workflow

## Configuration

**All paths, CLI commands, and settings:** `#file:config/shared.json`

**Shared prompt definitions:** `#file:.github/prompts/util-base.prompt.md`

## Entry Points

| Task | Prompt |
|------|--------|
| Full workflow | `#file:.github/prompts/phase-01-prepare-ticket.prompt.md` |
| Full workflow (parallel) | `#file:.github/prompts/phase-01-prepare-ticket-parallel.prompt.md` |
| Re-run phase | `#file:.github/prompts/re-phase.prompt.md` |
| Help | `#file:.github/prompts/util-help.prompt.md` |
| Setup | `#file:.github/prompts/util-setup.prompt.md` |

## Workflow Phases

1. **Initialize** (02) → Creates artifact structure
2. **Research** (03a-03z) → Gathers context from ADO, SF, wiki, code
   - Sequential: `phase-03-research.prompt.md` (15-25 min)
   - Parallel: `phase-03-research-parallel.prompt.md` (8-12 min, 50% faster)
3. **Grooming** (04) → Refines requirements
4. **Solutioning** (05) → Designs technical approach
5. **Wiki** (06) → Generates documentation
6. **Finalization** (07) → Updates ADO work item

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
│   ├── templates/           # ADO field templates
│   └── standards/           # Development standards
├── scripts/workflow/        # TypeScript CLI tools
└── .ai-artifacts/           # Runtime artifacts (gitignored)
    ├── {id}/                # Per-work-item artifacts
    │   ├── run-state.json
    │   ├── research/
    │   ├── grooming/
    │   ├── solutioning/
    │   ├── wiki/
    │   └── finalization/
    └── reports/             # Activity report CSVs
```

## CLI Tools

| Tool | Commands | Batch Support |
|------|----------|---------------|
| workflow-tools | prepare, status, reset | N/A |
| ado-tools | get, update, create, search, link, relations | No |
| sf-tools | query, describe, discover, apex-classes, flows | **Yes** (describe, discover, validation-rules) |
| wiki-tools | get, update, create, search, list, delete | No |

All commands support `--json` for structured output.

### Batch Operations (sf-tools)

Batch operations execute multiple requests in parallel for significant speedup:

**Describe multiple objects:**
```bash
npx sf-tools describe Account,Contact,Opportunity --batch --json
```

**Discover dependencies for multiple components:**
```bash
npx sf-tools discover --type CustomObject --name Account,Contact --batch --json
```

**Get validation rules for multiple objects:**
```bash
npx sf-tools validation-rules Account,Contact --batch --json
```

Returns array of results (one per object) with success/failure per item.

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
