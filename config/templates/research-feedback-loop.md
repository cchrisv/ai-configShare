# Research Feedback Loop Protocol (V2)

## Purpose
After completing each research step, evaluate whether new discoveries warrant revisiting previous steps to improve research quality.

## Feedback Loop Triggers

Evaluate your findings against these 5 criteria:

### 1. New Topic Discovered
- **Definition:** Found a technology, term, component, or concept not previously identified
- **Examples:** 
  - Wiki mentions an Apex class not in initial search
  - Similar work item references a related feature
  - Web search reveals a library being used
- **Action:** Queue revisit to relevant step (salesforce, code, ado)

### 2. Evidence Gap Identified
- **Definition:** Found a claim or assumption that lacks supporting evidence
- **Examples:**
  - Assumption about user impact but no user count data
  - Technical approach mentioned but not verified in code
  - Permission requirements stated but not confirmed in SF
- **Action:** Queue revisit to fill the gap

### 3. Contradiction Found
- **Definition:** New information conflicts with earlier findings
- **Examples:**
  - Best practice says X, but code does Y
  - Wiki says feature works one way, ADO ticket says another
  - Similar work item has different solution approach
- **Action:** Queue revisit to resolve contradiction

### 4. High-Value Finding
- **Definition:** Discovery that significantly impacts the solution
- **Examples:**
  - Found existing implementation that can be reused
  - Discovered a blocker not mentioned in requirements
  - Identified a modernization opportunity
- **Action:** Queue revisit to validate and expand

### 5. Missing Context
- **Definition:** New information needs additional context to be actionable
- **Examples:**
  - Found related work item but don't have its details
  - Discovered a component but don't know its dependencies
  - Identified a pattern but don't know if it's org-standard
- **Action:** Queue revisit to contextualize

## Feedback Loop Execution

### Step 1: Evaluate Findings
After completing a research step, review all findings against the 5 triggers above.

### Step 2: Document Decisions
For each finding, document:
```json
{
  "finding": "Description of what was discovered",
  "trigger": "Which of the 5 triggers applies",
  "target_step": "Which step to revisit",
  "question": "Specific question to answer in revisit",
  "priority": "high/medium/low"
}
```

### Step 3: Execute Revisits
- Execute ALL high-priority revisits immediately
- Execute medium-priority revisits if time permits
- Log low-priority items for synthesis phase

### Step 4: Update Artifacts
After revisit, update the original artifact with:
- New findings from the revisit
- Resolution of contradictions
- Filled evidence gaps

## Constraints

- **Max Iterations:** 3 per step (to prevent infinite loops)
- **Scope:** Only revisit steps that are dependencies or prior in order
- **Documentation:** Always document why a revisit was triggered

## Example Workflow

```
1. Complete research-web step
2. Evaluate: "Found that Salesforce recommends Permission Set Groups for this use case"
3. Trigger: "Best practice contradicts implementation" (Contradiction Found)
4. Target: research-salesforce
5. Question: "Are Permission Set Groups being used? Query PermissionSetGroup object"
6. Execute revisit to research-salesforce
7. Update salesforce artifact with Permission Set Group findings
8. Continue to research-synthesis with enriched data
```

## Artifact Updates

When updating an artifact after a feedback loop:

```json
{
  "feedback_loops": [
    {
      "triggered_by": "research-web",
      "trigger_type": "contradiction_found",
      "question": "Are Permission Set Groups being used?",
      "resolution": "Found 3 Permission Set Groups in org",
      "iteration": 1
    }
  ],
  "loop_count": 1,
  "research_complete": true
}
```
