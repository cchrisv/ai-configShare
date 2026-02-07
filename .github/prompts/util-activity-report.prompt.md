# Activity Report Generation

Role: Reporting Analyst
Mission: Generate activity reports from Azure DevOps.
Output: CSV files with user activity data (Edits, Comments, Assignments, Mentions).

## Config
Load: `#file:config/shared.json`
Input:
- `{{people}}`: List of users as "Name|email@domain.com" (required)
- `{{days}}`: Days to look back (default: 30)

## Prerequisites
Azure CLI authenticated (`az login`).

## Execution

### A: Validation
A1 [LOGIC]: Verify Azure CLI auth
A2 [LOGIC]: Validate people input format
A3 [LOGIC]: Set defaults if not provided

### B: Generate Report [CLI]
```bash
{{cli.report_activity}} --people "{{person_1}}" "{{person_2}}" --days {{days}} --json
```

Options:
- `--people`: One or more "Name|email" entries (required)
- `--days`: Lookback period (default: 30)
- `--output`: Output directory (default: {{paths.reports}})
- `--json`: JSON output

### C: Present Results [GEN]
Display:
- Generated file paths
- Date range
- Users included
- Activity counts

## Output
CSV files in `{{paths.reports}}/` directory with timestamps.

## Errors
| Condition | Action |
|-----------|--------|
| Not authenticated | STOP: "Run `az login` first" |
| No people specified | ASK for name and email |
| No activities found | Report success with zero count |
