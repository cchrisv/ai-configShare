# Detective Pattern Documentation

## Overview

The Detective Pattern is the core investigative methodology used by "The Detective" persona during research phases. It transforms research from passive data collection into an active, hypothesis-driven investigation that seeks patterns, gaps, and deeper understanding.

## Reference

- Persona Configuration: `#file:.github/config/personas/detective.json`
- Template: `#file:.github/prompts/templates/detective-pattern.md`

## The Detective Pattern Loop

The Detective Pattern consists of four sequential steps that form an iterative loop:

### Step 1: Clarify the Case

**Purpose:** Ensure you understand the problem/enhancement clearly before investigating.

**Actions:**
1. **Restate the problem** in your own words to confirm understanding
2. **Classify the item type:**
   - **Enhancement:** New functionality or improvement to existing functionality
   - **Defect:** Something that should work but doesn't, or works incorrectly
   - **Investigation:** Need to understand current behavior or answer a question
3. **Identify missing information** that blocks accurate analysis

**Key Questions:**
- What is the user trying to accomplish?
- What is the current behavior (if known)?
- What is the desired behavior?
- Who is impacted (users, profiles, roles)?
  - **Important:** Do NOT use `System.AreaPath` as evidence for "who is impacted"
  - Area Path indicates team ownership (which team is working the ticket), not user impact
  - Use work item description, comments, acceptance criteria, and related work items to determine actual impact
- What objects/features are involved?
- Are there steps to reproduce (for defects)?

**Output:**
- Restated problem/enhancement in clear, business-friendly language
- Item type classification with rationale
- List of missing information (if any)

**Example:**
> **Restated Problem:** Users need to assign Contacts to advisors based on both workload balance and expertise matching (program type to advisor specialization). Currently, assignment is round-robin only.
> 
> **Item Type:** Enhancement
> 
> **Missing Information:** None - work item description is clear.

### Step 2: Form Initial Hypotheses

**Purpose:** Generate testable hypotheses about what might be causing the behavior or what might be involved in the solution.

**Actions:**
Form hypotheses about:
- **Root cause** (for defects): What could be causing this behavior?
- **Involved components** (for enhancements): What Salesforce features might be involved?
- **Configuration relevance:** Which metadata or configuration is likely relevant?
- **System dependencies:** Which upstream or downstream systems might matter?

**Hypothesis Structure:**
Each hypothesis should include:
- **Statement:** Clear, testable hypothesis
- **Confidence:** Low (0.0-0.4), Medium (0.5-0.7), or High (0.8-1.0)
- **Rationale:** Why this hypothesis is plausible
- **Evidence Needed:** What evidence would support or refute this
- **Test Approach:** How to test this hypothesis

**Output:**
- List of hypotheses with confidence levels
- Hypothesis rationale
- Evidence needed to validate/refute

**Example:**
```json
{
  "hypotheses": [
    {
      "hypothesis": "Contact assignment is handled by a Flow named 'Contact_Assignment_Flow'",
      "confidence": "medium",
      "rationale": "Flow naming convention suggests this is the assignment automation",
      "evidence_needed": [
        "Flow metadata query for 'Contact_Assignment_Flow'",
        "Flow trigger type (Record-Triggered Flow on Contact)",
        "Flow elements showing assignment logic"
      ],
      "test_approach": "Query FlowDefinition via Tooling API"
    },
    {
      "hypothesis": "Advisor workload is tracked via a custom field on User object",
      "confidence": "high",
      "rationale": "Standard pattern for workload tracking, field likely exists",
      "evidence_needed": [
        "FieldDefinition query for User object",
        "Field API name and data type"
      ],
      "test_approach": "Describe User object and search for workload-related fields"
    }
  ]
}
```

### Step 3: Research and Correlate

**Purpose:** Gather evidence, test hypotheses, and use findings to discover new clues.

**Actions:**

1. **Use Every Available Information Source:**
   - Process and flow descriptions
   - Field and object definitions
   - Validation rules, flows, triggers, and automations
   - Page layouts and record types
   - Permission sets and profiles
   - Existing user stories, defects, decision logs, release notes, and design docs

2. **For Each Finding, Ask Three Questions:**
   - **"What does this suggest?"** - What implications does this finding have?
   - **"What does this contradict?"** - Does this conflict with any hypotheses or previous findings?
   - **"What is still unknown?"** - What questions remain unanswered?

3. **Use Findings to Drill Deeper:**
   - **If something looks inconsistent:** Search for more examples or related configurations
   - **If you see a pattern:** Check for other impacted objects, profiles, or processes
   - **If a hypothesis seems likely:** Explicitly test it with scenarios and edge cases
   - **If documentation is missing:** Flag it as a risk and suggest what should be documented

**Evidence Correlation:**
Map each finding to its evidence source and track confidence:

```json
{
  "evidence_correlation": {
    "finding_1": {
      "finding": "Contact assignment uses round-robin logic",
      "evidence_sources": [
        {
          "source": "Flow XML: Contact_Assignment_Flow",
          "evidence": "Flow element 'Get_Advisors' queries all active advisors, 'Assign_Contact' uses MOD function with advisor count",
          "confidence": 0.95
        },
        {
          "source": "Field: User.Contacts_Assigned__c",
          "evidence": "Field exists and is incremented in flow",
          "confidence": 0.9
        }
      ],
      "what_this_suggests": "Current implementation is simple and may not handle expertise matching",
      "what_this_contradicts": null,
      "what_is_still_unknown": "How to determine advisor expertise for program types"
    }
  }
}
```

**Output:**
- Correlated findings with evidence sources
- Evidence mapping (finding → source → confidence)
- New clues discovered
- Updated hypotheses (validated/refuted/promoted)

### Step 4: Converge on a Clear View

**Purpose:** Synthesize all findings into a coherent understanding of current behavior, desired behavior, and the gap.

**Actions:**

1. **Describe Current Behavior:**
   - Use specific examples
   - Reference observable evidence (metadata, configurations, code)
   - Include edge cases and exception paths

2. **Describe Desired/Expected Behavior:**
   - Clear description of expected outcome
   - Success criteria
   - Business value

3. **Explain the Gap:**
   - What's the difference between current and desired?
   - What are the suspected causes (for defects)?
   - What are the implementation considerations (for enhancements)?

4. **List Assumptions and Unknowns:**
   - **Assumptions:** Uncertain hypotheses about HOW something might work (with confidence levels)
   - **Unknowns:** Complete information gaps where critical information is missing

**Output:**
- Current behavior description (with examples)
- Desired/expected behavior description
- Gap analysis
- Assumptions and unknowns list

**Example:**
> **Current Behavior:** When a Contact is created, the `Contact_Assignment_Flow` (Version 5) assigns the Contact to the next available advisor using round-robin logic. The flow queries all active advisors, counts total contacts assigned per advisor, and selects the advisor with the lowest count. Evidence: Flow XML retrieved, field `User.Contacts_Assigned__c` exists and is updated.
> 
> **Desired Behavior:** Contacts should be assigned based on both workload (current count) and expertise (matching Contact program type to advisor specialization). Success criteria: (1) Assignment within 5 minutes, (2) Workload balanced (±10% variance), (3) Expertise matching for 90%+ of assignments.
> 
> **Gap Analysis:** Current system only considers workload, not expertise. Need to add expertise matching logic (likely via custom field on User for specializations and picklist on Contact for program type).
> 
> **Assumptions:**
> - Advisor specializations are tracked (confidence: medium, needs verification)
> - Program types exist on Contact (confidence: high, referenced in work item)
> 
> **Unknowns:**
> - What is the field API name for advisor specializations?
> - How many advisors typically have overlapping specializations?

## How to Form Hypotheses

### Hypothesis Quality Criteria

A good hypothesis is:
- **Testable:** Can be validated or refuted with evidence
- **Specific:** Not vague or overly broad
- **Plausible:** Based on reasonable assumptions or patterns
- **Actionable:** Leads to specific research steps

### Hypothesis Formation Process

1. **Start with the problem/enhancement statement**
2. **Identify key components:**
   - Objects involved
   - Processes mentioned
   - User roles/profiles
   - Business rules implied
3. **Generate hypotheses for each component:**
   - What could be causing this (for defects)?
   - What might be involved (for enhancements)?
   - What configuration might be relevant?
4. **Assign confidence levels:**
   - **High:** Strong prior knowledge or pattern recognition
   - **Medium:** Reasonable inference or single source
   - **Low:** Speculation or missing data
5. **Define test approach:**
   - What evidence would support this?
   - What evidence would refute this?
   - How can we gather that evidence?

### Example Hypothesis Formation

**Problem:** "Contact assignment doesn't consider advisor expertise"

**Key Components:**
- Contact assignment process
- Advisor expertise tracking
- Assignment logic

**Hypotheses:**
1. **Assignment is automated via Flow** (confidence: high - common pattern)
   - Test: Query FlowDefinition for assignment-related flows
2. **Advisor expertise is tracked on User object** (confidence: medium - likely but needs verification)
   - Test: Describe User object, search for expertise/specialization fields
3. **Current logic only uses workload, not expertise** (confidence: high - stated in problem)
   - Test: Review Flow XML for expertise matching logic

## How to Correlate Evidence

### Evidence Correlation Process

1. **For each finding:**
   - Identify the evidence source (metadata query, code search, documentation, etc.)
   - Extract the specific evidence (field definition, flow element, code snippet, etc.)
   - Assess confidence in the evidence (source reliability, completeness)

2. **Map findings to evidence:**
   - Create evidence_correlation object
   - Link findings to their sources
   - Track confidence levels

3. **Ask the three questions:**
   - **What does this suggest?** - Implications and next steps
   - **What does this contradict?** - Conflicts with hypotheses or other findings
   - **What is still unknown?** - Remaining questions

4. **Use findings to generate new clues:**
   - If finding suggests a pattern, check for other instances
   - If finding contradicts a hypothesis, revise or refute
   - If finding reveals unknowns, add to unknowns list

### Evidence Source Reliability

**High Reliability (confidence 0.8-1.0):**
- Direct metadata queries (EntityDefinition, FieldDefinition)
- Active Flow/Trigger/Apex code retrieved from org
- Official documentation (Salesforce docs, release notes)

**Medium Reliability (confidence 0.5-0.7):**
- Wiki pages (may be outdated)
- Similar work items (context may differ)
- Code repository (may not reflect current org state)

**Low Reliability (confidence 0.0-0.4):**
- Speculation
- Outdated documentation
- Conflicting sources

## How to Assess Confidence Levels

### Confidence Assessment Framework

**High Confidence (0.8-1.0):**
- **Criteria:**
  - Multiple independent sources confirm
  - Direct observation (metadata query, code retrieval)
  - Authoritative documentation
- **Use terms:** "likely", "confident", "strong evidence"
- **Example:** "The Contact object has a Status__c picklist field (likely, confidence 0.95) - confirmed via EntityDefinition describe and FieldDefinition query."

**Medium Confidence (0.5-0.7):**
- **Criteria:**
  - Single source with good reliability
  - Indirect evidence (inferred from patterns)
  - Reasonable inference from available data
- **Use terms:** "possible", "suggests", "indicates"
- **Example:** "The assignment flow likely uses round-robin logic (possible, confidence 0.6) - inferred from flow name and advisor count field, but flow XML not yet retrieved."

**Low Confidence (0.0-0.4):**
- **Criteria:**
  - Speculation
  - Missing data
  - Conflicting evidence
  - Single unreliable source
- **Use terms:** "requires confirmation", "uncertain", "needs investigation"
- **Example:** "The integration endpoint may require authentication (requires confirmation, confidence 0.3) - Named Credential exists but auth type not yet verified."

### Confidence Tracking in Artifacts

```json
{
  "confidence_levels": {
    "finding_1": {
      "confidence": 0.95,
      "level": "high",
      "rationale": "Multiple sources confirm",
      "evidence_count": 3
    },
    "finding_2": {
      "confidence": 0.6,
      "level": "medium",
      "rationale": "Single source, reasonable inference",
      "evidence_count": 1
    },
    "finding_3": {
      "confidence": 0.3,
      "level": "low",
      "rationale": "Speculation, needs verification",
      "evidence_count": 0
    }
  }
}
```

## Examples of Detective Pattern Execution

### Example 1: Enhancement Research

**Step 1: Clarify the Case**
- Restated: "Users need Contact assignment to consider both workload and expertise"
- Type: Enhancement
- Missing: None

**Step 2: Form Hypotheses**
- H1: Assignment handled by Flow (confidence: high)
- H2: Expertise tracked on User object (confidence: medium)
- H3: Current logic only uses workload (confidence: high)

**Step 3: Research and Correlate**
- Found: `Contact_Assignment_Flow` exists, uses round-robin
- Found: `User.Contacts_Assigned__c` field exists
- Not found: Expertise field on User (new clue)
- What this suggests: Need to verify if expertise tracking exists
- New clue: Check for advisor specialization fields

**Step 4: Converge**
- Current: Round-robin assignment only
- Desired: Workload + expertise matching
- Gap: Missing expertise matching logic
- Unknown: Does expertise field exist? What's the API name?

### Example 2: Defect Research

**Step 1: Clarify the Case**
- Restated: "Contact Status field not updating when Affiliation changes"
- Type: Defect
- Missing: Steps to reproduce (need to verify)

**Step 2: Form Hypotheses**
- H1: Flow/Trigger should update Status but isn't firing (confidence: medium)
- H2: Validation rule blocking update (confidence: low)
- H3: Field-level security preventing update (confidence: low)

**Step 3: Research and Correlate**
- Found: `Contact_After_Save` flow references Affiliation
- Found: Flow has decision element checking Affiliation changes
- Found: Status update action exists in flow
- What this suggests: Flow should work, but may have entry criteria issue
- New clue: Check flow entry criteria and trigger conditions

**Step 4: Converge**
- Current: Status not updating when Affiliation changes
- Expected: Status should update automatically
- Gap: Flow exists but may not be triggering correctly
- Unknown: What are the exact flow entry criteria? Is flow active?

## Integration with Research Phases

The Detective Pattern is executed in each research sub-phase:

1. **research-ado:** Clarify work item, form hypotheses about scope
2. **research-wiki:** Correlate wiki findings with work item
3. **research-business-context:** Form hypotheses about impacted personas/processes
4. **research-salesforce:** Deep investigation with hypothesis testing
5. **research-code:** Correlate code patterns with metadata findings
6. **research-web:** Test hypotheses against best practices
7. **research-context7:** Form hypotheses about implementation approaches
8. **research-similar-workitems:** Pattern recognition and solution hypothesis formation

Each sub-phase produces structured output following the Detective Pattern format, and all outputs are synthesized in the final research summary.

## Best Practices

1. **Never skip hypothesis formation** - Even if the answer seems obvious, form and test hypotheses
2. **Always ask the three questions** - "What does this suggest/contradict/leave unknown?"
3. **Track confidence explicitly** - Don't hide uncertainty
4. **Use findings to generate new clues** - Each finding should lead to new questions
5. **Document the investigation trail** - Show how you got from problem to understanding
6. **Be skeptical** - Don't accept the first explanation if evidence is incomplete
7. **Connect technical to business** - Every finding should link back to business impact

