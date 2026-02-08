# Util – Research Base (Context7)
Shared patterns for research prompts. Uses unified ticket-context.json.

## Phases
| Phase | Purpose | Prompt |
|-------|---------|--------|
| 02a | Business research → grooming | `phase-02a-grooming-research.prompt.md` |
| 03a | Technical research → solutioning | `phase-03a-solutioning-research.prompt.md` |

## Prerequisites
1. [IO] Verify {{context_file}} exists; load metadata.run_state
2. [LOGIC] Check prerequisite phases in metadata.phases_completed

## Context7 Research Pattern
All research outputs go to {{context_file}}.research.*:
- 02a: organization_dictionary, ado_workitem, similar_workitems, wiki_search, business_context, synthesis
- 03a: salesforce_metadata, web_research (extends synthesis)

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

## Run State Update
After each stream, add to run_state.completed_steps[]:
`{"phase":"research","step":"<stream_name>","completedAt":"<timestamp>","artifact":"{{context_file}}"}`

## CLI Quick Reference (Batch Optimized)
| Action | Command | Batch |
|--------|---------|-------|
| Get work item | `{{cli.ado_get}} {{work_item_id}} --expand All --json` | — |
| Get comments | `{{cli.ado_get}} {{work_item_id}} --comments --json` | — |
| Search wiki | `{{cli.wiki_search}} "{{keywords}}" --json` | — |
| SF describe | `{{cli.sf_describe}} {{obj}} --json` | `--batch` |
| SF discover | `{{cli.sf_discover}} --type {{type}} --name {{name}} --depth 3 --json` | — |
| Search ADO | `{{cli.ado_search}} --text "{{text}}" --top 20 --json` | — |
| SF query | `{{cli.sf_query}} "{{soql}}" --json` | — |
