# Development Closeout

Role: Closeout Coordinator
Mission: Comprehensive ticket closeout that reconciles planned vs. actual using evidence from ADO, wiki, pull requests, and Salesforce; updates all artifacts, ADO fields, and wiki to reflect the final state of development. All open assumptions and unknowns must be resolved. The final wiki must clearly separate what/why (grooming) from how (solution) and document end-to-end flow and previous state vs current state.
Output: Finalized work item, updated wiki, and closeout summary.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}`

## Content Discipline: What/Why vs How
- **Grooming (what & why):** Description, Acceptance Criteria, Tags, and classification express *what* we need to deliver and *why* it matters — requirements and business value only. No implementation detail or "how" in these fields.
- **Solutioning (how):** Solution design and `Custom.DevelopmentSummary` express *how* we built it — architecture, components, technical approach. Keep what/why out of the technical narrative; reference business goals only to motivate the design.
- **Wiki:** The wiki must clearly communicate this separation: sections that state requirements and business outcomes (what/why) must be distinct from sections that describe architecture and implementation (how). Readers should be able to understand "what we committed to" vs "how we did it" at a glance.

## Prerequisites
- None. This phase does not require local artifact files from prior phases. It fetches the current ticket and wiki from ADO and gathers evidence from linked PRs, Salesforce audit trail, and metadata.

## Standard Paths (extension)
| Variable | Value |
|----------|-------|
| `{{closeout}}` | `{{root}}/closeout` |
| `{{root}}` | `{{paths.artifacts_root}}/{{work_item_id}}` |

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
4. At closeout, all assumptions must have a final status (Validated, Refuted, or Superseded); no assumption may remain "Open". All open unknowns must be Resolved, Deferred (with follow-up work item), or Accepted (risk accepted).

## Execution

### A: Init
A1 [IO]: Load `#file:config/shared.json`
A2 [IO]: Create `{{closeout}}` directory
A3 [CLI]: Fetch current work item: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A4 [CLI]: Find wiki page: `{{cli.wiki_search}} "{{work_item_id}}" --json`; if pages found, pick the matching path. If none found, try `{{cli.wiki_list}} --path "/WorkItems" --json` and match by path pattern. Set `{{wiki_path}}` to the discovered path.
A5 [CLI]: If `{{wiki_path}}` is set: `{{cli.wiki_get}} --path "{{wiki_path}}" --json`; else proceed without wiki (graceful degradation).
A6 [LOGIC]: Extract current state from ADO fields and wiki content (this replaces loading local JSON artifacts). Parse wiki for planned solution design, components, acceptance criteria, Assumptions Resolution Log, and Open Unknowns.
A7 [IO]: If present, load any `{{root}}/dev-updates/{{artifact_files.dev_updates.log_prefix}}-*.json` (optional; from Phase-08 runs) for incremental context.

### B: Comprehensive Evidence Gathering
B1 [CLI]: Fetch PRs linked to the work item: `{{cli.ado_relations}} {{work_item_id}} --json`. Filter for ArtifactLink types referencing pull requests. Where possible, obtain PR details (title, description, status). Ask developer to confirm the list and identify any sandbox-only changes not in PRs.
B2 [CLI]: Query Salesforce audit trail via `{{cli.sf_query}}` (SOQL) with a broader date range than Phase-08 (e.g. LAST_N_DAYS:90 or since work item creation). Filter or annotate results relevant to components in the wiki or work item.
B3 [CLI]: Run `{{cli.sf_discover}}` (and/or `{{cli.sf_describe}}`) on all Salesforce components mentioned in the wiki or work item to capture current as-built dependency graph and metadata. Compare against the planned architecture in the wiki's Solution Design section.
B4 [LOGIC]: From the work item payload (A3), extract revision/change history if available (e.g. from relations or expand options). Use this to understand how the ticket evolved during development.
B5 [GEN]: Compile comprehensive evidence summary: PRs (with details), SF audit trail (relevant subset), SF as-built state vs. planned, and any ADO change timeline. Produce a planned-vs-actual comparison based on automated findings.

### C: Assumptions and Unknowns Resolution (Final)
At closeout, **all** assumptions and unknowns must be resolved. No assumption may remain "Open".

C1 [GEN]: Parse wiki content (from A5) to extract all assumptions from the Assumptions Resolution Log and all open unknowns from the Open Unknowns section.
C2 [GEN]: Cross-reference each assumption and unknown against all gathered evidence (PRs, SF audit trail, SF current state, ADO history).
C3 [GEN]: Auto-resolve assumptions where evidence is conclusive: e.g. SF metadata confirms a planned component exists as described → Validated; PR shows a different approach than assumed → Refuted with evidence; audit trail confirms configuration as planned → Validated.
C4 [GEN]: For assumptions/unknowns that cannot be auto-resolved, present to the developer with evidence context and require a resolution status. At closeout, every assumption must be set to Validated, Refuted, or Superseded (not Open).
C5 [GEN]: For open unknowns, determine resolution: **Resolved** (with answer), **Deferred** (moved to follow-up work item; document the work item ID or description), or **Accepted** (risk accepted without resolution; document rationale).
C6 [IO]: Compile final assumptions resolution table and unknowns resolution table for the wiki update. Save to `{{closeout}}/assumptions-resolution-final.json` and `{{closeout}}/unknowns-resolution-final.json` (or a single combined artifact) for use in section H.

### D: Developer Questionnaire [GEN]
Present the evidence summary and ask only for:

- Confirmation or correction of automated findings
- Resolution of any remaining unresolved assumptions/unknowns from section C (until none are left Open)
- Context that cannot be inferred: lessons learned, effort assessment, test results
- Identification of sandbox-only changes not captured in PRs or audit trail
- Follow-up work items needed (IDs or descriptions)

D1 [IO]: Save answers to `{{closeout}}/{{artifact_files.closeout.questionnaire}}`

### E: Delta Analysis [GEN + IO]
E1 [GEN]: Build planned-vs-actual comparison from questionnaire, evidence summary, and resolved assumptions/unknowns.
E2 [IO]: Save to `{{closeout}}/{{artifact_files.closeout.delta}}`

Schema for closeout-delta (conceptual):
- components: [{ name, planned_state, actual_state: "as_designed" | "modified" | "cut" | "added", notes }]
- acceptance_criteria: [{ id, description, status: "fully_met" | "partially_met" | "descoped", notes }]
- scope_changes: { added: [], removed: [], modified: [] }
- testing_actual: { types_performed: [], p1_results: "", coverage_pct: null, design_changes_from_tests: "" }
- effort_final: { story_points, effort_level, risk_level }
- lessons_learned: [], follow_up_work_items: []
- assumptions_resolved: [{ assumption, status: "Validated"|"Refuted"|"Superseded", resolution_evidence }]
- unknowns_resolved: [{ unknown, resolution: "Resolved"|"Deferred"|"Accepted", detail }]

### F: Update Grooming [GEN + IO]
F1 [GEN]: Regenerate grooming content with final requirements: Description, Acceptance Criteria (reflecting what was actually delivered), Tags (append `{{tags.dev_complete}}`), WorkClassType, RequiresQA. Keep all content in **what/why** terms only — what we delivered and why it matters; no implementation or "how". Use field HTML templates from `{{paths.templates}}/` per work item type. Source baseline from live ADO fields (from A3), not local files.
F2 [IO]: Save updated grooming payload to `{{closeout}}/grooming-final.json` (fields only, format suitable for ADO). Use this in the single ADO update in section J.

### G: Update Solutioning [GEN + IO]
G1 [GEN]: Regenerate solution design with actual components and as-built architecture from evidence (SF current state, PRs, questionnaire). Update technical-spec narrative to match what was built. Keep content in **how** terms — architecture, components, technical approach; reference what/why only to motivate the design.
G2 [IO]: Save updated solution-design content to `{{closeout}}/solution-design-final.json`
G3 [IO]: Save updated technical spec to `{{closeout}}/technical-spec-final.md`
G4 [GEN]: Build `Custom.DevelopmentSummary` HTML from `{{template_files.field_solution_design}}` with as-built content (business problem, solution approach, technical narrative, key components, integration points). Keep DevelopmentSummary focused on how the solution was built.
G5 [IO]: Include DevelopmentSummary in the combined closeout fields payload (see J).

### H: Update Wiki [GEN + CLI]
H1 [GEN]: Use current wiki content from A5 (live fetch). Produce updated wiki content that clearly communicates **what/why vs how**, **end-to-end flow**, and **previous state vs current state**:

**What/Why vs How (clear separation):**
  - Keep **What we need to deliver** / **Why it matters** (requirements, business value, acceptance outcomes) in distinct sections — e.g. Business Context, What We Need to Deliver, Acceptance Criteria. No implementation detail in these.
  - Keep **How we built it** (architecture, components, technical approach) in the Solution Design and As-Built sections. Readers should be able to see "what we committed to" (what/why) vs "how we did it" (how) at a glance.

**End-to-end flow:**
  - Add or update a concise **End-to-End Flow** (or "From Problem to Solution") subsection that narrates the journey: problem/opportunity → requirements (what/why) → solution approach (how) → implementation outcome (what was delivered). This ties the ticket story together for anyone reading the wiki.

**Previous state vs current state:**
  - Preserve or summarize **Previous state (planned):** what was planned for what/why (requirements, AC) and what was planned for how (solution design, components) before development. Do not delete the investigation trail or original plan; add as-built alongside.
  - Document **Current state (as-built):** what was actually delivered (what/why) and how it was actually built (how). Use the **Implementation Reality** section and As-Built Solution Design to make previous vs current explicit (e.g. "Planned: X. As-built: Y." or a short table where helpful).

**Standard closeout updates:**
  - Changes status banner from "Ready for Development" to "Development Complete".
  - Adds **Implementation Reality** section: document actual vs. planned (components, AC outcomes, scope changes), making previous state vs current state clear.
  - Updates **Solution Design** section to reflect as-built architecture (or add an "As-Built" subsection); keep this in "how" terms.
  - Updates **Quality & Validation** with actual test results (types performed, P1 results, coverage, any test-driven design changes).
  - Adds **Lessons Learned** section from questionnaire.
  - Updates **Assumptions Resolution Log** with final statuses for **all** assumptions (Validated, Refuted, or Superseded); **none** may remain "Open". Populate Resolution Evidence from section C and evidence summary.
  - Updates **Open Unknowns**: resolve all that were answered; for any unresolved, add **Deferred Unknowns** with linked follow-up work items or rationale. Do not leave unknowns unresolved without documenting resolution (Resolved/Deferred/Accepted).
  - Follow `{{template_files.wiki_format}}` and existing wiki structure.

H2 [IO]: Save updated wiki markdown to `{{closeout}}/wiki-closeout-content.md`.
H3 [CLI]: If `{{wiki_path}}` is set: `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{closeout}}/wiki-closeout-content.md" --json`
H4 [IO]: Optionally update `{{wiki}}/generated-content.md` and `{{wiki}}/wiki-metadata.json` for local consistency if those paths exist.

### I: Release Notes [GEN + IO]
Generate a polished, well-formatted release note for the `{{field_paths.release_notes}}` (Custom.ReleaseNotes) field.

I1 [GEN]: Compose the release note from the closeout delta (E), evidence summary (B), and questionnaire (D). The release note should be written for **end users, stakeholders, and QA** — not developers. It must be concise, professional, and high-quality.

**Release note structure:**
- **Summary** (1-2 sentences): Plain-language description of what changed and why it matters. Lead with the business outcome, not technical detail.
- **What's New / What Changed**: Bullet list of user-visible changes, new capabilities, or behavior differences. Use language the business understands. For bugs, describe the symptom that was fixed.
- **Impact**: Who is affected and how (e.g. "Sales reps will now see…", "Automated emails will no longer…"). Include any changes to existing workflows.
- **Known Limitations** (if any): Anything descoped, deferred, or accepted as-is, with brief rationale.
- **Related Items** (optional): Links to follow-up work items, if relevant to the reader.

**Quality guidelines:**
- Write in plain, jargon-free language; avoid Salesforce API names, class names, or internal references unless essential.
- Focus on *what changed for the user*, not how it was implemented.
- Be specific: "Contact records now display the preferred phone number" not "Updated Contact object".
- Format as clean HTML suitable for the ADO rich-text field.

I2 [IO]: Save release note content to `{{closeout}}/release-notes.html`.
I3 [IO]: Include `{{field_paths.release_notes}}` in the combined closeout fields payload (see J).

### J: Update ADO [CLI]
J1 [IO]: Build single final payload combining:
  - `System.Description` (from F; update if scope changed materially)
  - `Microsoft.VSTS.Common.AcceptanceCriteria` (final AC as delivered)
  - `Custom.DevelopmentSummary` (as-built solution design HTML from G)
  - `{{field_paths.release_notes}}` (release note HTML from I)
  - `System.Tags` (existing tags plus `{{tags.dev_complete}}`; preserve base tags)
  - `Microsoft.VSTS.Scheduling.StoryPoints` (confirmed or revised)
  - `Custom.RootCauseDetail` (bugs only, if provided)
  - `Custom.RequiresQA` (confirmed)
  - `Custom.WorkClassType` (if changed)
Omit fields that are unchanged and should not be overwritten, unless explicitly finalizing.
J2 [IO]: Save payload to `{{closeout}}/{{artifact_files.closeout.fields}}`
J3 [CLI]: `{{cli.ado_update}} {{work_item_id}} --fields-file "{{closeout}}/{{artifact_files.closeout.fields}}" --json`

### K: Closeout Summary [GEN + IO]
K1 [GEN]: Generate narrative completion summary: work item ID, what was built, planned vs. actual summary, artifacts updated, wiki updated, ADO fields updated, release notes generated, lessons learned (brief), follow-up items, and confirmation that all assumptions and unknowns were resolved.
K2 [IO]: Save to `{{closeout}}/{{artifact_files.closeout.summary}}`
K3 [IO]: Optionally update run state or local artifacts (e.g. copy closeout grooming/solutioning into `{{grooming}}` and `{{solutioning}}` for future reference).

## Output
- `{{closeout}}/{{artifact_files.closeout.questionnaire}}`
- `{{closeout}}/{{artifact_files.closeout.delta}}`
- `{{closeout}}/{{artifact_files.closeout.fields}}`
- `{{closeout}}/{{artifact_files.closeout.summary}}`
- `{{closeout}}/release-notes.html`
- `{{closeout}}/grooming-final.json`, `solution-design-final.json`, `technical-spec-final.md`, `wiki-closeout-content.md`
- Wiki page updated with as-built content, status "Development Complete", clear what/why vs how separation, end-to-end flow, previous state vs current state documentation, full Assumptions Resolution Log (no Open), and resolved/deferred Open Unknowns
- Work item updated with final fields, release notes, and `{{tags.dev_complete}}` tag

## Notes
- No local artifact files from prior phases are required; current state is retrieved from ADO and wiki.
- If wiki page is not found, proceed without wiki updates (H3 skipped); still update ADO and produce closeout artifacts.
- If no PRs are linked or SF audit returns no results, evidence summary will be partial; rely on developer questionnaire to complete planned-vs-actual and assumptions/unknowns resolution.
- The final wiki must clearly separate what/why (grooming) from how (solution), document end-to-end flow (problem → requirements → solution → outcome), and make previous state (planned) vs current state (as-built) explicit so the full journey is documented.
