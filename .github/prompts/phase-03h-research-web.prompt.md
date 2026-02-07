# Research: Industry Best Practices

Role: Innovator (Architect)
Mission: Benchmark internal patterns against Salesforce ecosystem best practices.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`, `{{technologies_identified}}`

## Protocol
- Prioritize results from last 24 months
- Explicitly search for anti-patterns and pitfalls

## Execution

### A: Init
A1 [LOGIC]: Load technology context from prior research
A2 [GEN]: Generate search strategy queue

### B: Targeted Discovery
B1 [CLI]: Framework searches:
  - "Salesforce [Tech] best practices 2025"
  - "Salesforce [Pattern] vs [Alternative]"
  - "Salesforce [Tech] governor limits performance"
B2 [CLI]: Integration/library searches (if found)
B3 [CLI]: Migration searches (if legacy tech detected)

### C: Comparative Analysis
C1 [GEN]: Gap analysis - internal patterns vs external standards
C2 [GEN]: Anti-pattern detection, flag with severity
C3 [GEN]: Identify unknowns for assumptions

### D: Artifact
D1 [IO]: Save to `{{research}}/{{artifact_files.research.web_research}}`

Schema:
```json
{
  "search_queries": [],
  "industry_standards": [],
  "modernization_opportunities": [],
  "identified_risks": [],
  "unknowns": [],
  "research_complete": true
}
```

## Feedback Loop
Triggers: Best practice contradiction → revisit code | Anti-pattern → revisit SF | Modern alternative → revisit ADO

## Output
- `{{research}}/{{artifact_files.research.web_research}}`
