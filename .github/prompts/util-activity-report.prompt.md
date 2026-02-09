# Util – Activity Report
Role: Reporting Analyst
Mission: Generate ADO activity reports (Edits, Comments, Assignments, Mentions).
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md`
Input: `{{people}}` — "Name|email" list (required) · `{{days}}` — lookback (default: 30)

## Constraints
- **CLI-only** – per util-base guardrails
- **Azure CLI auth required** – **STOP** with "Run `az login` first"
- **People required** – ASK for name/email if not provided
- **Format** – each person must be `"Display Name|email@domain.com"`

## Execution

### Step 1 [LOGIC] – Validate
A1: Verify Azure CLI auth → **STOP** if unauthenticated
A2: Validate `{{people}}` — each entry must be `"Name|email"` format; **ASK** if missing or malformed
A3: Set defaults — `{{days}}` = 30 if not specified

### Step 2 [CLI] – Generate Report
`{{cli.report_activity}} --people "{{person_1_name}}|{{person_1_email}}" "{{person_2_name}}|{{person_2_email}}" -d {{days}} -o {{paths.reports}} --json`

**Options:**
- `--no-wiki` — exclude wiki activity
- `--no-prs` — exclude pull request activity

**Errors:**
- `AADSTS` / `az account show` fails → re-run `az login`
- `At least one person must be specified` → check `--people` format
- `--days must be a number between 1 and 365` → fix `--days` value

### Step 3 [GEN] – Present Results
Parse the JSON output and present a summary:

| Field | Source |
|-------|--------|
| **Date range** | `days` lookback from today |
| **People tracked** | list from `--people` |
| **Report files** | paths from `result.files` |
| **Activity counts** | from `result.activityCounts` per person |
| **Total activities** | from `result.totalActivities` |
| **Duration** | from `result.durationMs` |

Zero activities for a person = success (not an error) — report it as "no activity found."
