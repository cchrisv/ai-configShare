# Feature Research Phase 04 – Analysis
Role: Solution Architect
Mission: Benchmark discovered implementation against web best practices and internal standards; assess risks, gaps, and modernization opportunities.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: Full context from `{{context_file}}` — all prior phases (scope, ado_research, sf_schema, sf_automation, sf_architecture, sf_platform)

## Constraints
- **Read-only** – NO ADO/wiki/SF modifications
- **CLI-only** – per util-base guardrails
- **Mission-focused** – you are analyzing the implementation of **{{scope.feature_area}}**; every risk, compliance check, and recommendation should be framed in terms of this feature's health and architectural quality
- **Outputs to** `{{context_file}}.analysis` + extends `.synthesis`
- **All streams mandatory**
- **Feedback loops** – max 3 iterations/stream
- **Standards from config** – load from `{{paths.standards}}/`; do NOT invent standards

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
Stream sections: Stream 1 → `analysis.web_research`, Stream 2 → `.compliance_scorecard`, Stream 3 → `.risk_register` + `.gap_analysis` + `.modernization_opportunities`, Stream 4 → `.executive_summary_data`
1. [IO] Write `{{context_file}}.analysis.[stream_section]` → save to disk
2. [GEN] Extend `{{context_file}}.synthesis` with new evidence
3. [IO] Append to `{{context_file}}.run_state.completed_steps[]`
4. [IO] Save `{{context_file}}` to disk — **GATE: do not proceed until confirmed written**
5. On error: log to `run_state.errors[]`; save to disk; continue

## Context Paths
`{{research_root}}` = `{{paths.artifacts_root}}/sf-research/{{sanitized_name}}`
`{{context_file}}` = `{{research_root}}/research-context.json`

## Prerequisites [IO]
A1 [IO]: Load `{{context_file}}`; verify:
  - `"sf_platform"` in `metadata.phases_completed`
  - `sf_schema`, `sf_automation`, `sf_platform` sections populated
A2 [IO]: Load all prior phase data for cross-referencing:
  - `scope` — objects, feature area, keywords
  - `ado_research` — business context, decisions, wiki pages
  - `sf_schema` — objects, fields, relationships, PII
  - `sf_automation` — triggers, flows, Apex, LWC, Aura, validation rules, dependency graph, risk assessment
  - `sf_architecture` — order of operations, execution chains, cross-object cascades, anti-patterns, architectural narrative
  - `sf_platform` — security, integrations, data landscape
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Mission Anchor [IO/GEN]
**Before any analysis begins, ground yourself in the full research context.**

MA1 [IO]: From `{{context_file}}`, read and internalize:
  - `scope.feature_area` — **what** we are researching
  - `scope.research_purpose` — **why** we are researching it
  - `scope.sf_objects[]` — the Salesforce objects in scope
  - `ado_research.business_context` — business purpose, rules, decisions, stakeholders
  - `sf_schema` — object model summary (object count, field count, relationships, PII)
  - `sf_automation` — automation inventory (triggers, flows, Apex, dependency graph, risk assessment)
  - `sf_platform` — security model, integrations, data landscape
  - `synthesis.unified_truth` — cumulative understanding from all discovery phases

MA2 [GEN]: State the full picture: *"I am analyzing the implementation quality of **{{scope.feature_area}}**. This feature spans {{sf_schema.objects | length}} objects, {{sf_automation.dependency_graph.stats.total_nodes}} automation components, and {{sf_platform.integrations.platform_events | length}} integrations. Architecture analysis found {{sf_architecture.architecture_patterns.anti_patterns | length}} anti-patterns with max cascade depth of {{sf_architecture.execution_complexity.max_cascade_depth}}. Business purpose: {{ado_research.business_context.feature_purpose | truncate(100)}}. I will benchmark this implementation against web best practices and internal standards, incorporating the architectural risks from Phase 03c."*

MA3: **Frame EVERY finding in terms of {{scope.feature_area}}.** Don't write generic compliance observations — write "The {{scope.feature_area}} trigger handler for {{object}} lacks..." and "The {{scope.feature_area}} flow for {{process}} does not handle...". Make the analysis feel like it was written by an architect who deeply understands this specific feature.

---

## Analysis Output Structure
All outputs to `{{context_file}}.analysis`:
- `web_research` — `{ search_queries[], findings[], best_practices[], known_issues[] }`
- `compliance_scorecard[]` — `{ component, component_type, standard, status, severity, finding, recommendation }`
- `risk_register[]` — `{ id, risk, category, severity, impact, likelihood, affected_components[], recommendation }`
- `gap_analysis[]` — `{ area, gap_type, description, severity, recommendation }`
- `modernization_opportunities[]` — `{ current_pattern, recommended_pattern, effort, benefit, affected_components[] }`
- `executive_summary_data` — `{ key_stats{}, top_risks[], compliance_score, critical_findings[], recommendations_priority[] }`

---

## Stream 1 [API/GEN] – Web Research
**Goal:** Benchmark **{{scope.feature_area}}**'s implementation patterns against industry standards and Salesforce best practices → `{{context_file}}.analysis.web_research`

### Query Generation
B1 [IO]: Load key patterns from prior phases:
  - Automation patterns (trigger framework type, flow patterns, batch processing)
  - Architecture patterns (order of operations conflicts, cascade depth, governor risks from `sf_architecture`)
  - Integration patterns (callout types, event architecture)
  - Object model patterns (custom object count, relationship complexity)
  - Known risks from `sf_automation.risk_assessment[]` + `sf_architecture.architecture_patterns.anti_patterns[]`
B2 [GEN]: Generate 3–5 targeted search queries based on:
  - Technologies discovered (e.g., "Salesforce trigger actions framework best practices" + current year)
  - Patterns found (e.g., "Salesforce record-triggered flow vs trigger performance")
  - Anti-patterns detected (e.g., "Salesforce flow without error handling risks")
  - Integration patterns (e.g., "Salesforce platform events retry and error handling")
  - Data scale concerns (e.g., "Salesforce large data volume best practices {{object_name}}")

### Research
B3 [API]: Execute web searches — prioritize:
  1. Salesforce Developer Documentation (developer.salesforce.com)
  2. Salesforce Architects guides (architect.salesforce.com)
  3. Salesforce Trailhead (trailhead.salesforce.com)
  4. Salesforce Known Issues (issues.salesforce.com)
  5. Salesforce Stack Exchange, community forums
B4 [API]: Fetch top 2–3 relevant results per query for detailed review
B5 [GEN]: Extract per result:
  - Actionable guidance relevant to discovered implementation
  - Version-specific considerations for API version `{{sf_defaults.api_version}}`
  - Known issues that may affect in-scope components
  - Recommended patterns with concrete examples

### Output
B6 [GEN]: Store:
  - `search_queries[]` — queries executed with result count
  - `findings[]` — `{ source, url, summary, relevance, applicable_components[] }`
  - `best_practices[]` — `{ topic, practice, source, current_compliance (met/partial/not_met) }`
  - `known_issues[]` — `{ issue_id, title, description, affected_components[], workaround }`

---

## Stream 2 [IO/GEN] – Standards Compliance
**Goal:** Compare **{{scope.feature_area}}**'s implementation against internal architectural standards — produce a feature-specific scorecard → `{{context_file}}.analysis.compliance_scorecard`

### Load Standards
C1 [IO]: Load applicable standards from `{{paths.standards}}/` based on what was discovered:
  - `#file:config/standards/apex-well-architected.md` — if `sf_automation.apex_classes[]` has entries
  - `#file:config/standards/flow-well-architected.md` — if `sf_automation.flows[]` has entries
  - `#file:config/standards/flow-naming-conventions.md` — if flows found
  - `#file:config/standards/trigger-actions-framework-standards.md` — if `sf_automation.triggers[]` has entries
  - `#file:config/standards/metadata-naming-conventions.md` — always (naming compliance for objects, fields, flows, classes)
  - `#file:config/standards/event-driven-architecture-standards.md` — if `sf_platform.integrations.platform_events[]` has entries
  - `#file:config/standards/async-processing-standards.md` — if batch/schedulable/queueable classes found in `sf_automation.apex_classes[]`
  - `#file:config/standards/flow-subflow-usage.md` — if subflow calls found in `sf_automation.flows[]`

### Compliance Checks
C2 [GEN]: **Apex compliance** (if applicable):
  - Security: `with sharing` keyword usage, FLS checks, bind variables in SOQL
  - Performance: No SOQL/DML in loops, bulkification patterns
  - Architecture: Trigger → Handler → Service pattern adherence
  - Testing: Test class coverage, bulk test patterns (200+ records)
  - Naming: Class naming conventions per standards
C3 [GEN]: **Flow compliance** (if applicable):
  - Error handling: Fault connector presence on all DML/external elements
  - Performance: No DML/SOQL in loops, efficient queries
  - Modularity: Subflow usage for reusable logic
  - Naming: Flow and resource naming per `flow-naming-conventions.md`
  - Record-triggered flow order: Before vs After usage appropriateness
C4 [GEN]: **Trigger framework compliance** (if applicable):
  - Metadata-driven trigger actions (TAF) vs hardcoded handlers
  - Bypass mechanism: Global → Permission → Transaction hierarchy
  - One trigger per object rule
  - Entry criteria via formula-based filtering
C5 [GEN]: **Naming convention compliance** (always):
  - Objects: PascalCase API names, Title Case labels
  - Fields: PascalCase `__c` with descriptive names
  - Flows: Natural language naming per convention
  - Apex: Standard class naming patterns
  - Validation Rules: descriptive names matching convention
C6 [GEN]: **Event-driven compliance** (if applicable):
  - Event naming: `<Domain>_<Action>_<Version>__e` pattern
  - Required fields: Transaction_Id__c, Source_System__c, Event_Time__c
  - Publish patterns: publish after DML (not before)

### Scorecard Generation
C7 [GEN]: For each component checked, generate scorecard entry:
  `{ component, component_type (Apex/Flow/Trigger/Object/Field/Event), standard (reference), status (Compliant/Non-Compliant/Partial), severity (Critical/High/Medium/Low), finding (what was found), recommendation (what should change) }`

**Severity criteria:**
  - **Critical** — security vulnerability, data loss risk, governor limit violation
  - **High** — performance issue, missing error handling, architectural anti-pattern
  - **Medium** — naming convention violation, missing documentation, non-standard pattern
  - **Low** — style preference, minor optimization opportunity

---

## Stream 3 [GEN] – Risk and Gap Analysis
**Goal:** Consolidate all risks to **{{scope.feature_area}}** and identify gaps that could impact reliability, security, or maintainability → `{{context_file}}.analysis.risk_register` + `.gap_analysis`

### Risk Register
D1 [IO]: Load `sf_automation.risk_assessment[]` from Phase 03b and `sf_architecture.architecture_patterns.anti_patterns[]` + `sf_architecture.transaction_analysis.governor_risks[]` from Phase 03c (baseline risks)
D2 [GEN]: Augment with new risks from compliance analysis + web research:
  - **Security risks** — PII exposure (from `sf_schema.pii_fields[]` + `sf_platform.security`), missing FLS checks, overly permissive sharing
  - **Performance risks** — governor limit exposure (from Apex analysis), large data volumes + complex queries, DML in loops
  - **Reliability risks** — flows without error handling, circular dependencies, missing test coverage
  - **Maintainability risks** — inline trigger logic, undocumented components, high coupling in dependency graph
  - **Compliance risks** — non-standard patterns, naming violations, framework non-compliance
D3 [GEN]: For each risk:
  `{ id (R-001...), risk, category (security/performance/reliability/maintainability/compliance), severity (Critical/High/Medium/Low), impact, likelihood (High/Medium/Low), affected_components[], recommendation }`
D4 [GEN]: Sort by severity (Critical first), then by likelihood

### Gap Analysis
D5 [GEN]: Identify gaps across categories:
  - **Documentation gaps** — objects/flows/classes with no description or wiki coverage
  - **Testing gaps** — Apex classes without corresponding test classes (from `sf_automation.apex_classes[].test_class`)
  - **Error handling gaps** — flows without fault paths, Apex without try/catch
  - **Security gaps** — missing sharing declarations, no FLS enforcement
  - **Monitoring gaps** — no logging framework usage, no error alerting
D6 [GEN]: For each gap:
  `{ area, gap_type (documentation/testing/error_handling/security/monitoring), description, severity, recommendation }`

### Modernization Opportunities
D7 [GEN]: Identify legacy patterns that have modern alternatives:
  - Workflow Rules → Record-Triggered Flows
  - Process Builder → Record-Triggered Flows
  - Hardcoded triggers → Trigger Actions Framework (metadata-driven)
  - SOAP API callouts → REST/Named Credentials
  - Batch Apex for simple operations → Platform Events or Queueable
  - Visualforce → LWC
D8 [GEN]: For each opportunity:
  `{ current_pattern, recommended_pattern, effort (Low/Medium/High), benefit (Low/Medium/High), affected_components[] }`

---

## Stream 4 [GEN] – Final Synthesis
**Goal:** Distill the full **{{scope.feature_area}}** analysis into executive summary data — the story an architect needs to tell leadership → `{{context_file}}.analysis.executive_summary_data`

### Key Statistics
E1 [GEN]: Compile `key_stats{}`:
  - `objects_count` — from `sf_schema.objects[]`
  - `total_fields` — from `sf_schema.field_inventory[]`
  - `custom_fields` — count where category = custom
  - `relationships_count` — from `sf_schema.relationships[]`
  - `triggers_count` (active/total) — from `sf_automation.triggers[]`
  - `flows_count` (active/total) — from `sf_automation.flows[]`
  - `apex_classes_count` — from `sf_automation.apex_classes[]`
  - `lwc_count` — from `sf_automation.lwc_components[]`
  - `aura_count` — from `sf_automation.aura_components[]`
  - `validation_rules_count` (active/total) — from `sf_automation.validation_rules[]`
  - `discovery_stats` — from `sf_automation.relevance_filter.stats` (candidates found vs feature-relevant)
  - `integrations_count` — platform events + named credentials + callout patterns
  - `total_records` — sum from `sf_platform.data_landscape.volumes[]`
  - `profiles_with_access` — distinct profiles from `sf_platform.security.object_permissions[]`
  - `pii_fields_count` — from `sf_schema.pii_fields[]`

### Compliance Score
E2 [GEN]: Calculate overall compliance score:
  - Total checked components from `compliance_scorecard[]`
  - Compliant count / total checked * 100 = compliance percentage
  - Category breakdown: Apex %, Flow %, Naming %, Security %, Events %

### Critical Findings
E3 [GEN]: Extract top findings (max 10, sorted by severity):
  - Combine Critical + High items from risk_register, compliance_scorecard, gap_analysis
  - Each: `{ finding, severity, category, recommendation }`

### Prioritized Recommendations
E4 [GEN]: Generate `recommendations_priority[]` (max 10):
  - Sort by: severity (Critical first) → effort (Low first for quick wins) → benefit (High first)
  - Each: `{ rank, recommendation, category, severity, effort, benefit, affected_components[] }`

---

## Completion [IO/GEN]
Update `{{context_file}}`:
- `metadata.phases_completed` append `"analysis"`
- `metadata.current_phase` = `"documentation"`
- `metadata.last_updated` = ISO timestamp
- Finalize `synthesis.unified_truth` with:
  - `analysis_complete` = true
  - `compliance_score` — overall percentage
  - `risk_count_by_severity` — `{ critical: N, high: N, medium: N, low: N }`
  - `top_recommendation` — single most impactful recommendation
- Resolve any remaining `synthesis.assumptions[]` — mark as confirmed or unresolved
- Append `{"phase":"analysis","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Analysis of {{scope.feature_area}} complete. Compliance score: {{score}}%. {{critical_count}} critical findings, {{risk_count}} total risks. Top recommendation: {{recommendations_priority[0].recommendation | truncate(100)}}. Use `/feature-research-phase-05` to generate the research report."**

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 03d not completed | **STOP** — "Run `/feature-research-phase-03d` first" |
| Standards file not found | Log warning; skip that standard; note partial compliance check |
| Web search returns 0 results | Log; proceed with standards analysis only; note limited external benchmarking |
| Web fetch fails for a URL | Log; continue with remaining results |
| No Apex classes found (nothing to check) | Skip Apex compliance; note N/A in scorecard |
| No flows found | Skip Flow compliance; note N/A in scorecard |
| Very large component set (100+ items) | Prioritize Critical/High severity checks; note selective coverage |
