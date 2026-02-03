# ADO Field Disclaimer Template

This template provides standardized disclaimer HTML blocks that are prepended to all Copilot-generated content in Azure DevOps work item fields.

**NOTE:** Comments are no longer posted by the autonomous workflow. All documentation lives in wiki pages and work item fields.

## HTML Version (for HTML fields)

Use this disclaimer for all HTML-formatted fields (Description, Acceptance Criteria, Repro Steps, System Info, Development Summary):

```html
<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-bottom: 16px; color: #212529;">
  <p style="margin: 0; font-weight: bold; color: #212529;">⚠️ <strong>Copilot-Generated Content:</strong> This field was populated during the autonomous Copilot process. Please review for accuracy before continuing.</p>
  <p style="margin: 4px 0 0 0; color: #212529;">This message should be deleted once the story has been validated and updated.</p>
</div>
```

## Usage Instructions

### For Fields

- **HTML version**: Prepend to HTML content in Description, Acceptance Criteria, Repro Steps, System Info, and Development Summary fields
- **Placement**: Must appear at the very top of the HTML content, before any other content
- **Styling**: Yellow warning box with left border for visual prominence

## Fields That Include Disclaimers

### Grooming Phase
- `System.Description` - HTML disclaimer prepended
- `Microsoft.VSTS.Common.AcceptanceCriteria` - HTML disclaimer prepended
- `Microsoft.VSTS.TCM.ReproSteps` - HTML disclaimer prepended (bugs only)
- `Microsoft.VSTS.TCM.SystemInfo` - HTML disclaimer prepended (bugs only)

### Solutioning Phase
- `Custom.DevelopmentSummary` - HTML disclaimer prepended

## Fields That Do NOT Include Disclaimers

- `System.Title` - User requested exclusion
- `Custom.WorkClassType` - Classification field
- `Custom.RequiresQA` - Classification field
- `System.Tags` - Classification tags
- `Microsoft.VSTS.Scheduling.StoryPoints` - Numeric field (disclaimer note in rationale instead)

## Loading This Template

In prompts, reference this template using:
```
#file:config/templates/field-disclaimer.md
```

Load the appropriate disclaimer HTML block and prepend it to field content before updating ADO.

