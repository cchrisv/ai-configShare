# Util – Submit Feedback
Role: Feedback Coordinator
Mission: Collect user feedback about Copilot prompts and their outputs, then create an Issue work item in ADO for leadership triage.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`

## Constraints (STRICT)
- **CLI-only** – per util-base guardrails; use `{{cli.*}}` variables only
- **Template-verbatim HTML** – COPY `#file:config/templates/field-feedback-description.html` character-for-character; ONLY replace `{{variable}}` tokens. NEVER write HTML from memory.
- **No config edits** – never modify shared.json
- **No comments on work items** – never post ADO comments unless requested
- **Area path** – always use `Digital Platforms\CRM - DREAM`
- **Tag** – always apply `Copilot-Feedback`
- **Unassigned** – never set assigned-to; leaders triage via filtered ADO queries
- **Temp file cleanup** – delete temp files after successful ADO update

## Prerequisites [IO]
A1 [IO]: Load `#file:config/shared.json` → extract `cli_commands.*`, `paths.*`

## Execution

### Step 1 [IO] – Collect Feedback
**ASK** the user for all of the following. Present the prompt list as a pick list. All fields required unless marked optional.

| Field | Description |
|-------|-------------|
| **Prompt** | Which prompt was used? List filenames from `.github/prompts/` as options. |
| **Feedback** | Free-text summary of the issue or suggestion. |
| **Expected** | What the user expected the prompt/output to do. |
| **Actual** | What actually happened (incorrect output, errors, missing content, etc.). |
| **Severity** | Priority 1-4 (1 = Critical, 2 = High, 3 = Medium, 4 = Low). Default: 3. |
| **Repro steps** | *(Optional)* Step-by-step instructions to reproduce the problem. |
| **Related ticket** | *(Optional)* The ADO work item ID that was being processed when the issue occurred. |

### Step 2 [GEN] – Build Description HTML
B1 [IO]: Read template `#file:config/templates/field-feedback-description.html`
B2 [GEN]: Replace `{{variable}}` tokens with collected feedback data:
  - `{{prompt_name}}` → selected prompt filename
  - `{{severity_label}}` → severity as text: `1 - Critical`, `2 - High`, `3 - Medium`, or `4 - Low`
  - `{{related_ticket}}` → related work item ID, or `N/A` if not provided
  - `{{feedback_summary}}` → user's feedback text
  - `{{expected_behavior}}` → expected behavior text
  - `{{actual_behavior}}` → actual behavior text
  - `{{reproduction_steps}}` → repro steps, or `No reproduction steps provided.` if not supplied
  - `{{report_date}}` → current date (YYYY-MM-DD)
B3 [IO]: Save rendered HTML to temp file: `temp-feedback-description.html`

### Step 3 [CLI] – Create Issue
C1 [GEN]: Build a concise title from the feedback summary (max ~80 chars). Format: `[Copilot Feedback] <concise summary>`
C2 [CLI]: Create the Issue:
```
{{cli.ado_create}} Issue --title "[Copilot Feedback] <summary>" --area "Digital Platforms\CRM - DREAM" --tags "Copilot-Feedback" --json
```
C3 [LOGIC]: Extract `id` from the JSON response. **STOP** on error.

### Step 4 [CLI] – Update Description & Priority
D1 [CLI]: Update the created Issue with description and priority:
```
{{cli.ado_update}} <id> --description-file "temp-feedback-description.html" --priority <severity> --json
```
D2 [LOGIC]: Confirm update succeeded. **STOP** on error after one retry.

### Step 5 [IO] – Cleanup
E1 [IO]: Delete `temp-feedback-description.html`

### Step 6 – Confirm
F1: Report to the user:
- ✅ Issue **#<id>** created successfully
- **Title:** [Copilot Feedback] <summary>
- **Priority:** <severity>
- **Tag:** Copilot-Feedback
- **Area:** Digital Platforms\CRM - DREAM
- The issue is unassigned and will be triaged by leadership.
