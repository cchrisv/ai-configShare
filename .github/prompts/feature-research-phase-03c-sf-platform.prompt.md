# Feature Research Phase 03c – Salesforce Platform Discovery
Role: Salesforce Platform Architect
Mission: Document security model, integrations, platform events, and data landscape for all in-scope objects.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:.github/prompts/util-research-base.prompt.md`
Input: Scope from `{{context_file}}.scope.sf_objects[]`, prior context from `sf_schema` + `sf_automation`

## Constraints
- **Read-only** – NO ADO/wiki/SF modifications
- **CLI-only** – per util-base guardrails (SF operations use `{{cli.*}}` commands only)
- **Outputs to** `{{context_file}}.sf_platform`
- **Rolling synthesis** – extend `synthesis` with platform findings
- **All streams mandatory** – batch when beneficial
- **Feedback loops** – max 3 iterations/stream
- **Tooling API** – security and metadata queries use `--tooling` flag

## After Each Stream (MANDATORY — do NOT batch)
**MUST write to disk before starting next stream.** This ensures resumability if context is lost.
1. [IO] Write `{{context_file}}.sf_platform.[stream_section]` → save to disk
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
  - `sf_schema.objects` is populated
  - `sf_automation` is populated (triggers, flows, apex_classes)
A2: **STOP** if any prerequisite missing. Log to `run_state.errors[]` and save.

## Platform Output Structure
All outputs to `{{context_file}}.sf_platform`:
- `security` — `{ object_permissions[], field_permissions[], sharing_model{}, record_type_assignments[] }`
- `integrations` — `{ platform_events[], named_credentials[], connected_apps[], callout_patterns[], cdc_subscriptions[] }`
- `data_landscape` — `{ volumes[], record_type_distribution[], data_quality{}, data_freshness[], deployment_history[] }`

---

## Stream 1 [CLI/GEN] – Security and Access
**Goal:** Document who can access what → `{{context_file}}.sf_platform.security`

### Object Permissions
B1 [CLI]: For each in-scope object:
  - `{{cli.sf_query}} "SELECT Id, Parent.Profile.Name, Parent.Label, Parent.IsOwnedByProfile, SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords FROM ObjectPermissions WHERE SobjectType = '{{object}}'" --tooling --json`
B2 [GEN]: Parse results into:
  - `object_permissions[]`: `{ object, parent_name, parent_type (Profile|PermissionSet), read, create, edit, delete, view_all, modify_all }`
  - Separate Profile-based permissions from Permission Set-based permissions
B3 [GEN]: Identify profiles/permission sets with elevated access (ModifyAll, ViewAll, Delete) — flag as security-sensitive

### Field-Level Security
B4 [CLI]: For each in-scope object (prioritize objects with PII fields from `sf_schema.pii_fields[]`):
  - `{{cli.sf_query}} "SELECT Id, Parent.Profile.Name, Parent.Label, Parent.IsOwnedByProfile, SobjectType, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE SobjectType = '{{object}}'" --tooling --json`
B5 [GEN]: Parse into `field_permissions[]`:
  - `{ object, field, parent_name, parent_type, read, edit }`
B6 [GEN]: Cross-reference with `sf_schema.pii_fields[]`:
  - Flag PII fields that are readable by many profiles (potential exposure risk)
  - Flag PII fields with edit access beyond expected roles

### Sharing Model
B7 [CLI]: `{{cli.sf_query}} "SELECT QualifiedApiName, ExternalSharingModel, InternalSharingModel FROM EntityDefinition WHERE QualifiedApiName IN ('{{obj1}}','{{obj2}}')" --tooling --json`
B8 [GEN]: For each object, extract:
  - OWD (Organization-Wide Default): Private, Public Read Only, Public Read/Write, Controlled by Parent
  - Internal vs External sharing model
B9 [GEN]: Build `sharing_model{}`:
  - `{ object, internal_owd, external_owd, sharing_rules_exist (boolean), notes }`

### Record Type Assignments
B10 [CLI]: For objects with record types (from `sf_schema.record_types[]`):
  - `{{cli.sf_query}} "SELECT Id, RecordType.DeveloperName, Profile.Name FROM RecordTypeAssignment WHERE SobjectType = '{{object}}' AND IsActive = true" --tooling --json`
B11 [GEN]: Build `record_type_assignments[]`:
  - `{ object, record_type, profile, is_default }`

---

## Stream 2 [CLI/GEN] – Integrations and Events
**Goal:** Document external connections and event architecture → `{{context_file}}.sf_platform.integrations`

### Platform Events
C1 [CLI]: `{{cli.sf_query}} "SELECT Id, DeveloperName, MasterLabel, Description FROM EntityDefinition WHERE IsCustomizable = true AND QualifiedApiName LIKE '%__e'" --tooling --json`
C2 [GEN]: Filter to events relevant to in-scope objects:
  - Name contains scope object name or feature area keywords
  - Referenced in `sf_automation.apex_classes[].event_publishes[]`
  - Referenced in `sf_automation.flows[]` where type = Platform Event-Triggered
C3 [GEN]: For each relevant event, store:
  - `{ api_name, label, description, publishers[] (Apex classes/flows that publish), subscribers[] (flows/triggers that subscribe) }`

### Event Publishers in Apex
C4 [IO]: Load `sf_automation.apex_classes[]` — filter for classes with `callout_references[]` or `event_publishes[]`
C5 [GEN]: Cross-reference Apex event publish statements with discovered platform events

### Named Credentials
C6 [CLI]: `{{cli.sf_query}} "SELECT Id, DeveloperName, MasterLabel, Endpoint FROM NamedCredential" --tooling --json`
C7 [GEN]: Identify named credentials referenced by in-scope Apex classes (from callout patterns):
  - `{ developer_name, label, endpoint, referenced_by[] (Apex class names) }`

### Connected Apps
C8 [CLI]: `{{cli.sf_query}} "SELECT Id, Name, Description FROM ConnectedApplication" --tooling --json`
C9 [GEN]: Note connected apps that may relate to the feature area (by name/description match)

### Callout Pattern Summary
C10 [IO]: Load `sf_automation.apex_classes[].callout_references[]` from phase 03b
C11 [GEN]: Consolidate callout patterns:
  - `{ apex_class, callout_type (REST/SOAP/HTTP), named_credential, endpoint_pattern, direction (inbound/outbound) }`

### Change Data Capture
C12 [CLI]: `{{cli.sf_query}} "SELECT Id, DurableId, QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName IN ('{{obj1}}ChangeEvent','{{obj2}}ChangeEvent')" --tooling --json`
C13 [GEN]: Identify objects with CDC enabled → `cdc_subscriptions[]`

---

## Stream 3 [CLI/GEN] – Data Landscape
**Goal:** Document data volumes, quality, freshness, and deployment history → `{{context_file}}.sf_platform.data_landscape`

### Record Volumes
D1 [CLI]: For each in-scope object:
  - `{{cli.sf_query}} "SELECT COUNT() FROM {{object}}" --json`
D2 [GEN]: Store `volumes[]`: `{ object, record_count, assessed_at }`

### Record Type Distribution
D3 [CLI]: For objects with record types:
  - `{{cli.sf_query}} "SELECT RecordType.DeveloperName, COUNT(Id) cnt FROM {{object}} GROUP BY RecordType.DeveloperName" --json`
D4 [GEN]: Store `record_type_distribution[]`:
  - `{ object, record_type, count, percentage }`

### Data Quality Indicators
D5 [CLI]: For key fields (required fields, commonly used fields — max 10 queries per object):
  - `{{cli.sf_query}} "SELECT COUNT(Id) FROM {{object}} WHERE {{field}} != null" --json`
D6 [GEN]: Calculate population rate: `(non_null_count / total_count) * 100`
D7 [GEN]: Build `data_quality{}`:
  - `field_population[]`: `{ object, field, population_rate, total_records, populated_records }`
  - Flag fields with <50% population as potential quality concerns
  - Cross-reference with `sf_schema.field_inventory[]` required fields — required fields with <100% population indicate data integrity issues

### Data Freshness
D8 [CLI]: For each in-scope object:
  - `{{cli.sf_query}} "SELECT Id, CreatedDate, LastModifiedDate FROM {{object}} ORDER BY LastModifiedDate DESC LIMIT 1" --json`
  - `{{cli.sf_query}} "SELECT Id, CreatedDate FROM {{object}} ORDER BY CreatedDate DESC LIMIT 1" --json`
D9 [GEN]: Store `data_freshness[]`:
  - `{ object, last_modified, last_created, freshness_status (active/stale/dormant) }`
  - Active: modified within 7 days
  - Stale: modified 7–90 days ago
  - Dormant: no modifications in 90+ days

### Deployment History
D10 [CLI]: For each in-scope object (combine into single query if possible):
  - `{{cli.sf_query}} "SELECT CreatedDate, CreatedBy.Name, Display, Section, Action FROM SetupAuditTrail WHERE Display LIKE '%{{object}}%' ORDER BY CreatedDate DESC LIMIT 30" --json`
D11 [GEN]: Store `deployment_history[]`:
  - `{ object, date, user, action, detail }`
  - Summarize deployment frequency and recent changes

---

## Completion [IO/GEN]
Update `{{context_file}}`:
- `metadata.phases_completed` append `"sf_platform"`
- `metadata.current_phase` = `"analysis"`
- `metadata.last_updated` = ISO timestamp
- Extend `synthesis.unified_truth` with:
  - `security_summary` — profile/permission set count with access, OWD overview, PII exposure flags
  - `integration_summary` — platform event count, named credential count, callout pattern count
  - `data_summary` — total record count across objects, freshness status distribution, quality concerns
  - `deployment_activity` — summary of recent deployment history
- Append `{"phase":"sf_platform","step":"complete","completedAt":"<ISO>","artifact":"{{context_file}}"}` to `run_state.completed_steps[]`
- Save to disk

Tell user: **"Platform discovery complete. Security model, {{event_count}} integrations/events, and data landscape documented. Use `/feature-research-phase-04` for analysis."**

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Context file missing | **STOP** — "Run `/feature-research-phase-01` first" |
| Phase 03b not completed | **STOP** — "Run `/feature-research-phase-03b` first" |
| Tooling API query fails | Log error; try alternative query approach; continue with partial data |
| ObjectPermissions query returns 0 | Object may use Controlled by Parent OWD; note in sharing_model |
| FieldPermissions query too large | Limit to PII fields + key custom fields; note partial coverage |
| SetupAuditTrail has no entries | Object may be stable (no recent changes); note in deployment_history |
| Record count query fails | May be permissions issue; log error; estimate from other indicators |
| Named Credential query restricted | Log; note security limitation; continue |
| CDC entity not found | CDC not enabled for this object; log as normal finding |
