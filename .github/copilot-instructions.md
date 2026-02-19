# GitHub Copilot Instructions – Autonomous Ticket Workflow

## Config
`#file:config/shared.json` (paths, CLI, settings) · `#file:.github/prompts/util-base.prompt.md` (definitions)

## Unified Context Pattern
Single `ticket-context.json` per work item - progressive growth through phases. NO separate artifacts.
Schema: `#file:config/templates/ticket-context-schema.json`

## Rules
1. **Interactive questions** – when you need to ask the user a question (clarify intent, choose between options, confirm a decision), you MUST use the interactive question tool. NEVER ask questions via plain text in chat. Always present choices as structured options so the user can select quickly.
2. **CLI-only** – use CLI tools; NEVER raw shell (curl, az, git, npm)
3. **No script edits** – never modify `scripts/workflow/` without explicit request
4. **No hardcoded paths** – use `{{paths.*}}`, `{{cli.*}}` (from `cli_commands`) from shared.json
5. **Config read-only** – never modify shared.json unless asked
6. **No comments** – never post to work items unless requested
7. **Unified context only** – ALWAYS use {{root}}/ticket-context.json; NEVER separate artifacts
8. **Template-verbatim HTML** – when generating HTML for any ADO field with a template in `config/templates/`, COPY the template file character-for-character and ONLY replace `{{variable}}` tokens. NEVER write HTML tags or CSS from memory. Omit entire repeatable blocks when no data exists.
9. **Comments by default** – when fetching work items for context, ALWAYS include `--comments` unless the prompt explicitly states comments are not needed (e.g., formatting-only operations)

## Entry Points

| Task | Prompt |
|------|--------|
| Research (init + business research) | `#file:.github/prompts/ticket-grooming-phase-01-research.prompt.md` |
| Grooming | `#file:.github/prompts/ticket-grooming-phase-02-grooming.prompt.md` |
| Grooming update (dev) | `#file:.github/prompts/util-grooming-update.prompt.md` |
| Solutioning research | `#file:.github/prompts/ticket-grooming-phase-03-solutioning-research.prompt.md` |
| Solutioning | `#file:.github/prompts/ticket-grooming-phase-04-solutioning.prompt.md` |
| Solutioning update (dev) | `#file:.github/prompts/util-solutioning-update.prompt.md` |
| Finalization | `#file:.github/prompts/ticket-grooming-phase-05-finalization.prompt.md` |
| Dev closeout | `#file:.github/prompts/ticket-grooming-phase-06-dev-closeout.prompt.md` |
| Feature/Epic solution design | `#file:.github/prompts/util-feature-solution-design.prompt.md` |
| Apply template (reformat) | `#file:.github/prompts/util-apply-template.prompt.md` |
| Sequence tickets | `#file:.github/prompts/util-sequence-tickets.prompt.md` |
| Activity report | `#file:.github/prompts/util-activity-report.prompt.md` |
| Team members | `#file:.github/prompts/util-team-members.prompt.md` |
| Update feature progress | `#file:.github/prompts/util-update-feature-progress.prompt.md` |
| Re-run phase | `#file:.github/prompts/util-repeat-phase.prompt.md` |
| PR analysis | `#file:.github/prompts/util-pr-analysis.prompt.md` |
| Submit feedback | `#file:.github/prompts/util-feedback.prompt.md` |
| Help | `#file:.github/prompts/util-help.prompt.md` |
| Setup | `#file:.github/prompts/util-setup.prompt.md` |

## Phases
**01 Research:** init + business research
**02 Grooming:** refine requirements (what/why)
**03 Solutioning Research:** technical research (SF metadata, dependencies)
**04 Solutioning:** solution design (how)
**05 Finalization:** WSJF scoring, ADO links
**06 Dev Closeout:** planned vs actual, release notes
**Feature/Epic:** `util-feature-solution-design` — aggregate children into solution design
**Utilities:** `util-grooming-update` · `util-solutioning-update` · `util-apply-template` · `util-sequence-tickets` · `util-activity-report` · `util-team-members` · `util-update-feature-progress` · `util-repeat-phase` · `util-pr-analysis` · `util-feedback` · `util-help` · `util-setup`

## Folder Structure
`.github/prompts/` — prompt definitions · `config/shared.json` — master config · `config/templates/` — ADO field HTML templates · `config/standards/` — dev standards · `scripts/workflow/` — TypeScript CLI tools
`.ai-artifacts/{id}/ticket-context.json` — UNIFIED context file (replaces all phase artifacts)
`.ai-artifacts/reports/` — activity report CSVs

## CLI Tools

All commands: `npx --prefix scripts/workflow <tool> <command>`. All support `--json` output and `-v` verbose. Use `{{cli.*}}` variables.

### workflow-tools
| Command | Syntax |
|---------|--------|
| prepare | `{{cli.workflow_prepare}} -w <id> [--force] --json` |
| status | `{{cli.workflow_status}} -w <id> --json` |
| reset | `workflow-tools reset -w <id> [--phase <phase>] --force --json` |

Reset sections: `research`, `grooming`, `solutioning`, `finalization`, `dev_updates`, `closeout` (clears section in ticket-context.json + rewinds metadata)

### ado-tools
| Command | Syntax |
|---------|--------|
| get | `{{cli.ado_get}} <id> [--expand All\|Relations\|Fields] [--comments] [--fields <csv>] --json` ← **include `--comments` for context-gathering calls** |
| update | `{{cli.ado_update}} <id> [field options] --json` |
| create | `{{cli.ado_create}} <type> --title "<title>" [--parent <id>] [--area <path>] [--iteration <path>] [--assigned-to <user>] [--tags <csv>] --json` |
| search | `{{cli.ado_search}} [--text "<keyword>"] [--type "<type>"] [--state "<state>"] [--wiql "<wiql>"] [--top <n>] --json` |
| link | `{{cli.ado_link}} <sourceId> <targetId> --type <linkType> [--comment "<text>"] --json` |
| unlink | `{{cli.ado_unlink}} <sourceId> <targetId> --type <linkType> --json` |
| relations | `{{cli.ado_relations}} <id> [--type <types>] --json` |

**Link types:** `parent`, `child`, `related`, `predecessor`, `successor`

**Update options:**
`--title` · `--description` (or `--description-file`) · `--state` (New/Active/Resolved/Closed) · `--tags` (semicolon-separated) · `--ac` / `--ac-file` (AcceptanceCriteria) · `--repro-steps` / `--repro-steps-file` (bugs) · `--system-info` / `--system-info-file` (bugs) · `--story-points` · `--priority <1-4>` · `--work-class` · `--requires-qa <Yes|No>` · `--field <path> --value <val>` (or `--value-file`) · `--fields-file <json>` (bulk: `{"fields":{...}}`) · `--comment`

### sf-tools
**Org selection required:** Before any `sf-tools` call, run `sf org list --json` and ask the user which org to use. Store the alias in `{{context_file}}.run_state.sf_org` and pass `--org {{sf_org}}` to ALL commands. NEVER assume a default org.

| Command | Syntax |
|---------|--------|
| query | `{{cli.sf_query}} "<SOQL>" [--tooling] [--all] --org <alias> --json` |
| describe | `{{cli.sf_describe}} <objectName> [--field <name>] [--fields-only] [--batch] --org <alias> --json` |
| discover | `{{cli.sf_discover}} --type <metadataType> --name <name> [--depth <n>] [--include-standard] [--batch] --org <alias> --json` |
| apex-classes | `{{cli.sf_apex}} [--pattern <pattern>] --org <alias> --json` |
| apex-triggers | `{{cli.sf_apex_triggers}} [--object <name>] --org <alias> --json` |
| validation-rules | `{{cli.sf_validation}} <objectName> [--all] [--batch] --org <alias> --json` |
| flows | `{{cli.sf_flows}} [--object <name>] [--all] --org <alias> --json` |
| custom-objects | `sf-tools custom-objects --org <alias> --json` |

**Batch** (describe, discover, validation-rules): comma-separated names or `--batch` → parallel execution, returns `[{objectName, success, data/error}]`

### wiki-tools
| Command | Syntax |
|---------|--------|
| get (by path) | `{{cli.wiki_get}} --path "<pagePath>" --json` |
| get (by ID) | `{{cli.wiki_get_by_id}} <pageId> --json` |
| update (by path) | `{{cli.wiki_update}} --path "<pagePath>" --content "<fileOrText>" --json` |
| update (by ID) | `{{cli.wiki_update_by_id}} <pageId> --content "<fileOrText>" --json` |
| create | `{{cli.wiki_create}} --path "<pagePath>" --content "<fileOrText>" --json` |
| search | `{{cli.wiki_search}} "<query>" --json` |
| list | `{{cli.wiki_list}} [--path <basePath>] --json` |
| delete | `{{cli.wiki_delete}} --path "<pagePath>" --force` |

**Page ID vs Path:** use `--page-id` (PATCH, update-only) for existing pages; `--path` (PUT, create-or-update) otherwise.

### pr-tools
| Command | Syntax |
|---------|--------|
| get | `{{cli.pr_get}} [<prId> --repo <id>] [--url <fullUrl>] --json` |
| diff | `{{cli.pr_diff}} [<prId> --repo <id>] [--url <fullUrl>] [--file <path>] [--max-files <n>] [--mode <mode>] [--no-content] --json` |
| threads | `{{cli.pr_threads}} [<prId> --repo <id>] [--url <fullUrl>] --json` |
| work-items | `{{cli.pr_work_items}} [<prId> --repo <id>] [--url <fullUrl>] --json` |
| list | `{{cli.pr_list}} --work-item <id> --json` |

All commands accept either `<prId> --repo <repoIdOrName>` or `--url <fullPrUrl>` for convenience (except `list` which uses `--work-item`).

**Diff modes:** `context` (default) = sourceContent + unifiedDiff; `full` = source + target + diff; `diff-only` = only unified diff

### report-tools
`{{cli.report_activity}} -p "Name|email" [-p ...] [-d <days>] [--start <YYYY-MM-DD> --end <YYYY-MM-DD>] [-o <dir>] [--sf-org <alias>] --json`
Options: `-d` days (default 30) · `--start` / `--end` explicit date range (use for bounded historical periods like "month of January") · `-o` output dir · `--no-wiki` · `--no-prs` · `--sf-org <alias>` (SF login/metadata activity) · `-q` quiet · `-v` verbose

### team-tools
`{{cli.team_discover}} [--leader <email>] [--department] [--salesforce] [--markdown] [-o <dir>] --json`
Options: `-l, --leader <email>` root tree at leader (team-centric, deterministic) · `-d, --department` include department · `-s, --salesforce` enrich with SF User data (Profile, Role, Username, FederationId, UMUC_Department__c) · `--markdown` export Markdown with Mermaid org chart · `-o` output dir · `-q` quiet · `-v` verbose
Output: CSV + JSON always generated to `{{paths.reports}}`. Service accounts and disabled users filtered automatically.

## Extending
**New CLI command:** add to `scripts/workflow/cli/{tool}-tools.ts` → register in `shared.json` `cli_commands` → `npm run build`
**New phase:** create `ticket-grooming-phase-XX-{name}.prompt.md` → register in `shared.json` `artifact_files.{phase}` → update `util-help`, `copilot-instructions`, `README`
