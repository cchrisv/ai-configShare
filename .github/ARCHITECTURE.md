# Architecture Guide

This document describes the architecture of the autonomous ticket workflow system. Follow these patterns when extending or modifying the system.

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Configuration-driven** | All paths, commands, and settings live in `config/shared.json`. Never hardcode. |
| **Single source of truth** | Prompts in `.github/prompts/`, config/templates/standards in `config/`, CLI tools in `scripts/workflow/`. |
| **CLI-first** | Use TypeScript CLI tools for all external operations. No raw shell commands in prompts. |
| **Artifacts persist** | Every phase writes JSON artifacts for traceability and resumability. |
| **Run state tracking** | `run-state.json` tracks progress, enabling pause/resume and phase re-runs. |
| **Template variables** | Use `{{variable}}` syntax resolved from configuration. |

---

## 1a. Mandatory Rules

> **These rules are enforced in `.github/copilot-instructions.md` and must be followed.**

| Rule | Description |
|------|-------------|
| **NO RAW SHELL COMMANDS** | Never use `curl`, `az`, `git`, `npm`, etc. directly. Use the CLI tools defined in `cli_commands`. |
| **DO NOT MODIFY CLI SCRIPTS** | Files in `scripts/workflow/` are stable infrastructure. Do not modify without explicit user request. |
| **NO HARDCODED PATHS** | Use template variables (`{{paths.*}}`, `{{cli.*}}`, `{{artifact_files.*}}`, `{{template_files.*}}`) from `shared.json`. |
| **CONFIGURATION IS READ-ONLY** | Do not modify `shared.json` or config files without explicit request. |
| **FOLLOW ARCHITECTURE** | Read this document before extending the workflow. |

---

## 2. Folder Structure

```
project-root/
├── .github/                       # GitHub Copilot integration
│   ├── prompts/                   # Canonical prompt definitions (25 prompts)
│   │   ├── util-*.prompt.md       # Utility prompts (help, setup, activity-report)
│   │   ├── phase-01-*.prompt.md   # Phase 1: Prepare ticket (orchestrator)
│   │   ├── phase-02-*.prompt.md   # Phase 2: Initialize
│   │   ├── phase-03-*.prompt.md   # Phase 3: Research orchestrator
│   │   ├── phase-03a-*.prompt.md  # Phase 3a: Organization dictionary
│   │   ├── phase-03b-*.prompt.md  # Phase 3b: ADO extraction
│   │   ├── phase-03c-*.prompt.md  # Phase 3c: Wiki search
│   │   ├── phase-03d-*.prompt.md  # Phase 3d: Business context
│   │   ├── phase-03e-*.prompt.md  # Phase 3e: Salesforce metadata
│   │   ├── phase-03f-*.prompt.md  # Phase 3f: Similar workitems
│   │   ├── phase-03g-*.prompt.md  # Phase 3g: Code analysis
│   │   ├── phase-03h-*.prompt.md  # Phase 3h: Web research
│   │   ├── phase-03z-*.prompt.md  # Phase 3z: Research synthesis
│   │   ├── phase-04-*.prompt.md   # Phase 4: Grooming
│   │   ├── phase-05-*.prompt.md   # Phase 5: Solutioning
│   │   ├── phase-06-*.prompt.md   # Phase 6: Wiki orchestrator
│   │   ├── phase-06a-*.prompt.md  # Phase 6a: Wiki creation
│   │   ├── phase-07-*.prompt.md   # Phase 7: Finalization
│   │   └── re-phase-*.prompt.md   # Re-run variants (5 prompts)
│   ├── ARCHITECTURE.md            # This file
│   └── copilot-instructions.md    # GitHub Copilot configuration
│
├── config/                        # Configuration and templates
│   ├── shared.json                # Master configuration (paths, CLI commands, settings)
│   ├── organization-dictionary.json
│   ├── template-variables.json    # Prompt variable definitions
│   ├── step-manifests.json        # Step execution manifests
│   ├── templates/                 # HTML/Markdown templates for ADO fields
│   │   ├── user-story-templates.md
│   │   ├── bug-templates.md
│   │   ├── field-disclaimer.md
│   │   ├── validation-checklist.md
│   │   ├── solution-design-template.md
│   │   ├── wiki-page-format.md
│   │   └── *.md
│   └── standards/                 # Development standards
│       ├── apex-well-architected.md
│       ├── flow-well-architected.md
│       ├── lwc-well-architected.md
│       ├── trigger-actions-framework-standards.md
│       └── *.md
│
├── scripts/workflow/              # TypeScript CLI tools
│   ├── cli/                       # CLI entry points
│   │   ├── ado-tools.ts
│   │   ├── sf-tools.ts
│   │   ├── wiki-tools.ts
│   │   ├── workflow-tools.ts
│   │   └── report-tools.ts
│   ├── src/                       # Source code and utilities
│   └── dist/                      # Compiled output
│
├── README.md                      # Project documentation & CLI reference
│
└── .ai-artifacts/                 # Runtime artifacts (gitignored)
    └── {work_item_id}/
        ├── run-state.json
        ├── research/
        ├── grooming/
        ├── solutioning/
        ├── wiki/
        └── finalization/
```

---

## 3. Configuration (`config/shared.json`)

All configurable values live in `shared.json`. Prompts reference these via template variables.

### Structure

```json
{
  "paths": {
    "artifacts_root": ".ai-artifacts",
    "prompts": ".github/prompts",
    "templates": "config/templates",
    "standards": "config/standards",
    "config": "config",
    "scripts": "scripts/workflow"
  },
  "cli_commands": {
    "workflow_prepare": "npx --prefix scripts/workflow workflow-tools prepare",
    "workflow_status": "npx --prefix scripts/workflow workflow-tools status",
    "workflow_reset": "npx --prefix scripts/workflow workflow-tools reset",
    "ado_get": "npx --prefix scripts/workflow ado-tools get",
    "ado_update": "npx --prefix scripts/workflow ado-tools update",
    "sf_query": "npx --prefix scripts/workflow sf-tools query",
    "wiki_search": "npx --prefix scripts/workflow wiki-tools search"
  },
  "artifact_files": {
    "run_state": "run-state.json",
    "research": {
      "organization_dictionary": "00-organization-dictionary.json",
      "ado_workitem": "01-ado-workitem.json",
      "wiki_research": "02-wiki-research.json",
      "dependency_discovery": "03a-dependency-discovery.json",
      "similar_workitems": "04-similar-workitems.json",
      "business_context": "05-business-context.json",
      "code_analysis": "05-code-analysis.json",
      "web_research": "06-web-research.json"
    },
    "grooming": { "result": "grooming-result.json" },
    "solutioning": { "solution_design": "solution-design.json" },
    "wiki": { "generated_content": "generated-content.md" },
    "finalization": { "completion_summary": "completion-summary.md" }
  },
  "template_files": {
    "user_story": "user-story-templates.md",
    "bug": "bug-templates.md",
    "disclaimer": "field-disclaimer.md",
    "validation": "validation-checklist.md",
    "solution_design": "solution-design-template.md"
  },
  "field_paths": { ... },
  "tags": { ... }
}
```

### Usage in Prompts

```markdown
**Command:** `{{cli.workflow_prepare}} -w {{work_item_id}} --json`
**Output:** `{{paths.artifacts_root}}/{{work_item_id}}/research/`
**File:** `{{research}}/{{artifact_files.research.ado_workitem}}`
**Template:** `{{paths.templates}}/{{template_files.user_story}}`
```

### Adding New Configuration

1. Add the value to `shared.json` under the appropriate section
2. Document the JSON path in the prompt's "Variables from shared.json" table
3. Use the template variable in the prompt

---

## 4. Prompt Architecture

### Naming Convention

| Category | Pattern | Example |
|----------|---------|---------|
| Utility | `util-{name}.prompt.md` | `util-help.prompt.md` |
| Main phase | `phase-XX-{name}.prompt.md` | `phase-04-grooming.prompt.md` |
| Sub-phase | `phase-XXy-{name}.prompt.md` | `phase-03b-research-ado.prompt.md` |
| Re-run | `re-phase-XX-{name}.prompt.md` | `re-phase-04-grooming.prompt.md` |

### Canonical Prompts (`.github/prompts/`)

These contain the full logic and are the source of truth.

**Required sections:**

```markdown
# {Phase Name}

## 1. SYSTEM CONTEXT & PERSONA
**Role:** ...
**Mission:** ...
**Output:** ...

## 2. INPUT CONFIGURATION
**Runtime Inputs:** ...
**Configuration Source:** ...
**Variables from shared.json:** (table)
**Derived Paths:** ...

## 3. PROTOCOL & GUARDRAILS
1. ...
2. ...

## 4. EXECUTION WORKFLOW
### PHASE/STEP: {Name} [TYPE: {IO|CLI|API|LOGIC|GEN}]
* **Action:** ...
* **Output:** ...

## 5. OUTPUT MANIFEST
...

## 6. ERROR HANDLING (optional)
...
```

### Step Type Annotations

Every step must have a type annotation:

| Type | Description | Characteristics |
|------|-------------|-----------------|
| `[TYPE: IO]` | File read/write | Deterministic, fast, no network |
| `[TYPE: CLI]` | External tool execution | May fail, has exit codes |
| `[TYPE: API]` | Remote API calls | Network-dependent, may timeout |
| `[TYPE: LOGIC]` | Conditional branching | Pure logic, no side effects |
| `[TYPE: GEN]` | AI reasoning/generation | Non-deterministic, requires LLM |

### Re-run Prompts (`.github/prompts/re-phase-*.prompt.md`)

Re-run prompts reset a phase and re-execute it.

**Format:**

```markdown
```prompt
# Re-{Phase} (Phase XX)

Purpose: Re-run the {phase} phase after updated information.

## Configuration
Load CLI commands from: `#file:config/shared.json`

## Step 1: Reset Phase
{{cli.workflow_reset}} -w {{work_item_id}} --phase {phase} --force --json

## Step 2: Execute
Execute: #file:.github/prompts/phase-XX-{phase}.prompt.md
```
```

---

## 5. CLI Tools Architecture

### Tool Categories

| Tool | Purpose | Key Commands |
|------|---------|--------------|
| `workflow-tools` | Lifecycle management | `prepare`, `status`, `reset` |
| `ado-tools` | Azure DevOps operations | `get`, `update`, `create`, `search`, `link`, `relations` |
| `sf-tools` | Salesforce operations | `query`, `describe`, `discover`, `apex-classes`, `flows` |
| `wiki-tools` | Wiki operations | `get`, `update`, `create`, `search`, `list`, `delete` |
| `report-tools` | Activity reporting | `activity` |

### Adding a New CLI Command

1. **Add to CLI file** (`scripts/workflow/cli/{tool}-tools.ts`):
```typescript
program
  .command('new-command')
  .description('Description')
  .requiredOption('-w, --work-item <id>', 'Work item ID', parseInt)
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    // Implementation
  });
```

2. **Register in `shared.json`**:
```json
"cli_commands": {
  "new_command": "npx --prefix scripts/workflow {tool}-tools new-command"
}
```

3. **Rebuild**: `cd scripts/workflow && npm run build`

4. **Document in `README.md`** (project root)

### CLI Conventions

- All commands support `--json` for structured output
- All commands support `-v, --verbose` for debug logging
- Use `getProjectRoot()` for path resolution (not `process.cwd()`)
- Return structured JSON with `success: boolean` and `message: string`

---

## 6. Artifact Management

### Run State (`run-state.json`)

Tracks workflow progress:

```json
{
  "workItemId": "12345",
  "version": 1,
  "currentPhase": "research",
  "phaseOrder": ["research", "grooming", "solutioning", "wiki", "finalization"],
  "completedSteps": ["phase-03a", "phase-03b", "phase-03c"],
  "errors": [],
  "metrics": {
    "phases": {},
    "startedAt": "2024-01-01T00:00:00Z"
  },
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### Artifact Naming

Files are named with numeric prefixes for ordering. Use `{{artifact_files.*}}` variables in prompts.

```
research/
├── 00-organization-dictionary.json  # {{artifact_files.research.organization_dictionary}}
├── 01-ado-workitem.json             # {{artifact_files.research.ado_workitem}}
├── 02-wiki-research.json            # {{artifact_files.research.wiki_research}}
├── 03a-dependency-discovery.json    # {{artifact_files.research.dependency_discovery}}
├── 03b-dependency-summary.md        # {{artifact_files.research.dependency_summary}}
├── 03c-object-descriptions.json     # {{artifact_files.research.object_descriptions}}
├── 04-similar-workitems.json        # {{artifact_files.research.similar_workitems}}
├── 05-business-context.json         # {{artifact_files.research.business_context}}
├── 05-code-analysis.json            # {{artifact_files.research.code_analysis}}
├── 06-web-research.json             # {{artifact_files.research.web_research}}
├── research-summary.json            # {{artifact_files.research.research_summary}}
└── assumptions.json                 # {{artifact_files.research.assumptions}}
```

### Adding a New Artifact

1. Add filename to `shared.json` under `artifact_files.{phase}`
2. Reference via `{{artifact_files.{phase}.{name}}}` in prompts
3. Update the phase prompt to write the artifact

---

## 7. Adding a New Phase

1. **Create prompt**: `.github/prompts/phase-XX-{phase}.prompt.md`
   - Follow the standard sections (SYSTEM CONTEXT, INPUT CONFIGURATION, etc.)
   - Add step type annotations
   - Use sequential numbering (e.g., phase-08 for a new phase after finalization)

2. **Create re-run prompt**: `.github/prompts/re-phase-XX-{phase}.prompt.md`
   - Reset phase artifacts first
   - Execute the phase prompt

3. **Update `phase-01-prepare-ticket.prompt.md`**:
   - Add the phase in sequence

4. **Update `shared.json`**:
   - Add artifact filenames under `artifact_files.{phase}`
   - Add any new CLI commands

5. **Update `workflow-tools reset`**:
   - Add phase to valid phases list if needed

6. **Update documentation**:
   - `README.md` (project root)
   - `.github/copilot-instructions.md`

---

## 8. Adding a New Research Sub-Prompt

1. **Create prompt**: `.github/prompts/phase-03X-research-{name}.prompt.md`
   - Use a letter suffix (a-z) based on execution order
   - Use 'z' for synthesis/final aggregation steps

2. **Add to research sequence** in:
   - `.github/prompts/phase-01-prepare-ticket.prompt.md` (PHASE 2)
   - `.github/prompts/phase-03-research.prompt.md`

3. **Register artifact** in `shared.json`:
```json
"artifact_files": {
  "research": {
    "new_research": "XX-new-research.json"
  }
}
```

4. **Update documentation**:
   - `README.md` (project root)

---

## 9. Template Variables Reference

### Path Variables
- `{{paths.artifacts_root}}` - Base artifacts directory (`.ai-artifacts`)
- `{{paths.prompts}}` - Prompts directory (`.github/prompts`)
- `{{paths.templates}}` - Templates directory (`config/templates`)
- `{{paths.standards}}` - Standards directory (`config/standards`)
- `{{paths.config}}` - Configuration directory (`config`)
- `{{paths.scripts}}` - Scripts directory (`scripts/workflow`)

### CLI Variables
- `{{cli.workflow_prepare}}` - Initialize workflow
- `{{cli.workflow_status}}` - Check status
- `{{cli.workflow_reset}}` - Reset workflow/phase
- `{{cli.ado_get}}` - Get ADO work item
- `{{cli.ado_update}}` - Update ADO work item
- `{{cli.ado_search}}` - Search work items
- `{{cli.ado_link}}` - Link work items
- `{{cli.sf_query}}` - Run SOQL query
- `{{cli.sf_describe}}` - Describe Salesforce object
- `{{cli.sf_discover}}` - Discover dependencies
- `{{cli.wiki_search}}` - Search wiki
- `{{cli.wiki_get}}` - Get wiki page
- `{{cli.wiki_update}}` - Update wiki page

### Artifact Variables
- `{{artifact_files.run_state}}` - Run state filename
- `{{artifact_files.research.*}}` - Research artifact filenames
- `{{artifact_files.grooming.*}}` - Grooming artifact filenames
- `{{artifact_files.solutioning.*}}` - Solutioning artifact filenames
- `{{artifact_files.wiki.*}}` - Wiki artifact filenames
- `{{artifact_files.finalization.*}}` - Finalization artifact filenames

### Template Variables
- `{{template_files.user_story}}` - User story template
- `{{template_files.bug}}` - Bug template
- `{{template_files.disclaimer}}` - Field disclaimer
- `{{template_files.validation}}` - Validation checklist
- `{{template_files.solution_design}}` - Solution design template
- `{{template_files.wiki_format}}` - Wiki page format

### Runtime Variables
- `{{work_item_id}}` - Target work item ID
- `{{iso_timestamp}}` - Current ISO timestamp
- `{{root}}` - `{{paths.artifacts_root}}/{{work_item_id}}`
- `{{research}}` - `{{root}}/research`

---

## 10. Testing Changes

1. **Initialize test workflow**:
```bash
npx --prefix scripts/workflow workflow-tools prepare -w <test_id> --json
```

2. **Check status**:
```bash
npx --prefix scripts/workflow workflow-tools status -w <test_id> --json
```

3. **Reset and retry**:
```bash
npx --prefix scripts/workflow workflow-tools reset -w <test_id> --phase <phase> --force
```

4. **Full reset**:
```bash
npx --prefix scripts/workflow workflow-tools reset -w <test_id> --force
```

---

## 11. Checklist for Changes

Before committing changes:

- [ ] All hardcoded paths use template variables (`{{paths.*}}`, `{{artifact_files.*}}`, `{{template_files.*}}`)
- [ ] New commands registered in `shared.json` under `cli_commands`
- [ ] Prompts follow standard section structure
- [ ] Step type annotations present on all steps
- [ ] CLI tools rebuilt (`cd scripts/workflow && npm run build`)
- [ ] Documentation updated (`README.md`, `copilot-instructions.md`)
- [ ] New artifacts registered in `shared.json` under `artifact_files`

---

## 12. Slash Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `/util-help` | System overview and guidance |
| `/util-setup` | First-time setup |
| `/phase-01-prepare-ticket` | Full workflow (all phases) |
| `/phase-02-initialize` | Initialize only |
| `/phase-03-research` | Research phase (all sub-prompts) |
| `/phase-04-grooming` | Grooming phase |
| `/phase-05-solutioning` | Solutioning phase |
| `/phase-06-wiki` | Wiki creation |
| `/phase-07-finalization` | Finalization |
| `/re-phase-XX-*` | Re-run specific phase |
