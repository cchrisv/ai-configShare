# Architecture Reference

Internal architecture of the Autonomous Ticket Workflow. For AI agents and developers.

## 1. System Overview

Autonomous ticket workflow integrating **ADO**, **Salesforce**, and **AI assistants**. Automates: research → grooming → solutioning → wiki → finalization. Each phase produces JSON/Markdown artifacts in `.ai-artifacts/<work_item_id>/`. Phases run sequentially.

| System | Library | Purpose |
|--------|---------|--------|
| Azure DevOps | `azure-devops-node-api` | Work item CRUD, linking, search, wiki |
| Salesforce | `jsforce`, `@salesforce/core` | SOQL, metadata describe, dependencies |
| Auth (ADO) | Azure CLI `az login` | Bearer token via `authAzureCli.ts` |
| Auth (SF) | SF CLI `sf org login web` | Stored connection via `authSalesforceCli.ts` |

---

## 2. Directory Structure

```
project-root/
├── .github/
│   ├── copilot-instructions.md      # AI entry points + CLI docs
│   └── prompts/                     # Phase (phase-XX-*.prompt.md) + utility (util-*.prompt.md) prompts
├── config/
│   ├── shared.json                  # Central config (paths, CLI, tags, templates, artifacts)
│   ├── templates/                   # ADO field HTML + wiki templates (33 files)
│   └── standards/                   # Salesforce dev standards (14 .md + 1 .json)
├── scripts/workflow/
│   ├── cli/                         # CLI entry points (ado-tools, sf-tools, wiki-tools, workflow-tools, report-tools)
│   └── src/                         # Shared modules (clients, operations, auth, config, types)
├── force-app/                       # Salesforce source
└── .ai-artifacts/                   # Runtime artifacts (gitignored, per work item)
```

---

## 3. Configuration System (`config/shared.json`)

Single source of truth for paths, CLI commands, field mappings, tags, templates, artifacts. Read-only by prompts/CLI.

**Key sections:** `version` · `project` · `ado_defaults` · `sf_defaults` · `paths` (directory paths) · `cli_commands` (27 CLI strings) · `work_item_types` · `field_paths` (27 ADO field mappings) · `flow_health` (stalled work thresholds, severity indicators) · `tags` (9 workflow tags) · `template_files` (33 templates) · `artifact_files` (per-phase filenames) · `retry_settings` · `logging`

**Prompt consumption:** `#file:config/shared.json` → template variables:

| Pattern | Example |
|---------|---------|
| `{{cli.<key>}}` | `{{cli.ado_get}}` → `npx --prefix scripts/workflow ado-tools get` |
| `{{paths.<key>}}` | `{{paths.artifacts_root}}` → `.ai-artifacts` |
| `{{artifact_files.<phase>.<key>}}` | `{{artifact_files.research.ado_workitem}}` → `01-ado-workitem.json` |
| `{{field_paths.<key>}}` | `{{field_paths.title}}` → `System.Title` |
| `{{tags.<key>}}` | `{{tags.refined}}` → `AI-Refined` |
| `{{template_files.<key>}}` | `{{template_files.wiki_page_template}}` → `wiki-page-template.html` |
| `{{flow_health.<key>}}` | `{{flow_health.warning_days}}` → `3` |

Composite: `{{paths.artifacts_root}}/{{work_item_id}}/research/{{artifact_files.research.ado_workitem}}`

**TypeScript:** `configLoader.ts` provides `loadSharedConfig()`, `getCliCommand()`, `getTemplatePath()`, `getPromptPath()`, `getStandardPath()`, `resolveTemplate()`. Types in `configTypes.ts`.

**Rules:** all paths relative to project root · never hardcode · `npx --prefix scripts/workflow <tool> <command>` pattern · backward compatible · increment `version` on structural changes.

---

## 4. Phase System

| Phase | Name | Purpose |
|-------|------|---------|
| 01 | Initialize | Prepare work item directory, run-state |
| 02a | Grooming Research | Business context (ADO, wiki, similar items) |
| 02b | Grooming | Requirements (what/why) → ADO |
| 03a | Solutioning Research | Technical context (deps, code, web) |
| 03b | Solutioning | Solution design (how) |
| 04 | Wiki | Generate wiki documentation |
| 05 | Finalize | Completion summary, WSJF, final ADO |
| 06 | Closeout | Post-dev delta analysis (standalone) |

**Flow:** 01 → 02a → 02b → 03a → 03b → 04 → 05. Standalone (06) runs independently post-handoff. Utilities (`util-grooming-update`, `util-solutioning-update`) run independently at any time.

**Content separation:** What/Why (02b, `util-grooming-update`) → Description, Acceptance Criteria · How (03b, `util-solutioning-update`) → DevelopmentSummary, SFComponents. Never cross-write.

**Utilities:** `util-base` (shared vars, guardrails) · `util-research-base` (research schema) · `util-grooming-update` (dev updates to requirements) · `util-solutioning-update` (dev updates to solution) · `util-help` · `util-repeat-phase` · `util-feature-solution-design` (Feature/Epic aggregation) · `util-reformat-ticket` · `util-sequence-tickets` · `util-update-feature-progress` (Feature flow health + progress fields)

**Run state** (`run-state.json`): `workItemId`, `currentPhase`, `completedSteps[]` (phase, step, completedAt, artifact), `errors[]`. Updated after each phase. Read via `workflow-tools status`, reset via `workflow-tools reset`.

---

## 5. Prompt Architecture

**Inheritance:** `shared.json` → `util-base.prompt.md` → all prompts. `util-research-base.prompt.md` → research phases (02a, 03a).

**`util-base` provides:** path variables (`{{root}}`, `{{research}}`, etc.) · guardrails · step annotations (`[IO]`, `[CLI]`, `[API]`, `[LOGIC]`, `[GEN]`) · run state schema · CLI reference.

**`util-research-base` adds:** prerequisite checks · artifact schema · rolling synthesis · feedback loops.

**Standard structure:** `# Phase Name` → Role/Mission → Config (Base + Load + Input) → Prerequisites `[IO]` → Steps → Output.

**File references:** `#file:config/shared.json` injects file contents into prompt context (GitHub Copilot/Cursor).

**Guardrails (all prompts):** NO COMMENTS to ADO · CLI-ONLY (from `shared.json`) · NO HARDCODED PATHS (`{{paths.*}}`) · CONFIG READ-ONLY · LOAD CONFIG FIRST.

---

## 6. CLI Tools

| Tool | Commands | Purpose |
|------|----------|---------|
| `ado-tools` | get, update, create, search, link, unlink, relations | ADO work items |
| `sf-tools` | query, describe, discover, apex-classes, apex-triggers, flows, validation-rules, custom-objects | SF query/metadata |
| `wiki-tools` | get, update, create, search, list, delete | ADO wiki |
| `workflow-tools` | prepare, status, reset | Workflow lifecycle |
| `report-tools` | activity | Activity reports |

**Invocation:** `npx --prefix scripts/workflow <tool> <command> [options] --json`. `--json` for structured output · `-v` for debug.

**Batch:** `sf-tools describe Account,Contact,Opportunity --batch --json` (parallel). Batch-capable: `describe`, `discover`, `validation-rules`.

**Build:** `cd scripts/workflow && npm run build` (tsup → ESM). Test: `npm test` (vitest).

**Modules:** CLI entry points (`cli/`) → Operations (`adoWorkItems.ts`, `sfMetadataDescriber.ts`, etc.) → Clients (`adoClient.ts`, `sfClient.ts`) → Lib (`auth*.ts`, `configLoader.ts`, `retryWithBackoff.ts`).

---

## 7. Template System

Templates in `config/templates/`, registered in `shared.json.template_files`.

| Category | Pattern | Count |
|----------|---------|-------|
| ADO field HTML | `field-<type>-<field>.html` | 15 |
| Wiki pages | `wiki-*-template.html` | 3 |
| Content guides | `<type>-templates.md` | 5 |
| Solution design | `*-template.md` | 2 |
| Reference/schemas | various | 5 |

**Field templates:** per work item type (User Story, Bug, Feature) + shared (solution-design, release-notes, blockers, progress).

**Reference:** prompts use `{{paths.templates}}/{{template_files.<key>}}` · TypeScript uses `getTemplatePath(name)`.

---

## 8. Standards System

Salesforce dev standards in `config/standards/*.md`. Referenced in prompts via `#file:config/standards/<filename>`. No `shared.json` registration needed.

| Standard | Scope |
|----------|-------|
| `apex-well-architected.md` | Apex patterns, SOLID, testing |
| `lwc-well-architected.md` | LWC atomic design, naming |
| `flow-well-architected.md` | Flow principles, error handling |
| `flow-naming-conventions.md` | Flow element naming |
| `flow-subflow-usage.md` | Subflow patterns |
| `trigger-actions-framework-standards.md` | Metadata-driven triggers |
| `async-processing-standards.md` | Queueable, Batch, MAS, Step Framework |
| `event-driven-architecture-standards.md` | Platform Events, CDC, Pub/Sub |
| `nebula-logger-standards.md` | Logging patterns |
| `feature-flags-standards.md` | Feature flags |
| `profiles-permissions-standards.md` | Security model |
| `metadata-naming-conventions.md` | Object/field/layout naming |
| `code-complexity-standards.md` | CC/CoC thresholds, PMD |
| `organization-dictionary.json` | Acronyms, terms, departments |

---

## 9. Artifact System

```
.ai-artifacts/<work_item_id>/
├── run-state.json
├── research/          # 00-org-dict, 01-ado-workitem, 02-wiki, 03a-deps, 04-similar, 05-business, 06-code, 07-web, research-summary, assumptions
├── grooming/          # grooming-result.json
├── solutioning/       # solution-design.json, technical-spec.md
├── wiki/              # generated-content.md, wiki-metadata.json
├── finalization/       # completion-summary.md, wsjf-evidence.json
├── closeout/          # questionnaire, delta, fields, summary
├── dev-updates/       # Timestamped logs (02c/03c)
├── solution-design/   # util-feature-solution-design outputs
├── sequencing/        # util-sequence-tickets outputs
└── reformat/          # util-reformat-ticket outputs
```

**Lifecycle:** prepare → research → grooming → solutioning → wiki → finalization. Each phase overwrites its artifacts (idempotent).

**Schema (all research artifacts):** `workItemId`, `generatedAt` (ISO 8601), `research_complete` (bool), `feedback_loops[]`.

Artifacts are **gitignored** and ephemeral. `workflow-tools reset` cleans up.

---

## 10. Extension Guide

| Action | Steps | Update |
|--------|-------|--------|
| **New Phase** | Create `phase-XX-<name>.prompt.md` (standard structure) · register artifacts in `shared.json` | `util-repeat-phase`, `util-help`, `copilot-instructions.md`, `README.md` |
| **New Research Stream** | Add to `phase-02a` or `phase-03a` · register in `shared.json` → `artifact_files.research` (next number prefix) | `util-research-base` table |
| **New Utility Prompt** | Create `util-<name>.prompt.md` · register artifacts if applicable | `util-help`, `copilot-instructions.md`, `README.md` |
| **New CLI Command** | Add handler in `cli/<tool>-tools.ts` · add modules in `src/` · register in `shared.json` → `cli_commands` · rebuild | `copilot-instructions.md`, `README.md` |
| **New Template** | Create in `config/templates/` (naming: `field-<type>-<field>.html` / `wiki-<purpose>-template.html`) · register in `shared.json` → `template_files` | — |
| **New Standard** | Create `config/standards/<topic>.md` · reference in prompts via `#file:` | No `shared.json` registration |
| **New Config Section** | Add to `shared.json` · update `configTypes.ts` · optionally `configLoader.ts` · never rename/remove keys · increment `version` | — |

---

## 11. Conventions and Rules

### File Naming

| Category | Convention |
|----------|----------|
| Phase prompts | `phase-XX-<name>.prompt.md` |
| Utility prompts | `util-<name>.prompt.md` |
| Field templates | `field-<type>-<field>.html` |
| Wiki templates | `wiki-<purpose>-template.html` |
| Standards | `<topic>-standards.md` or `<topic>-well-architected.md` |
| CLI tools | `<tool>-tools.ts` |
| Research artifacts | `NN-<name>.json` |

### Template Variables

All snake_case. Computed paths: `{{root}}` = `{{paths.artifacts_root}}/{{work_item_id}}` · `{{research}}` = `{{root}}/research` · etc.

### Guardrails

1. **NO COMMENTS** to ADO unless explicitly requested
2. **CLI-ONLY** from `shared.json` — no raw `curl`, `az`, `git`, `npm`, `sf`
3. **NO HARDCODED PATHS** — use `{{paths.*}}` and `{{template_files.*}}`
4. **CONFIG READ-ONLY** — don't modify `shared.json`/CLI/templates unless asked
5. **LOAD CONFIG FIRST** — always load `shared.json` at phase start

### Research Feedback Loops

5 triggers: New Topic · Evidence Gap · Contradiction · High-Value · Missing Context. Max 3 iterations/step. High=immediate · Medium=queue · Low=document.

### Other Rules

- **Idempotent** — re-running overwrites artifacts · `workflow-tools reset --phase <phase>` to clear
- **Error handling** — failures in `run-state.json.errors[]` · fail-fast · recover via `util-repeat-phase`
- **Auth** — ADO: `az login` → `authAzureCli.ts` → bearer token. SF: `sf org login web` → `authSalesforceCli.ts`.
- **Org dictionary** — `organization-dictionary.json`: 50+ acronyms, 60+ terms, departments. Loaded by phase 02a.
