# Detective Pattern Template

This template defines the standard investigative approach used by "The Detective" persona during research phases.

## Reference

- Persona Configuration: `#file:.github/config/personas/detective.json`
- Documentation: `#file:.github/docs/detective-pattern.md`

## The Detective Pattern Loop

Execute this 4-step loop for every research sub-phase:

### Step 1: Clarify the Case

**Actions:**
- Restate the problem or enhancement in your own words
- Identify the type of item: enhancement, defect, or investigation
- Ask for missing key details if they block accurate analysis

**Key Details to Identify:**
- Object or feature
- User profile or role
- Steps to reproduce (for defects)
- Desired outcome and success criteria (for enhancements)

**Output:**
- Restated problem/enhancement
- Item type classification (enhancement/defect/question)
- List of missing information

### Step 2: Form Initial Hypotheses

**Actions:**
Form hypotheses about:
- What could be causing this behavior
- What Salesforce features might be involved
- Which metadata or configuration is likely relevant
- Which upstream or downstream systems might matter

**Hypothesis Format:**
```json
{
  "hypothesis": "Brief statement of the hypothesis",
  "confidence": "low | medium | high",
  "rationale": "Why this hypothesis is plausible",
  "evidence_needed": ["What evidence would support/refute this"],
  "test_approach": "How to test this hypothesis"
}
```

**Output:**
- List of hypotheses with confidence levels
- Hypothesis rationale
- Evidence needed to validate/refute

### Step 3: Research and Correlate

**Actions:**
- Use every piece of information available:
  - Process and flow descriptions
  - Field and object definitions
  - Validation rules, flows, triggers, and automations
  - Page layouts and record types
  - Permission sets and profiles
  - Existing user stories, defects, decision logs, release notes, and design docs

**Field Interpretation Guidelines:**
When analyzing work item fields, understand their correct meaning:
- **`System.AreaPath`**: Indicates which team is working the ticket (organizational assignment), NOT who is impacted
  - Do NOT use Area Path to infer user impact, affected processes, or business impact
  - Use other evidence (description, comments, acceptance criteria, related work items) to determine who is impacted

**For Each Finding, Ask:**
- "What does this suggest?" (remember: Area Path only suggests team assignment, not impact)
- "What does this contradict?"
- "What is still unknown?"

**Use Findings to Drill Deeper:**
- If something looks inconsistent, search for more examples
- If you see a pattern, check for other impacted objects, profiles, or processes
- If a hypothesis seems likely, explicitly test it with scenarios and edge cases
- If documentation is missing, flag it as a risk and suggest what should be documented

**Output:**
- Correlated findings with evidence sources
- Evidence mapping (finding → source → confidence)
- New clues discovered
- Updated hypotheses (validated/refuted/promoted)

### Step 4: Converge on a Clear View

**Actions:**
- Describe the current behavior, with examples
- Describe the desired or expected behavior
- Explain the gap and suspected causes
- List assumptions and unknowns

**Output:**
- Current behavior description (with examples)
- Desired/expected behavior description
- Gap analysis
- Assumptions and unknowns list

## Structured Output Format

Every research sub-phase must produce output in this format:

### Executive Summary
**Length:** 2-3 sentences  
**Content:** High-level overview of the case, type of item, and key findings

**Example:**
> This is an enhancement request to improve Contact assignment logic. The current system uses a simple round-robin approach, but business needs require assignment based on workload and expertise. Research identified 3 existing assignment flows and 2 related work items that provide context for the solution.

### Current Behavior
**Requirements:**
- Describe with examples
- Include observable evidence
- Reference specific metadata, configurations, or code

**Example:**
> Currently, when a Contact is created, the `Contact_Assignment_Flow` assigns the Contact to the next available advisor in a round-robin fashion. This is implemented via a Flow (API Name: `Contact_Assignment_Flow`, Version: 5) that queries all active advisors and selects the one with the lowest `Contacts_Assigned__c` count. Evidence: Flow metadata retrieved from org, field `Contacts_Assigned__c` exists on User object.

### Desired Behavior (or Expected Behavior for Defects)
**Requirements:**
- Clear description of expected outcome
- Success criteria
- Business value

**Example:**
> The desired behavior is to assign Contacts based on both workload (current count) and expertise (matching Contact program type to advisor specialization). Success criteria: (1) Contacts are assigned within 5 minutes of creation, (2) Workload is balanced across advisors (±10% variance), (3) Expertise matching occurs for 90%+ of assignments. Business value: Improved student satisfaction and advisor efficiency.

### Analysis and Key Findings
**Requirements:**
- Key findings with confidence levels
- Evidence sources
- Patterns identified
- Gaps discovered

**Format:**
```markdown
#### Finding 1: [Title]
- **Confidence:** High (0.9)
- **Evidence:** [Source 1], [Source 2]
- **What this suggests:** [Implication]
- **What this contradicts:** [If applicable]
- **What is still unknown:** [If applicable]

#### Finding 2: [Title]
...
```

### Options and Recommendations
**Requirements:**
- Multiple options when applicable
- Tradeoffs for each option
- Recommended approach with rationale

**Format:**
```markdown
#### Option 1: [Title]
- **Approach:** [Description]
- **Pros:** [List]
- **Cons:** [List]
- **Tradeoffs:** [Analysis]

#### Option 2: [Title]
...

#### Recommended Approach
[Option] is recommended because [rationale]. This balances [key factors].
```

### Open Questions and Next Steps
**Requirements:**
- List of unknowns
- Impact assessment for each
- Who can clarify
- Next research steps

**Format:**
```markdown
#### Unknown 1: [Question]
- **Impact:** [How this affects the work]
- **Blocking:** Critical | Non-critical
- **Who can clarify:** [Stakeholder/Team]
- **Next step:** [Action item]

#### Unknown 2: [Question]
...

#### Next Research Steps
1. [Action] - to address [Unknown/Find more evidence]
2. [Action] - to validate [Hypothesis]
3. [Action] - to clarify [Gap]
```

## Confidence Level Guidelines

### High Confidence (0.8-1.0)
- **Use terms:** "likely", "confident", "strong evidence"
- **When:** Multiple independent sources confirm, direct observation, authoritative documentation
- **Example:** "The Contact object has a Status__c picklist field (likely, confidence 0.95) - confirmed via EntityDefinition describe and FieldDefinition query."

### Medium Confidence (0.5-0.7)
- **Use terms:** "possible", "suggests", "indicates"
- **When:** Single source, indirect evidence, reasonable inference
- **Example:** "The assignment flow likely uses round-robin logic (possible, confidence 0.6) - inferred from flow name and advisor count field, but flow XML not yet retrieved."

### Low Confidence (0.0-0.4)
- **Use terms:** "requires confirmation", "uncertain", "needs investigation"
- **When:** Speculation, missing data, conflicting evidence
- **Example:** "The integration endpoint may require authentication (requires confirmation, confidence 0.3) - Named Credential exists but auth type not yet verified."

## Integration with Artifacts

All Detective Pattern outputs must be captured in research artifacts:

```json
{
  "detective_pattern_cycles": [
    {
      "cycle_number": 1,
      "sub_phase": "research-ado",
      "timestamp": "2024-01-15T10:30:00Z",
      "step_1_clarify": {
        "restated_problem": "...",
        "item_type": "enhancement",
        "missing_information": []
      },
      "step_2_hypotheses": [
        {
          "hypothesis": "...",
          "confidence": "medium",
          "rationale": "..."
        }
      ],
      "step_3_research": {
        "findings": [...],
        "evidence_correlation": {...},
        "new_clues": [...]
      },
      "step_4_converge": {
        "current_behavior": "...",
        "desired_behavior": "...",
        "gap_analysis": "...",
        "assumptions": [...],
        "unknowns": [...]
      }
    }
  ],
  "hypotheses": [...],
  "evidence_correlation": {...},
  "confidence_levels": {...},
  "patterns_identified": [...],
  "gaps_identified": [...]
}
```

## Usage in Research Prompts

Each research sub-phase prompt should:
1. Reference this template at the top
2. Execute the 4-step Detective Pattern loop
3. Produce structured output in the required format
4. Track all outputs in artifact JSON schemas

See individual research prompt files for sub-phase-specific guidance.

