# Development Closeout

Role: Closeout Coordinator
Mission: Comprehensive ticket closeout that reconciles planned vs. actual, updates all artifacts, ADO fields, and wiki to reflect the final state of development.
Output: Finalized work item, updated wiki, and closeout summary.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Prerequisites
- `{{grooming}}/grooming-result.json` exists
- `{{solutioning}}/solution-design.json` exists
- `{{wiki}}/wiki-metadata.json` exists (contains wiki path for this work item)

## Standard Paths (extension)
| Variable | Value |
|----------|-------|
| `{{closeout}}` | `{{root}}/closeout` |

## Templates
| Type | File |
|------|------|
| Field Mappings | `{{paths.templates}}/{{template_files.field_mappings}}` |
| Field HTML (by work item type) | Same as phase-04-grooming (Description, AC, etc.) |
| Solution Design (HTML) | `{{paths.templates}}/{{template_files.field_solution_design}}` |
| Wiki Format Guide | `{{paths.templates}}/{{template_files.wiki_format}}` |

## Protocol
1. Single ADO update call for all final field changes
2. Preserve investigation trail in wiki; add as-built sections rather than deleting planned content
3. Use `{{tags.dev_complete}}` (Dev-Complete) when updating tags

## Execution

### A: Init
A1 [IO]: Load shared.json
A2 [IO]: Create `{{closeout}}` directory
A3 [IO]: Load all phase artifacts: `{{grooming}}/grooming-result.json`, `{{solutioning}}/solution-design.json`, `{{solutioning}}/technical-spec.md`, `{{solutioning}}/templates-applied.json`, `{{wiki}}/wiki-metadata.json`, `{{wiki}}/generated-content.md` (or path from wiki_metadata)
A4 [CLI]: Get current work item: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A5 [CLI]: Get current wiki content: `{{cli.wiki_get}} --path "{{wiki_path}}" --json` (wiki_path from `{{wiki}}/wiki-metadata.json`)

### B: Developer Questionnaire [GEN]

Ask the developer the following questions and capture answers in structured form. Present current planned state from loaded artifacts where it helps.

**Final Implementation Review:**
- Summarize what was actually built (free-text narrative).
- For each planned component: Was it built as designed, modified, or cut?
- Were any components added that weren't in the original plan?
- What was the actual vs. planned complexity?

**Requirements Reconciliation:**
- For each acceptance criterion: Was it fully met, partially met, or descoped?
- Were any new acceptance criteria added during development?
- Did the business value or goals change?

**Testing and Quality:**
- What testing was performed? (unit, integration, manual, UAT)
- Were all P1 test cases executed? Results?
- Were there test failures that required design changes?
- Code coverage achieved (percentage)?
- Were any test cases from the plan unnecessary or missing?

**Effort and Classification:**
- Final story points (confirm or revise from WSJF estimate).
- Actual effort level vs. estimated (Low/Medium/High).
- Actual risk level vs. estimated.
- For bugs: root cause detail for `Custom.RootCauseDetail`.

**Knowledge Capture:**
- Lessons learned or gotchas for future developers.
- Any follow-up work items needed? (IDs or descriptions)
- Any new related work items to link?
- Assumptions that proved true/false during implementation.

B1 [IO]: Save answers to `{{closeout}}/{{artifact_files.closeout.questionnaire}}`

### C: Delta Analysis [GEN]
C1 [GEN]: Build planned-vs-actual comparison from questionnaire and loaded artifacts.
C2 [IO]: Save to `{{closeout}}/{{artifact_files.closeout.delta}}`

Schema for closeout-delta (conceptual):
- components: [{ name, planned_state, actual_state: "as_designed" | "modified" | "cut" | "added", notes }]
- acceptance_criteria: [{ id, description, status: "fully_met" | "partially_met" | "descoped", notes }]
- scope_changes: { added: [], removed: [], modified: [] }
- testing_actual: { types_performed: [], p1_results: "", coverage_pct: null, design_changes_from_tests: "" }
- effort_final: { story_points, effort_level, risk_level }
- lessons_learned: [], follow_up_work_items: [], assumptions_resolved: []

### D: Update Grooming [GEN + IO]
D1 [GEN]: Regenerate grooming content with final requirements: Description, Acceptance Criteria (reflecting what was actually delivered), Tags (append `{{tags.dev_complete}}`), WorkClassType, RequiresQA. Use field HTML templates from `{{paths.templates}}/` per work item type.
D2 [IO]: Save updated grooming payload to `{{closeout}}/grooming-final.json` (fields only, format suitable for ADO). Do not overwrite `{{grooming}}/grooming-result.json` until after closeout summary; use closeout payload for the single ADO update in G.

### E: Update Solutioning [GEN + IO]
E1 [GEN]: Regenerate solution design with actual components and as-built architecture. Update technical-spec narrative to match what was built.
E2 [IO]: Save updated `solution-design.json` content to `{{closeout}}/solution-design-final.json`
E3 [IO]: Save updated technical spec to `{{closeout}}/technical-spec-final.md`
E4 [GEN]: Build `Custom.DevelopmentSummary` HTML from `{{template_files.field_solution_design}}` with as-built content (business problem, solution approach, technical narrative, key components, integration points).
E5 [IO]: Include DevelopmentSummary in the combined closeout fields payload (see G).

### F: Update Wiki [GEN + CLI]
F1 [IO]: Load current wiki content (from A5).
F2 [GEN]: Produce updated wiki content that:
  - Changes status banner from "Ready for Development" to "Development Complete".
  - Adds **Implementation Reality** section: document actual vs. planned (components, AC outcomes, scope changes).
  - Updates **Solution Design** section to reflect as-built architecture (or add an "As-Built" subsection).
  - Updates **Quality & Validation** with actual test results (types performed, P1 results, coverage, any test-driven design changes).
  - Adds **Lessons Learned** section from questionnaire.
  - Updates **Assumptions Resolution Log** with final statuses (validated/refuted/superseded) from implementation.
  - Updates **Open Unknowns**: resolve any that were answered during development; leave open those still unknown.
F3 [IO]: Save updated wiki markdown to `{{closeout}}/wiki-closeout-content.md`. Follow `{{template_files.wiki_format}}` and existing wiki structure.
F4 [CLI]: `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{closeout}}/wiki-closeout-content.md" --json`
F5 [IO]: Optionally update `{{wiki}}/generated-content.md` and `{{wiki}}/wiki-metadata.json` for local consistency.

### G: Update ADO [CLI]
G1 [IO]: Build single final payload combining:
  - `System.Description` (from D; update if scope changed materially)
  - `Microsoft.VSTS.Common.AcceptanceCriteria` (final AC as delivered)
  - `Custom.DevelopmentSummary` (as-built solution design HTML from E)
  - `System.Tags` (existing tags plus `{{tags.dev_complete}}`; preserve base tags)
  - `Microsoft.VSTS.Scheduling.StoryPoints` (confirmed or revised)
  - `Custom.RootCauseDetail` (bugs only, if provided)
  - `Custom.RequiresQA` (confirmed)
  - `Custom.WorkClassType` (if changed)
Omit fields that are unchanged and should not be overwritten, unless explicitly finalizing.
G2 [IO]: Save payload to `{{closeout}}/{{artifact_files.closeout.fields}}`
G3 [CLI]: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{closeout}}/{{artifact_files.closeout.fields}}" --json`

### H: Closeout Summary [GEN + IO]
H1 [GEN]: Generate narrative completion summary: work item ID, what was built, planned vs. actual summary, artifacts updated, wiki updated, ADO fields updated, lessons learned (brief), follow-up items.
H2 [IO]: Save to `{{closeout}}/{{artifact_files.closeout.summary}}`
H3 [IO]: Optionally update run state or local artifacts (e.g. copy closeout grooming/solutioning into `{{grooming}}` and `{{solutioning}}` for future reference).

## Output
- `{{closeout}}/{{artifact_files.closeout.questionnaire}}`
- `{{closeout}}/{{artifact_files.closeout.delta}}`
- `{{closeout}}/{{artifact_files.closeout.fields}}`
- `{{closeout}}/{{artifact_files.closeout.summary}}`
- `{{closeout}}/grooming-final.json`, `solution-design-final.json`, `technical-spec-final.md`, `wiki-closeout-content.md`
- Wiki page updated with as-built and status
- Work item updated with final fields and `{{tags.dev_complete}}` tag
