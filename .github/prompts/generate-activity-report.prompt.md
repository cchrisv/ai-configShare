# Generate Activity Report

This prompt generates a detailed CSV report of Azure DevOps activity (Edits, Comments, Assignments, Mentions) for specific users.

## Prerequisites
- Ensure you are logged into Azure CLI (`az login`).
- The script `scripts/generate_complete_report.py` must exist.

## Steps
1. **Identify Targets**: Determine which users to generate the report for. If not specified by the user, ask for "Name" and "Email".
2. **Determine Timeframe**: Identify how many days back to look. Default is 30 days.
3. **Execute Script**: Run the python script with the appropriate arguments.

## Command Syntax
```bash
python scripts/generate_complete_report.py --people "Name 1|email1@domain.com" "Name 2|email2@domain.com" --days <number_of_days>
```

## Output
- The script will generate unique CSV files in the `reports/` directory with timestamps.
- Present the paths of the generated files to the user.
