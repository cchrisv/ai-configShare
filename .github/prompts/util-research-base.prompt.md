# Util – Research Base
Shared patterns for research prompts. Uses unified ticket-context.json.

## Phases
| Phase | Purpose | Prompt |
|-------|---------|--------|
| 01 | Business research → grooming | `ticket-grooming-phase-01-research.prompt.md` |
| 03 | Technical research → solutioning | `ticket-grooming-phase-03-solutioning-research.prompt.md` |

## Prerequisites
1. [IO] Verify {{context_file}} exists; load metadata.run_state
2. [LOGIC] Check prerequisite phases in metadata.phases_completed

## Unified Context Research Pattern
All research outputs go to {{context_file}}.research.*:
- 01 (research): organization_dictionary, ado_workitem (scope_context, domain_keywords), similar_workitems, wiki_search, business_context, solutioning_investigation (assumptions_to_validate, questions_for_solutioning, unknowns, scope_risks), synthesis (what_requested, why_it_matters, who_affected, scope_boundaries, open_questions)
- 03 (solutioning research): salesforce_metadata, dependency_discovery (extends synthesis)

## Rolling Synthesis
After each stream:
1. Update .research.synthesis.unified_truth
2. Update .research.assumptions[] (ID, category, confidence, source)
3. Continue to next stream with cumulative context

## Feedback Loop
Triggers (max 3 iterations/stream):
- New Topic/Component → revisit
- Evidence Gap → fill
- Contradiction → resolve
- High-Impact → validate
- Missing Context → investigate

Log to .research.synthesis.conflict_log[]

## Comment Mining Taxonomy
When processing work item comments, classify each by `context_type`:

| Type | Signal Patterns | Priority |
|------|----------------|----------|
| `decision` | "decided to", "agreed that", "approved", "going with", "final answer" | 1 (highest) |
| `meeting_transcript` | "meeting notes", "transcript", "discussed in", "action items", "attendees" | 2 |
| `requirement_change` | "changed to", "new requirement", "descoped", "added scope", "revised" | 3 |
| `blocker` | "blocked by", "waiting on", "dependency on", "cannot proceed" | 4 |
| `question` | "question:", "asking about", "need clarification", "does anyone know" | 5 |
| `status_update` | "completed", "in progress", "started", "finished", "deployed" | 6 |
| `general` | (none of the above) | 7 (lowest) |

**Priority:** decisions > transcripts > requirement changes > blockers > questions > status updates > general.
When summarizing, always lead with decisions and transcripts.

## Salesforce Org Selection (MANDATORY)
Before executing ANY `sf-tools` command (`sf_query`, `sf_describe`, `sf_discover`, `sf_apex`, `sf_apex_triggers`, `sf_flows`, `sf_validation`), the workflow MUST determine which Salesforce org to target. **NEVER assume a default org.**

1. [LOGIC] Check if `{{context_file}}.run_state.sf_org` is already set (from a prior stream/phase). If set → use it, skip to step 4.
2. [CLI] Run `sf org list --json` → display the list of authenticated orgs to the user
3. [ASK] Ask the user: "Which Salesforce org should I use for this work item?" — present the aliases from the org list
4. [IO] Store the selected alias → `{{context_file}}.run_state.sf_org`
5. [IO] Save {{context_file}} to disk
6. Pass `--org {{sf_org}}` to ALL subsequent `sf-tools` commands in this and future phases

**If no orgs are authenticated** → inform the user and **SKIP** all Salesforce streams. Log skip reason to `run_state.errors[]`.

## Run State Update
After each stream, add to run_state.completed_steps[]:
`{"phase":"research","step":"<stream_name>","completedAt":"<timestamp>","artifact":"{{context_file}}"}`

## CLI Quick Reference (Batch Optimized)
| Action | Command | Batch |
|--------|---------|-------|
| Get work item | `{{cli.ado_get}} {{work_item_id}} --expand All --comments --json` | — |
| Get comments | `{{cli.ado_get}} {{work_item_id}} --comments --json` | — |
| Search wiki | `{{cli.wiki_search}} "{{keywords}}" --json` | — |
| SF org list | `sf org list --json` | — |
| SF describe | `{{cli.sf_describe}} {{obj}} --org {{sf_org}} --json` | `--batch` |
| SF discover | `{{cli.sf_discover}} --type {{type}} --name {{name}} --depth 3 --org {{sf_org}} --json` | — |
| Search ADO | `{{cli.ado_search}} --text "{{text}}" --all --json` | — |
| SF query | `{{cli.sf_query}} "{{soql}}" --org {{sf_org}} --json` | — |
