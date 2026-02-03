# User Story Templates - Digital Platforms Project

Complete templates for User Story work items in Azure DevOps. Use these templates when applying business requirements during the AI Refinement phase.

## Overview

User stories should help your team understand:
- **WHAT** the business needs (capability, action, outcome)
- **WHY** it matters (business value, metrics, context)
- **WHO** it serves (user persona, stakeholders)

This templates guide focuses on clarity and testability to help developers make informed decisions during implementation.

## Description Field Template

### Structure (5 Required Sections)

1. **Summary** - Brief WHAT and WHY
2. **User Story** - As a / I want / so that format
3. **Goals & Business Value** - Measurable outcomes
4. **Assumptions & Constraints** - Technical assumptions and constraints
5. **Out of Scope** - Explicit boundaries

### Full Template (HTML)

Note: Write WHAT/WHY only in Summary and User Story; move any HOW to Assumptions. This separation helps developers understand business context without being locked into specific technical approaches.

**CRITICAL:** Prepend the Copilot-Generated Content disclaimer at the very top of this template. See `#file:config/templates/field-disclaimer.md` for the disclaimer HTML block.

```html
<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-bottom: 16px; color: #212529;">
  <p style="margin: 0; font-weight: bold; color: #212529;">⚠️ <strong>Copilot-Generated Content:</strong> This field was populated during the autonomous Copilot process. Please review for accuracy before continuing.</p>
  <p style="margin: 4px 0 0 0; color: #212529;">This message should be deleted once the story has been validated and updated.</p>
</div>

<h2>📋 Summary</h2>
<p>[What is needed and why, based on research context. Focus on business capability, not technical implementation. Keep to 1-2 sentences.]</p>

<h2>✍️ User Story</h2>
<p>As a [persona from research], I want to [action], so that [business value from research].</p>

<h2>🌟 Goals & Business Value</h2>
<ul>
  <li>[Measurable goal from research - e.g., "Reduce contact lookup time by 50%"]</li>
  <li>[Business outcome - e.g., "Improve advisor efficiency in student outreach"]</li>
  <li>[Additional measurable outcome if applicable]</li>
</ul>

<h2>🕵️‍♂️ Assumptions & Constraints</h2>
<h3>Assumptions</h3>
<p>Technical approaches and architectural decisions discovered during research. These assumptions will be validated during solutioning.</p>
<table>
  <tr>
    <th>ID</th>
    <th>Statement</th>
    <th>Confidence</th>
    <th>Status</th>
    <th>How to Falsify</th>
  </tr>
  [FOR EACH ASSUMPTION IN assumptions.json]
  <tr>
    <td>{assumption.id}</td>
    <td>{assumption.statement}</td>
    <td>{assumption.confidenceLabel} ({assumption.confidence})</td>
    <td>{assumption.status}</td>
    <td>{assumption.falsify.method}</td>
  </tr>
  [END FOR]
</table>
[IF NO ASSUMPTIONS]
<p><em>No technical assumptions captured during research.</em></p>
[END IF]

<h3>Known Unknowns & Clarifications Needed</h3>
<p>Information gaps that need clarification before or during development.</p>

<h4>Critical Unknowns (Block Development)</h4>
[IF CRITICAL_UNKNOWNS_EXIST]
<table>
  <tr>
    <th>ID</th>
    <th>Question</th>
    <th>Impact</th>
    <th>Who Can Clarify</th>
  </tr>
  [FOR EACH UNKNOWN WHERE blocking="critical"]
  <tr>
    <td>{unknown.id}</td>
    <td>{unknown.question}</td>
    <td>{unknown.impact}</td>
    <td>{unknown.who_can_clarify}</td>
  </tr>
  [END FOR]
</table>
<p><strong>⚠️ Action Required:</strong> These unknowns must be resolved before development begins.</p>
[ELSE]
<p><em>No critical unknowns identified.</em></p>
[END IF]

<h4>Non-Critical Unknowns (Nice to Know)</h4>
[IF NON_CRITICAL_UNKNOWNS_EXIST]
<table>
  <tr>
    <th>ID</th>
    <th>Question</th>
    <th>Impact</th>
    <th>Who Can Clarify</th>
  </tr>
  [FOR EACH UNKNOWN WHERE blocking="non-critical"]
  <tr>
    <td>{unknown.id}</td>
    <td>{unknown.question}</td>
    <td>{unknown.impact}</td>
    <td>{unknown.who_can_clarify}</td>
  </tr>
  [END FOR]
</table>
<p><strong>💡 Note:</strong> These unknowns can be clarified during development but may affect implementation decisions.</p>
[ELSE]
<p><em>No non-critical unknowns identified.</em></p>
[END IF]

<h3>Constraints</h3>
<ul>
  <li>[Constraint from research - e.g., "Must maintain compatibility with existing Contact_After_Save Flow"]</li>
  <li>[Platform constraint - e.g., "Governor limits require bulkification"]</li>
  <li>[Business constraint - e.g., "Must comply with FERPA regulations"]</li>
</ul>

<h2>🚫 Out of Scope</h2>
<ul>
  <li>[Explicitly out of scope item - e.g., "Bulk export functionality is deferred to future story"]</li>
  <li>[Feature for future consideration - e.g., "Mobile app support not included"]</li>
  <li>[Related capability explicitly excluded]</li>
</ul>
```

### Example 1: Contact Filtering

```html
<h2>📋 Summary</h2>
<p>Advisors need a consolidated view of student contact attempts to prioritize follow-ups and improve conversion rates. Currently, advisors manually search through multiple records, wasting time and missing opportunities.</p>

<h2>✍️ User Story</h2>
<p>As an advisor, I want to filter contacts by status and affiliation, so that I can quickly find relevant students and prioritize my outreach efforts.</p>

<h2>🌟 Goals & Business Value</h2>
<ul>
  <li>Reduce contact lookup time by 50% (from 5 minutes to 2.5 minutes per search)</li>
  <li>Improve advisor efficiency in student outreach by eliminating manual record scanning</li>
  <li>Increase conversion rates by enabling advisors to focus on high-priority contacts</li>
</ul>

<h2>🕵️‍♂️ Assumptions & Constraints</h2>
<h3>Assumptions</h3>
<p>Technical approaches and architectural decisions discovered during research. These assumptions will be validated during solutioning.</p>
<table>
  <tr>
    <th>ID</th>
    <th>Statement</th>
    <th>Confidence</th>
    <th>Status</th>
    <th>How to Falsify</th>
  </tr>
  <tr>
    <td>A-001</td>
    <td>Use Lightning Web Component (LWC) for the filtering interface</td>
    <td>High (0.85)</td>
    <td>Open</td>
    <td>Review codebase - if Aura components used exclusively, consider Aura instead</td>
  </tr>
  <tr>
    <td>A-002</td>
    <td>Server-side filtering via Apex controller required for complex queries</td>
    <td>High (0.90)</td>
    <td>Open</td>
    <td>Test if Lightning Data Service can handle complex WHERE clauses</td>
  </tr>
  <tr>
    <td>A-003</td>
    <td>Pagination required to handle large result sets (200+ contacts)</td>
    <td>Medium (0.70)</td>
    <td>Open</td>
    <td>Query production data volumes to confirm pagination necessity</td>
  </tr>
</table>
<h3>Constraints</h3>
<ul>
  <li>Must maintain compatibility with existing Contact_After_Save Flow (no changes to trigger logic)</li>
  <li>Governor limits require bulkification of all Apex operations</li>
  <li>Must comply with FERPA regulations - no education records exposed</li>
  <li>Filter UI must work in Lightning Experience (Classic not supported)</li>
</ul>

<h2>🚫 Out of Scope</h2>
<ul>
  <li>Bulk export functionality is deferred to future story</li>
  <li>Mobile app support not included (desktop Lightning Experience only)</li>
  <li>Real-time updates via Platform Events not included in initial implementation</li>
  <li>Integration with external CRM systems not included</li>
</ul>
```

### Example 2: Data Sync Enhancement

```html
<h2>📋 Summary</h2>
<p>Student records from Banner need to sync more frequently to ensure advisors have up-to-date information for outreach. Current daily sync causes advisors to work with stale data.</p>

<h2>✍️ User Story</h2>
<p>As an advisor, I want student records to sync within 5 minutes of Banner updates, so that I always have current information when contacting students.</p>

<h2>🌟 Goals & Business Value</h2>
<ul>
  <li>Reduce data staleness from 24 hours to 5 minutes maximum</li>
  <li>Improve advisor confidence in contact information accuracy</li>
  <li>Reduce wasted outreach attempts to outdated addresses</li>
</ul>

<h2>🕵️‍♂️ Assumptions & Constraints</h2>
<h3>Assumptions</h3>
<p>Technical approaches and architectural decisions discovered during research. These assumptions will be validated during solutioning.</p>
<table>
  <tr>
    <th>ID</th>
    <th>Statement</th>
    <th>Confidence</th>
    <th>Status</th>
    <th>How to Falsify</th>
  </tr>
  <tr>
    <td>A-001</td>
    <td>Platform Events can be used for real-time sync notification</td>
    <td>Medium (0.65)</td>
    <td>Open</td>
    <td>Verify Banner can publish Platform Events or use REST API polling</td>
  </tr>
</table>
<h3>Constraints</h3>
<ul>
  <li>Banner API rate limits: maximum 100 calls per minute</li>
  <li>Must maintain backward compatibility with existing daily batch sync</li>
  <li>PII/FERPA compliance requires encryption in transit</li>
</ul>

<h2>🚫 Out of Scope</h2>
<ul>
  <li>Two-way sync (Salesforce → Banner) not included</li>
  <li>Historical data backfill not included (only forward-looking sync)</li>
  <li>Custom field mappings beyond standard Banner → Salesforce objects</li>
</ul>
```

## Acceptance Criteria Template

### Structure (GWT Format)

Each acceptance criterion must follow the Given/When/Then (GWT) format. We use this format because it creates testable scenarios that developers, QA, and stakeholders can all understand and verify independently.

- **Given** - Initial context or state
- **When** - User action or trigger
- **Then** - Expected outcome (must be observable/measurable)

### Full Template (HTML)

**CRITICAL:** Prepend the Copilot-Generated Content disclaimer at the very top of this template. See `#file:config/templates/field-disclaimer.md` for the disclaimer HTML block.

```html
<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-bottom: 16px; color: #212529;">
  <p style="margin: 0; font-weight: bold; color: #212529;">⚠️ <strong>Copilot-Generated Content:</strong> This field was populated during the autonomous Copilot process. Please review for accuracy before continuing.</p>
  <p style="margin: 4px 0 0 0; color: #212529;">This message should be deleted once the story has been validated and updated.</p>
</div>

<h2>⭐ Acceptance Criteria</h2>

<h3>Scenario 1: [Happy Path from research]</h3>
<p><strong>Given</strong> [Initial state],<br>
<strong>When</strong> [User action],<br>
<strong>Then</strong> [Expected outcome with observable result].</p>

<h3>Scenario 2: [Edge Case from research]</h3>
<p><strong>Given</strong> [Edge case state],<br>
<strong>When</strong> [Action],<br>
<strong>Then</strong> [Graceful handling].</p>

<h3>Scenario 3: [Error Handling]</h3>
<p><strong>Given</strong> [Error condition],<br>
<strong>When</strong> [Trigger],<br>
<strong>Then</strong> [User-friendly error message].</p>

<h3>Scenario 4: [Regression - Related Components]</h3>
<p><strong>Given</strong> [Existing related functionality from research],<br>
<strong>When</strong> [Change is deployed],<br>
<strong>Then</strong> [Existing functionality continues to work].</p>
```

### Example: Contact Filtering ACs

```html
<h2>⭐ Acceptance Criteria</h2>

<h3>Scenario 1: Filter by Status Returns Matching Records</h3>
<p><strong>Given</strong> an advisor is viewing the contact list with 100+ contacts,<br>
<strong>When</strong> the advisor selects "Status = Active" from the filter dropdown and clicks Apply,<br>
<strong>Then</strong> the list displays only contacts with Status = Active AND the result count shows "X records found" where X matches the filtered count.</p>

<h3>Scenario 2: Multiple Filters Combine with AND Logic</h3>
<p><strong>Given</strong> an advisor has filtered contacts by Status = Active,<br>
<strong>When</strong> the advisor adds Affiliation = "University A" filter and clicks Apply,<br>
<strong>Then</strong> the list displays only contacts that have BOTH Status = Active AND Affiliation = "University A".</p>

<h3>Scenario 3: Empty Filters Return All Records</h3>
<p><strong>Given</strong> an advisor has applied filters and is viewing filtered results,<br>
<strong>When</strong> the advisor clears all filter selections and clicks Apply,<br>
<strong>Then</strong> the list displays all contacts (pagination applied if >50 records) AND the result count shows the total record count.</p>

<h3>Scenario 4: Invalid Filter Criteria Shows Error</h3>
<p><strong>Given</strong> an advisor enters invalid filter criteria (e.g., special characters in status field),<br>
<strong>When</strong> the advisor clicks Apply,<br>
<strong>Then</strong> an error toast message appears saying "Invalid filter criteria. Please check your selections." AND no filter is applied (previous results remain).</p>

<h3>Scenario 5: Pagination Works with Filtered Results</h3>
<p><strong>Given</strong> filtered results return 150 contacts,<br>
<strong>When</strong> the advisor navigates to page 2 of results,<br>
<strong>Then</strong> page 2 displays contacts 51-100 from the filtered set AND pagination controls show "Page 2 of 3".</p>

<h3>Scenario 6: Existing Contact Flows Unaffected</h3>
<p><strong>Given</strong> the Contact_After_Save Flow exists and is active,<br>
<strong>When</strong> a contact is created or updated via the new filtering interface,<br>
<strong>Then</strong> the Contact_After_Save Flow executes successfully AND all existing Flow logic continues to work as before.</p>
```

## Template Filling Instructions

### For AI Agents

1. **Load Research Context**: Read `{{artifact_path}}/research/` to gather:
   - User personas from work item comments or similar work items
   - Business goals from stakeholder input
   - Assumptions from `assumptions.json`
   - Constraints from research findings
   - Out of scope items from research boundaries

2. **Fill Summary Section**:
   - Extract WHAT (business need) and WHY (business value) from research
   - Keep to 1-2 sentences
   - Remove all technical jargon (no component names, no HOW)

3. **Fill User Story Section**:
   - Identify persona: Who needs this? (e.g., "advisor", "student", "administrator")
   - Identify action: What do they want to do? (e.g., "filter contacts", "view dashboard")
   - Identify value: Why does it matter? (e.g., "prioritize follow-ups", "reduce lookup time")

4. **Fill Goals & Business Value**:
   - Extract measurable goals from research (include metrics if available)
   - Focus on business outcomes, not technical benefits
   - Include 2-3 goals minimum

5. **Fill Assumptions Table**:
   - Load assumptions from `research/assumptions.json`
   - Render each assumption as a table row
   - If no assumptions exist, show "No technical assumptions captured during research."

6. **Fill Constraints**:
   - Technical constraints from research (governor limits, platform restrictions)
   - Business constraints (compliance, policies)
   - Integration constraints (API limits, compatibility requirements)

7. **Fill Out of Scope**:
   - List explicitly excluded features
   - Reference related work items if applicable
   - Set clear boundaries to prevent scope creep

8. **Fill Acceptance Criteria**:
   - Create minimum 3 scenarios (aim for 4-6)
   - Always include: Happy path, Edge case, Error handling, Regression
   - Each AC must be observable and testable
   - Use GWT format strictly

### Validation Checklist

Before applying template, verify:

- [ ] All 5 Description sections filled (no `[TO_BE_DETERMINED]` placeholders)
- [ ] Summary is 1-2 sentences, business-focused
- [ ] User Story uses proper "As a / I want / so that" format
- [ ] Goals include measurable outcomes
- [ ] Assumptions table rendered if assumptions exist in research
- [ ] Constraints list has at least 1 item
- [ ] Out of Scope list has at least 1 item
- [ ] Acceptance Criteria has minimum 3 scenarios
- [ ] All ACs use Given/When/Then format
- [ ] All HTML tags properly closed
- [ ] No technical jargon in Summary or User Story sections

## Field Mapping

Apply templates to these fields per `field-mappings.md`:

- **Description**: `/fields/System.Description` → Full 5-section template
- **Acceptance Criteria**: `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` → GWT scenarios

See `field-mappings.md` for complete field path reference.

