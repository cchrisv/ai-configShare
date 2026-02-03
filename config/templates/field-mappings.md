# Azure DevOps Field Mappings - Digital Platforms Project

This document provides authoritative field path references for all work item types in Azure DevOps. Use these exact field paths when updating work items via `mcp_ado_wit_update_work_item`.

## User Story Fields

| Field Path | Purpose | Format | Required | Notes |
|------------|---------|--------|----------|-------|
| `/fields/System.Title` | Business-focused title | Plain text | Yes | Enhanced during triage to remove technical jargon |
| `/fields/System.Description` | 5-section business requirements template | HTML | Yes | Summary, User Story, Goals, Assumptions, Out of Scope |
| `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` | GWT acceptance criteria scenarios | HTML | Yes | Given/When/Then format, minimum 3 scenarios |
| `/fields/Custom.DevelopmentSummary` | Technical solution design | HTML | Yes (Solutioning) | Complete solution design document populated during Solutioning phase |
| `/fields/Custom.WorkClassType` | Work classification | String | Yes | Values: `Critical/Escalation`, `Development`, `Fixed Date Delivery`, `Maintenance/Recurring Tasks`, `Standard` |
| `/fields/Custom.RequiresQA` | QA requirement flag | String | Yes | Values: `Yes` or `No` |
| `/fields/System.Tags` | Classification tags | Semicolon-delimited string | Yes | Format: `Triaged;CoPilot-Refined;[CoPilot-Solutioned];[WorkType];[Effort];[Risk]` |
| `/fields/System.State` | Workflow state | String | No | Do NOT update - leave at current state for human workflow control |
| `/fields/System.AreaPath` | Team board classification | String | Yes | Must match parent work item (Connect/FastTrack) |
| `/fields/System.IterationPath` | Sprint/iteration | String | Yes | Must match parent work item |
| `/fields/Microsoft.VSTS.Scheduling.StoryPoints` | Relative effort estimate | Number | Yes (Finalization) | Populate during Finalization using Fibonacci mapping (0, 1, 2, 3, 5, 8, 13) |

## Bug/Defect Fields

| Field Path | Purpose | Format | Required | Notes |
|------------|---------|--------|----------|-------|
| `/fields/System.Title` | Clear issue description | Plain text | Yes | Focus on actual vs expected behavior |
| `/fields/System.Description` | Issue summary | HTML | Yes | Single Summary section only |
| `/fields/Microsoft.VSTS.TCM.ReproSteps` | Reproduction steps | HTML | Yes | Environment, preconditions, steps, expected/actual |
| `/fields/Microsoft.VSTS.TCM.SystemInfo` | Test data & supporting information | HTML | Yes | Screenshots, error messages, logs, test data |
| `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` | Fix validation criteria | HTML | Yes | Fix validation + regression testing (NOT step-by-step scenarios) |
| `/fields/Custom.DevelopmentSummary` | Technical solution design | HTML | Yes (Solutioning) | Complete solution design document populated during Solutioning phase |
| `/fields/Custom.RootCauseDetail` | Root cause analysis | HTML | No | Process/context factors if known |
| `/fields/Custom.WorkClassType` | Work classification | String | Yes | Same values as User Stories |
| `/fields/Custom.RequiresQA` | QA requirement flag | String | Yes | Usually `Yes` for defects |
| `/fields/System.Tags` | Classification tags | Semicolon-delimited string | Yes | Same format as User Stories |
| `/fields/System.State` | Workflow state | String | No | Do NOT update - leave at current state for human workflow control |

## Task Fields

| Field Path | Purpose | Format | Required | Notes |
|------------|---------|--------|----------|-------|
| `/fields/System.Title` | Task title | Plain text | Yes | Format: `[Number] - [Type] - [Action] - [WORK_ITEM_ID]` |
| `/fields/Microsoft.VSTS.Common.Activity` | Activity type | String | Yes | Values: `Triage`, `Refinement`, `Design`, etc. |
| `/fields/System.Description` | Task description | HTML | Yes | Audit trail or task details |
| `/fields/Microsoft.VSTS.Scheduling.CompletedWork` | Time logged | Number | No | Hours in decimal (e.g., 0.25, 1.50) |
| `/fields/System.State` | Task state | String | Yes | `Active` when working, `Closed` when complete |
| `/fields/System.AreaPath` | Team board classification | String | Yes | Must match parent work item |
| `/fields/System.IterationPath` | Sprint/iteration | String | Yes | Must match parent work item |

## Critical Field Mapping Rules

### Acceptance Criteria Field Mapping

⚠️ **CRITICAL**: The Acceptance Criteria field mapping differs by work item type:

- **User Stories**: Apply AC to `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` only
- **Bugs/Defects**: Apply AC to `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` AND also populate `/fields/Microsoft.VSTS.TCM.ReproSteps` with step-by-step reproduction instructions

**Do NOT confuse:**
- Repro Steps (`Microsoft.VSTS.TCM.ReproSteps`) = Step-by-step bug reproduction instructions
- Acceptance Criteria (`Microsoft.VSTS.Common.AcceptanceCriteria`) = Business validation criteria (GWT format for User Stories, fix validation for Bugs)

### Tags Format

Tags are semicolon-delimited. Always include base tags first:

**Base Tags:**
- `Triaged` - Always present
- `CoPilot-Refined` - Added after AI Refinement phase
- `CoPilot-Solutioned` - Added after Solutioning phase (optional)

**Work Type (select ONE):**
- `Admin` OR `Dev` (never both)

**Effort Level (select ONE):**
- `Low-Effort`
- `Medium-Effort`
- `High-Effort`

**Risk Level (select ONE):**
- `Low-Risk`
- `Medium-Risk`
- `High-Risk`

**Examples:**
```
# After AI Refinement:
Triaged;CoPilot-Refined;Dev;Medium-Effort;Medium-Risk

# After Solutioning:
Triaged;CoPilot-Refined;CoPilot-Solutioned;Dev;Medium-Effort;Medium-Risk
```

**Optional Tags (add as needed):**
- `Assumption-LowConfidence` - If assumptions have low confidence
- `Template-Incomplete` - If template validation fails
- `Clarity-Review-Needed` - If clarity gate fails
- `Testability-Review-Needed` - If testability gate fails
- `Traceability-Review-Needed` - If traceability gate fails
- `Safety-Review-Needed` - If safety gate fails
- `INVEST-Review-Needed` - If INVEST validation fails

### Story Points Field

- Only populate during Finalization after completing the complexity/risk/uncertainty heuristic.
- Values must align to Fibonacci numbers: 0, 1, 2, 3, 5, 8, or 13.
- Persist the rationale (factor breakdown and total score) to `run-state.json.finalization.storyPoints` for traceability.

## Field Path Usage in Code

Always use the `/fields/` prefix when updating work items:

```python
mcp_ado_wit_update_work_item(
  project="Digital Platforms",
  id=[WORK_ITEM_ID],
  updates=[
    {
      "path": "/fields/System.Description",
      "value": "[HTML formatted content]"
    },
    {
      "path": "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
      "value": "[HTML formatted AC scenarios]"
    },
    {
      "path": "/fields/Custom.WorkClassType",
      "value": "Development"
    },
    {
      "path": "/fields/System.Tags",
      "value": "Triaged;CoPilot-Refined;Dev;Medium-Effort;Medium-Risk"
    }
  ]
)
```

## HTML Formatting Requirements

All HTML fields must use UTF-8 encoding and follow these structure rules:

- Use `<h2>` for main section headers (with emoji if applicable)
- Use `<h3>` for subsection headers
- Use `<p>` for paragraphs (NOT `<div>`)
- Use `<ul>` and `<li>` for unordered lists
- Use `<ol>` and `<li>` for ordered lists
- Use `<strong>` for emphasis (NOT `<b>`)
- Use `<br/>` for line breaks within paragraphs
- Use `<table>`, `<tr>`, `<th>`, `<td>` for structured data
- Use `<em>` for emphasis or italic text
- Use `<code>` for inline code references

**All HTML tags must be properly closed.** Azure DevOps will render malformed HTML incorrectly.

## Copilot-Generated Content Disclaimers

**CRITICAL:** All HTML fields populated by the autonomous Copilot process include a disclaimer at the top indicating the content was Copilot-generated and should be reviewed for accuracy.

### Fields That Include Disclaimers

- `System.Description` - Copilot-Generated Content disclaimer prepended
- `Microsoft.VSTS.Common.AcceptanceCriteria` - Copilot-Generated Content disclaimer prepended
- `Microsoft.VSTS.TCM.ReproSteps` - Copilot-Generated Content disclaimer prepended (bugs only)
- `Microsoft.VSTS.TCM.SystemInfo` - Copilot-Generated Content disclaimer prepended (bugs only)
- `Custom.DevelopmentSummary` - Copilot-Generated Content disclaimer prepended

**NOTE:** Comments are no longer posted by the autonomous workflow.

### Fields That Do NOT Include Disclaimers

- `System.Title` - User requested exclusion
- `Custom.WorkClassType` - Classification field
- `Custom.RequiresQA` - Classification field
- `System.Tags` - Classification tags
- `Microsoft.VSTS.Scheduling.StoryPoints` - Numeric field (disclaimer note included in rationale JSON instead)

### Disclaimer Template

See `#file:config/templates/field-disclaimer.md` for the standardized disclaimer HTML blocks used for fields.

## Notes

- Always use `/fields/` prefix in `mcp_ado_wit_update_work_item` calls
- Field paths are case-sensitive
- Custom fields use `Custom.` prefix (e.g., `Custom.WorkClassType`)
- System fields use `System.` prefix (e.g., `System.Title`)
- Microsoft fields use `Microsoft.VSTS.` prefix (e.g., `Microsoft.VSTS.Common.AcceptanceCriteria`)
- Tags are semicolon-delimited strings, not arrays
- HTML content must be properly escaped if using in JSON
- All Copilot-generated HTML fields must include the appropriate disclaimer at the top

