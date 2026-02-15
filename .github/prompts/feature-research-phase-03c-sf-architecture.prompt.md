# Feature Research Phase 03c – Salesforce Architecture & Order of Operations
Role: Salesforce Technical Architect
Mission: Map how all discovered automation works together as a system — execution order per object, cross-object cascades, transaction boundaries, and the overall architectural patterns behind **{{scope.feature_area}}**.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: Full automation inventory from `{{context_file}}.sf_automation` (triggers, flows, Apex, LWC, Aura, validation rules, dependency graph)

## Constraints
- **Read-only** – NO ADO/wiki/SF modifications
- **CLI-only** – per util-base guardrails (SF operations use `{{cli.*}}` commands only)
- **Mission-focused** – you are mapping how **{{scope.feature_area}}** actually executes; the goal is not just "what components exist" (Phase 03b did that) but "what happens when a user saves a record, and in what order"
- **Outputs to** `{{context_file}}.sf_architecture`
- **Rolling synthesis** – extend `synthesis` with architectural understanding
- **All streams mandatory**
- **Feedback loops** – max 3 iterations/stream

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
Stream sections: Stream 1 → `sf_architecture.order_of_operations`, Stream 2 → `.execution_chains`, Stream 3 → `.cross_object_cascades`, Stream 4 → `.transaction_analysis`, Stream 5 → `.architecture_patterns` + `.narrative`
1. [IO] Write `{{context_file}}.sf_architecture.[stream_section]` → save to disk
2. [GEN] Extend `{{context_file}}.synthesis` + `.synthesis.assumptions[]` with new evidence
3. [IO] Append to `{{context_file}}.run_state.completed_steps[]`
4. [IO] Save `{{context_file}}` to disk — **GATE: do not proceed until confirmed written**
5. On error: log to `run_state.errors[]`; save to disk; continue

## Context Paths
`{{research_root}}` = `{{paths.artifacts_root}}/sf-research/{{sanitized_name}}`
`{{context_file}}` = `{{research_root}}/research-context.json`

## Prerequisites [IO]
A1 [IO]: Load `{{context_file}}`; verify:
  - `"sf_automation"` in `metadata.phases_completed`
  - `sf_automation.triggers` is populated (or explicitly empty for triggerless objects)
  - `sf_automation.flows` is populated
  - `sf_automation.apex_classes` is populated
  - `sf_automation.validation_rules` is populated
  - `sf_automation.dependency_graph` is populated
A2 [IO]: Load all automation data + schema context for cross-referencing
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Mission Anchor [IO/GEN]
**Before any analysis begins, ground yourself in the mission.**

MA1 [IO]: From `{{context_file}}`, read and internalize:
  - `scope.feature_area` — **what** we are researching
  - `scope.research_purpose` — **why** we are researching it
  - `scope.sf_objects[]` — the Salesforce objects whose execution model we are mapping
  - `ado_research.business_context` — business rules and processes that the automation should implement
  - `sf_schema.relationships[]` — master-detail and lookup relationships (affect cascade order)
  - `sf_automation.triggers[]` — all triggers with events, handlers, chains
  - `sf_automation.flows[]` — all flows with types, DML operations, subflow calls
  - `sf_automation.apex_classes[]` — all Apex with categories, DML statements, callout references
  - `sf_automation.lwc_components[]` — UI components and their Apex imports
  - `sf_automation.validation_rules[]` — validation rules with formulas
  - `sf_automation.dependency_graph` — component interconnections
  - `synthesis.unified_truth` — cumulative understanding from prior phases

MA2 [GEN]: State the mission: *"Phase 03b told me WHAT automation exists for **{{scope.feature_area}}**. Now I need to understand HOW it all works together. When a user creates or updates a {{scope.sf_objects[0]}} record, what fires in what order? What cascades to other objects? Where are the transaction boundaries? What is the architectural layering? My goal is to produce a clear picture that an architect can use to understand the execution flow and identify architectural risks."*

MA3: **Think like an architect tracing a transaction.** For every DML event, mentally walk through the Salesforce order of execution and populate each slot with the actual components from Phase 03b. When you find gaps or ambiguities (e.g., a flow and a trigger both fire after-save on the same object), note them as architectural risks.

---

## Architecture Output Structure
All outputs to `{{context_file}}.sf_architecture`:
- `order_of_operations[]` — per object: `{ object, dml_event, execution_slots[] }`
- `execution_chains[]` — per object+event: `{ object, event, chain_steps[], async_forks[], total_dml_count, total_soql_count, cascade_depth, bulk_assessment{}, governor_risk }`
- `cross_object_cascades[]` — `{ trigger_object, trigger_event, cascade_path[], depth, re_entrant, transaction_scope, failure_propagation, risk_assessment }`
- `transaction_analysis` — `{ sync_boundaries[], async_boundaries[], mixed_dml_risks[], governor_risks[] }`
- `architecture_patterns` — `{ layer_map{}, rule_distribution{}, separation_of_concerns{}, anti_patterns[] }`
- `execution_complexity` — `{ max_cascade_depth, highest_governor_risk, re_entrant_cascade_count, objects_with_mixed_automation }`
- `narrative` — `{ system_overview, per_object_summaries[], critical_paths[], recommendations[] }`

---

## Stream 1 [GEN] – Order of Operations Mapping
**Goal:** For each in-scope object, populate the Salesforce Order of Execution with actual components from **{{scope.feature_area}}** → `{{context_file}}.sf_architecture.order_of_operations`

### Salesforce Order of Execution Reference
B1 [GEN]: For each in-scope object AND for each relevant DML event (insert, update, delete), map the standard Salesforce execution order and populate each slot with discovered components:

**Slot 1 — System Validation (pre-execution)**
  - Required fields check, field format validation, max length checks
  - Note: these fire BEFORE any custom automation

**Slot 2 — Before-Save Record-Triggered Flows**
  - List flows from `sf_automation.flows[]` where `object = {{object}}` AND `type = "Record-Triggered Before"`
  - Execution order: alphabetical by API name when multiple exist (Salesforce default)
  - Note: these CAN modify the triggering record without DML (field updates are free)

**Slot 3 — Before Triggers**
  - List triggers from `sf_automation.triggers[]` where `object = {{object}}` AND `events[]` includes `BeforeInsert`/`BeforeUpdate`/`BeforeDelete`
  - Trace handler chains from `handler_chain[]` — which service classes execute?
  - Note: field changes here also do NOT require DML

**Slot 4 — System Validation (post-trigger)**
  - Unique field checks, foreign key validation
  - Note: fires AFTER before triggers but BEFORE validation rules

**Slot 5 — Custom Validation Rules**
  - List from `sf_automation.validation_rules[]` where `object = {{object}}` AND `is_active = true`
  - Note cross-object validation rules (from `cross_object_refs[]`) — these may fail due to data from other objects

**Slot 6 — Duplicate Rules**
  - Note if any duplicate rules exist for the object (log as assumption if unknown)

**Slot 7 — After Triggers**
  - List triggers where `events[]` includes `AfterInsert`/`AfterUpdate`/`AfterDelete`/`AfterUndelete`
  - Trace handler chains — after triggers often contain DML on OTHER objects (cascade trigger)
  - **Critical:** Each DML in an after trigger starts the order of execution on the TARGET object

**Slot 8 — Assignment Rules**
  - Note if Lead or Case assignment rules apply (standard objects only)

**Slot 9 — Auto-Response Rules**
  - Note if auto-response rules apply (Lead/Case)

**Slot 10 — Workflow Rules (Legacy)**
  - Note any legacy workflow rules discovered (Phase 03b may have flagged these as modernization candidates)
  - If present, field updates from workflows can re-trigger before/after update triggers (re-evaluation)

**Slot 11 — After-Save Record-Triggered Flows**
  - List flows where `object = {{object}}` AND `type = "Record-Triggered After"`
  - **Critical:** DML in after-save flows starts the order of execution on target objects
  - Note: after-save flows run in the SAME transaction as the triggering DML

**Slot 12 — Entitlement Rules**
  - Note if entitlement processes apply (Case only)

**Slot 13 — Roll-Up Summary Field Calculations**
  - From `sf_schema.relationships[]`, identify master-detail parents whose roll-up summaries recalculate
  - Roll-up recalculation on the parent starts the parent's order of execution (update event)

**Slot 14 — Cross-Object Formula Updates**
  - From `sf_schema.field_analysis.cross_object_formulas[]`, identify objects with formulas referencing this object

**Slot 15 — Criteria-Based Sharing Evaluation**
  - Sharing rule recalculation

**Slot 16 — Async Operations (post-transaction)**
  - Platform event delivery (from `apex_classes[].event_publishes[]`)
  - Queueable jobs enqueued (from `apex_classes[]` where category = "Queueable")
  - Batch jobs launched (from `apex_classes[]` where category = "Batch")
  - Scheduled flows (from `flows[]` where type = "Scheduled")
  - Outbound messages / callouts (from `apex_classes[].callout_references[]`)

### Output
B2 [GEN]: For each object + DML event, store:
```json
{
  "object": "Journey__c",
  "dml_event": "insert",
  "execution_slots": [
    { "slot": 2, "slot_name": "Before-Save Flows", "components": ["Flow_Name_1"], "notes": "" },
    { "slot": 3, "slot_name": "Before Triggers", "components": ["JourneyTrigger → JourneyTriggerHandler → JourneyService.validateFields()"], "notes": "" },
    { "slot": 5, "slot_name": "Validation Rules", "components": ["VR_Journey_RequireStatus", "VR_Journey_DateRange"], "notes": "VR_DateRange has cross-object ref to Account" },
    { "slot": 7, "slot_name": "After Triggers", "components": ["JourneyTrigger → JourneyTriggerHandler → JourneyService.createRelatedRecords()"], "notes": "DML on JourneyStep__c — triggers cascade" },
    { "slot": 11, "slot_name": "After-Save Flows", "components": ["Journey_After_Save_Notification"], "notes": "Sends platform event" },
    { "slot": 16, "slot_name": "Async Operations", "components": ["JourneyNotificationQueueable"], "notes": "Enqueued by after trigger" }
  ]
}
```
→ `sf_architecture.order_of_operations[]`

B3 [GEN]: Flag **conflicts and risks**:
  - Multiple before-save flows on the same object (execution order ambiguity)
  - Both a before trigger AND before-save flow modifying the same fields (last-write-wins risk)
  - After triggers AND after-save flows both performing DML on the same target object (double-processing risk)
  - Validation rules that reference fields modified by before triggers/flows (timing dependency)

---

## Stream 2 [GEN] – Execution Chain Analysis
**Goal:** For each object's key DML events, trace the COMPLETE execution chain including all cascades — what actually happens from start to finish when a record is saved → `{{context_file}}.sf_architecture.execution_chains`

### Chain Tracing
C1 [GEN]: For each in-scope object, identify the most important DML events:
  - **Insert** — if triggers/flows fire on insert
  - **Update** — if triggers/flows fire on update (usually the most complex)
  - **Delete** — if triggers/flows fire on delete OR master-detail cascade delete exists

C2 [GEN]: For each object + event, trace the full chain step-by-step:

**Step format:** `{ step_number, slot_name, component, action, target_object, dml_type, note }`

Example chain for `Journey__c INSERT`:
```
Step 1: Before-Save Flow "Journey_Defaults" → sets default field values on Journey__c
Step 2: Before Trigger "JourneyTrigger" → JourneyTriggerHandler.beforeInsert() → JourneyService.validateFields() → validates business rules
Step 3: Validation Rule "VR_Journey_RequireStatus" → checks Status__c is not null
Step 4: After Trigger "JourneyTrigger" → JourneyTriggerHandler.afterInsert() → JourneyService.createSteps() → INSERT 3 JourneyStep__c records
  Step 4a: → CASCADE: JourneyStep__c INSERT fires JourneyStepTrigger → JourneyStepHandler.afterInsert() → (no further DML)
Step 5: After-Save Flow "Journey_Notification" → publishes Journey_Created__e platform event
Step 6: Roll-up on JourneyGroup__c recalculates TotalJourneys__c
  Step 6a: → CASCADE: JourneyGroup__c UPDATE fires JourneyGroupTrigger (if exists)
Step 7: [ASYNC] Platform event Journey_Created__e → subscribed by flow "Handle_Journey_Created"
Step 8: [ASYNC] JourneyNotificationQueueable → sends email notification
```

C3 [GEN]: For each chain, calculate:
  - `total_dml_count` — total DML statements in the synchronous transaction
  - `total_soql_count` — estimated SOQL queries (from Apex `soql_queries[]` in the chain)
  - `cascade_depth` — how many levels of cascaded DML (object A → B → C = depth 3)
  - `governor_risk` — assess risk of hitting governor limits:
    - **Low** — <20 DML, <50 SOQL, cascade depth ≤2
    - **Medium** — 20–80 DML, 50–80 SOQL, cascade depth 3
    - **High** — 80–130 DML, 80–130 SOQL, cascade depth 4+
    - **Critical** — near 150 DML or 100 SOQL limits; or unbounded loops detected

### Bulk Operation Assessment
C4 [GEN]: For each chain, assess bulk behavior:
  - Does the chain handle 200 records (Trigger.new batch size)?
  - Are there SOQL/DML inside loops in any Apex class in the chain? (from Phase 03b analysis)
  - Do flows in the chain have elements inside loops that perform DML?
  - Calculate: at 200 records, how many total DML / SOQL would fire?

### Output
C5 [GEN]: Store each chain:
```json
{
  "object": "Journey__c",
  "event": "insert",
  "chain_steps": [ /* step objects as above */ ],
  "async_forks": [ /* async operations triggered */ ],
  "total_dml_count": 5,
  "total_soql_count": 12,
  "cascade_depth": 2,
  "bulk_assessment": { "handles_200": true, "dml_at_200_records": 605, "soql_at_200_records": 412, "governor_risk_at_bulk": "High" },
  "governor_risk": "Medium"
}
```
→ `sf_architecture.execution_chains[]`

---

## Stream 3 [GEN] – Cross-Object Cascade Mapping
**Goal:** Trace how automation on one **{{scope.feature_area}}** object cascades to other objects — map the full ripple effect → `{{context_file}}.sf_architecture.cross_object_cascades`

### Cascade Discovery
D1 [GEN]: From execution chains (Stream 2), extract every DML operation that targets a DIFFERENT object:
  - After trigger DML (from `apex_classes[].dml_statements[]`)
  - After-save flow DML operations (from `flows[].dml_operations[]`)
  - Roll-up summary recalculations (from `sf_schema.relationships[]`)
  - Master-detail cascade deletes (from `sf_schema.relationships[]` where `is_cascade_delete = true`)

D2 [GEN]: For each cross-object DML, trace what happens on the TARGET object:
  - Does the target object have triggers? What fires?
  - Does the target object have flows? What runs?
  - Does the target object have validation rules? Any risk of cascade failure?
  - Does the target object's automation cause further DML on a THIRD object?

### Cascade Path Construction
D3 [GEN]: Build complete cascade paths:
```
Journey__c INSERT
  → After Trigger inserts JourneyStep__c
    → JourneyStep__c After Trigger updates JourneyMilestone__c
      → JourneyMilestone__c rollup updates Journey__c (!! re-entrant)
```

D4 [GEN]: For each cascade path, assess:
  - `depth` — number of object hops (A → B → C = depth 3)
  - `re_entrant` — does the cascade path loop back to the originating object? (true/false)
  - `transaction_scope` — "synchronous" (all in same transaction) or "async_boundary" (breaks at platform event / queueable)
  - `failure_propagation` — if step N fails (e.g., validation rule on target object), does the entire transaction roll back?

### Re-Entrancy Analysis
D5 [GEN]: For re-entrant paths (cascade loops back to same object):
  - Does Salesforce's built-in recursion guard handle this? (triggers run max 1 additional time in same transaction)
  - Does the Apex code have explicit recursion guards? (static boolean patterns, trigger framework bypass)
  - Is the re-entry intentional (designed cascade) or accidental (side effect)?
  - Risk level: re-entrant + no guard = **Critical**; re-entrant + guard present = **Medium**

### Transaction Boundary Mapping
D6 [GEN]: Identify where synchronous transaction ends and async begins:
  - Platform event publish → subscriber runs in separate transaction
  - Queueable enqueue → runs in separate transaction
  - Batch launch → runs in separate transactions per batch
  - Future method → runs in separate transaction
  - **Mixed DML risk** — does the cascade mix setup objects (User, Group) with non-setup objects in the same synchronous chain?

### Output
D7 [GEN]: Store each cascade:
```json
{
  "trigger_object": "Journey__c",
  "trigger_event": "insert",
  "cascade_path": [
    { "step": 1, "source_object": "Journey__c", "source_component": "JourneyService.createSteps()", "target_object": "JourneyStep__c", "dml_type": "insert" },
    { "step": 2, "source_object": "JourneyStep__c", "source_component": "JourneyStepTrigger", "target_object": "JourneyMilestone__c", "dml_type": "update" },
    { "step": 3, "source_object": "JourneyMilestone__c", "source_component": "rollup_summary", "target_object": "Journey__c", "dml_type": "update" }
  ],
  "depth": 3,
  "re_entrant": true,
  "transaction_scope": "synchronous",
  "failure_propagation": "full_rollback",
  "risk_assessment": "High — re-entrant cascade with rollup trigger"
}
```
→ `sf_architecture.cross_object_cascades[]`

---

## Stream 4 [GEN] – Transaction & Governor Analysis
**Goal:** Assess transaction boundaries, governor limit exposure, and mixed DML risks across **{{scope.feature_area}}** → `{{context_file}}.sf_architecture.transaction_analysis`

### Synchronous Transaction Boundaries
E1 [GEN]: For each execution chain (from Stream 2), identify everything that runs in the SAME synchronous transaction:
  - All before/after triggers + all before/after-save flows + all synchronous Apex
  - Aggregate: total DML count, total SOQL count, total CPU time estimate, total heap size estimate
  - Classify: `{ chain_id, objects_touched[], total_sync_dml, total_sync_soql, estimated_cpu_ms, governor_headroom }`

### Async Boundaries
E2 [GEN]: Map async exit points and what runs in each async context:
  - Platform events → subscriber flows/triggers (separate transaction, separate governor limits)
  - Queueable chains → each execute() is a separate transaction
  - Batch jobs → each execute() batch (up to 200 records) is a separate transaction
  - Scheduled flows → separate transaction
  - Classify: `{ async_type, source_component, target_component, data_passed, error_handling }`

### Mixed DML Risk
E3 [GEN]: Scan all synchronous chains for mixed DML:
  - Setup objects: User, Group, GroupMember, QueueSobject, UserRole, PermissionSet, PermissionSetAssignment
  - If any chain performs DML on BOTH a setup object and a non-setup object in the same transaction → **Critical risk**
  - Check if the code handles this via `System.runAs()` or async deferral

### Governor Limit Exposure
E4 [GEN]: For each execution chain, calculate worst-case governor usage:
  - **At 1 record:** baseline DML/SOQL/CPU from chain tracing
  - **At 200 records:** multiply per-record operations by 200 (unless bulkified)
  - **At 200 records with cascades:** include cascade DML amplification
  - Flag chains where worst-case exceeds 80% of any governor limit

### Shared State Risks
E5 [GEN]: Identify components that share state across the transaction:
  - Static variables used as recursion guards (fragile — reset on re-entry from different trigger)
  - Static collections used for cross-trigger communication
  - Custom metadata / custom settings read in multiple components (query vs cached?)
  - Platform cache usage

### Output
E6 [GEN]: Store:
```json
{
  "sync_boundaries": [ /* per-chain sync transaction summaries */ ],
  "async_boundaries": [ /* async exit points */ ],
  "mixed_dml_risks": [ /* any mixed DML findings */ ],
  "governor_risks": [
    { "chain_id": "Journey__c_insert", "risk_level": "High", "limiting_factor": "DML at 200 records = 605 (limit 150)", "recommendation": "Bulkify JourneyService.createSteps()" }
  ]
}
```
→ `sf_architecture.transaction_analysis`

---

## Stream 5 [GEN] – Architecture Synthesis
**Goal:** Synthesize the execution analysis into an architectural narrative — how does **{{scope.feature_area}}** actually work as a system? → `{{context_file}}.sf_architecture.architecture_patterns` + `.narrative`

### Architectural Layer Map
F1 [GEN]: Map the discovered components into architectural layers:
  - **UI Layer** — LWC components, Aura components, Visualforce pages
  - **Controller Layer** — Apex controllers (LWC controllers, Aura controllers)
  - **Service Layer** — Service classes containing business logic
  - **Domain Layer** — Domain classes, trigger handlers
  - **Selector Layer** — Selector/query classes
  - **Declarative Layer** — Flows (record-triggered, screen, scheduled), validation rules
  - **Integration Layer** — Callout classes, platform events, named credentials
  - **Data Layer** — Objects, fields, relationships (from Phase 03a)
  Store → `architecture_patterns.layer_map`

### Business Rule Distribution
F2 [GEN]: For each business rule from `ado_research.business_context.business_rules[]`:
  - Where is this rule implemented? (trigger? flow? validation rule? Apex service? multiple places?)
  - Is the implementation in a single place (good) or spread across multiple components (fragile)?
  - Are there business rules implemented in automation that are NOT documented in ADO? (undocumented logic)
  Store → `architecture_patterns.rule_distribution`

### Separation of Concerns Assessment
F3 [GEN]: Evaluate architectural quality:
  - **Trigger → Handler separation** — do triggers delegate to handlers, or contain inline logic?
  - **Handler → Service separation** — do handlers delegate to services, or contain business logic?
  - **Query encapsulation** — are SOQL queries in selector classes, or scattered across services/handlers?
  - **DML encapsulation** — are DML operations in unit-of-work patterns, or scattered?
  - **Flow vs Apex boundaries** — are flows and Apex clearly separated, or do they overlap (same logic in both)?
  - **UI vs Backend separation** — do LWC controllers contain business logic, or delegate to services?
  For each concern: score as `clean` | `partial` | `mixed` | `violated`
  Store → `architecture_patterns.separation_of_concerns`

### Anti-Pattern Detection
F4 [GEN]: Flag discovered anti-patterns:
  - **SOQL/DML in loops** — from Apex analysis
  - **Inline trigger logic** — triggers with business logic instead of handler delegation
  - **God class** — single Apex class with 500+ LOC touching many objects
  - **Duplicate logic** — same business rule in both a trigger AND a flow
  - **Missing error handling** — flows without fault paths, Apex without try/catch on DML/callouts
  - **Hardcoded IDs/values** — record type IDs, profile IDs in Apex code
  - **Non-bulkified patterns** — single-record processing in triggers/flows
  - **Tight coupling** — classes directly instantiating other classes instead of using dependency injection or configuration
  - **Mixed automation** — same object has BOTH triggers and record-triggered flows modifying fields (unpredictable order)
  Each: `{ pattern, severity (Critical/High/Medium/Low), components[], description, recommendation }`
  Store → `architecture_patterns.anti_patterns[]`

### Narrative Generation
F5 [GEN]: Generate human-readable architectural narrative:

**System Overview** (2–3 paragraphs):
  - "{{scope.feature_area}} is built on {{N}} objects with {{N}} automation components. The architecture follows a [layered/mixed/flat] pattern..."
  - Describe the primary execution flows in plain language
  - Highlight the most complex paths and where risk concentrates

**Per-Object Summaries** (1 paragraph each):
  - For each in-scope object: "When a {{Object}} record is [created/updated], the following sequence executes: ..."
  - Focus on what matters architecturally, not every minor step

**Critical Paths** (bullet list):
  - The 3–5 most important/risky execution chains
  - Why they matter (high cascade depth, governor risk, business-critical)

**Recommendations** (prioritized list):
  - Architectural improvements based on anti-patterns, governor risks, and separation-of-concerns violations
  - Each: what to change, why, expected benefit, effort estimate

Store → `sf_architecture.narrative`

---

## Completion [IO/GEN]
Update `{{context_file}}`:
- `metadata.phases_completed` append `"sf_architecture"`
- `metadata.current_phase` = `"sf_platform"`
- `metadata.last_updated` = ISO timestamp
- Write `sf_architecture.execution_complexity`:
  - `max_cascade_depth` — deepest cascade chain across all objects
  - `highest_governor_risk` — worst governor risk level (Critical/High/Medium/Low)
  - `re_entrant_cascade_count` — number of re-entrant cascade paths
  - `objects_with_mixed_automation` — objects with both triggers + record-triggered flows on same event
- Extend `synthesis.unified_truth` with:
  - `architecture_summary` — layer map summary, separation-of-concerns scores, anti-pattern count by severity
  - `execution_complexity` — same data as `sf_architecture.execution_complexity` (convenience copy in synthesis)
  - `critical_chains` — top 3 riskiest execution chains (object, event, risk level, reason)
  - `automation_conflicts` — count of objects with overlapping triggers + flows, duplicate logic instances
- Append `{"phase":"sf_architecture","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Architecture analysis for {{scope.feature_area}} complete. Mapped order of operations for {{object_count}} objects across {{chain_count}} execution chains. Max cascade depth: {{max_depth}}. Governor risk: {{highest_risk}}. Found {{anti_pattern_count}} anti-patterns ({{critical_count}} critical). The system follows a {{architecture_style}} pattern. Use `/feature-research-phase-03d` for platform discovery."**

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 03b not completed | **STOP** — "Run `/feature-research-phase-03b` first" |
| No triggers or flows found for an object | Object has no custom automation; note as "data-only object" in narrative |
| Cannot determine execution order (ambiguous metadata) | Log assumption with reasoning; note confidence level in synthesis |
| Cascade depth exceeds 5 levels | Stop tracing at depth 5; flag as "deep cascade — requires manual verification" |
| Cannot determine if Apex is bulkified (no source available) | Log assumption; flag as "bulk behavior unverified" in governor risk |
| Mixed automation (trigger + flow on same event) | Flag as architectural risk; note Salesforce's documented order but warn about field update conflicts |
| Circular cascade detected | Document the cycle; assess if recursion guards exist; flag severity based on guard presence |
