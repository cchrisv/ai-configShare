# Feature Research Phase 03a – Salesforce Schema Discovery
Role: Salesforce Data Architect
Mission: Document the complete object model — schema, fields, relationships, record types — for all in-scope Salesforce objects.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: Scope from `{{context_file}}.scope.sf_objects[]`

## Constraints
- **Read-only** – NO ADO/wiki/SF modifications
- **CLI-only** – per util-base guardrails (SF operations use `{{cli.*}}` commands only)
- **Outputs to** `{{context_file}}.sf_schema`
- **Rolling synthesis** – extend `synthesis` with schema findings
- **All streams mandatory** – batch SF operations when multiple objects
- **Feedback loops** – max 3 iterations/stream

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
Stream sections: Stream 1 → `sf_schema.objects` + `.field_inventory` + `.record_types`, Stream 2 → `sf_schema.relationships`, Stream 3 → `sf_schema.pii_fields` + `.field_analysis`
1. [IO] Write `{{context_file}}.sf_schema.[stream_section]` → save to disk
2. [GEN] Extend `{{context_file}}.synthesis` + `.synthesis.assumptions[]` with new evidence
3. [IO] Append to `{{context_file}}.run_state.completed_steps[]`
4. [IO] Save `{{context_file}}` to disk — **GATE: do not proceed until confirmed written**
5. On batch failure: log failed objects to `run_state.errors[]`; save to disk; continue with successes

## Context Paths
`{{research_root}}` = `{{paths.artifacts_root}}/sf-research/{{sanitized_name}}`
`{{context_file}}` = `{{research_root}}/research-context.json`

## Prerequisites [IO]
A1 [IO]: Load `{{context_file}}`; verify:
  - `"ado_discovery"` in `metadata.phases_completed`
  - `scope.sf_objects` has ≥1 entry
A2 [CLI]: Verify SF auth: `{{cli.sf_query}} "SELECT Id FROM Organization LIMIT 1" --json`
A3: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Schema Output Structure
All outputs to `{{context_file}}.sf_schema`:
- `objects[]` — `{ api_name, label, description, is_custom, field_count, record_type_count, child_relationships[] }`
- `field_inventory[]` — `{ object, api_name, label, type, length, required, unique, external_id, formula, default_value, help_text, category }`
- `relationships[]` — `{ from_object, to_object, field_name, relationship_type, relationship_name, is_cascade_delete }`
- `record_types[]` — `{ object, api_name, label, description, is_active, is_default }`
- `pii_fields[]` — `{ object, field, type, sensitivity_reason }`
- `field_analysis` — `{ by_category: {}, formula_dependencies[], cross_object_formulas[], unused_candidates[] }`

---

## Stream 1 [CLI/GEN] – Object Schema Discovery
**Goal:** Full field inventory and record types for all in-scope objects → `{{context_file}}.sf_schema.objects` + `.field_inventory` + `.record_types`

### Describe Objects (batch when multiple)
B1 [CLI]: `{{cli.sf_describe}} {{obj1}},{{obj2}},{{objN}} --batch --json`
  - If single object: `{{cli.sf_describe}} {{object}} --json`
  - Extract per object: label, description, isCustom, keyPrefix, fields[], recordTypeInfos[], childRelationships[]

### Field Extraction
B2 [GEN]: For each object's fields[], extract:
  - `api_name` (name), `label`, `type`, `length`, `precision`, `scale`
  - `required` (nillable = false AND not defaulted), `unique`, `externalId`
  - `formula` (calculatedFormula if present), `defaultValue`
  - `help_text` (inlineHelpText), `picklistValues[]` (if picklist/multipicklist)
  - `referenceTo[]` (for Lookup/MasterDetail fields)
B3 [GEN]: Categorize each field:
  - **standard** – not custom (no `__c` suffix)
  - **custom** – `__c` suffix, no formula
  - **formula** – calculatedFormula is populated
  - **rollup_summary** – type = "summary"
  - **lookup** – type = "reference", relationship is Lookup
  - **master_detail** – type = "reference", relationship is MasterDetail
  - **external_id** – externalId = true
B4 [GEN]: Store → `sf_schema.field_inventory[]`

### Record Types
B5 [GEN]: For each object's recordTypeInfos[], extract:
  - `api_name` (developerName), `label` (name), `description`, `isActive`, `isDefault`
  - Skip Master record type unless it is the only one
B6 [GEN]: Store → `sf_schema.record_types[]`

### Object Summary
B7 [GEN]: Per object, build summary:
  - `api_name`, `label`, `description`, `is_custom`
  - `field_count` (total fields), `custom_field_count`, `formula_field_count`
  - `record_type_count` (active record types)
  - `child_relationships[]` from childRelationships (relationship name + child object)
B8 [GEN]: Store → `sf_schema.objects[]`

---

## Stream 2 [CLI/GEN] – Relationship Mapping
**Goal:** Map all relationships between in-scope objects and their connected objects → `{{context_file}}.sf_schema.relationships`

### Dependency Discovery
C1 [CLI]: For each in-scope object:
  - `{{cli.sf_discover}} --type CustomObject --name {{object}} --depth 3 --json`
C2 [GEN]: From describe results (Stream 1) + discover results, extract all relationships:
  - **Master-Detail** — `referenceTo` where relationship is MasterDetail; note cascade delete behavior
  - **Lookup** — `referenceTo` where relationship is Lookup
  - **Hierarchical** — self-referencing lookup (same object in `referenceTo`)
  - **External Lookup** — `type` = "externalLookup"
  - **Indirect Lookup** — `type` = "indirectLookup"
C3 [GEN]: Identify junction objects — objects with 2+ master-detail relationships to in-scope objects
C4 [GEN]: Identify polymorphic lookups — fields with multiple `referenceTo` values (WhatId, WhoId patterns)
C5 [GEN]: Build relationship entries:
  - `{ from_object, to_object, field_name, relationship_type, relationship_name, is_cascade_delete }`
C6 [GEN]: Store → `sf_schema.relationships[]`

### Scope Expansion Detection
C7 [GEN]: Identify objects outside initial scope that have significant relationships to in-scope objects:
  - Objects with master-detail relationships (critical — cascade delete implications)
  - Objects with ≥3 lookup references to in-scope objects
  - Flag as `synthesis.assumptions[]` entry: "Object {{name}} may need investigation — {{reason}}"
  - Do NOT auto-expand scope — flag for user review in completion report

---

## Stream 3 [GEN] – Field Analysis
**Goal:** Categorize fields by purpose, flag PII, identify dependencies → `{{context_file}}.sf_schema.pii_fields` + `.field_analysis`

### Field Categorization
D1 [GEN]: Categorize all fields in `field_inventory[]` by purpose:
  - **identifiers** — Id, Name, external ID fields, unique fields
  - **classification** — picklists, record type, status/stage fields
  - **dates_timestamps** — Date, DateTime, CreatedDate, LastModifiedDate, custom date fields
  - **metrics** — Number, Currency, Percent, formula-calculated values
  - **text_rich_text** — String, TextArea, LongTextArea, Html
  - **relationships** — Lookup, MasterDetail (from Stream 2)
  - **system** — CreatedById, LastModifiedById, OwnerId, IsDeleted
D2 [GEN]: Store category counts per object → `sf_schema.field_analysis.by_category`

### PII Detection
D3 [GEN]: Flag fields with PII/sensitivity indicators:
  - **Name patterns** — field name contains: Email, Phone, SSN, Social, Address, Birth, DOB, Mobile, Fax
  - **Type patterns** — Email type, Phone type
  - **Label patterns** — label contains: email, phone, social security, date of birth, address, personal
  - **Encryption** — any field marked as encrypted
D4 [GEN]: Store → `sf_schema.pii_fields[]`:
  - `{ object, field, type, sensitivity_reason }`

### Formula Dependencies
D5 [GEN]: For each formula field in `field_inventory[]`:
  - Parse formula text for field references (`ObjectName.FieldName` or `FieldName`)
  - Identify cross-object formula references (fields from related objects via relationship)
D6 [GEN]: Store → `sf_schema.field_analysis.formula_dependencies[]`:
  - `{ object, formula_field, referenced_fields[], cross_object_references[] }`
D7 [GEN]: Store cross-object formulas separately → `sf_schema.field_analysis.cross_object_formulas[]`:
  - `{ object, formula_field, referenced_object, referenced_field, relationship_path }`

### Unused Field Candidates
D8 [CLI]: For objects with high field counts (>50 custom fields):
  - `{{cli.sf_query}} "SELECT COUNT(Id) FROM {{object}} WHERE {{field}} != null" --json` for suspicious fields (max 10 queries per object)
D9 [GEN]: Flag fields with 0% or very low population as unused candidates → `sf_schema.field_analysis.unused_candidates[]`:
  - `{ object, field, population_rate, recommendation }`

---

## Completion [IO/GEN]
Update `{{context_file}}`:
- `metadata.phases_completed` append `"sf_schema"`
- `metadata.current_phase` = `"sf_automation"`
- `metadata.last_updated` = ISO timestamp
- Extend `synthesis.unified_truth` with:
  - `object_model_summary` — count of objects, total fields, total relationships, record types
  - `key_relationships` — critical master-detail and high-cardinality lookups
  - `data_sensitivity` — PII field count, objects with sensitive data
- Append `{"phase":"sf_schema","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Schema discovery complete. {{object_count}} objects, {{field_count}} fields, {{relationship_count}} relationships mapped. Use `/feature-research-phase-03b` for automation discovery."**

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 02 not completed | **STOP** — "Run `/feature-research-phase-02` first" |
| SF auth failure | **STOP** — "Run `sf org login web` first" |
| sf_describe fails for an object | Log to `run_state.errors[]`; continue with remaining objects |
| sf_discover fails | Log error; rely on describe data for relationships; note limitation |
| Object has 0 fields returned | Log warning; likely permissions issue; note in synthesis |
| Very large object (500+ fields) | Process all fields; note high field count as potential complexity indicator |
