# GitHub Copilot Instructions – Autonomous Ticket Workflow

This file configures GitHub Copilot for the autonomous ticket preparation workflow.

## Configuration Source

**All paths, CLI commands, and settings are defined in:**
`#file:config/shared.json`

Reference this file to resolve:
- `{{paths.*}}` - Directory paths
- `{{cli.*}}` - CLI commands (from `cli_commands` object)
- `{{artifact_files.*}}` - Output file names
- `{{field_paths.*}}` - ADO field paths
- `{{tags.*}}` - Tag names

## Entry Points

| Task | Prompt |
|------|--------|
| Full workflow | `#file:.github/prompts/phase-01-prepare-ticket.prompt.md` |
| Single phase | See `#file:README.md` |
| Re-run phase | Use `re-phase-*.prompt.md` variants |
| Help | `#file:.github/prompts/util-help.prompt.md` |
| Setup | `#file:.github/prompts/util-setup.prompt.md` |

## Workflow Phases

1. **Initialize** (phase-02) → Creates `{{paths.artifacts_root}}/<id>/` structure
2. **Research** (phase-03) → Gathers context from ADO, Salesforce, wiki, code (sub-phases 03a-03z)
3. **Grooming** (phase-04) → Refines requirements, applies templates
4. **Solutioning** (phase-05) → Designs technical approach
5. **Wiki** (phase-06) → Generates documentation
6. **Finalization** (phase-07) → Updates ADO work item

## Key Principles

1. **Configuration-driven** – Resolve all paths/commands from `shared.json`
2. **CLI-first** – Use TypeScript CLI tools from `scripts/workflow/`
3. **Artifacts persist** – Each phase writes JSON to `.ai-artifacts/<id>/`
4. **Run state tracking** – `run-state.json` tracks progress
5. **Canonical prompts** – All prompts live in `.github/prompts/`

## Explicit Rules

**MANDATORY** – These rules must be followed without exception.

1. **NO RAW SHELL COMMANDS** – Never use raw shell commands (curl, az, git, npm, etc.) in prompts or workflow execution. Always use the TypeScript CLI tools defined in `shared.json` under `cli_commands`. If a CLI command doesn't exist for your need, ask the user before proceeding.

2. **DO NOT MODIFY CLI SCRIPTS** – Never modify files in `scripts/workflow/` unless the user explicitly asks you to. These tools are stable infrastructure. If you need new functionality, propose it and wait for approval.

3. **NO HARDCODED PATHS** – Never hardcode file paths, directory names, or command strings. Always use template variables (`{{paths.*}}`, `{{cli.*}}`) resolved from `shared.json`.

4. **CONFIGURATION IS READ-ONLY** – Do not modify `shared.json` or other config files unless explicitly asked. Treat configuration as stable infrastructure.

5. **FOLLOW ARCHITECTURE** – Before extending this workflow, read `#file:.github/architecture.md` and follow its patterns.

## Step Type Annotations

| Type | Description |
|------|-------------|
| `[TYPE: IO]` | File read/write |
| `[TYPE: CLI]` | Tool execution |
| `[TYPE: API]` | Remote API calls |
| `[TYPE: LOGIC]` | Conditional branching |
| `[TYPE: GEN]` | AI reasoning |

## Resources

- Prompt catalog & CLI reference: `#file:README.md`
- Architecture guide: `#file:.github/architecture.md`
- Configuration: `#file:config/shared.json`
