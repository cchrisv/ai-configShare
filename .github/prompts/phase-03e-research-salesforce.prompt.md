# Research: Salesforce Metadata

Role: Technical Analyst
Mission: Discover Salesforce metadata dependencies and usage patterns.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{object_names}}`

## Prerequisite
SF CLI authenticated (`sf org list` to verify).

## Execution

### A: Init
A1 [CLI]: Verify SF auth with `sf org list`
A2 [IO]: Load keywords from ADO artifact

### B: Metadata Discovery
B1 [CLI]: For each object: `{{cli.sf_describe}} {{object_name}} --json`
B2 [CLI]: `{{cli.sf_discover}} --type CustomObject --name {{object_name}} --depth 3 --json`
B3 [CLI]: Query related metadata:
  - `{{cli.sf_apex}} --pattern "%{{object_name}}%" --json`
  - `{{cli.sf_triggers}} --object {{object_name}} --json`
  - `{{cli.sf_flows}} --object {{object_name}} --json`
  - `{{cli.sf_validation}} {{object_name}} --json`

### C: Analysis
C1 [GEN]: Impact assessment (>100 components = High, >500 = Critical)
C2 [GEN]: Categorize components by type and impact

### D: Artifact
D1 [IO]: Save to `{{research}}/{{artifact_files.research.dependency_discovery}}`
D2 [IO]: Save summary to `{{research}}/{{artifact_files.research.dependency_summary}}`

## Feedback Loop
Triggers: New dependencies → revisit ADO | Integration points → revisit code/wiki

## Output
- `{{research}}/{{artifact_files.research.dependency_discovery}}`
- `{{research}}/{{artifact_files.research.dependency_summary}}`
