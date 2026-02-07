# Wiki Page Formatting Standards

This document defines the formatting standards for all Azure DevOps Wiki pages created by the autonomous ticket preparation workflow.

## Rich HTML Template

**Primary Template:** Use `#file:config/templates/wiki-page-template.html` for all wiki pages.

The HTML template provides:
- **Gradient headers** for each major section (matching work item field styling)
- **Card-based layouts** for content organization
- **Color-coded sections** based on content type:
  - 🟢 Green: Summary, Success, Goals, Getting Started
  - 🔵 Blue: Information, Design, Architecture, Research
  - 🟠 Orange: Assumptions, Warnings, Investigation
  - 🔴 Red: Risks, Blockers, Critical items, Open Unknowns
  - 🟣 Purple: Discovery, Investigation Trail
  - 🩵 Teal: Testing, Validation, Quality
- **Styled tables** with colored headers
- **Collapsible sections** for detailed content

## Writing Tone & Narrative Style

### The Voice: Knowledgeable Guide

Write as a **knowledgeable colleague sharing insights** - someone who has thoroughly investigated the problem and wants to help readers understand both the journey and the destination. The tone should be:

- **Educational without being condescending** - Explain concepts as if teaching a capable peer who simply hasn't had time to research this specific topic yet
- **Narrative-driven** - Tell the story of discovery, not just list facts. Guide readers through "what we learned and why it matters"
- **Respectful of all audiences** - Business users should understand the value and impact; technical users should find the depth they need
- **Conversational but professional** - Use "we" to create partnership, avoid jargon without explanation, and maintain warmth without sacrificing precision

### Narrative Over Lists

**Bad Example (Just Facts):**
```markdown
## Research Findings
- Found ContactTriggerHandler
- Uses Handler Pattern
- 15 references in codebase
```

**Good Example (Narrative with Context):**
```markdown
## What We Discovered

When we examined the codebase, we found that the organization has already established a solid foundation for this type of work. The `ContactTriggerHandler` class follows the Handler Pattern that the team has standardized on - this is good news because it means we can extend existing patterns rather than introducing something unfamiliar.

We traced 15 references to this handler throughout the codebase, which tells us two important things: first, any changes here will need careful testing since the impact radius is significant; second, the pattern is well-established and trusted by the team.

| Component | What It Does | Why It Matters |
|-----------|--------------|----------------|
| ContactTriggerHandler | Orchestrates contact-related automation | Our entry point - we'll extend this rather than create something new |
```

### Balancing Business and Technical Audiences

Each section should work on two levels:

1. **Lead with business context** - Start with why this matters, what problem it solves, or what value it delivers
2. **Follow with technical depth** - Provide the specifics in tables, code references, or collapsible details for those who need them

**Example Structure:**
```markdown
### Why We Chose This Approach

After evaluating our options, we determined that extending the existing Flow framework gives us the best balance of speed and maintainability. This approach means the team can deliver the feature within the sprint while keeping future enhancements straightforward.

For the technically curious, here's how the options compared:

<details>
<summary>📊 Detailed Option Analysis (Click to expand)</summary>

| Option | Approach | Trade-offs |
|--------|----------|------------|
| Option A | ... | ... |

</details>
```

### Phrases to Use and Avoid

**Use:**
- "We discovered that..." / "Our investigation revealed..."
- "This matters because..." / "The key insight here is..."
- "Here's what this means in practice..."
- "For those interested in the details..." / "Diving deeper..."
- "The good news is..." / "One thing to watch for..."

**Avoid:**
- "Obviously..." / "Simply..." / "Just..." (condescending)
- "As everyone knows..." (assumes knowledge)
- "It should be noted that..." (bureaucratic)
- Unexplained acronyms on first use
- Technical jargon without context for business readers

## Azure DevOps Wiki-Specific Requirements

Azure DevOps Wiki uses a specific flavor of markdown with important differences from standard markdown:

### Critical ADO Wiki Rules

1. **HTML Support** - ADO Wiki DOES support HTML in wiki pages (unlike pull requests)
   - ✅ HTML tags allowed: `<details>`, `<summary>`, `<div>`, `<strong>`, `<em>`, `<p>`, `<br/>`
   - ⚠️ **Avoid hardcoded colors:** `<font color="blue">` or `style="color:green"` may be invisible in Dark Mode.
   - ✅ Video embedding: `<video src="url" width=400 controls>`
   - ⚠️ Use HTML sparingly - prefer markdown for consistency

2. **Link Format** - Use standard markdown links, NOT wiki-specific syntax
   - ✅ `[Link Text](Page-Path)` - Standard markdown
   - ❌ `[[Link Text]]` - MediaWiki style (not supported)

3. **Tables** - Must have header row and alignment row
   ```markdown
   | Header 1 | Header 2 |
   |----------|----------|
   | Value 1  | Value 2  |
   ```

4. **Code Blocks** - Use lowercase language identifiers
   ```markdown
   ```apex
   // Apex code here
   ```
   ```

5. **Table of Contents** - Use ADO Wiki's automatic TOC
   ```markdown
   [[_TOC_]]
   ```

6. **Collapsible Sections** - Use HTML details/summary tags
   ```markdown
   <details>
   <summary>Click to expand!</summary>
   
   ## Content inside
   - List item 1
   - List item 2
   
   </details>
   ```

### Mermaid Diagrams
- Wrap diagrams with `::: mermaid` and close with `:::`.
- **Do NOT use `%%{init...}%%` or `classDef` styling.** These are not fully supported in ADO Wiki and break in Dark Mode.
- Use standard Mermaid node shapes to distinguish element types:
  - `([Start/End])` for terminators
  - `{{Decision}}` for logic checks
  - `[[Subprocess]]` for major actions
  - `[(Database)]` for storage
- Use `graph LR` or `graph TD` (avoid `flowchart`).
- Keep node labels concise.

#### Diagram Example
```markdown
::: mermaid
graph LR
  trigger([Trigger]) --> assess{{Decision}}
  assess -->|Yes| happy[Primary Path]
  assess -->|No| alternate[Fallback]
  happy --> done([Outcome])
  alternate --> notify[[Notify Stakeholders]]
  notify --> done
:::
```

> compass **Diagram cadence:** Provide at least one diagram in each major section (Research, Solutioning, Implementation) to reinforce comprehension.
# 📋 Autonomous Ticket Preparation - #{{runtime.work_item_id}}

> **Work Item:** #{{runtime.work_item_id}} - [Work Item Title]
>
> **Generated:** [ISO 8601 timestamp]
>
> **Status:** ✅ Complete - Ready for Development

---

[View Ticket in ADO →](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/{{runtime.work_item_id}})

---

## 📑 Table of Contents

[[_TOC_]]

---

## 🎯 Executive Summary

[Begin with 2-3 sentences that tell the story: what's the situation, what did we discover, and what do we recommend? Write this as if explaining to a colleague over coffee.]

**The Challenge We're Addressing:**
[Describe the business problem in plain language. What pain point or opportunity prompted this work? Who is affected and how?]

**What We Learned:**
[Summarize the key discoveries from research. What surprised us? What confirmed our assumptions? What changed our thinking?]

**Our Recommended Approach:**
[Explain the solution in terms of value delivered, not technical implementation. What will be different when this is complete?]

**The Path Forward:**
[Set expectations: complexity level, key dependencies, and any important considerations for planning.]

---

## 📋 Understanding the Request

### 🎯 Business Context

[Open with a narrative that puts the reader in the shoes of the people who need this. Who are they? What are they trying to accomplish? What's standing in their way?]

**The People This Affects:**
[Write about the stakeholders as real people with real challenges, not just "users." What does their day look like? What frustrates them about the current situation?]

**The Current Situation:**
[Describe where things stand today - not just technically, but in terms of the human experience. What works? What doesn't? Why is now the right time to address this?]

**What Success Looks Like:**
[Paint a picture of the future state in terms the stakeholders would use. How will their experience be different? What will they be able to do that they can't do today?]

### 📊 What We Need to Deliver

[Transition into requirements with context: "Based on what we learned about the team's needs, here's what the solution must accomplish..."]

**Functional Requirements:**
[Frame these in terms of user value, not just technical capabilities. "Users need to be able to..." not just "System shall..."]

**Quality Attributes:**
[Explain why these matter: "Given the volume of records involved, performance is critical because..." not just "Response time < 2 seconds"]

---

## 🔍 Discovery & Research

### 📚 Learning from Existing Knowledge

**What We Found in Our Documentation:**
- [Relevant wiki pages and documentation found]
- [Prior solutions and approaches]
- [Design patterns and best practices]

**Key Discoveries:**
- [Important discoveries from existing knowledge]
- [Reusable components or patterns]
- [Integration points identified]

### 🏗️ Understanding Our Technical Environment

**What Already Exists:**
- [Existing components and their roles]
- [Data flows and dependencies]
- [Technical constraints and considerations]

**Metadata Dependencies Discovered:**

<details>
<summary>📊 Component Usage Analysis (Click to expand)</summary>

**Components Using This Metadata:**
| Type | Component Name | Impact Level | Notes |
|------|---------------|--------------|-------|
| [ApexClass/Flow/Trigger] | [Component Name] | [High/Medium/Low] | [Brief description of how it's used] |

**Usage Statistics:**
- **Apex Classes:** [Count] components reference this metadata
- **Flows:** [Count] flows use this metadata
- **Triggers:** [Count] triggers depend on this metadata
- **Pages:** [Count] Visualforce/Lightning pages include this metadata

**What This Metadata Depends On:**
| Type | Component Name | Dependency Reason |
|------|---------------|-------------------|
| [Type] | [Name] | [Why the dependency exists] |

> **Note:** Dependency analysis performed using MetadataComponentDependency Tooling API. For CustomField dependencies, results show object-level relationships as the API tracks field dependencies at the parent object level.

</details>

**Systems We Need to Work With:**
- [Third-party systems and APIs]
- [Service integrations required]
- [External data sources]

### 💻 Examining the Codebase

**Helpful Components We Discovered:**
| Component | Purpose | Relevance | Reusability |
|-----------|---------|-----------|-------------|
| [Component 1] | [Function] | [How it relates] | [Can we reuse?] |
| [Component 2] | [Function] | [How it relates] | [Can we reuse?] |

**Patterns We Can Follow:**
- [Existing patterns to follow]
- [Code conventions and standards]
- [Testing approaches used]

### 🔗 Related Work Items

**Work Items Related to This Ticket:**

| Work Item | Title | Why It's Related |
|-----------|-------|------------------|
| [#12345](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/12345) | [Title] | [Relationship reason - same functional area, dependencies, similar business context] |
| [#12346](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/12346) | [Title] | [Relationship reason] |

> **Note:** Related work items are linked in Azure DevOps. Check the work item's **Links tab** to view all related items and navigate between them.

### 🔍 Potential Duplicates

**Work Items That May Be Duplicates:**

| Work Item | Title | Why It's a Duplicate | Similarity Assessment |
|-----------|-------|---------------------|----------------------|
| [#12347](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/12347) | [Title] | [Duplicate reason - same business ask, similar user story intent, overlapping acceptance criteria] | [Similarity score/assessment] |
| [#12348](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/12348) | [Title] | [Duplicate reason] | [Similarity score/assessment] |

> **⚠️ Action Required:** These work items have been identified as potential duplicates based on similarity analysis. Please review these work items to determine if they should be consolidated or if they address distinct requirements.

---

## 🔬 Investigation & Discovery Trail

This section tells the story of how we investigated this work item - not just what we found, but how our understanding evolved along the way. Think of it as a research journal that helps future readers understand the reasoning behind our conclusions.

### 🕵️ The Investigation Journey

[Write 2-3 paragraphs describing the investigation as a narrative. What questions did we start with? What did we look at first and why? How did early findings shape where we looked next?]

**Where We Started:**
[Explain the initial questions or assumptions that guided the research. What were we trying to understand?]

**How Our Understanding Evolved:**
[Describe how findings built on each other. Did anything surprise us? Did we need to change direction based on what we learned?]

**Key Turning Points:**
[Highlight 2-3 moments where a discovery significantly shaped our understanding or approach]

### 🧪 Testing Our Assumptions

As we researched, we formed hypotheses and tested them against evidence. Here's what held up and what didn't:

[Write a brief narrative about the most important hypothesis - what made us think it, how we tested it, and what we learned]

<details>
<summary>📋 Complete Hypothesis Testing Log (Click to expand)</summary>

| What We Thought | Why We Thought It | What We Found | Verdict |
|-----------------|-------------------|---------------|---------|
| [Initial hypothesis] | [Source or reasoning] | [Evidence discovered] | ✅ Confirmed / ❌ Disproven / ⚠️ Partially True |

</details>

### 🔄 When We Had to Rethink

[If applicable, describe in narrative form any moments where later findings made us revisit earlier conclusions. What triggered the rethink? What did we learn the second time?]

> **Why This Matters:** Documenting when we changed our minds helps future readers understand that our conclusions came from rigorous investigation, not initial assumptions.

### ⚔️ Resolving Conflicting Information

[If sources disagreed, tell the story: what conflicted, why it mattered, and how we determined the truth. Explain the resolution in terms readers can follow.]

When we encountered conflicting information, we used this priority order: what's actually in the live system (metadata) > what the code does > what documentation says > what comments suggest.

<details>
<summary>📋 Conflict Resolution Details (Click to expand)</summary>

| The Conflict | What One Source Said | What Another Said | What We Concluded | Our Reasoning |
|--------------|---------------------|-------------------|-------------------|---------------|
| [Topic] | [Source A] | [Source B] | [Resolution] | [Why this makes sense] |

</details>

### 📊 How Confident Are We?

[Summarize overall confidence in a few sentences. Where do we feel solid? Where should implementers verify or dig deeper?]

| Area | Our Confidence | What Gives Us Confidence | What We're Less Sure About |
|------|----------------|-------------------------|---------------------------|
| [Technical approach] | High/Medium/Low | [Evidence] | [Remaining questions] |

---

## 🎨 Solution Design

[Open with a brief narrative that orients the reader: what's the overall shape of this solution? Help both business and technical readers understand the approach before diving into details.]

### 🏛️ The Architectural Approach

**Why We Designed It This Way:**
[Tell the story of the design philosophy. What principles guided our decisions? What did we optimize for and why?]

**The Key Technology Choices:**
[Explain each major technology decision in terms of the value it provides. "We're using X because it gives us Y, which matters because Z..."]

### 🧩 How the Pieces Fit Together

[Provide a narrative overview before the component table. Help readers understand the "shape" of the solution before the details.]

**The Components at a Glance:**

| Component | What It Does | Why It's Needed | How Complex |
|-----------|--------------|-----------------|-------------|
| [Name] | [Plain-language responsibility] | [Why this piece matters] | [Effort level with context] |

**How Information Flows:**
[Describe the data flow as a story: "When a user does X, the system responds by... This triggers... which ultimately results in..."]

### 🔌 Integration Points

**Working with Other Systems:**
[Explain each integration in terms of what it enables, not just what it connects to. "To keep student records synchronized, we connect with Banner, which means..."]

**Security Considerations:**
[Frame security in terms of what we're protecting and why it matters, not just technical controls.]

---

## 💭 Decision Rationale

Every technical decision involves weighing alternatives. This section walks you through how we evaluated our options and why we landed where we did. Our goal is transparency - if circumstances change, this documentation should help future teams understand whether our reasoning still applies.

### 🎯 The Options We Weighed

[Write 2-3 paragraphs telling the story of the decision. What approaches did we consider? What made this decision non-trivial? What were the key factors that ultimately drove our recommendation?]

**The Short Version:**
[One paragraph summary of why we chose what we chose - accessible to any reader]

**For Those Who Want the Details:**

We evaluated each option against three criteria from the Salesforce Well-Architected Framework:
- **Trusted** - Will this be reliable and secure?
- **Easy** - Can the team maintain and extend this confidently?
- **Adaptable** - Will this flex gracefully as requirements evolve?

| Option | The Approach | What's Good About It | What Gave Us Pause | Our Assessment |
|--------|--------------|---------------------|-------------------|----------------|
| Option 1 | [Approach] | [Strengths in plain language] | [Concerns] | ✅ **Recommended** |
| Option 2 | [Approach] | [Strengths] | [Concerns] | ❌ Not this time |
| Option 3 | [Approach] | [Strengths] | [Concerns] | ❌ Not this time |

### ❌ Why We Passed on the Alternatives

[For each eliminated option, write a brief narrative explanation. Focus on helping readers understand the reasoning, not just listing rejection criteria.]

<details>
<summary>💡 Option 2: [Option Name] - Why we didn't go this route</summary>

[Write 2-3 sentences explaining the reasoning in conversational terms]

**The key concerns were:**
- [Reason 1 - explain why this matters, not just what it is]
- [Reason 2]

**When this might be the right choice:**
[Help future readers know when to reconsider this option]

</details>

<details>
<summary>💡 Option 3: [Option Name] - Why we didn't go this route</summary>

[Same narrative approach]

</details>

### 📏 How Our Standards Guided Us

Our organization has established standards for good reason - they encode lessons learned. Here's how those standards influenced this decision:

[Write a brief narrative connecting the standards to this specific situation]

| Standard | The Relevant Guidance | How It Applied Here |
|----------|----------------------|---------------------|
| [Standard name] | [Rule in plain language] | [Specific impact on our decision] |

### ⚖️ The Trade-offs We're Making

No solution is perfect. Here's what we're consciously accepting and why we think it's the right call:

[Write a narrative about the most significant trade-off - what we're giving up and why it's worth it]

| We're Choosing | Instead Of | Because | The Risk We're Accepting |
|----------------|-----------|---------|-------------------------|
| [Choice] | [Alternative] | [Reasoning that a peer would find compelling] | [Honest assessment of downside] |

### 🚫 Roads Not Taken

For the record, here are approaches we explicitly decided against. This isn't to say they're bad - just not right for this situation:

[Brief narrative about why these didn't fit]

| Approach We Avoided | Why It Wasn't Right Here | When It Might Be Right |
|--------------------|------------------------|----------------------|
| [Approach] | [Reasoning in plain language] | [Future scenarios] |

---

## ✅ Quality & Validation

### 📋 How We'll Know We're Successful

**What Users Should Experience:**
1. [First user-facing requirement with acceptance test]
2. [Second user-facing requirement with acceptance test]
3. [Third user-facing requirement with acceptance test]

**What the System Must Do:**
4. [First technical requirement with validation approach]
5. [Second technical requirement with validation approach]
6. [Third technical requirement with validation approach]

### 🧪 Testing Strategy & Coverage

[Open with 2-3 paragraphs explaining the testing philosophy for this feature. What testing approach did we take and why? What categories of tests are most critical? What risks are we specifically testing against?]

**Our Testing Philosophy:**
[Explain the reasoning behind test case selection - what we prioritized and why. Help readers understand the coverage strategy.]

---

### 🎯 AC-Centric Test Coverage Matrix

This matrix ensures every Acceptance Criteria has both happy path AND unhappy path test coverage. No AC is considered fully covered without both.

| AC ID | Acceptance Criteria | Happy Path Tests | Unhappy Path Tests | Coverage Status |
|:-----:|---------------------|------------------|-------------------|:---------------:|
| AC-1 | [First acceptance criterion] | TC-001, TC-002 | TC-005, TC-006 | ✅ Full |
| AC-2 | [Second acceptance criterion] | TC-003 | TC-007 | ✅ Full |
| AC-3 | [Third acceptance criterion] | TC-004 | — | ⚠️ Partial |
| AC-4 | [Fourth acceptance criterion] | — | — | ❌ Gap |

> **Coverage Legend:**
> - ✅ **Full** = Has at least one Happy Path test AND one Unhappy Path test
> - ⚠️ **Partial** = Has only Happy Path OR only Unhappy Path tests (requires justification)
> - ❌ **Gap** = No test coverage (blocker - must be addressed)

**Path Type Definitions:**
| Path Type | Symbol | Description |
|-----------|:------:|-------------|
| Happy Path | ✓ | Validates AC works as expected under normal conditions with valid inputs |
| Negative | ✗ | Validates error handling, invalid inputs, permission failures, missing data |
| Edge Case | ⚡ | Validates boundary conditions, bulk operations, timing, concurrent access |
| Security | 🔒 | Validates access controls, data isolation, FLS/CRUD enforcement, sharing rules |

**Coverage Notes:**
- **AC-3 (Partial):** [Explanation of what's covered and what's not, and why - e.g., "No negative test because feature degrades gracefully with no user-facing error"]
- **AC-4 (Gap):** [Explanation of why no test exists and recommended action]

---

### 📊 Test Data Matrix

Understanding who and what we're testing is crucial. The test data matrix below defines the personas, configurations, and scenarios that form the foundation of our test coverage.

<details>
<summary>📦 Test Data Setup Guide (Click to expand)</summary>

**Required Configuration:**
- [ ] [Feature flag or setting 1]
- [ ] [Feature flag or setting 2]
- [ ] [Required permission sets]

**Test Records to Create:**
- [ ] [Record type 1 with specific attributes]
- [ ] [Record type 2 with specific attributes]

**Environment Prerequisites:**
- [ ] [Integration or mock service setup]
- [ ] [Data seeding requirements]

</details>

#### 👤 Persona & Scenario Definitions

| Row ID | Persona | Profile / Permissions | Record Context | Key Conditions | Notes |
|:------:|---------|----------------------|----------------|----------------|-------|
| 👤 D1 | [Primary User Type] | [Profile + Permission Set] | [Object Context] | [Happy path conditions] | Primary success path |
| 👤 D2 | [Secondary User Type] | [Profile + Permission Set] | [Object Context] | [Alternate conditions] | Alternate flow |
| 📊 D3 | [Data Variation] | [Profile + Permission Set] | [Object Context] | [Boundary conditions] | Boundary testing |
| ⚠️ D4 | [Negative Scenario] | [Limited permissions] | [Object Context] | [Failure conditions] | Expected to fail gracefully |

> **Legend:** 👤 Persona-focused | 📊 Data variation | ⚠️ Negative/Edge case

<details>
<summary>📋 Detailed Persona & Data Specifications (Click to expand)</summary>

---

#### 👤 D1: [Primary User Persona Name]

| Attribute | Value |
|-----------|-------|
| **Role/Title** | [e.g., Admissions Advisor] |
| **Profile** | [e.g., Admissions User] |
| **Permission Sets** | [e.g., Email_Composer_User, Template_Access] |
| **Record Access** | [e.g., Own records + sharing rules] |

**Test User Setup:**
```
Username: test.d1.user@sandbox.test
Profile: [Profile Name]
Permission Sets: [List]
Role: [Role in hierarchy]
```

**Required Test Records:**
| Object | Record Name | Key Field Values | Purpose |
|--------|-------------|------------------|---------|
| [Contact] | [Test Contact D1] | Email: test@example.com | Primary test record |
| [Account] | [Test Account D1] | Type: Prospect | Parent record |

**Feature Flag Configuration:**
| Flag Name | Value | Reason |
|-----------|-------|--------|
| [Feature_Enabled__c] | `true` | Standard happy path |

---

#### 👤 D2: [Secondary User Persona Name]

| Attribute | Value |
|-----------|-------|
| **Role/Title** | [e.g., Student Success Coach] |
| **Profile** | [e.g., Student Success User] |
| **Permission Sets** | [e.g., Email_Composer_User] |
| **Record Access** | [e.g., Team-based sharing] |

**Test User Setup:**
```
Username: test.d2.user@sandbox.test
Profile: [Profile Name]
Permission Sets: [List]
```

**Required Test Records:**
| Object | Record Name | Key Field Values | Purpose |
|--------|-------------|------------------|---------|
| [Lead] | [Test Lead D2] | Status: Open | Alternate object context |

---

#### 📊 D3: [Boundary/Data Variation Scenario]

| Attribute | Value |
|-----------|-------|
| **Scenario Type** | [e.g., Maximum record count] |
| **Data Condition** | [e.g., 200 related records] |
| **Expected Behavior** | [e.g., Pagination activates] |

**Test Data Requirements:**
| Object | Count | Key Attributes | Purpose |
|--------|-------|----------------|---------|
| [Related Object] | [200] | [Various statuses] | Bulk/boundary testing |

---

#### ⚠️ D4: [Negative/Error Scenario]

| Attribute | Value |
|-----------|-------|
| **Scenario Type** | [e.g., Permission denied] |
| **Failure Condition** | [e.g., Missing Create permission] |
| **Expected Behavior** | [e.g., Graceful error message] |

**Test User Setup:**
```
Username: test.d4.restricted@sandbox.test
Profile: Minimum Access User
Permission Sets: [None or limited]
```

**Why This Scenario Matters:**
[Explain the business risk if this error case isn't handled properly]

---

</details>

---

### 🔴 P1 Critical Path Tests

These tests validate the core functionality that must work for the feature to be considered successful. Failure of any P1 test is a release blocker.

| ID | Test Scenario | Path Type | Covers AC | Steps Summary | Expected Outcome | Data Row |
|----|---------------|:---------:|:---------:|---------------|------------------|:--------:|
| TC-001 | [Happy path scenario] | ✓ Happy | AC-1, AC-2 | [Key steps] | [Observable result] | D1 |
| TC-002 | [Critical negative path] | ✗ Negative | AC-1 | [Key steps] | [Observable result] | D2 |

<details>
<summary>📋 P1 Test Case Details (Click to expand)</summary>

---

#### TC-001: [Full Test Title]

| | |
|---|---|
| **Objective** | [What we're validating and what proves success - the "oracle" that determines pass/fail] |
| **Path Type** | ✓ Happy Path |
| **Covers AC** | AC-1, AC-2 |
| **Priority** | 🔴 P1 - Critical Path |
| **Data Row** | D1 |
| **Estimated Duration** | [X minutes] |

**Pre-conditions & Setup:**
- [ ] [User is logged in as specified persona]
- [ ] [Required records exist with specified attributes]
- [ ] [Feature flags are configured as specified]
- [ ] [Integration endpoints are available/mocked]

**Step-by-Step Execution:**

| Step | Action | Input/Data | Expected Result | ✓ |
|:----:|--------|------------|-----------------|:-:|
| 1 | [Navigate to specific location] | [URL or navigation path] | [Page/component loads successfully] | ☐ |
| 2 | [Perform specific action] | [Exact values to enter/select] | [Immediate visual feedback] | ☐ |
| 3 | [Verify intermediate state] | [What to look for] | [Expected intermediate result] | ☐ |
| 4 | [Complete the action] | [Final input or click] | [Success indicator appears] | ☐ |
| 5 | [Verify final outcome] | [Where to check] | [Expected final state] | ☐ |

**Verification Checklist:**
- [ ] **UI Verification:** [Specific UI element shows expected state]
- [ ] **Data Verification:** [Record field X = expected value]
- [ ] **Related Records:** [Child/related records created/updated as expected]
- [ ] **Notifications:** [Email/alert sent if applicable]

**Telemetry & Logs to Verify:**
| Log Type | What to Look For | Where to Find It |
|----------|------------------|------------------|
| [Debug Log] | [Specific log message or pattern] | [Developer Console / Debug Logs] |
| [Platform Event] | [Event name and payload] | [Event Monitoring] |
| [Custom Log] | [Nebula Logger entry] | [Log__c records] |

**Cleanup Steps:**
- [ ] [Delete test record created]
- [ ] [Reset any changed settings]

<details>
<summary>👨‍💻 Developer Validation (Click to expand)</summary>

**Unit Test Pattern:**
```apex
@IsTest
static void test_[Object]_[Action]_[Condition]_Success() {
    // Arrange
    [Setup test data matching D1 persona]
    
    // Act
    Test.startTest();
    [Execute the action being tested]
    Test.stopTest();
    
    // Assert
    System.assertEquals([expected], [actual], '[Descriptive message]');
}
```

**Assertions to Implement:**
- `System.assertEquals([expected_value], [actual_value], '[Field] should be [expected]');`
- `System.assertNotEquals(null, [record].Id, 'Record should be created');`
- `System.assertEquals([expected_count], [query_results].size(), 'Expected N records');`

**Mocks Required:**
- [ ] [External service mock - if applicable]
- [ ] [HTTP callout mock - if applicable]

**Integration Points to Verify:**
- [ ] [Trigger/Flow executed - check debug log for specific entry]
- [ ] [Platform Event published - verify subscriber received]

</details>

<details>
<summary>🧪 QA Validation (Click to expand)</summary>

**Step-by-Step Navigation:**
1. App Launcher → [App Name]
2. [Object] tab → [List View or New button]
3. [Specific page/component] → [Action to perform]

**Data Verification Query:**
```sql
SELECT Id, [Field1], [Field2], [Field3], CreatedDate
FROM [Object__c]
WHERE [Condition]
ORDER BY CreatedDate DESC
LIMIT 1
-- Expected: [Describe expected field values]
```

**Visual Verification Checkpoints:**
- [ ] [UI element 1] displays [expected state]
- [ ] [Toast/message] shows [expected text]
- [ ] [Record detail page] shows [expected field values]

**Environment Prerequisites:**
- [ ] Logged in as: [Username from D1]
- [ ] Feature flag `[Flag_Name__c]` = ON
- [ ] Permission set `[Permission_Set_Name]` assigned

</details>

---

#### TC-002: [Full Test Title - Negative Scenario]

| | |
|---|---|
| **Objective** | [What we're validating - error handling, graceful failure] |
| **Path Type** | ✗ Negative |
| **Covers AC** | AC-1 |
| **Priority** | 🔴 P1 - Critical Path |
| **Data Row** | D2 |
| **Estimated Duration** | [X minutes] |

**Pre-conditions & Setup:**
- [ ] [Required setup items]
- [ ] [Condition that triggers the negative path - e.g., missing permission]

**Step-by-Step Execution:**

| Step | Action | Input/Data | Expected Result | ✓ |
|:----:|--------|------------|-----------------|:-:|
| 1 | [Action that should trigger error] | [Invalid/missing input] | [Error is caught gracefully] | ☐ |
| 2 | [Verify error handling] | [Check error message/state] | [User-friendly error displayed] | ☐ |
| 3 | [Verify no data corruption] | [Check related records] | [No orphaned/partial records] | ☐ |

**Verification Checklist:**
- [ ] Error message is user-friendly and actionable
- [ ] No data corruption occurred
- [ ] User can recover from error state

**Cleanup Steps:**
- [ ] [Cleanup item - verify no orphaned records]

<details>
<summary>👨‍💻 Developer Validation (Click to expand)</summary>

**Unit Test Pattern:**
```apex
@IsTest
static void test_[Object]_[Action]_[ErrorCondition]_FailsGracefully() {
    // Arrange
    [Setup test data matching D2 persona - with error condition]
    
    // Act & Assert
    Test.startTest();
    try {
        [Execute the action that should fail]
        System.assert(false, 'Expected exception was not thrown');
    } catch ([ExpectedException] e) {
        System.assert(e.getMessage().contains('[expected message]'), 'Error message should be user-friendly');
    }
    Test.stopTest();
    
    // Verify no side effects
    System.assertEquals(0, [SELECT COUNT() FROM Object__c WHERE ...], 'No records should be created');
}
```

**Assertions to Implement:**
- Verify exception is thrown with correct message
- Verify no partial data was committed
- Verify error is logged appropriately

**Mocks Required:**
- [ ] [Mock to simulate failure condition if external dependency]

</details>

<details>
<summary>🧪 QA Validation (Click to expand)</summary>

**Step-by-Step Navigation:**
1. App Launcher → [App Name]
2. [Object] tab → [Action that triggers error]
3. [Observe error handling]

**Data Verification Query:**
```sql
SELECT COUNT()
FROM [Object__c]
WHERE CreatedDate = TODAY
-- Expected: No new records created (or count unchanged)
```

**Visual Verification Checkpoints:**
- [ ] Error toast/message displays [expected text]
- [ ] User is NOT redirected to broken page
- [ ] User can retry or navigate away

**Environment Prerequisites:**
- [ ] Logged in as: [Username from D2 - restricted user]
- [ ] Permission set `[Permission_Set_Name]` NOT assigned (to trigger error)

</details>

---

</details>

---

### 🟡 P2 Important Tests

These tests cover important alternate paths and key negative scenarios. They should pass before release but may not block deployment in exceptional circumstances.

| ID | Test Scenario | Path Type | Covers AC | Steps Summary | Expected Outcome | Data Row |
|----|---------------|:---------:|:---------:|---------------|------------------|:--------:|
| TC-003 | [Alternate scenario] | ⚡ Edge | AC-2 | [Key steps] | [Observable result] | D3 |
| TC-004 | [Negative scenario] | ✗ Negative | AC-3 | [Key steps] | [Observable result] | D4 |

<details>
<summary>📋 P2 Test Case Details (Click to expand)</summary>

---

#### TC-003: [Full Test Title - Edge Case]

| | |
|---|---|
| **Objective** | [What we're validating - specific alternate path or edge case] |
| **Path Type** | ⚡ Edge Case |
| **Covers AC** | AC-2 |
| **Priority** | 🟡 P2 - Important |
| **Data Row** | D3 |
| **Estimated Duration** | [X minutes] |

**Pre-conditions & Setup:**
- [ ] [Required setup items]
- [ ] [Specific data conditions for this scenario - e.g., bulk records, boundary values]

**Step-by-Step Execution:**

| Step | Action | Input/Data | Expected Result | ✓ |
|:----:|--------|------------|-----------------|:-:|
| 1 | [Action with edge condition] | [Boundary input] | [Expected handling] | ☐ |
| 2 | [Verify edge case handled] | [Check results] | [Expected outcome] | ☐ |
| 3 | [Verify no side effects] | [Check related data] | [No unexpected changes] | ☐ |

**Verification Checklist:**
- [ ] [Verification item 1]
- [ ] [Verification item 2]

**Cleanup Steps:**
- [ ] [Cleanup item]

<details>
<summary>👨‍💻 Developer Validation (Click to expand)</summary>

**Unit Test Pattern:**
```apex
@IsTest
static void test_[Object]_[Action]_[EdgeCondition]_HandlesCorrectly() {
    // Setup edge case data (e.g., bulk, boundary)
    // Execute and verify handling
}
```

**Key Assertions:** [List specific assertions for this edge case]

</details>

<details>
<summary>🧪 QA Validation (Click to expand)</summary>

**Navigation:** [Step-by-step to trigger edge case]
**Data Query:** `SELECT ... WHERE [edge condition]`
**Visual Check:** [What to verify in UI]

</details>

---

#### TC-004: [Full Test Title - Negative Scenario]

| | |
|---|---|
| **Objective** | [What we're validating - negative/error scenario] |
| **Path Type** | ✗ Negative |
| **Covers AC** | AC-3 |
| **Priority** | 🟡 P2 - Important |
| **Data Row** | D4 |
| **Estimated Duration** | [X minutes] |

**Pre-conditions & Setup:**
- [ ] [Setup that creates the negative condition]

**Step-by-Step Execution:**

| Step | Action | Input/Data | Expected Result | ✓ |
|:----:|--------|------------|-----------------|:-:|
| 1 | [Action that should fail gracefully] | [Invalid/edge input] | [Graceful error handling] | ☐ |
| 2 | [Verify error state] | [What to check] | [Expected error message/behavior] | ☐ |

**Verification Checklist:**
- [ ] Error message is user-friendly and actionable
- [ ] No data corruption occurred
- [ ] User can recover from error state

**Cleanup Steps:**
- [ ] [Cleanup item]

<details>
<summary>👨‍💻 Developer Validation (Click to expand)</summary>

**Unit Test Pattern:**
```apex
@IsTest
static void test_[Object]_[Action]_[NegativeCondition]_FailsGracefully() {
    // Setup negative condition
    // Verify exception or graceful handling
}
```

**Key Assertions:** [List specific assertions for error handling]

</details>

<details>
<summary>🧪 QA Validation (Click to expand)</summary>

**Navigation:** [Step-by-step to trigger negative scenario]
**Data Query:** `SELECT COUNT() FROM ... -- Expected: unchanged`
**Visual Check:** [Error message/state to verify]

</details>

---

</details>

---

### 🟢 P3 Additional Coverage

<details>
<summary>🟢 P3 Nice-to-Have Tests (Click to expand)</summary>

These tests provide additional coverage for edge cases and long-tail scenarios. They improve confidence but are not required for release.

| ID | Test Scenario | Path Type | Covers AC | Steps Summary | Expected Outcome | Data Row |
|----|---------------|:---------:|:---------:|---------------|------------------|:--------:|
| TC-005 | [Long-tail scenario] | 🔒 Security | AC-4 | [Key steps] | [Observable result] | D5 |

---

#### TC-005: [Full Test Title - Security/Long-tail]

| | |
|---|---|
| **Objective** | [What we're validating - long-tail or security scenario] |
| **Path Type** | 🔒 Security |
| **Covers AC** | AC-4 |
| **Priority** | 🟢 P3 - Nice to Have |
| **Data Row** | D5 |

**Pre-conditions & Setup:**
- [ ] [Required setup items]

**Step-by-Step Execution:**

| Step | Action | Input/Data | Expected Result | ✓ |
|:----:|--------|------------|-----------------|:-:|
| 1 | [Action] | [Input] | [Expected] | ☐ |
| 2 | [Action] | [Input] | [Expected] | ☐ |

**Verification Checklist:**
- [ ] [Verification item]

<details>
<summary>👨‍💻 Developer Validation (Click to expand)</summary>

**Unit Test Pattern:** [Brief pattern for this scenario]
**Key Assertions:** [List assertions]

</details>

<details>
<summary>🧪 QA Validation (Click to expand)</summary>

**Navigation:** [Steps]
**Data Query:** [Verification query]
**Visual Check:** [UI verification]

</details>

---

</details>

---

### 🔗 Requirements Traceability Matrix

This matrix provides a detailed view linking each acceptance criterion to its test cases, organized by path type. This supplements the AC-Centric Coverage Matrix above with additional detail.

| AC ID | Description | Happy Path Tests | Unhappy Path Tests | Coverage |
|:-----:|-------------|------------------|-------------------|:--------:|
| AC-1 | [First acceptance criterion] | TC-001 | TC-002 | ✅ Full |
| AC-2 | [Second acceptance criterion] | TC-001 | TC-003 | ✅ Full |
| AC-3 | [Third acceptance criterion] | TC-004 | — | ⚠️ Partial |
| AC-4 | [Fourth acceptance criterion] | — | TC-005 | ⚠️ Partial |

> **Coverage Legend:** 
> - ✅ **Full** = Has at least one Happy Path AND one Unhappy Path test
> - ⚠️ **Partial** = Missing either Happy Path or Unhappy Path coverage
> - ❌ **Gap** = No test coverage at all

**Coverage Notes:**
- **AC-3 (Partial):** [Explanation - e.g., "Missing negative test because error condition cannot occur in this context"]
- **AC-4 (Partial):** [Explanation - e.g., "Happy path covered by AC-1 tests; security test added for defense-in-depth"]

---

### 📝 Testing Notes & Considerations

**Automation Opportunities:**
- [Tests that are good candidates for automation]
- [Existing test frameworks that could be extended]

**Test Dependencies:**
- [Tests that must run in sequence]
- [Shared test data considerations]

**Environment Requirements:**
- [Sandbox configuration needs]
- [Integration endpoint requirements]

**How We'll Test This:**
- [Unit testing strategy and coverage goals]
- [Integration testing approach]
- [User acceptance testing plan]

**Quality Checkpoints:**
| Quality Aspect | What We'll Measure | How We'll Validate |
|----------------|-------------------|-------------------|
| [Performance] | [Response time requirements] | [Load testing approach] |
| [Security] | [Security requirements] | [Security testing approach] |
| [Usability] | [User experience goals] | [User testing approach] |

### ⚠️ Planning for Success

**Potential Challenges We've Considered:**
| Risk | How Likely | Impact | Our Plan |
|------|-----------|--------|----------|
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [How to address] |
| [Risk 2] | [High/Med/Low] | [High/Med/Low] | [How to address] |

**What We're Assuming:**
| Assumption | How Confident | How We'll Verify |
|------------|--------------|-----------------|
| [Assumption 1] | [High/Med/Low] | [How to verify] |
| [Assumption 2] | [High/Med/Low] | [How to verify] |

### 📋 Assumptions Resolution Log

This tracks all assumptions made during research and grooming, showing how each was validated, refuted, or remains open.

| Assumption | Phase Identified | Source | Status | Resolution Evidence |
|------------|-----------------|--------|--------|-------------------|
| [Initial assumption about system behavior] | Research | [ADO/Wiki/Code] | ✅ Validated | [What confirmed this assumption] |
| [Assumption about data model] | Research | [Metadata query] | ❌ Refuted | [What disproved this - corrected understanding] |
| [Assumption about stakeholder need] | Grooming | [Comment analysis] | ⚠️ Open | [Requires stakeholder confirmation - flagged as risk] |
| [Technical assumption] | Solutioning | [Code search] | ✅ Validated | [Evidence found in codebase] |

> **Status Legend:** ✅ Validated (confirmed true), ❌ Refuted (proved false), ⚠️ Open (needs verification), 🔄 Superseded (replaced by better understanding)

### 🔧 Quality Corrections Applied

During the autonomous preparation process, several quality gates identified and corrected issues:

#### Solution Bias Removed

Technical implementation details were moved from requirements to assumptions to maintain solution neutrality:

| Original Content | Where Found | Moved To | Category |
|-----------------|-------------|----------|----------|
| [Technical term like "LWC component"] | Description | Assumptions | solution_scent |
| [API name or specific technology] | Acceptance Criteria | Assumptions | solution_scent |
| [Database/field reference] | Requirements | Assumptions | implementation_detail |

#### Template Fidelity Corrections

| Issue Detected | Auto-Correction Applied | Section Affected |
|----------------|------------------------|------------------|
| [Missing standard section] | [Added required section from template] | [Section name] |
| [Non-compliant formatting] | [Reformatted to match standard] | [Section name] |

#### Logical Fallacies Challenged

| Fallacy Type | Original Statement | Challenge Question Added | Resolution |
|--------------|-------------------|-------------------------|------------|
| Appeal to Tradition | "We've always done it this way" | "Is this still the best approach given current capabilities?" | [How it was addressed] |
| False Dilemma | "We must use X or nothing" | "What other options exist that weren't considered?" | [Additional options identified] |
| Bandwagon | "Everyone uses this approach" | "Is this approach appropriate for our specific context?" | [Context-specific evaluation] |

> **Note:** Logical fallacy detection helps ensure decisions are based on sound reasoning rather than cognitive biases.

### ❓ Open Unknowns

These items could not be determined during autonomous preparation and require human input:

| Unknown | Why We Couldn't Determine | Impact if Unresolved | Suggested Resolution Path |
|---------|--------------------------|---------------------|--------------------------|
| [Specific unknown] | [What prevented determination] | [Risk level and affected areas] | [Who to ask or how to find out] |

---

## 📚 Additional Resources

- **Audit Trail:** Check the work item's Links tab for the child audit task with complete decision walkthrough
- **Work Item:** Return to the work item by checking your browser history or searching for work item #{{runtime.work_item_id}}
- **Related Documentation:** Check the work item's Links tab for related wiki pages and documentation

> **Note:** Direct URLs are not included in wiki pages to prevent link breakage. All related items and documentation are accessible via the work item's Links tab.

---

*📅 Last Updated: {{runtime.timestamp}}*  
*🤖 Generated by Copilot Refinement*  
*This single page provides complete documentation of research, decisions, and technical design.*

## 🎨 Section-Specific Formatting

### The Narrative-First Principle

Every section should **lead with narrative context** before presenting structured data. Tables and bullets are supporting evidence for the story, not the story itself.

**Pattern to Follow:**
1. **Opening narrative** (2-4 sentences) - Set context, explain why this matters
2. **Key insight callout** - The most important takeaway for skimmers
3. **Supporting detail** - Tables, lists, or collapsible sections for depth
4. **Transition** - Connect to what comes next

### Research Sections
- **Lead with** what we learned and why it matters
- **Support with** tables for metadata/components found
- **Tone:** Curious colleague sharing discoveries - "When we dug into the codebase, we found something interesting..."

### Investigation Trail Sections
- **Lead with** the narrative of how our understanding evolved
- **Support with** hypothesis tables (✅/❌/⚠️ outcomes)
- **Tone:** Research journal - "We started by asking... which led us to discover..."

### Understanding Sections
- **Lead with** who benefits and why this work matters to them
- **Support with** requirements tables and criteria lists
- **Tone:** Advocate for the user - "The team currently struggles with... and this impacts..."

### Design Sections
- **Lead with** the "why" behind architectural choices
- **Support with** component tables and diagrams
- **Tone:** Experienced mentor - "We chose this approach because... here's how the pieces fit together..."

### Decision Rationale Sections
- **Lead with** the story of evaluation - what made this decision interesting
- **Support with** options comparison tables (collapsible for detail)
- **Tone:** Transparent decision-maker - "We had three viable paths. Here's why we went with..."

### Quality Sections
- **Lead with** what success looks like in business terms
- **Support with** acceptance criteria, assumptions logs, corrections made
- **Tone:** Quality advocate - "We'll know this works when... and we've already addressed these concerns..."

### Bridging Business and Technical Audiences

| Audience | What They Need | How to Serve Them |
|----------|---------------|-------------------|
| Business Stakeholders | Value, impact, timelines | Lead every section with business context, avoid unexplained jargon |
| Technical Reviewers | Depth, specifics, rationale | Provide detail in collapsible sections, reference standards explicitly |
| Future Maintainers | Context, reasoning, gotchas | Document "why" not just "what", flag areas of uncertainty |

## 🚨 Critical Rules

### NEVER Use
- ❌ MediaWiki links (`[[Page Name]]`)
- ❌ Uppercase language identifiers in code blocks
- ❌ Block-level blockquotes without `>` on each line
- ❌ Multiple separate pages
- ❌ Local file paths (`.ai-artifacts/`, `.github/`, `#file:`, `file://`)
- ❌ References to artifact files (`solution-output.json` or any internal section names)
- ❌ Timeline estimates, delivery dates, or sprint assignments
- ❌ Story point estimates or velocity-based planning

### ALWAYS Use
- ✅ Single comprehensive page
- ✅ Standard markdown links `[Text](URL)`
- ✅ Lowercase language identifiers (`apex`, `javascript`, `json`)
- ✅ `>` on each line for blockquotes
- ✅ Headers for section structure
- ✅ Tables with separator rows
- ✅ Automatic TOC `[[_TOC_]]`
- ✅ Embedded test cases (not external references)
- ✅ Inline test data definitions
- ✅ ADO work item IDs for cross-references

### HTML Usage Guidelines
- ✅ **Allowed:** `<details>`, `<summary>`, `<strong>`, `<em>`, `<p>`, `<br/>`
- ✅ **Rich text:** `<font color="blue">`, `<span style="color:green">`
- ✅ **Layout:** `<center>`, `<div>` with styling
- ⚠️ **Prefer markdown** for consistency
- ⚠️ **Use HTML sparingly** - only when markdown can't achieve the effect

## 🔍 Validation Checklist

Before creating the wiki page, verify:

**Structure & Format:**
- [ ] Header includes work item link and timestamp
- [ ] Work item link uses standard markdown format
- [ ] Emoji used consistently for headers
- [ ] Tables have header row and alignment row
- [ ] Code blocks use lowercase language identifiers
- [ ] Single page structure (no multiple pages)
- [ ] Automatic TOC `[[_TOC_]]` included
- [ ] All narrative sections represented
- [ ] Timestamps are ISO 8601 format
- [ ] Attribution is included
- [ ] HTML used sparingly and correctly (if any)
- [ ] No MediaWiki links `[[Page]]`
- [ ] All resource links are ADO or web URLs (no local file paths)

**Content Exclusion Rules (CRITICAL):**
- [ ] No local file paths (`.ai-artifacts/`, `.github/`, `#file:`, `file://`)
- [ ] No artifact file references (`solution-output.json` or any JSON file names)
- [ ] No timeline estimates or delivery dates
- [ ] No sprint assignments or velocity-based estimates
- [ ] No story point estimates (these belong in work items only)
- [ ] No implementation plans or step-by-step development guides
- [ ] All test case content embedded directly (not referenced externally)
- [ ] All test data definitions included inline (not in external files)

**Testing & Traceability:**
- [ ] Test Data Matrix includes all personas and scenarios
- [ ] Test cases organized by priority (P1 🔴, P2 🟡, P3 🟢)
- [ ] P1 tests include "Why This Test Matters" justification
- [ ] Traceability matrix links all acceptance criteria to test cases
- [ ] Coverage gaps are documented with explanations
- [ ] Test data setup guide is actionable and complete

**Reasoning & Documentation:**
- [ ] Investigation Trail section documents hypotheses tested
- [ ] Source conflicts are documented with resolution rationale
- [ ] Confidence levels assessed for key findings
- [ ] Decision Rationale section includes options comparison table
- [ ] Eliminated options have documented reasoning
- [ ] Standards that influenced decisions are explicitly cited
- [ ] Trade-offs are documented with clear justification
- [ ] Assumptions Resolution Log tracks all assumptions through lifecycle
- [ ] Quality Corrections section documents bias removal and auto-fixes
- [ ] Open unknowns are listed with resolution paths

**Tone & Quality:**
- [ ] Educational tone used throughout (teaching, not directive)
- [ ] Narrative flow from problem to solution
- [ ] "Why" is explained alongside "What" for all decisions

## 📯 Content Guidelines

### Section Organization
- **Executive Summary** - Problem statement and solution overview
- **Understanding the Request** - Business context and requirements analysis
- **Discovery & Research** - Knowledge base search and technical landscape analysis
- **Investigation & Discovery Trail** - Hypotheses tested, evidence gathered, conflicts resolved, reasoning documented
- **Solution Design** - Architecture approach and component design
- **Decision Rationale** - Options considered, why alternatives were eliminated, standards that influenced decisions
- **Quality & Validation** - Acceptance criteria, testing strategy, test data, test cases, traceability matrix, assumptions resolution

### Navigation
- Table of contents at top for easy navigation
- Section headers with emoji for visual hierarchy
- Links to ADO work item throughout
- No cross-page navigation (single page design)

### Data Presentation
- Use tables for structured data with educational headers
- Use code blocks for examples and API calls
- Use lists for findings and recommendations
- Use consistent educational tone across sections
- Progressive disclosure from simple to complex

## 📋 Callout Boxes

Use blockquotes for important notes (no HTML, use markdown bold):

```markdown
> ⚠️ **Important:** This assumption requires validation with the Banner integration team before implementation.

> 💡 **Key Insight:** Existing ContactTriggerHandler already has similar filtering logic that can be reused.

> 🚨 **Risk:** Performance degradation possible if filter criteria return >2000 records.
```

**Note:** Each line of a multi-line blockquote needs its own `>` prefix in ADO Wiki.

## Page Footer Template

Every page must end with this footer:

```markdown
---

## 🔄 Related Work Items

- [#12300](https://dev.azure.com/UMGC/Digital%20Platforms/_workitems/edit/12300) - Contact Sync Enhancement
- [#12350](https://dev.azure.com/UMGC/Digital%20Platforms/_workitems/edit/12350) - Affiliation Filtering

---

*📅 Last Updated: [Timestamp]*  
*🤖 Generated by AI Autonomous Ticket Preparation*
```

## Example: Well-Formatted Wiki Page

```markdown
# 📋 Autonomous Ticket Preparation - #12345

> **Work Item:** #12345 - Add Contact Filtering UI
>
> **Generated:** 2025-10-31T14:30:00Z
>
> **Status:** ✅ Complete - Ready for Development

---

[View Ticket in ADO →](https://dev.azure.com/{{config.organization}}/{{config.project}}/_workitems/edit/{{runtime.work_item_id}})

---

## 📑 Table of Contents

[[_TOC_]]

---

## 🎯 Executive Summary

**Understanding the Challenge:** Users need to filter Contacts by status and affiliation to improve data quality and user experience.

**Our Approach:** Build a reusable filtering component with configurable criteria and performance optimization.

**Why This Matters:** Improves data accuracy, reduces manual effort, and provides foundation for future filtering needs.

**What to Expect:** Moderate complexity with reusable components for future projects.

---

## 📋 Understanding the Request

### 🎯 Business Context

**Who We're Helping:**
- Student Services team needs better contact data management
- Business objective: Improve data quality by 40%
- Success metric: Reduced manual data cleanup time

**Where We Are Today:**
- Current system shows all contacts without filtering
- Users export to Excel for filtering (time-consuming)
- Change needed now for upcoming enrollment season

---

## 🔍 Discovery & Research

### 📚 Learning from Existing Knowledge

**What We Found in Our Documentation:**
- Prior filtering implementations in Student module
- Performance patterns for large datasets
- UI component library with filtering controls

**Key Discoveries:**
- Existing ContactTriggerHandler has filtering logic
- Reusable status picker component available
- Integration with Banner system for data sync

---

## 🎨 Solution Design

### 🏛️ How We'll Build It

**Our Design Philosophy:**
- Build reusable filtering framework
- Leverage existing Salesforce patterns
- Optimize for large dataset performance

**Technology Choices We Made:**
- Apex for backend filtering logic
- Lightning Web Components for UI
- Platform Events for real-time updates

---

## ✅ Quality & Validation

### 📋 How We'll Know We're Successful

**What Users Should Experience:**
1. Filter contacts by status with instant results
2. Save filter preferences for future sessions
3. Export filtered data to CSV format

**What the System Must Do:**
4. Handle datasets up to 10,000 records
5. Maintain sub-second response times
6. Provide audit trail for filter usage

---

## 🔄 Related Work Items

Related work items are linked to this ticket. Check the work item's **Links tab** to view:
- Predecessor work items (completed work that influenced this design)
- Related work items (similar or connected functionality)
- Child tasks (audit trail and tracking tasks)

---

*📅 Last Updated: 2025-10-31T14:30:00Z*  
*🤖 Generated by AI Autonomous Ticket Preparation*
```


## Common Formatting Mistakes to Avoid

❌ **DON'T:**
- Use `[[Wiki Links]]` format - use standard markdown `[text](path)` instead
- Forget blank lines before lists
- Use uppercase language identifiers in code blocks (use `apex` not `Apex`)
- Use unencoded ampersands in URLs (use `&amp;`)
- Include raw URLs without link text
- Mix emoji styles inconsistently
- Create orphan pages with no navigation
- Use absolute wiki paths (use relative)
- Leave placeholder text like [TODO] or [TBD]
- Use spaces in wiki paths (use hyphens or URL-encode)
- Overuse HTML when markdown would work better
- **Include direct URLs to work items or wiki pages** - they break easily
- **Reference local file paths** (`.ai-artifacts/`, `.github/`, `#file:`)
- **Include timeline or sprint estimates** - these belong in work items
- **Include implementation plans or step-by-step guides** - focus on design, not how to build
- **Reference artifact files** (`solution-output.json` or any JSON file names)
- **Leave test cases as external references** - embed them directly

✅ **DO:**
- Prefer markdown, use HTML sparingly for special effects
- Add blank line before every list
- Use lowercase language identifiers: `apex`, `javascript`, `python`
- Apply emoji standards consistently
- Provide clear navigation paths
- Include generation timestamps
- Fill all placeholders before saving
- Test blockquotes render correctly (use `>` per line)
- Use `[[_TOC_]]` for automatic table of contents
- Use `<details><summary>` for collapsible sections when needed
- **Direct users to check Links tab** instead of including direct URLs
- **Reference work item numbers** (e.g., "#12345") instead of full URLs
- **Embed all test cases and test data directly in the wiki**
- **Include full traceability matrix linking AC to test cases**
- **Use visual priority indicators** (🔴 P1, 🟡 P2, 🟢 P3) for test cases
