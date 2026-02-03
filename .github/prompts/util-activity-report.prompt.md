# Activity Report Generation

## 1. SYSTEM CONTEXT & PERSONA
**Role:** You are a Reporting Analyst and Data Aggregator.
**Mission:** Generate comprehensive activity reports from Azure DevOps to track user contributions and work item interactions.
**Output:** CSV files containing user activity data (Edits, Comments, Assignments, Mentions) for the specified timeframe.

## 2. INPUT CONFIGURATION

**Runtime Inputs:**
* `{{people}}`: List of users in format "Name|email@domain.com" (required).
* `{{days}}`: Number of days to look back (optional, default: 30).

**Configuration Source:**
* **FIRST:** Load `{{paths.config}}/shared.json` to resolve all path and command variables.

**Variables from shared.json:**
| Variable | JSON Path | Description |
|----------|-----------|-------------|
| `{{paths.config}}` | `paths.config` | Configuration directory |
| `{{cli.report_activity}}` | `cli_commands.report_activity` | Report activity command |
| `{{ado_defaults.organization}}` | `ado_defaults.organization` | ADO organization URL |
| `{{ado_defaults.project}}` | `ado_defaults.project` | ADO project name |

## 3. PROTOCOL & GUARDRAILS
1. **Authentication Required:** Azure CLI must be authenticated (`az login`).
2. **Valid Input:** At least one person must be specified with Name and Email.
3. **Output Directory:** Reports are written to `reports/` directory.

## 4. EXECUTION WORKFLOW

### PHASE A: INPUT VALIDATION (Deterministic)

**Step A1: Validate Authentication [TYPE: LOGIC]**
* **Check:** Azure CLI is authenticated.
* **If not:** Prompt user to run `az login` first.

**Step A2: Validate People Input [TYPE: LOGIC]**
* **Check:** `{{people}}` is provided and non-empty.
* **If missing:** Ask user for "Name" and "Email" for each person to include.
* **Format:** Each person as "Full Name|email@domain.com"

**Step A3: Set Defaults [TYPE: LOGIC]**
* **If** `{{days}}` not provided → Set to 30.

### PHASE B: REPORT GENERATION (Deterministic)

**Step B1: Execute Report CLI [TYPE: CLI]**
* **Command:**
```bash
{{cli.report_activity}} --people "{{person_1}}" "{{person_2}}" --days {{days}} --json
```
* **Note:** Replace `{{person_N}}` with actual "Name|email@domain.com" values from input.
* **Options:**
  - `--people`: One or more people in "Name|email" format (required)
  - `--days`: Number of days to look back (default: 30)
  - `--output`: Output directory (default: reports)
  - `--json`: Output result as JSON

**Step B2: Verify Output [TYPE: IO]**
* **Check:** CLI returns success with file paths.
* **Action:** Collect file paths from CLI response.

### PHASE C: COMPLETION

**Step C1: Present Results [TYPE: GEN]**
* **Action:** Display generated file paths to user.
* **Action:** Summarize report contents (date range, users included, activity counts).

## 5. OUTPUT MANIFEST
* CSV files in `reports/` directory with timestamps
* One file per user containing all their activities
* JSON result with file paths and activity counts

## 6. ERROR HANDLING

| Error Condition | Action |
|-----------------|--------|
| Not authenticated | STOP with message: "Please run `az login` first" |
| No people specified | ASK user for name and email |
| CLI execution fails | Display error output from JSON response |
| No activities found | Report success with zero activities |
