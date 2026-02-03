# Prompt Variable Reference

All prompts MUST load configuration from `shared.json` before execution and use variables instead of hardcoded paths.

## Step Type Annotations

Every step in a prompt MUST include a `[TYPE: X]` annotation to classify its execution type:

| Type | Meaning | Description | AI Reasoning? |
|------|---------|-------------|---------------|
| `[TYPE: IO]` | Input/Output | Deterministic file operations - read/write files, create directories | No |
| `[TYPE: LOGIC]` | Logic | Deterministic conditional checks - if/then decisions based on values | No |
| `[TYPE: CLI]` | CLI Command | Execute a CLI tool and capture output | No (may need AI to parse) |
| `[TYPE: API]` | API Call | External API interaction (network call) | No |
| `[TYPE: GEN]` | Generative | Requires AI reasoning - analysis, classification, content generation | **Yes** |

### Why This Matters

- **Predictability**: IO/LOGIC/CLI steps always produce same result given same input
- **Testing**: IO/LOGIC steps can be unit tested; GEN steps need different validation
- **Cost**: GEN steps consume AI tokens; others don't
- **Debugging**: Knowing the type helps isolate failures
- **Parallelization**: IO steps can often run in parallel; GEN steps may have dependencies

### Usage Example

```markdown
**Step A1: Load Configuration [TYPE: IO]**
* **Read:** `{{paths.config}}/shared.json`

**Step A2: Prerequisite Check [TYPE: LOGIC]**
* **Check:** `{{dictionary}}` exists
* **Action:** If missing, STOP execution

**Step B1: Retrieve Work Item [TYPE: CLI]**
* **Command:** `{{cli.ado_get}} {{work_item_id}} --json`

**Step C1: Classify Work Item [TYPE: GEN]**
* **Action:** Analyze work item and determine category
```

## Configuration Loading

**First Step in Every Prompt:**
```
Load: {{paths.config}}/shared.json
```

Where `{{paths.config}}` defaults to `config` but should be passed as a variable.

## Available Variables

### Path Variables (from `paths` in shared.json)
| Variable | Default Value | Description |
|----------|---------------|-------------|
| `{{paths.artifacts_root}}` | `.ai-artifacts` | Work item artifacts |
| `{{paths.scripts}}` | `scripts/workflow` | CLI scripts location |
| `{{paths.prompts}}` | `.github/prompts` | Prompt files |
| `{{paths.config}}` | `config` | Configuration files |
| `{{paths.templates}}` | `config/templates` | Template files |
| `{{paths.standards}}` | `config/standards` | Standards documents |
| `{{paths.state}}` | `.github/state` | Workflow state |

### CLI Command Variables (from `cli_commands` in shared.json)
| Variable | Default Value |
|----------|---------------|
| `{{cli.ado_get}}` | `npx --prefix {{paths.scripts}} ado-tools get` |
| `{{cli.ado_update}}` | `npx --prefix {{paths.scripts}} ado-tools update` |
| `{{cli.ado_create}}` | `npx --prefix {{paths.scripts}} ado-tools create` |
| `{{cli.ado_search}}` | `npx --prefix {{paths.scripts}} ado-tools search` |
| `{{cli.ado_link}}` | `npx --prefix {{paths.scripts}} ado-tools link` |
| `{{cli.ado_relations}}` | `npx --prefix {{paths.scripts}} ado-tools relations` |
| `{{cli.sf_query}}` | `npx --prefix {{paths.scripts}} sf-tools query` |
| `{{cli.sf_describe}}` | `npx --prefix {{paths.scripts}} sf-tools describe` |
| `{{cli.sf_discover}}` | `npx --prefix {{paths.scripts}} sf-tools discover` |
| `{{cli.sf_apex}}` | `npx --prefix {{paths.scripts}} sf-tools apex-classes` |
| `{{cli.sf_triggers}}` | `npx --prefix {{paths.scripts}} sf-tools apex-triggers` |
| `{{cli.sf_flows}}` | `npx --prefix {{paths.scripts}} sf-tools flows` |
| `{{cli.sf_validation}}` | `npx --prefix {{paths.scripts}} sf-tools validation-rules` |
| `{{cli.wiki_get}}` | `npx --prefix {{paths.scripts}} wiki-tools get` |
| `{{cli.wiki_update}}` | `npx --prefix {{paths.scripts}} wiki-tools update` |
| `{{cli.wiki_create}}` | `npx --prefix {{paths.scripts}} wiki-tools create` |
| `{{cli.wiki_list}}` | `npx --prefix {{paths.scripts}} wiki-tools list` |
| `{{cli.wiki_search}}` | `npx --prefix {{paths.scripts}} wiki-tools search` |

### Derived Variables (computed at runtime)
| Variable | Derivation | Description |
|----------|------------|-------------|
| `{{root}}` | `{{paths.artifacts_root}}/{{work_item_id}}` | Work item artifact root |
| `{{research}}` | `{{root}}/research` | Research artifacts |
| `{{grooming}}` | `{{root}}/grooming` | Grooming artifacts |
| `{{solutioning}}` | `{{root}}/solutioning` | Solutioning artifacts |
| `{{finalization}}` | `{{root}}/finalization` | Finalization artifacts |

### Template File Variables
| Variable | Path |
|----------|------|
| `{{templates.user_story}}` | `{{paths.templates}}/user-story-templates.md` |
| `{{templates.bug}}` | `{{paths.templates}}/bug-templates.md` |
| `{{templates.disclaimer}}` | `{{paths.templates}}/field-disclaimer.md` |
| `{{templates.validation}}` | `{{paths.templates}}/validation-checklist.md` |
| `{{templates.solution_design}}` | `{{paths.templates}}/solution-design-template.md` |

## Usage Example

**WRONG (hardcoded):**
```bash
npx --prefix scripts/workflow ado-tools get 258084 --json
```

**CORRECT (variable):**
```bash
{{cli.ado_get}} {{work_item_id}} --json
```

## Run State Management

Every prompt MUST maintain the workflow run state in `{{root}}/run-state.json`.

### Run State Structure
```json
{
  "workItemId": "258084",
  "version": 1,
  "currentPhase": "research|grooming|solutioning|wiki|finalization",
  "phaseOrder": ["research", "grooming", "solutioning", "wiki", "finalization"],
  "completedSteps": [
    {
      "phase": "research",
      "step": "00-organization-dictionary",
      "completedAt": "2026-01-26T00:00:00Z",
      "artifact": ".ai-artifacts/258084/research/00-organization-dictionary.json"
    }
  ],
  "errors": [],
  "metrics": {
    "phases": {
      "research": {
        "stepsCompleted": 10,
        "stepsTotal": 10,
        "startedAt": "2026-01-26T00:00:00Z",
        "completedAt": "2026-01-26T01:00:00Z"
      }
    }
  },
  "lastUpdated": "2026-01-26T01:00:00Z"
}
```

### Run State Rules
1. **First step of first phase** (organization-dictionary): Create run-state.json if missing
2. **Every step**: Add entry to `completedSteps`, increment phase step count
3. **Last step of each phase**: Set phase `completedAt`, advance `currentPhase`
4. **On error**: Add entry to `errors` array with step, error, timestamp

## Standard Prompt Header

Every prompt should include this configuration section:

```markdown
## Configuration
**Load First:** `{{paths.config}}/shared.json`

**Variables Used:**
- Paths: `paths.artifacts_root`, `paths.templates`, `paths.config`
- Commands: `cli_commands.ado_get`, `cli_commands.ado_update`

**Derived:**
- `{{root}}`: `{{paths.artifacts_root}}/{{work_item_id}}`
```
