# Solution Design Template - Digital Platforms Project

Complete template for the Solution Design / Development Summary field in Azure DevOps. Use this template when documenting the technical solution during the AI Refinement phase.

## Overview

The Solution Design serves two audiences:
1.  **Stakeholders:** Need to understand the "What" and "Why" (Business Summary).
2.  **Developers:** Need the "How" (Architecture, Implementation Steps, Standards).

## Full Template (HTML)

**CRITICAL:** Prepend the Copilot-Generated Content disclaimer at the very top of this template. See `#file:config/templates/field-disclaimer.md` for the disclaimer HTML block.

```html
<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-bottom: 16px; color: #212529;">
  <p style="margin: 0; font-weight: bold; color: #212529;">⚠️ <strong>Copilot-Generated Content:</strong> This field was populated during the autonomous Copilot process. Please review for accuracy before continuing.</p>
  <p style="margin: 4px 0 0 0; color: #212529;">This message should be deleted once the story has been validated and updated.</p>
</div>

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

<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px;">🛠️ Implementation Guide</h2>

<h3 style="color: #0078d4; margin-top: 16px;">Step 1: Schema & Data Model</h3>
<ul>
  <li>Create/Update Field: <code>[Object].[Field_Name]</code> ([Type])</li>
  <li>[Additional schema changes]</li>
</ul>

<h3 style="color: #0078d4; margin-top: 16px;">Step 2: Logic & Automation</h3>
<p><strong>[Component Name]</strong></p>
<ul>
  <li>[Step-by-step logic description]</li>
  <li>[Key algorithm or formula]</li>
  <li>[Error handling approach]</li>
</ul>

<h3 style="color: #0078d4; margin-top: 16px;">Step 3: User Interface</h3>
<ul>
  <li>[UI changes or new components]</li>
  <li>[Permission set assignments]</li>
</ul>

<h2 style="border-bottom: 2px solid #0078d4; padding-bottom: 8px; margin-top: 24px;">📏 Standards & Governance</h2>
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

1.  **Business Summary:** Summarize the `option-analysis.json` recommended option in non-technical terms.
2.  **Architecture Design:**
    *   List key components from `solution-design.json`.
3.  **Implementation Guide:**
    *   Break down the `solution-design.json` into logical steps (Schema -> Logic -> UI).
    *   Use specific API names and types.
4.  **Standards & Governance:**
    *   List every standard file referenced in `solution-design.json`'s `applied_standards` array.
    *   Explicitly state how limits and security are handled.
5.  **Testing Strategy:**
    *   Reference the `test-data-matrix.json` and `test-cases.json`.

### Validation Checklist

- [ ] Disclaimer is present at the top.
- [ ] Business Summary is jargon-free.
- [ ] All API names use correct naming conventions.
- [ ] Applied Standards section lists specific files.
