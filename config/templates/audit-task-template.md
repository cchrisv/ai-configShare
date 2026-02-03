# Audit Task Description Template

This template is used in Phase 5 (Finalization) to create a simple audit task that records the completion of the autonomous ticket preparation process.

## Template

```html
<h2>✅ Autonomous Ticket Preparation Complete</h2>
<p><strong>Work Item:</strong> #{work_item_id} - {work_item_title}<br>
<strong>Completed:</strong> {iso_timestamp}<br>
<strong>Status:</strong> All phases completed successfully</p>

<h3>Phases Executed</h3>
<ul>
  <li>Phase 1: Research</li>
  <li>Phase 2: AI Refinement</li>
  <li>Phase 3: Solutioning</li>
  <li>Phase 4: Wiki Creation</li>
  <li>Phase 5: Finalization</li>
</ul>

<h3>Estimation Snapshot</h3>
<p><strong>Story Points:</strong> 5 (Complexity 2 · Risk 1 · Uncertainty 1)</p>

<h3>Estimation Snapshot</h3>
<p><strong>Story Points:</strong> {story_points} (Complexity {complexity_factor} · Risk {risk_factor} · Uncertainty {uncertainty_factor})</p>

<h3>📚 Complete Documentation</h3>
<p>All research findings, decisions, and technical design details are available in the comprehensive wiki documentation.</p>
<p><strong>Wiki:</strong> <a href="{wiki_url}">{work_item_id} - {work_item_title}</a></p>

<hr>
<p><em>This task serves as an audit record that autonomous ticket preparation was executed and completed successfully.</em></p>
```

## Usage

Load this template in finalization.prompt.md and replace the placeholders:

- `{work_item_id}` - The work item ID
- `{work_item_title}` - The work item title  
- `{iso_timestamp}` - ISO 8601 timestamp of completion
- `{wiki_url}` - The wiki page URL from wiki-creation.json
- `{story_points}` - Fibonacci story point value written to the work item
- `{complexity_factor}` / `{risk_factor}` / `{uncertainty_factor}` - Numeric factors (1–3) contributing to the estimate

## Example

```html
<h2>✅ Autonomous Ticket Preparation Complete</h2>
<p><strong>Work Item:</strong> #12345 - Enable Contact Filtering for Advisors<br>
<strong>Completed:</strong> 2025-11-02T15:30:00Z<br>
<strong>Status:</strong> All phases completed successfully</p>

<h3>Phases Executed</h3>
<ul>
  <li>Phase 1: Research</li>
  <li>Phase 2: AI Refinement</li>
  <li>Phase 3: Solutioning</li>
  <li>Phase 4: Wiki Creation</li>
  <li>Phase 5: Finalization</li>
</ul>

<h3>📚 Complete Documentation</h3>
<p>All research findings, decisions, and technical design details are available in the comprehensive wiki documentation.</p>
<p><strong>Wiki:</strong> <a href="https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki?pagePath=/CRM-Home/Legacy-Org/Contact/12345-Enable-Contact-Filtering">12345 - Enable Contact Filtering for Advisors</a></p>

<hr>
<p><em>This task serves as an audit record that autonomous ticket preparation was executed and completed successfully.</em></p>
```

## Key Points

- **Keep it simple** - This is just a completion record, not a comprehensive walkthrough
- **Link to wiki** - The wiki contains all the detailed documentation
- **No local paths** - Never reference `.ai-artifacts/` paths as they're not accessible to team members
