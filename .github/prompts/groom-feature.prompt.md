# Groom Feature

Refine a Feature work item by applying the Digital Platforms standard template format to key fields. This prompt updates **only the Feature itself**, not its child stories.

## Runtime Configuration

- `feature_id`: **{{feature_id}}** - The Feature work item ID to refine
- `project`: `Digital Platforms`

## Template Reference

Use the Feature templates defined in `#file:.github/templates/feature-templates.md` as the structural guide. Feature **211780** (Unified CRM Data) serves as the gold standard for content quality.

## Target Fields

This prompt updates the following fields on the Feature:

| Field Name | ADO Path | Purpose |
|------------|----------|---------|
| Description | `System.Description` | Summary, User Story, Goals & Business Value, Business Assumptions |
| Business Problem and Value Statement | `Custom.BusinessProblemandValueStatement` | Why this work matters and the value it delivers |
| Business Objectives and Impact | `Custom.BusinessObjectivesandImpact` | Measurable objectives and expected outcomes |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | Feature-level success criteria in Given/When/Then format |

## Execution Workflow

### Phase 1: Discovery

1. **Retrieve Feature**: Fetch Feature `{{feature_id}}` with `expand=relations` to understand the full context
2. **Analyze Current State**: Review existing field content to determine what needs enhancement
3. **Query Child Work Items**: Extract all child work item IDs from the Feature's relations (look for `System.LinkTypes.Hierarchy-Forward` with name "Child")
4. **Fetch Child Details in Batch**: Use `mcp_microsoft_azu_wit_get_work_items_batch_by_ids` to retrieve all child work items with fields:
   - `System.Id`, `System.Title`, `System.WorkItemType`, `System.State`
   - `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`
   - `System.Tags`
5. **Retrieve Child Comments**: For each child work item, use `mcp_microsoft_azu_wit_list_work_item_comments` to gather discussion context (limit to top 20 comments per item)
6. **Extract Business Context**: From child stories and comments, extract ONLY:
   - **Business requirements** (what users need)
   - **Acceptance criteria** (success conditions)
   - **User personas** and departments mentioned
   - **Pain points** and problems being solved
   - **Expected outcomes** and benefits
   - **Dependencies** and assumptions
   - **Known issues** or risks
7. **Filter Out Solutions**: Explicitly EXCLUDE from context:
   - Technical implementation details (Apex code, Flow configurations, field mappings)
   - Solution architecture decisions
   - Specific object/field names (unless needed for acceptance criteria clarity)
   - Step-by-step implementation instructions
   - Developer notes about "how" to build
8. **Create Todo List**: Generate todos for each field update

### Phase 2: Content Generation

Generate refined content for all four target fields using the templates from `#file:.github/templates/feature-templates.md`:

#### Field 1: Description (`System.Description`)

```html
<h2>📋 Summary</h2>
<p>[2-3 sentences describing the feature's purpose and strategic importance. Include the business context and the transformation this feature enables.]</p>

<h2>✍️ User Story</h2>
<p>As a [primary persona - e.g., UMGC constituent, staff member],<br>
I want to [high-level capability this feature delivers],<br>
so that [strategic business outcome and benefit to the user].</p>

<h2>🌟 Goals & Business Value</h2>
<ul>
  <li><strong>[Value Category 1]</strong>: [Specific business value delivered]</li>
  <li><strong>[Value Category 2]</strong>: [Specific business value delivered]</li>
  <li><strong>[Value Category 3]</strong>: [Specific business value delivered]</li>
  <li><strong>[Value Category 4]</strong>: [Specific business value delivered]</li>
  <li><strong>[Value Category 5]</strong>: [Specific business value delivered]</li>
  <li><strong>[Value Category 6]</strong>: [Specific business value delivered]</li>
</ul>

<h2>💡 Business Assumptions</h2>
<ul>
  <li>[Assumption about data, systems, or processes that must hold true]</li>
  <li>[Assumption about integrations or dependencies]</li>
  <li>[Assumption about user adoption or behavior]</li>
  <li>[Assumption about technical feasibility]</li>
  <li>[Assumption about timeline or resources]</li>
  <li>[Assumption about licensing or budget constraints]</li>
</ul>
```

#### Field 2: Business Problem and Value Statement (`Custom.BusinessProblemandValueStatement`)

```html
<h2>🎯 Business Problem & Value Statement</h2>
<ul>
  <li><strong>[Primary Strategic Objective]</strong>: [How this feature addresses a core business need]</li>
  <li><strong>[User Experience Improvement]</strong>: [How end users benefit from this feature]</li>
  <li><strong>[Friction Reduction]</strong>: [What pain points are eliminated]</li>
  <li><strong>[Effort Reduction]</strong>: [How this reduces manual work or complexity]</li>
  <li><strong>[Proactive Capability]</strong>: [How this enables anticipation vs. reaction]</li>
  <li><strong>[Channel Excellence]</strong>: [How this improves consistency across touchpoints]</li>
  <li><strong>[Operational Excellence]</strong>: [Quantified efficiency gains]</li>
  <li><strong>[Data Quality]</strong>: [How this improves data accuracy and trust]</li>
</ul>
```

#### Field 3: Business Objectives and Impact (`Custom.BusinessObjectivesandImpact`)

```html
<h2>📊 Business Objectives & Expected Impact</h2>
<ul>
  <li><strong>[Foundation/Platform Objective]</strong>: [What infrastructure or platform capability is being established]</li>
  <li><strong>[Visibility/Access Objective]</strong>: [What data or insights become available to users]</li>
  <li><strong>[Quality/Accuracy Objective]</strong>: [How data quality or reporting accuracy improves]</li>
  <li><strong>[Automation Objective]</strong>: [What processes become automated and the time savings]</li>
  <li><strong>[Personalization Objective]</strong>: [How user experiences become more personalized]</li>
</ul>
```

#### Field 4: Acceptance Criteria (`Microsoft.VSTS.Common.AcceptanceCriteria`)

```html
<h2>✅ Acceptance Criteria</h2>
<ol>
  <li><strong>[Success Indicator 1 - Core Capability]</strong><br>
      <strong>Given</strong> [precondition describing the data/system state]<br>
      <strong>When</strong> [action or process completes]<br>
      <strong>Then</strong> [measurable outcome with specific metrics or thresholds]</li>
  
  <li><strong>[Success Indicator 2 - Data Quality]</strong><br>
      <strong>Given</strong> [data model or integration is active]<br>
      <strong>When</strong> [users access data from any system]<br>
      <strong>Then</strong> [consistency/accuracy requirement with zero tolerance threshold]</li>
  
  <li><strong>[Success Indicator 3 - Reporting/Analytics]</strong><br>
      <strong>Given</strong> [unified data is available]<br>
      <strong>When</strong> [users generate reports]<br>
      <strong>Then</strong> [metrics match requirement with drill-down capability]</li>
  
  <li><strong>[Success Indicator 4 - Automation/Performance]</strong><br>
      <strong>Given</strong> [triggers or rules are configured]<br>
      <strong>When</strong> [thresholds are met]<br>
      <strong>Then</strong> [automated action occurs within specific time threshold]</li>
  
  <li><strong>[Success Indicator 5 - User Experience]</strong><br>
      <strong>Given</strong> [feature is fully deployed]<br>
      <strong>When</strong> [end users interact with the system]<br>
      <strong>Then</strong> [user experience improvement is measurable]</li>
</ol>
```

### Phase 3: Update Feature

1. **Prepare Update Payload**: Collect all four field updates
2. **Execute Update**: Use `mcp_microsoft_azu_wit_update_work_item` to apply all changes in a single call
3. **Verify Success**: Confirm the update completed successfully

## Guardrails

1. **Feature-Only Scope**: This prompt updates ONLY the Feature work item. Child stories are NOT modified.
2. **No Disclaimers**: Do NOT include Copilot-Generated Content disclaimers in any fields.
3. **Solution Neutrality**: Keep technical implementation details out of Feature fields; they belong in child User Stories. Features describe the WHAT and WHY, not the HOW.
4. **User-Centric Language**: Frame everything from the perspective of the end user or business stakeholder.
5. **Measurable Outcomes**: Always include specific metrics, percentages, or time thresholds in Acceptance Criteria.
6. **Strategic Alignment**: Connect the feature to broader organizational goals (e.g., Student Success, Operational Excellence).
7. **No Comments**: This workflow MUST NOT post any comments to work items.
8. **Preserve Existing Quality**: If a field already has well-structured content matching the template, enhance rather than replace.
9. **Context Richness**: Always query child stories and their comments before generating content—this provides the business context needed for accurate Feature documentation.
10. **Business Language**: When referencing information from child stories, translate technical details into business outcomes. For example, instead of "ZVC__Zoom_Meeting__c object sync," use "meeting data synchronization" or "automatic meeting tracking."

## Output Summary

After execution, provide a summary:

```
✅ Feature {{feature_id}} Updated

**Context Gathered:**
- Child Work Items Analyzed: [count]
- Comments Reviewed: [total count across all children]

| Field | Status |
|-------|--------|
| Description | ✅ Updated |
| Business Problem and Value Statement | ✅ Updated |
| Business Objectives and Impact | ✅ Updated |
| Acceptance Criteria | ✅ Updated |

Child Stories (Not Modified): [count] items
```
