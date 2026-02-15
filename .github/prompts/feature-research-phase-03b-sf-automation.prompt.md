# Feature Research Phase 03b – Salesforce Automation Discovery
Role: Salesforce Automation Architect
Mission: Document all automation — triggers, flows, Apex classes, validation rules — and build a dependency graph for all in-scope objects.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: Scope from `{{context_file}}.scope.sf_objects[]`, schema context from `{{context_file}}.sf_schema`

## Constraints
- **Read-only** – NO ADO/wiki/SF modifications
- **CLI-only** – per util-base guardrails (SF operations use `{{cli.*}}` commands only)
- **Outputs to** `{{context_file}}.sf_automation`
- **Rolling synthesis** – extend `synthesis` with automation findings
- **All streams mandatory** – batch SF operations when beneficial
- **Feedback loops** – max 3 iterations/stream

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
1. [IO] Write `{{context_file}}.sf_automation.[stream_section]` → save to disk
2. [GEN] Extend `{{context_file}}.synthesis` + `.synthesis.assumptions[]` with new evidence
3. [IO] Append to `{{context_file}}.run_state.completed_steps[]`
4. [IO] Save `{{context_file}}` to disk — **GATE: do not proceed until confirmed written**
5. On batch failure: log failed objects to `run_state.errors[]`; save to disk; continue with successes

## Context Paths
`{{research_root}}` = `{{paths.artifacts_root}}/sf-research/{{sanitized_name}}`
`{{context_file}}` = `{{research_root}}/research-context.json`

## Prerequisites [IO]
A1 [IO]: Load `{{context_file}}`; verify:
  - `"sf_schema"` in `metadata.phases_completed`
  - `sf_schema.objects` is populated (at least 1 object described)
A2 [IO]: Load `scope.sf_objects[]` and `sf_schema.objects[]` for reference
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Automation Output Structure
All outputs to `{{context_file}}.sf_automation`:
- `triggers[]` — `{ object, name, events[], is_active, handler_class, handler_chain[], framework_compliant }`
- `flows[]` — `{ object, name, type, process_type, description, is_active, dml_operations[], subflow_calls[], apex_actions[], error_handling }`
- `apex_classes[]` — `{ name, category, referenced_objects[], soql_queries[], dml_statements[], callout_references[], event_publishes[], test_class, lines_of_code }`
- `validation_rules[]` — `{ object, name, is_active, formula, error_message, error_field, cross_object_refs[] }`
- `dependency_graph` — `{ nodes[], edges[], circular_dependencies[], stats }`
- `risk_assessment[]` — `{ component, risk_level, downstream_count, description }`

---

## Stream 1 [CLI/GEN] – Trigger Discovery
**Goal:** Catalog all triggers and trace handler chains → `{{context_file}}.sf_automation.triggers`

### Discovery
B1 [CLI]: For each in-scope object:
  - `{{cli.sf_triggers}} --object {{object}} --json`
B2 [GEN]: For each trigger returned, extract:
  - `name`, `object` (TableEnumOrId), `is_active` (Status = "Active")
  - `events[]` — which DML events fire it: BeforeInsert, AfterInsert, BeforeUpdate, AfterUpdate, BeforeDelete, AfterDelete, AfterUndelete
  - `body` — the trigger body source (if available)

### Handler Chain Tracing
B3 [GEN]: From trigger body, identify the handler class invocation pattern:
  - **Metadata-driven (TAF)** — look for `TriggerActionFlowBypass`, `MetadataTriggerHandler`, or custom metadata references
  - **Direct handler** — look for `new {{ClassName}}().run()` or similar patterns
  - **Inline logic** — trigger body contains direct SOQL/DML (anti-pattern)
B4 [CLI]: For each identified handler class:
  - `{{cli.sf_apex}} --pattern "%{{handler_class}}%" --json`
B5 [GEN]: Trace the chain: trigger → handler → service class → selector/domain layer
  - Extract class names at each layer
  - Note if handler delegates to service classes or contains logic directly
B6 [GEN]: Assess trigger framework compliance:
  - `framework_compliant` = true if metadata-driven (TAF pattern)
  - `framework_compliant` = false if direct handler or inline logic
  - Note specific non-compliance details

### Output
B7 [GEN]: Store each trigger:
  `{ object, name, events[], is_active, handler_class, handler_chain[], framework_compliant }`
  → `sf_automation.triggers[]`

---

## Stream 2 [CLI/GEN] – Flow Discovery
**Goal:** Catalog all flows related to in-scope objects → `{{context_file}}.sf_automation.flows`

### Object-Specific Flows
C1 [CLI]: For each in-scope object:
  - `{{cli.sf_flows}} --object {{object}} --json`
C2 [GEN]: For each flow returned, extract:
  - `name` (DeveloperName), `label` (MasterLabel), `description`
  - `type` — categorize by ProcessType + TriggerType:
    - **Record-Triggered Before** — AutoLaunchedFlow + RecordBeforeSave
    - **Record-Triggered After** — AutoLaunchedFlow + RecordAfterSave
    - **Record-Triggered Delete** — AutoLaunchedFlow + RecordBeforeDelete
    - **Screen Flow** — Flow
    - **Autolaunched** — AutoLaunchedFlow (no trigger)
    - **Scheduled** — AutoLaunchedFlow + Scheduled
    - **Platform Event-Triggered** — AutoLaunchedFlow + PlatformEvent
  - `is_active` (Status = "Active"), `process_type`, `object` (TriggerObjectOrEvent)

### Global/Scheduled Flow Scan
C3 [CLI]: `{{cli.sf_flows}} --all --json`
C4 [GEN]: Filter for flows that reference in-scope objects but are not object-triggered:
  - Scheduled flows with SOQL referencing scope objects
  - Platform Event-triggered flows related to scope events
  - Autolaunched flows invoked by Apex that processes scope objects
  - Deduplicate against C1 results

### Flow Detail Analysis
C5 [GEN]: For each flow, analyze available metadata:
  - `dml_operations[]` — Record Create, Record Update, Record Delete elements (target objects)
  - `subflow_calls[]` — Subflow elements with referenced flow names
  - `apex_actions[]` — Apex Action elements with class/method names
  - `error_handling` — presence of Fault connectors (true/false); note flows without error handling as risk

### Output
C6 [GEN]: Store each flow:
  `{ object, name, type, process_type, description, is_active, dml_operations[], subflow_calls[], apex_actions[], error_handling }`
  → `sf_automation.flows[]`

---

## Stream 3 [CLI/GEN] – Apex Class Discovery
**Goal:** Catalog Apex classes that reference in-scope objects → `{{context_file}}.sf_automation.apex_classes`

### Discovery
D1 [CLI]: For each in-scope object:
  - `{{cli.sf_apex}} --pattern "%{{object}}%" --json`
D2 [GEN]: Deduplicate across objects (a class may reference multiple scope objects)

### Classification
D3 [GEN]: Categorize each class based on naming patterns, annotations, and content:
  - **Trigger Handler** — name ends with `TriggerHandler`, `Handler`; implements trigger handler interface
  - **Service** — name ends with `Service`; contains business logic methods
  - **Selector** — name ends with `Selector`; contains SOQL queries
  - **Domain** — name ends with `Domain`; extends SObjectDomain or similar
  - **Batch** — implements `Database.Batchable`; has `start()`, `execute()`, `finish()`
  - **Schedulable** — implements `Schedulable`; has `execute(SchedulableContext)`
  - **Queueable** — implements `Queueable`; has `execute(QueueableContext)`
  - **Invocable** — has `@InvocableMethod` annotation
  - **REST Endpoint** — has `@RestResource` annotation
  - **SOAP Endpoint** — has `webservice` keyword
  - **Test Class** — has `@IsTest` or `@isTest` annotation
  - **Utility** — helper/utility patterns not matching above
  - **Controller** — Visualforce or Aura controller patterns

### Content Analysis
D4 [GEN]: For each non-test class, extract:
  - `referenced_objects[]` — SF objects referenced in SOQL/DML
  - `soql_queries[]` — SOQL query patterns (SELECT fields FROM object WHERE...)
  - `dml_statements[]` — insert/update/upsert/delete/undelete operations
  - `callout_references[]` — HttpRequest, Http.send, WebServiceCallout patterns
  - `event_publishes[]` — EventBus.publish references
  - `lines_of_code` — approximate LOC
D5 [GEN]: Identify batch chains — classes where `finish()` method enqueues another batch/queueable
D6 [GEN]: Identify test classes that correspond to each production class (by naming convention `{{ClassName}}Test` or `{{ClassName}}_Test`)

### Output
D7 [GEN]: Store each class:
  `{ name, category, referenced_objects[], soql_queries[], dml_statements[], callout_references[], event_publishes[], test_class, lines_of_code }`
  → `sf_automation.apex_classes[]`

---

## Stream 4 [CLI/GEN] – Validation Rules
**Goal:** Catalog all validation rules for in-scope objects → `{{context_file}}.sf_automation.validation_rules`

### Discovery (batch)
E1 [CLI]: `{{cli.sf_validation}} {{obj1}},{{obj2}},{{objN}} --batch --json`
  - If single object: `{{cli.sf_validation}} {{object}} --json`

### Analysis
E2 [GEN]: For each validation rule, extract:
  - `name` (DeveloperName), `object`, `is_active` (Active)
  - `formula` (ErrorConditionFormula) — the validation formula
  - `error_message` (ErrorMessage), `error_field` (ErrorDisplayField — field-level or page-level)
E3 [GEN]: Analyze formula for cross-references:
  - Fields from related objects (e.g., `Account.Industry`, `Parent.Name`)
  - Custom metadata references (`$CustomMetadata.Type.Record.Field__c`)
  - Custom label references (`$Label.CustomLabel`)
  - Custom setting references (`$Setup.Setting__c.Field__c`)
E4 [GEN]: Store `cross_object_refs[]` for each rule

### Output
E5 [GEN]: Store each rule:
  `{ object, name, is_active, formula, error_message, error_field, cross_object_refs[] }`
  → `sf_automation.validation_rules[]`

---

## Stream 5 [CLI/GEN] – Dependency Graph
**Goal:** Build full automation dependency graph and risk assessment → `{{context_file}}.sf_automation.dependency_graph` + `.risk_assessment`

### Graph Construction
F1 [CLI]: For key Apex classes (handlers, services, batch — max 10):
  - `{{cli.sf_discover}} --type ApexClass --name {{class}} --depth 3 --json`
F2 [GEN]: Build graph nodes from all discovered components:
  - Triggers, Flows, Apex Classes, Validation Rules, Platform Events (from prior streams)
  - Each node: `{ id, name, type, object }`
F3 [GEN]: Build graph edges from traced relationships:
  - Trigger → Handler (from Stream 1 handler_chain)
  - Handler → Service → Selector (from Stream 1 chain tracing)
  - Flow → Subflow (from Stream 2 subflow_calls)
  - Flow → Apex Action (from Stream 2 apex_actions)
  - Apex → Apex (from service calls, batch chains in Stream 3)
  - Apex → External (from callout_references in Stream 3)
  - Each edge: `{ from, to, relationship_type }`

### Circular Dependency Detection
F4 [GEN]: Walk the graph to identify cycles:
  - Trigger A → Handler → Service → DML on Object B → Trigger B → Handler → DML on Object A
  - Flow recursion chains (subflow calls that eventually circle back)
  - Store cycles → `dependency_graph.circular_dependencies[]`

### Impact Assessment
F5 [GEN]: Count downstream dependencies per component:
  - **Low** — <5 downstream dependents
  - **Medium** — 5–15 downstream dependents
  - **High** — 15–50 downstream dependents
  - **Critical** — >50 downstream dependents
F6 [GEN]: Identify high-risk regression candidates:
  - Components with Critical/High impact + multiple objects affected
  - Components involved in circular dependencies
  - Active triggers without test classes identified
  - Flows without error handling (fault paths)

### Output
F7 [GEN]: Store graph: `{ nodes[], edges[], circular_dependencies[], stats: { total_nodes, total_edges, max_depth, component_counts_by_type } }`
  → `sf_automation.dependency_graph`
F8 [GEN]: Store risk assessment:
  `{ component, risk_level (Critical/High/Medium/Low), downstream_count, description }`
  → `sf_automation.risk_assessment[]`

---

## Completion [IO/GEN]
Update `{{context_file}}`:
- `metadata.phases_completed` append `"sf_automation"`
- `metadata.current_phase` = `"sf_platform"`
- `metadata.last_updated` = ISO timestamp
- Extend `synthesis.unified_truth` with:
  - `automation_summary` — total triggers, flows, Apex classes, validation rules; active vs inactive counts
  - `key_risks` — top 3 high/critical risk components
  - `framework_compliance` — % of triggers using TAF; % of flows with error handling
  - `dependency_complexity` — graph stats, circular dependency count
- Append `{"phase":"sf_automation","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Automation discovery complete. {{trigger_count}} triggers, {{flow_count}} flows, {{apex_count}} Apex classes, {{vr_count}} validation rules cataloged. Use `/feature-research-phase-03c` for platform discovery."**

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 03a not completed | **STOP** — "Run `/feature-research-phase-03a` first" |
| sf_triggers returns 0 for an object | Log; object may not have triggers; continue |
| sf_flows returns 0 for an object | Log; object may not have flows; continue |
| sf_apex returns 0 for an object | Log; note no Apex references; continue |
| sf_validation fails for batch | Retry individually per object; log failures |
| sf_discover fails for a class | Log error; build partial graph from other streams |
| Handler class not found in apex search | Log; may be in managed package or deleted; note in risk_assessment |
| Very large Apex result set (100+ classes) | Prioritize by category (handlers, services first); note partial coverage |
