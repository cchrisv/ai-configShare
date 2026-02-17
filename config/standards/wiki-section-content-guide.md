# Wiki Section Content Guide

Reference for generating wiki section content. Each section has specific context sources and content expectations.

## Section Content Specifications

### executive_summary
- **Sources:** `research.synthesis.unified_truth`, `solutioning.option_analysis.decision_summary`
- **Pattern:** Challenge callout → What We Learned callout → Recommended Approach callout → Path Forward callout
- **Phase 02b:** Populate challenge + discoveries (partial)
- **Phase 03b:** Add recommended approach + path forward (finalize)

### what_business_context
- **Sources:** `research.ado_workitem.business_summary`, `research.business_context.organizational_context`, `grooming.organizational_context_match`, `research.journey_maps`
- **Content:** Who is affected, persona, current situation, pain points, department alignment
- **Sub-labels:** 👥 The People This Affects · 📍 The Current Situation · 🏆 What Success Looks Like

### what_requirements
- **Sources:** `grooming.templates_applied.applied_content` (description filled_slots), `research.synthesis.unified_truth.technical_requirements`, `research.synthesis.unified_truth.constraints`
- **Content:** Functional requirements, quality attributes, constraints, out-of-scope items
- **Sub-labels:** ⚙️ Functional Requirements · 📐 Quality Attributes · 🚫 Out of Scope

### what_success_criteria
- **Sources:** `grooming.templates_applied.applied_content` (AC filled_slots), `grooming.classification.quality_gates`
- **Content:** AC scenarios (Given/When/Then), quality attributes, definition of done

### why_business_value
- **Sources:** `grooming.organizational_context_match.strategic_goals`, `research.synthesis.unified_truth.business_goals`, `research.synthesis.swot_analysis`
- **Content:** Strategic alignment, stakeholder impact, SWOT summary

### why_discovery
- **Sources:** `research.salesforce_metadata`, `research.dependency_discovery`, `research.code_search`, `research.wiki_search`, `research.web_research`
- **Content:** Technical environment table, codebase analysis table, documentation found, external dependencies

### why_investigation
- **Sources:** `research.assumptions`, `research.synthesis.conflict_log`, `research.synthesis.research_gaps_investigated`, `research.synthesis.reusable_assets`
- **Content:** How understanding evolved, assumptions tested (✅/❌/⚠️), conflicts resolved, confidence assessment

### why_decisions
- **Sources:** `solutioning.option_analysis`, `solutioning.solution_design.applied_standards`, `research.synthesis.unified_truth.risks`
- **Content:** Options evaluated (OOTB/Extension/Custom), TEA scores, trade-offs, eliminated options, standards cited

### how_solution
- **Sources:** `solutioning.solution_design`, `solutioning.traceability`
- **Content:** Architecture, components table, integration points, AC↔component mapping, Mermaid diagrams

### how_quality
- **Sources:** `solutioning.testing` (test_data_matrix, test_cases, ac_coverage_matrix)
- **Content:** Test strategy, coverage matrix, P1/P2/P3 test cases, UAT scripts, smoke pack, data setup guide
