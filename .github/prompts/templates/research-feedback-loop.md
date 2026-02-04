# Research Feedback Loop Decision Template

This template defines the feedback loop decision mechanism used in research sub-phases to ensure research completeness and substance.

## Purpose

**YOU MUST** evaluate findings after completing research and evidence correlation in a sub-phase to determine if previous research steps need to be revisited to gather additional evidence. This creates an iterative loop ensuring research is complete and substantive. **This is NOT optional** - iteration is expected and required for thorough research.

## CRITICAL: MANDATORY EVALUATION

**Every sub-phase MUST:**
1. Evaluate ALL findings against the 5 trigger criteria below
2. Execute ALL warranted revisits BEFORE marking the sub-phase complete
3. Update the Global Clue Register with new discoveries
4. Document all loop decisions in the artifact

**Failure to evaluate and execute feedback loops is a research quality failure.**

## Decision Framework

### When to Loop Back

**YOU MUST** evaluate findings against these criteria. If ANY criterion is met, a revisit is **REQUIRED** (not optional):

1. **New Topic Discovered**
   - Current research finds a topic/component not previously investigated
   - Example: Web research finds "Platform Events" → Loop back to Salesforce metadata to find Platform Event definitions

2. **Evidence Gap**
   - Finding has low confidence and previous step could provide evidence
   - Example: Wiki mentions a flow but doesn't describe it → Loop back to Salesforce metadata to get flow details

3. **Contradiction**
   - Finding contradicts previous research and needs resolution
   - Example: Code shows one pattern, Salesforce metadata shows another → Loop back to verify which is active

4. **High-Value Finding**
   - Important finding that should be validated across sources
   - Example: Similar work item shows critical pattern → Loop back to Salesforce metadata to verify pattern exists

5. **Missing Context**
   - Finding requires context from previous step to be meaningful
   - Example: Context7 docs reference integration → Loop back to ADO to find related tickets

### Which Steps Can Be Revisited

Based on current sub-phase, determine which previous steps can provide additional evidence:

**From ADO Research:**
- Can loop back to: `organization_dictionary` (if new terms found)

**From Wiki Research:**
- Can loop back to: `ado` (if related tickets mentioned), `organization_dictionary` (if new terms)

**From Business Context Research:**
- Can loop back to: `wiki` (if documentation needed), `ado` (if related tickets needed)

**From Salesforce Research:**
- Can loop back to: `wiki` (for documentation), `ado` (for related tickets), `business_context` (for persona context)

**From Code Research:**
- Can loop back to: `context7` (for library docs), `web` (for best practices), `salesforce` (to verify active metadata)

**From Web Research:**
- Can loop back to: `ado` (for related tickets), `salesforce` (to find related metadata), `wiki` (for internal docs)

**From Context7 Research:**
- Can loop back to: `code` (for implementation), `web` (for additional best practices), `salesforce` (to verify usage)

**From Similar Work Items Research:**
- Can loop back to: `salesforce` (to investigate patterns), `code` (to find implementations), `wiki` (for related docs)

### Global Clue Register Operations

**CRITICAL:** The Global Clue Register and iteration state tracking are stored in the `run_state` section of the unified context file (`{{context_file}}`). You MUST actively maintain it.

#### How to UPDATE the Global Clue Register

**At Start of Sub-Phase (Phase 0: Orientation):**
```
1. Load: Read {{context_file}} and access run_state section
2. Check: Filter for clues with status="uninvestigated" 
3. Identify: Which uninvestigated clues should THIS sub-phase handle?
4. Focus: Add these to your investigation queue
```

**After Each Finding:**
```
For each new discovery, add to global_clue_register.keywords/entities/etc:
{
  "term": "[The term/entity found]",
  "discovered_in": "[current sub-phase name]",
  "discovered_at": "[ISO timestamp]",
  "investigated_in": [],
  "status": "uninvestigated",
  "priority": "high|medium|low",
  "notes": "[Why this matters, what to investigate]"
}
```

**After Investigating a Clue:**
```
Update the clue entry:
{
  "investigated_in": ["salesforce", "code"],  // Add this sub-phase
  "status": "investigated",
  "findings": "[What was discovered]",
  "confidence": 0.95
}
```

**Before Marking Sub-Phase Complete:**
```
1. Query: Get all clues with status="uninvestigated"
2. Filter: Which should have been covered by THIS sub-phase?
3. Action: If any found, investigate them NOW
4. Save: Write updated register back to file
```

#### Clue Status Values
- `uninvestigated`: Discovered but not yet researched
- `in_progress`: Currently being investigated  
- `investigated`: Research complete, findings recorded
- `blocked`: Cannot investigate (e.g., managed package internals)
- `deferred`: Low priority, moved to assumptions

### Loop Back Rules

**Constraints:**
- Can only loop back to steps that have already executed (check `run-state.json.completedSteps`)
- Maximum 3 feedback loops per sub-phase to prevent infinite loops
- Maximum 10 total loops across all sub-phases (global safety limit)
- Maximum 2 revisits per target sub-phase
- Track loop count in artifact (`loop_count` field)
- Document loop rationale in artifact (`feedback_loop_decisions` array)

**Loop Execution (MANDATORY):**
- **EXECUTE NOW** - do not defer revisits to later
- When looping back, execute only the relevant steps from that sub-phase
- Focus on the specific question/clue that triggered the loop
- Update artifacts with new findings
- Update Global Clue Register with discoveries
- Re-evaluate after loop completes for cascading revisits

## Decision Process

### Step 1: Evaluate Current Findings

Review all findings from current sub-phase:
- New topics/components discovered
- Findings with low confidence
- Contradictions with previous research
- High-value findings needing validation
- Missing context requirements

### Step 2: Identify Evidence Gaps

For each finding, determine:
- What additional evidence is needed?
- Which previous step could provide that evidence?
- Is the evidence critical for research completeness?

### Step 3: Make Loop Decision

For each identified gap:
- **Decision:** Loop back or proceed?
- **Target Step:** Which previous step to revisit?
- **Specific Question:** What to investigate?
- **Rationale:** Why this loop is needed

### Step 4: Execute Loop (MANDATORY if warranted)

**If ANY criterion is met, you MUST execute the loop (not optional):**
1. Check loop count (must be < 3 per sub-phase, < 10 total)
2. Verify target step has executed
3. **EXECUTE NOW:** Run relevant steps from target sub-phase with focused investigation questions
4. Gather additional evidence
5. Update artifacts with new findings
6. Update Global Clue Register with new discoveries
7. Re-evaluate completeness and check for cascading revisits

### Step 5: Mark Research Complete

After loops complete (or if no loops needed):
- Set `research_complete: true` for this sub-phase
- Document all feedback loop decisions
- Proceed to next sub-phase

## Artifact Schema

All research artifacts must include feedback loop tracking:

```json
{
  "feedback_loop_decisions": [
    {
      "decision_number": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "trigger": "New topic discovered: Platform Events",
      "target_step": "research.salesforce",
      "specific_question": "Find Platform Event definitions and usage",
      "rationale": "Web research found Platform Events best practice, need to verify if org uses them",
      "loop_executed": true,
      "findings_from_loop": ["Found 3 Platform Events in org", "Used in 2 flows"],
      "research_complete_after_loop": true
    }
  ],
  "steps_revisited": [
    {
      "step": "research.salesforce",
      "revisit_count": 1,
      "questions_investigated": ["Platform Event definitions", "Platform Event usage in flows"]
    }
  ],
  "loop_count": 1,
  "research_complete": true
}
```

## Examples

### Example 1: Web Research → Salesforce Loop

**Scenario:** Web research finds "Platform Events" as best practice for async processing.

**Evaluation:**
- New topic discovered: Platform Events
- Evidence gap: Don't know if org uses Platform Events
- Missing context: Need to verify if this pattern applies

**Decision:**
- Loop back to: `research.salesforce`
- Question: Find Platform Event definitions and usage in org
- Rationale: Need to verify if org already uses Platform Events before recommending

**Execution:**
- Query Salesforce for Platform Event definitions
- Search flows for Platform Event usage
- Update Salesforce metadata artifact with findings

### Example 2: Salesforce Research → Wiki Loop

**Scenario:** Salesforce metadata finds integration "Banner_API" but details are unclear.

**Evaluation:**
- Evidence gap: Integration details missing
- Missing context: Need documentation for integration

**Decision:**
- Loop back to: `research.wiki`
- Question: Search wiki for Banner_API integration documentation
- Rationale: Wiki may have integration docs with authentication, endpoints, error handling

**Execution:**
- Search wiki for "Banner_API" or "Banner integration"
- Retrieve relevant wiki pages
- Update wiki artifact with findings

### Example 3: Similar Work Items → Salesforce Loop

**Scenario:** Similar work item shows pattern of using Record-Triggered Flows for Contact updates.

**Evaluation:**
- High-value finding: Pattern from similar work item
- Evidence gap: Need to verify if current org uses this pattern

**Decision:**
- Loop back to: `research.salesforce`
- Question: Find Record-Triggered Flows on Contact object
- Rationale: Validate pattern exists in org before recommending similar approach

**Execution:**
- Query Salesforce for Record-Triggered Flows on Contact
- Analyze flow patterns
- Update Salesforce metadata artifact

## Integration with Detective Pattern

The feedback loop decision step integrates with the Detective Pattern:

- **After Step 3 (Research and Correlate):** Evaluate if findings suggest looping back
- **Before Step 4 (Converge):** Complete any necessary loops to gather missing evidence
- **During Step 4 (Converge):** Incorporate loop findings into final view

## Iteration Flow Diagram

```
Current Sub-Phase Complete
         |
         v
Evaluate ALL Findings
         |
         v
Apply 5 Trigger Criteria
         |
         v
Any Triggers Met? ----YES----> Queue Revisits
         |                            |
         | NO                        v
         |                    Execute ALL Revisits NOW
         |                            |
         |                            v
         |                    Update Global Clue Register
         |                            |
         |                            v
         |                    Re-evaluate for Cascading Revisits
         |                            |
         |                            v
         |                    More Revisits Needed? ----YES----> (loop back)
         |                            |
         |                            | NO
         |                            |
         +<---------------------------+
         |
         v
Mark Sub-Phase Complete
```

## Best Practices

1. **Be Thorough:** Evaluate EVERY finding, not just obvious ones
2. **Be Specific:** Clearly define what to investigate in the loop
3. **Execute Immediately:** Do not defer revisits - execute them NOW
4. **Track Everything:** Document all loop decisions, findings, and clue register updates
5. **Respect Limits:** Don't exceed configured limits (3 per sub-phase, 10 total)
6. **Update Artifacts:** Always update artifacts AND Global Clue Register with loop findings
7. **Re-evaluate:** After each loop, re-evaluate if MORE revisits are needed
8. **Think Cross-Phase:** A single clue may warrant revisits to multiple sources

