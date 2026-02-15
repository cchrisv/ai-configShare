# Feature Research Phase 05 – Documentation
Role: Technical Writer / Documentation Architect
Mission: Generate a comprehensive research report from all prior phases and publish to ADO Wiki + local artifact.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: Full context from `{{context_file}}`

## Constraints
- **CLI-only** – per util-base guardrails
- **Markdown output** – generate wiki-compatible markdown (ADO Wiki flavor)
- **No raw HTML in report** – use markdown tables, headings, mermaid diagrams
- **Mermaid diagrams** – use `graph TD` for relationships, `erDiagram` for object model; no spaces in node IDs
- **Evidence-cited** – every finding links back to source (phase, component, standard)
- **Dual audience** – executive summary for leaders; technical sections for architects
- **ADO Wiki compatible** – use `[[_TOC_]]` for table of contents; standard markdown formatting

## Context Paths
`{{research_root}}` = `{{paths.artifacts_root}}/sf-research/{{sanitized_name}}`
`{{context_file}}` = `{{research_root}}/research-context.json`
`{{report_file}}` = `{{research_root}}/research-report.md`

## Prerequisites [IO]
A1 [IO]: Load `{{context_file}}`; verify:
  - `"analysis"` in `metadata.phases_completed`
  - `analysis.executive_summary_data` is populated
  - `analysis.compliance_scorecard` is populated
  - `sf_schema`, `sf_automation`, `sf_platform` sections populated
A2: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

---

## Step 1 [IO] – Load All Context
B1 [IO]: Load complete `{{context_file}}`
B2 [IO]: Extract key data sets:
  - `scope` — feature area name, SF objects, related ADO items
  - `ado_research` — business context, wiki pages, decisions
  - `sf_schema` — objects, fields, relationships, record types, PII
  - `sf_automation` — triggers, flows, Apex classes, validation rules, dependency graph
  - `sf_platform` — security, integrations, data landscape
  - `analysis` — web research, compliance scorecard, risk register, gap analysis, executive summary data
  - `synthesis` — unified truth, assumptions

---

## Step 2 [GEN] – Generate Report Sections

### Section 1: Title and TOC
```
# {{scope.feature_area}} — Salesforce Feature Research Report
**Generated:** {{metadata.last_updated}}
**Scope:** {{scope.sf_objects | join(", ")}}
**ADO References:** {{scope.related_ado_items | count}} work items

[[_TOC_]]
```

### Section 2: Executive Summary
C1 [GEN]: Generate from `analysis.executive_summary_data`:
- **Purpose** — 2–3 sentences: what this feature area does (from `synthesis.unified_truth`)
- **Scope** — objects researched, automation components discovered, integrations found
- **Key Statistics** — table from `key_stats{}`:

| Metric | Count |
|--------|-------|
| Custom Objects | N |
| Total Fields | N (N custom) |
| Relationships | N |
| Triggers (active/total) | N/N |
| Flows (active/total) | N/N |
| Apex Classes | N |
| Validation Rules (active/total) | N/N |
| Integrations | N |
| Total Records | N |
| PII Fields | N |

- **Compliance Score** — overall percentage + category breakdown
- **Top Findings** — bullet list of `critical_findings[]` (max 5)
- **Top Recommendations** — numbered list from `recommendations_priority[]` (max 5)

### Section 3: Object Model
C2 [GEN]: Generate from `sf_schema`:
- **Entity Relationship Diagram** — mermaid `erDiagram` from `sf_schema.relationships[]`:
  - Show all in-scope objects with key fields
  - Show relationship types (master-detail as `||--o{`, lookup as `}o--o{`)
  - Include junction objects if any
- **Object Inventory Table** — from `sf_schema.objects[]`:

| Object | Label | Custom | Fields | Record Types | Child Relationships |
|--------|-------|--------|--------|-------------|-------------------|

- **Field Inventory** — per object, collapsible section:
  - Table: API Name, Label, Type, Required, Category (custom/formula/lookup/etc.)
  - Highlight formula fields and cross-object references
- **Record Type Matrix** — from `sf_schema.record_types[]`:

| Object | Record Type | Active | Default | Description |
|--------|------------|--------|---------|-------------|

- **PII/Sensitive Fields** — from `sf_schema.pii_fields[]`:

| Object | Field | Type | Sensitivity |
|--------|-------|------|-------------|

### Section 4: Automation Inventory
C3 [GEN]: Generate from `sf_automation`:
- **Automation Summary** — mermaid `graph TD` showing trigger → handler → service chains and flow → subflow dependencies
- **Triggers** — table from `sf_automation.triggers[]`:

| Object | Trigger | Events | Handler | Framework Compliant |
|--------|---------|--------|---------|-------------------|

- **Flows** — table from `sf_automation.flows[]`:

| Object | Flow Name | Type | Active | DML Operations | Error Handling |
|--------|-----------|------|--------|---------------|---------------|

- **Apex Classes** — table from `sf_automation.apex_classes[]`:

| Class | Category | Referenced Objects | Callouts | Test Class |
|-------|----------|-------------------|----------|------------|

- **Validation Rules** — table from `sf_automation.validation_rules[]`:

| Object | Rule | Active | Error Field | Cross-Object Refs |
|--------|------|--------|-------------|------------------|

- **Dependency Graph** — mermaid `graph TD` from `sf_automation.dependency_graph`:
  - Nodes colored by type (trigger, flow, Apex, validation)
  - Highlight circular dependencies with dashed lines
  - Show component counts in graph stats

### Section 5: Integration Map
C4 [GEN]: Generate from `sf_platform.integrations`:
- **Integration Diagram** — mermaid `graph LR` showing:
  - In-scope objects → Platform Events → Subscribers
  - Apex Classes → Named Credentials → External Endpoints
  - CDC subscriptions
- **Platform Events** — table:

| Event | Label | Publishers | Subscribers |
|-------|-------|-----------|------------|

- **Named Credentials** — table:

| Credential | Endpoint | Referenced By |
|-----------|----------|--------------|

- **Callout Patterns** — table:

| Apex Class | Type | Named Credential | Direction |
|-----------|------|-----------------|-----------|

### Section 6: Security Model
C5 [GEN]: Generate from `sf_platform.security`:
- **Organization-Wide Defaults** — table:

| Object | Internal OWD | External OWD |
|--------|-------------|-------------|

- **Profile/Permission Set Access Matrix** — table showing CRUD per profile for each object
- **Field-Level Security Highlights** — PII field access summary:
  - Which profiles can read/edit PII fields
  - Recommendations for restriction
- **Sharing Rules** — summary of any identified sharing rules

### Section 7: Data Landscape
C6 [GEN]: Generate from `sf_platform.data_landscape`:
- **Record Volumes** — table:

| Object | Record Count | Freshness Status |
|--------|-------------|-----------------|

- **Record Type Distribution** — per object with record types:

| Object | Record Type | Count | % |
|--------|------------|-------|---|

- **Data Quality Indicators** — highlight fields with low population rates
- **Deployment History** — recent changes summary from SetupAuditTrail

### Section 8: ADO Traceability
C7 [GEN]: Generate from `ado_research`:
- **Related Work Items** — table:

| ID | Title | Type | State | SF References |
|----|-------|------|-------|--------------|

  - Each ID linked: `[#{{id}}](https://dev.azure.com/{{ado_defaults.organization_name}}/{{ado_defaults.project}}/_workitems/edit/{{id}})`
- **Key Decisions** — bullet list from `ado_research.business_context.decisions[]`
- **Wiki References** — list of related wiki pages with paths
- **Business Context** — narrative from `ado_research.business_context.feature_purpose`

### Section 9: Standards Compliance
C8 [GEN]: Generate from `analysis.compliance_scorecard`:
- **Compliance Summary** — overall score + category breakdown:

| Category | Checked | Compliant | Score |
|----------|---------|-----------|-------|

- **Non-Compliant Findings** — table sorted by severity:

| Severity | Component | Standard | Finding | Recommendation |
|----------|-----------|----------|---------|---------------|

- **Modernization Opportunities** — from `analysis.modernization_opportunities[]`:

| Current Pattern | Recommended | Effort | Benefit | Affected Components |
|----------------|-------------|--------|---------|-------------------|

### Section 10: Risk Register
C9 [GEN]: Generate from `analysis.risk_register`:
- **Risk Summary** — count by severity:

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |

- **Risk Details** — table sorted by severity:

| ID | Risk | Category | Severity | Likelihood | Impact | Recommendation |
|----|------|----------|----------|-----------|--------|---------------|

- **Gap Analysis** — from `analysis.gap_analysis[]`:

| Area | Gap Type | Description | Severity | Recommendation |
|------|----------|-------------|----------|---------------|

### Section 11: Appendix
C10 [GEN]: Generate supporting detail:
- **Full Dependency Graph** — expanded mermaid diagram with all nodes/edges
- **Assumptions** — from `synthesis.assumptions[]`:

| ID | Assumption | Confidence | Source |
|----|-----------|-----------|--------|

- **Research Metadata** — phases completed, timestamps, error log summary

---

## Step 3 [IO] – Save Local Artifact
D1 [IO]: Concatenate all sections into single markdown document
D2 [IO]: Write to `{{report_file}}`
D3 [IO]: Verify file saved — **GATE: confirm written**

---

## Step 4 [CLI] – Publish to Wiki
E1 [LOGIC]: Wiki path = `/Salesforce-Research/{{sanitized_name}}`
E2 [CLI]: Check existing: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json`
E3 [LOGIC]: Route:
  - **New page** → `{{cli.wiki_create}} --path "{{wiki_path}}" --content "{{report_file}}" --comment "Feature research: {{scope.feature_area}}" --json`
  - **Existing page** → `{{cli.wiki_update}} --path "{{wiki_path}}" --content "{{report_file}}" --comment "Feature research update: {{scope.feature_area}}" --json`
E4 [CLI]: Verify publication: `{{cli.wiki_get}} --path "{{wiki_path}}" --no-content --json` → confirm page exists with updated timestamp
E5 [IO]: Update `{{context_file}}.documentation`:
  - `wiki_path` = `{{wiki_path}}`
  - `published_at` = ISO timestamp

---

## Step 5 [IO/GEN] – Completion
Update `{{context_file}}`:
- `metadata.phases_completed` append `"documentation"`
- `metadata.current_phase` = `"complete"`
- `metadata.last_updated` = ISO timestamp
- Append `{"phase":"documentation","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user:
```
## Feature Research Complete

**Feature Area:** {{scope.feature_area}}
**Objects Researched:** {{scope.sf_objects | join(", ")}}

### Deliverables
- **Local Report:** {{report_file}}
- **Wiki Page:** [{{wiki_path}}](https://dev.azure.com/{{ado_defaults.organization_name}}/{{ado_defaults.project}}/_wiki/wikis/{{ado_defaults.wiki}}?pagePath=/Salesforce-Research/{{sanitized_name}})

### Key Metrics
- **Compliance Score:** {{compliance_score}}%
- **Critical Risks:** {{critical_risk_count}}
- **Total Components:** {{total_component_count}} (triggers, flows, Apex, validation rules)
- **Recommendations:** {{recommendation_count}} prioritized items

All research data saved to {{context_file}} for future reference.
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 04 not completed | **STOP** — "Run `/feature-research-phase-04` first" |
| Wiki create fails | Save local report; warn user; report local path as primary deliverable |
| Wiki update fails (conflict) | Retry once; if still fails, save local report and inform user |
| Report generation incomplete | Save partial report; note incomplete sections; continue with wiki publish |
| Mermaid diagram too complex (100+ nodes) | Simplify to top-level components; include full graph in appendix as text |
| Very large report (>50KB) | Split appendix into sub-pages if wiki supports it; otherwise truncate field lists |
