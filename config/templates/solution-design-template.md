# Solution Design Template - Digital Platforms Project

Complete template for the Solution Design / Development Summary field in Azure DevOps. Use this template when documenting the technical solution during the AI Refinement phase.

## Overview

The Solution Design serves two audiences:
1.  **Stakeholders:** Need to understand the "What" and "Why" (Business Summary).
2.  **Developers:** Need the "How" (Architecture, Standards, Testing Strategy).

## Full Template (HTML)

**CRITICAL:** Use the rich HTML template for this field. See `#file:config/templates/field-solution-design.html` for the complete styled template.

The template includes:
- Business Summary section with blue gradient header
- Architecture Design section with component table
- Standards & Governance section with guardrails table
- Testing Strategy section with green gradient header

```html
<!-- See field-solution-design.html for the complete styled template -->
<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px;">🚀 Business Summary</h2>
<div style="border: 1px solid #c8c8c8; padding: 12px; border-radius: 4px; margin-bottom: 24px;">
  <p style="margin: 0;">[Plain language summary of the solution. Focus on the workflow improvements and business value. Avoid technical jargon here.]</p>
</div>

<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px;">🏗️ Architecture Design</h2>
<h3>Component Overview</h3>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
  <thead>
    <tr style="text-align: left; border-bottom: 2px solid #c8c8c8;">
      <th style="padding: 8px;">Component Name</th>
      <th style="padding: 8px;">Type</th>
      <th style="padding: 8px;">Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e1dfdd;">
      <td style="padding: 8px;"><strong>[Component Name]</strong></td>
      <td style="padding: 8px;">[Type]</td>
      <td style="padding: 8px;">[Brief description of responsibility]</td>
    </tr>
    <!-- Add more rows as needed -->
  </tbody>
</table>

<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px;">📏 Standards & Governance</h2>
<h3>Applied Standards</h3>
<ul>
  <li><strong>[Standard File Name]</strong>: [Specific rule applied (e.g., "Naming Convention: Flow_Noun_Verb")]</li>
  <li><strong>[Standard File Name]</strong>: [Specific rule applied]</li>
</ul>

<h3>Guardrails & Limits</h3>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
  <tr style="border-bottom: 1px solid #e1dfdd;">
    <td style="padding: 8px; width: 150px;"><strong>Governor Limits</strong></td>
    <td style="padding: 8px;">[How bulkification is handled]</td>
  </tr>
  <tr style="border-bottom: 1px solid #e1dfdd;">
    <td style="padding: 8px;"><strong>Security</strong></td>
    <td style="padding: 8px;">[FLS/Sharing considerations]</td>
  </tr>
  <tr style="border-bottom: 1px solid #e1dfdd;">
    <td style="padding: 8px;"><strong>Performance</strong></td>
    <td style="padding: 8px;">[Query optimization or async processing notes]</td>
  </tr>
</table>

<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px;">🧪 Testing Strategy</h2>
<ul>
  <li><strong>Unit Tests:</strong> [Classes to create/update]</li>
  <li><strong>Key Scenarios:</strong> [Reference to Test Data Matrix rows]</li>
</ul>
```

## Template Filling Instructions

### For AI Agents

1.  **Business Summary:** Summarize the `solution-output.json` > `option_analysis.recommended_option` in non-technical terms.
2.  **Architecture Design:**
    *   List key components from `solution-output.json` > `solution_design.components[]`.
3.  **Standards & Governance:**
    *   List every standard file referenced in `solution-output.json` > `solution_design.applied_standards[]`.
    *   Explicitly state how limits and security are handled.
4.  **Testing Strategy:**
    *   Reference the `solution-output.json` > `testing` section (test_data_matrix, test_cases).

### Validation Checklist

- [ ] Business Summary is jargon-free.
- [ ] All API names use correct naming conventions.
- [ ] Applied Standards section lists specific files.
