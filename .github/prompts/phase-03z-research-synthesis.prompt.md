# Research: Synthesis

Role: Synthesizer (Business Analyst)
Mission: Consolidate all research into actionable insights for grooming phase.

## Config
Base: `#file:.github/prompts/util-base.prompt.md`
Research: `#file:.github/prompts/util-research-base.prompt.md`
Input: `{{work_item_id}}`

## Artifacts to Synthesize
- `{{artifact_files.research.ado_workitem}}`
- `{{artifact_files.research.wiki_research}}` (if exists)
- `{{artifact_files.research.dependency_discovery}}`
- `{{artifact_files.research.similar_workitems}}`
- `{{artifact_files.research.business_context}}`
- `{{artifact_files.research.code_analysis}}` (if exists)
- `{{artifact_files.research.web_research}}` (if exists)

## Execution

### A: Collection
A1 [IO]: Load all research artifacts from `{{research}}`
A2 [GEN]: Catalog available evidence

### B: Cross-Reference
B1 [GEN]: Correlate findings across artifacts
B2 [GEN]: Identify contradictions requiring stakeholder input
B3 [GEN]: Identify gaps (unanswered questions, incomplete requirements)

### C: Synthesis
C1 [GEN]: Build research summary:
  - Work item overview
  - Request summary (problem, outcome, justification)
  - Technical analysis
  - Related work items
  - Recommendations
  - Risk assessment

C2 [GEN]: Compile assumptions with:
  - ID, Category, Statement, Confidence, Source, Validation method, Risk

C3 [GEN]: Generate stakeholder questions

### D: Artifacts
D1 [IO]: Save to `{{research}}/research-summary.json`
D2 [IO]: Save to `{{research}}/assumptions.json`
D3 [IO]: Update run state:
  - Set `currentPhase` = "grooming"
  - Set `metrics.phases.research.completedAt`

## Output
- `{{research}}/research-summary.json`
- `{{research}}/assumptions.json`
