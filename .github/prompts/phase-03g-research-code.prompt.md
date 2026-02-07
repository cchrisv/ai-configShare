# Research: Code Analysis

Role: DevOps Analyst
Mission: Analyze Apex code from connected Salesforce org for patterns and frameworks.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{metadata_references}}`

## Protocol
- Query org directly for live code (not local files)
- Record patterns as Assumptions, not Facts

## Execution

### A: Init
A1 [LOGIC]: Check if dependency artifact exists
A2 [IO]: Load component names from dependency discovery

### B: Code Retrieval (Live from Org)
B1 [CLI]: For Apex classes:
  `{{cli.sf_query}} "SELECT Id, Name, Body, ApiVersion FROM ApexClass WHERE Name = '{{class_name}}'" --tooling --json`
B2 [CLI]: For triggers:
  `{{cli.sf_query}} "SELECT Id, Name, Body, TableEnumOrId FROM ApexTrigger WHERE Name = '{{trigger_name}}'" --tooling --json`
B3 [CLI]: For flows:
  `{{cli.sf_query}} "SELECT Id, ApiName, ProcessType, Status FROM Flow WHERE ApiName = '{{flow_name}}'" --tooling --json`

### C: Analysis
C1 [GEN]: Identify patterns (Singleton, Factory, Service Layer), frameworks (fflib, at4dx, TAF)
C2 [GEN]: Identify async patterns, integrations, testing patterns
C3 [GEN]: Assess complexity (method count, long methods >50 lines)

### D: Standards Check
D1 [GEN]: Compare against `{{paths.standards}}/` files

### E: Artifact
E1 [IO]: Save to `{{research}}/{{artifact_files.research.code_analysis}}`

Schema:
```json
{
  "components_analyzed": [],
  "technology_stack": {"frameworks": [], "patterns": [], "integrations": []},
  "assumptions": [],
  "standards_compliance": {"compliant": [], "gaps": []}
}
```

## Feedback Loop
Triggers: Patterns → revisit SF | Framework usage → revisit web | Integration code → revisit ADO

## Output
- `{{research}}/{{artifact_files.research.code_analysis}}`
