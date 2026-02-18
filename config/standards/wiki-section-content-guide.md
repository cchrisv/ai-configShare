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
- **Sources:** `solutioning.option_analysis`, `solutioning.solution_design.applied_standards`, `solutioning.solution_design.risk_considerations`, `research.synthesis.unified_truth.risks`
- **Content:** Options evaluated (OOTB/Extension/Custom), TEA scores, trade-offs, eliminated options, standards cited
- **Sub-labels:** 🔍 Options Evaluated · ⚖️ Trade-off Analysis · 🚫 Eliminated Options · 📏 Standards Applied · ⚠️ Risk Assessment
- **Required tables:**
  - Options comparison table (Name, Type, TEA scores, Pros, Cons)
  - Risk register table (Risk ID, Description, Likelihood, Impact, Mitigation) — from `risk_considerations[]`
  - Standards traceability table (Standard, Rule, How Applied) — from `standards_traceability[]`
- **Scaling:**
  - Simple: Options table + 1-paragraph rationale + standards list
  - Medium: Options table + trade-off narrative + risk table + standards table
  - Complex: All tables + detailed trade-off narrative + eliminated options rationale + full risk register + standards traceability with implementation details

### how_solution
- **Sources:** `solutioning.solution_design`, `solutioning.traceability`, `solutioning.solution_design.implementation_phases`, `solutioning.solution_design.field_level_mapping`, `solutioning.solution_design.legacy_analysis`, `solutioning.solution_design.method_designs`, `solutioning.solution_design.mermaid_diagrams`
- **Content:** Architecture, components table, integration points, AC↔component mapping, implementation phases, field-level mapping, legacy analysis, method-level design, Mermaid diagrams
- **Sub-labels:** 🏗️ Architecture Overview · 📦 Components · 🔗 Integration Points · 📋 Implementation Phases · 🗂️ Field-Level Mapping · 🗑️ Legacy Cleanup · 🔧 Method Design · 📊 Diagrams
- **Required tables:**
  - Components table (ID, Name, Type, Complexity, Responsibility) — always
  - Implementation phases table (Phase, Goal, Steps, Dependencies) — from `implementation_phases[]`
  - Field mapping tables (Fields Reset, Fields Computed, Fields Removed) — from `field_level_mapping` (when solution touches sObject fields)
  - Legacy issues table (Category, Description) — from `legacy_analysis.critical_issues[]` (when replacing existing code)
  - Dead code inventory table (Type, Name, Reason) — from `legacy_analysis.dead_code_inventory[]` (when replacing existing code)
  - Method design table (Method, Visibility, Parameters, Return, CC Target, Pattern) — from `method_designs[]` (for Complex components)
- **Required diagrams:**
  - Component interaction diagram (always) — from `mermaid_diagrams[]` where type=component_interaction
  - Implementation order diagram (Complex) — from `mermaid_diagrams[]` where type=implementation_order
  - Data flow diagram (optional) — from `mermaid_diagrams[]` where type=data_flow
- **Scaling:**
  - Simple: Components table + integration points narrative + 1 Mermaid diagram
  - Medium: Components table + implementation phases + integration points + AC mapping + 1-2 Mermaid diagrams
  - Complex: All tables + all applicable diagrams + field mapping + legacy analysis + method-level design

### how_quality
- **Sources:** `solutioning.testing` (test_data_matrix, test_cases, ac_coverage_matrix)
- **Content:** Test strategy, coverage matrix, P1/P2/P3 test cases, UAT scripts, smoke pack, data setup guide
