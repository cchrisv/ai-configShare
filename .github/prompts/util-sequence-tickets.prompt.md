# Sequence Tickets (Dependency Ordering and Linking)

Role: Release Planner / Dependency Analyst
Mission: Analyze all child work items under a Feature or Epic, determine the optimal execution order based on technical and logical dependencies, present the recommendation for user approval, and create predecessor/successor links in ADO.
Output: Dependency-ordered sequence plan (local artifact) and ADO work item links.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Load: `#file:config/shared.json`
Input: `{{work_item_id}}`

## Prerequisites
- `{{work_item_id}}` is a Feature or Epic work item in ADO
- Child work items exist (User Stories, Bugs, or Tasks under the Feature; Features with their own children under an Epic)
- Child work items have been groomed (Description, Acceptance Criteria populated) for best results; sequencing can still proceed with partial data but quality of dependency analysis degrades

## Protocol
1. All data comes from ADO APIs -- no local artifacts expected
2. Cache fetched data in `collected-tickets.json` so re-runs can skip re-fetching
3. Dependency edges are the source of truth -- phased execution groups are derived from edges
4. **No ADO mutations until the user explicitly approves** the sequence plan
5. Preserve existing valid predecessor/successor links -- skip creating duplicates
6. Flag conflicts between existing links and the recommended order rather than auto-removing
7. Tickets in terminal states (Closed, Done, Removed) should be included in the analysis for completeness but flagged in the recommendation

## Data Collection Guidelines

**IMPORTANT:** Data collection involves many CLI calls across potentially dozens of work items. Follow these rules to avoid scripting errors:

1. **Execute CLI calls individually** -- Run each `ado_get` and `ado_relations` call as a separate command. Do NOT combine all calls into a single inline script.
2. **Build collected-tickets.json incrementally** -- Initialize the JSON structure first, then append each work item's data as you fetch it. Write the file after processing each feature (not all at once at the end).
3. **Use the CLI output directly** -- Parse the JSON output from each CLI call and extract the fields you need. Do not build intermediate PowerShell hashtables or dictionaries to hold all data in memory.
4. **If you must use PowerShell dictionaries/hashtables**, always use **string keys** (e.g., `$map["$id"]` not `$map[$id]`). `ConvertTo-Json` does not support non-string dictionary keys and will throw a serialization error.
5. **Process one feature at a time** -- For Epic-level collection, loop through features sequentially: fetch the feature, get its children, fetch each child, then write that feature's data to the JSON before moving to the next feature.
6. **Use `ConvertTo-Json -Depth 10`** -- Nested objects require sufficient depth for proper serialization. Always specify `-Depth 10` (or higher) when writing JSON.

---

## Execution

### A: Init
A1 [IO]: Load shared.json, extract paths, CLI commands, artifact file names
A2 [CLI]: Fetch work item and detect type: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
A3 [LOGIC]: Extract `System.WorkItemType`. If type is not "Feature" AND not "Epic", STOP with error: "Sequencing requires a Feature or Epic work item."
A3a [LOGIC]: Set `{{work_item_type}}` to "Feature" or "Epic" for branching logic throughout execution
A4 [IO]: Create output directory `{{root}}/sequencing/`
A5 [LOGIC]: If `{{root}}/sequencing/{{artifact_files.sequencing.collected_tickets}}` exists, skip to Step C (use cached data)

### B: Data Collection [CLI]

#### B-Feature: Feature Path (1-level)
_Execute this block when `{{work_item_type}}` == "Feature"_

B1 [CLI]: Fetch feature: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
B2 [CLI]: Get child relations: `{{cli.ado_relations}} {{work_item_id}} --type child --json`
B3 [LOGIC]: Extract child work item IDs from relations. If no children found, STOP with error: "No child work items found under this Feature."
B4 [CLI]: For each child ID, fetch full work item:
  `{{cli.ado_get}} {{child_id}} --expand All --json`
B5 [IO]: Save to collected-tickets.json. Set `work_item_type` to "Feature", set `epic` to null, populate `features` array with a single entry containing the feature data and its `children`.

#### B-Epic: Epic Path (2-level)
_Execute this block when `{{work_item_type}}` == "Epic"_

B6 [CLI]: Fetch epic: `{{cli.ado_get}} {{work_item_id}} --expand All --json`
B7 [CLI]: Get child features: `{{cli.ado_relations}} {{work_item_id}} --type child --json`
B8 [LOGIC]: Extract child Feature IDs from relations. If no children found, STOP with error: "No child Features found under this Epic."
B9 [CLI]: For each Feature ID, fetch full work item:
  `{{cli.ado_get}} {{feature_id}} --expand All --json`
B10 [CLI]: For each Feature, get its child work items:
  `{{cli.ado_relations}} {{feature_id}} --type child --json`
B11 [CLI]: For each child under each Feature, fetch full work item:
  `{{cli.ado_get}} {{child_id}} --expand All --json`
B12 [IO]: Save to collected-tickets.json. Set `work_item_type` to "Epic", populate `epic` with the epic data, populate `features` array with each feature and its `children`.

**Epic collection pattern (step-by-step):**
```
1. Run: ado_get {{work_item_id}} → save epic fields
2. Run: ado_relations {{work_item_id}} → extract feature IDs list
3. For each feature_id in list:
   a. Run: ado_get {{feature_id}} → save feature fields
   b. Run: ado_relations {{feature_id}} → extract child IDs list
   c. For each child_id in child list:
      i.  Run: ado_get {{child_id}} → save child fields
   d. Write this feature + its children to collected-tickets.json
4. Final write of complete collected-tickets.json
```
Do NOT attempt to fetch all features and children in a single batched script.

#### Collected Data Schema (unified)

```json
{
  "work_item_id": "{{work_item_id}}",
  "work_item_type": "Epic|Feature",
  "collected_at": "{{iso_timestamp}}",
  "epic": null,
  "features": [
    {
      "id": 0,
      "title": "",
      "description": "",
      "acceptance_criteria": "",
      "tags": "",
      "children": [
        {
          "id": 0,
          "title": "",
          "work_item_type": "",
          "state": "",
          "description": "",
          "acceptance_criteria": "",
          "development_summary": "",
          "sf_components": "",
          "tags": "",
          "story_points": 0,
          "priority": 0,
          "assigned_to": ""
        }
      ]
    }
  ],
  "collection_warnings": []
}
```

When `work_item_type` is "Feature": `epic` is null, `features` contains one entry (the feature itself with its children).
When `work_item_type` is "Epic": `epic` is populated, `features` contains all child features each with their own children.

Epic schema (when populated):
```json
{
  "id": 0,
  "title": "",
  "description": "",
  "acceptance_criteria": "",
  "tags": ""
}
```

### C: Audit Existing Links [CLI]
C1 [CLI]: For each child ticket collected in Step B, fetch predecessor and successor relations:
  `{{cli.ado_relations}} {{child_id}} --type predecessor,successor --json`
C2 [LOGIC]: Build a map of existing predecessor/successor pairs. For each relation, record:
  - `source_id`: The work item whose relations were queried
  - `target_id`: The related work item ID
  - `link_type`: predecessor or successor
  - `is_within_scope`: Whether the target is also a collected child (i.e., both ends are in scope)
C3 [IO]: Save to `{{root}}/sequencing/{{artifact_files.sequencing.existing_links}}`

Existing links schema:
```json
{
  "audited_at": "{{iso_timestamp}}",
  "ticket_count": 0,
  "existing_pairs": [
    {
      "predecessor_id": 12345,
      "successor_id": 12346,
      "is_within_scope": true
    }
  ],
  "out_of_scope_links": [
    {
      "ticket_id": 12345,
      "link_type": "predecessor",
      "external_target_id": 99999
    }
  ]
}
```

### D: AI Analysis [GEN]
D1 [IO]: Load collected data from `{{root}}/sequencing/{{artifact_files.sequencing.collected_tickets}}`
D2 [IO]: Load existing links from `{{root}}/sequencing/{{artifact_files.sequencing.existing_links}}`
D3 [GEN]: **Analyze dependencies across all child tickets.** Consider the following signals (in priority order):

  1. **Explicit references**: Look for mentions of other ticket IDs in descriptions, AC, or development summaries (e.g., "depends on #12345", "after US-12345 is complete", "requires the object from story X")
  2. **Shared Salesforce components**: Tickets that create SF objects/fields must precede tickets that create triggers, flows, validation rules, or LWC that reference those objects/fields. Use `sf_components` and `development_summary` to identify these relationships.
  3. **Technical layering**: Data model → business logic → UI/integration → testing/validation. Foundation components (custom objects, fields, permission sets) before consumers (triggers, flows, Apex classes, LWC).
  4. **Logical dependencies**: Configuration/setup before usage, core functionality before extensions, backend before frontend when they share data contracts.
  5. **Tags and functional grouping**: Shared tags may indicate related work that should be sequenced together.
  6. **Story points and priority**: Higher-priority items and foundation items with many dependents should appear earlier. Story points can indicate relative complexity but do not directly determine order.

D4 [GEN]: **Build the dependency graph.** For each identified dependency:
  - Record the predecessor ticket, successor ticket, and a brief rationale
  - Validate there are no circular dependencies. If cycles are detected, flag them for user review and propose how to break them.

D5 [GEN]: **Derive execution phases from the dependency graph.** Use topological sorting:
  - Phase 1: Tickets with no predecessors (can start immediately)
  - Phase 2: Tickets whose predecessors are all in Phase 1
  - Phase N: Tickets whose predecessors are all in Phase 1 through Phase N-1
  - Tickets within the same phase can be executed in parallel

D6 [GEN]: **Identify parallel tracks.** Group tickets that form independent chains (no cross-dependencies) into named tracks. This helps visualize which work streams can proceed concurrently.

D7 [GEN]: **Compare with existing links.** For each existing predecessor/successor pair:
  - If the existing link agrees with the recommendation: mark as "preserved"
  - If the existing link contradicts the recommendation: mark as "conflict" with explanation
  - If an existing link connects to an out-of-scope ticket: mark as "external" (leave untouched)

D8 [GEN]: **When operating at Epic level**, provide two levels of sequencing:
  - **Feature-level sequencing**: The recommended order of Features within the Epic (based on cross-feature dependencies)
  - **Intra-feature sequencing**: The recommended order of child tickets within each Feature
  - **Cross-feature dependencies**: Any cases where a child ticket in Feature A must precede a child ticket in Feature B

D9 [IO]: Save the sequence plan to `{{root}}/sequencing/{{artifact_files.sequencing.sequence_plan}}`

Sequence plan schema:
```json
{
  "work_item_id": "{{work_item_id}}",
  "work_item_type": "Feature|Epic",
  "generated_at": "{{iso_timestamp}}",
  "total_tickets": 0,
  "total_dependency_edges": 0,
  "circular_dependencies_detected": false,
  "execution_phases": [
    {
      "phase": 1,
      "description": "Foundation -- no predecessors",
      "tickets": [
        {
          "id": 12345,
          "title": "Create custom object",
          "work_item_type": "User Story",
          "feature_id": null,
          "feature_title": null,
          "state": "New",
          "story_points": 5,
          "rationale": "Foundation: creates SObject used by 3 downstream stories"
        }
      ]
    }
  ],
  "dependency_edges": [
    {
      "predecessor_id": 12345,
      "successor_id": 12346,
      "rationale": "Trigger on Account depends on custom field created in 12345",
      "is_cross_feature": false
    }
  ],
  "parallel_tracks": [
    {
      "track": "A",
      "name": "Data Model and Business Logic",
      "ticket_ids": [12345, 12346],
      "description": "Custom objects, fields, and triggers"
    }
  ],
  "feature_sequence": [
    {
      "order": 1,
      "feature_id": 100,
      "feature_title": "Data Foundation",
      "rationale": "Creates objects consumed by all other features"
    }
  ],
  "existing_link_disposition": {
    "preserved": [
      { "predecessor_id": 12345, "successor_id": 12346 }
    ],
    "conflicts": [
      {
        "existing_predecessor_id": 12347,
        "existing_successor_id": 12345,
        "recommended_predecessor_id": 12345,
        "recommended_successor_id": 12347,
        "explanation": "Existing link has the direction reversed; 12345 creates the object that 12347 consumes"
      }
    ],
    "external": [
      { "ticket_id": 12345, "external_target_id": 99999, "link_type": "predecessor" }
    ]
  },
  "new_links_to_create": [
    { "predecessor_id": 12345, "successor_id": 12346 }
  ],
  "links_to_remove": [
    {
      "predecessor_id": 12347,
      "successor_id": 12345,
      "reason": "Direction reversed per recommended order"
    }
  ],
  "warnings": []
}
```

Note: `feature_sequence` is only populated when `work_item_type` is "Epic". `feature_id` and `feature_title` in each ticket entry are only populated at Epic level.

### E: Present Recommendation [GEN]
E1 [GEN]: Present the sequence plan to the user in a clear, readable format. Structure the presentation as follows:

**Summary:**
- Total tickets analyzed, total dependency edges identified
- Number of execution phases, number of parallel tracks
- Any circular dependencies detected (with proposed resolution)
- When Epic: feature-level execution order

**Execution Order (by phase):**
For each phase, display:
```
Phase N: [description]
  - [ticket_id] [title] ([state]) [story_points pts]
    Rationale: [why this ticket is in this phase]
```

**Parallel Tracks:**
For each track, display the chain of tickets that form the track.

**Dependency Edges:**
Table showing predecessor → successor with rationale.

**Existing Link Analysis:**
- Preserved links (existing links that match the recommendation)
- Conflicts (existing links that disagree -- highlight these)
- External links (links to out-of-scope tickets -- left untouched)

**Proposed ADO Changes:**
- New links to create (count and list)
- Links to remove (count and list, if any conflicts warrant removal)

E2 [GEN]: Ask the user to review and choose one of:
  1. **Approve** -- proceed to create links as proposed
  2. **Revise** -- specify changes (reorder tickets, add/remove dependency edges, move tickets between phases)
  3. **Cancel** -- abort without making any ADO changes

### F: User Review Loop [GEN]
F1 [LOGIC]: If the user chooses **Approve**, proceed to Step G.
F2 [GEN]: If the user chooses **Revise**:
  - Apply the user's requested changes to the sequence plan
  - Recompute execution phases from the updated dependency edges (re-run topological sort)
  - Recompute parallel tracks
  - Recompute new_links_to_create and links_to_remove
  - Update `{{root}}/sequencing/{{artifact_files.sequencing.sequence_plan}}` with the revised plan
  - Re-present the updated recommendation (return to Step E)
F3 [LOGIC]: If the user chooses **Cancel**, STOP. Save the sequence plan as a reference artifact but do not create any links.
F4 [IO]: Once approved, save the final plan as `{{root}}/sequencing/{{artifact_files.sequencing.sequence_plan_approved}}`

### G: Create Links in ADO [CLI]
G1 [IO]: Load approved plan from `{{root}}/sequencing/{{artifact_files.sequencing.sequence_plan_approved}}`
G2 [LOGIC]: Build the list of link operations:
  - **Create**: For each entry in `new_links_to_create`, create a successor link
  - **Remove**: For each entry in `links_to_remove`, remove the existing link (only if user approved removal)
G3 [CLI]: For each link to create, execute:
  `{{cli.ado_link}} {{predecessor_id}} {{successor_id}} --type successor --comment "Sequenced by AI dependency analysis" --json`
  - If the link already exists (error from API), log a warning and continue
  - Track success/failure for each operation
G4 [CLI]: For each link to remove (if any), execute:
  `{{cli.ado_unlink}} {{source_id}} {{target_id}} --type successor --json`
  - Track success/failure for each operation
G5 [IO]: Save link operation results to `{{root}}/sequencing/{{artifact_files.sequencing.link_results}}`

Link results schema:
```json
{
  "executed_at": "{{iso_timestamp}}",
  "links_created": [
    { "predecessor_id": 12345, "successor_id": 12346, "status": "success" }
  ],
  "links_removed": [
    { "predecessor_id": 12347, "successor_id": 12345, "status": "success" }
  ],
  "errors": [
    { "operation": "create", "predecessor_id": 0, "successor_id": 0, "error": "" }
  ],
  "summary": {
    "total_create_attempted": 0,
    "total_create_succeeded": 0,
    "total_remove_attempted": 0,
    "total_remove_succeeded": 0,
    "total_errors": 0
  }
}
```

### H: Verify and Report [CLI]
H1 [CLI]: For a sample of linked tickets (up to 5, or all if fewer), verify the links were created:
  `{{cli.ado_relations}} {{ticket_id}} --type predecessor,successor --json`
H2 [GEN]: Generate a summary report including:
  - Work item ID and type (Feature/Epic)
  - Total tickets sequenced
  - Total dependency edges in the final plan
  - Number of execution phases and parallel tracks
  - Links created (count, success/failure breakdown)
  - Links removed (count, success/failure breakdown)
  - Verification results
  - Any warnings or errors encountered
H3 [IO]: Save report to `{{root}}/sequencing/{{artifact_files.sequencing.report}}`
H4 [GEN]: Display the summary report to the user.

## Output
- `{{root}}/sequencing/collected-tickets.json` -- raw ticket data
- `{{root}}/sequencing/existing-links.json` -- pre-existing link audit
- `{{root}}/sequencing/sequence-plan.json` -- AI-recommended sequence (draft)
- `{{root}}/sequencing/sequence-plan-approved.json` -- user-approved sequence (final)
- `{{root}}/sequencing/link-results.json` -- ADO link operation results
- `{{root}}/sequencing/sequencing-report.md` -- human-readable summary
- ADO work item predecessor/successor links created per approved plan
