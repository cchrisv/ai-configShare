# Util – Setup (Context7)
Mission: First-time environment setup and auth validation.
Config: `#file:config/shared.json` · `#file:README.md`

## Step 1 [CLI] – Prerequisites
Verify: `node --version` (v18+) · `npm --version` · `az --version` · `sf --version`
If missing → install from official sources.

## Step 2 [CLI] – Install Dependencies
Run in `{{paths.scripts}}`: `npm install` → `npm run build`
Verify `dist/` contains compiled .js files.

## Step 3 [CLI] – Authenticate ADO
`az login` → `az account show` → `{{cli.ado_get}} <test-id> --json`
**Errors:** `AADSTS` → re-auth · `TF401019` → check permissions

## Step 4 [CLI] – Authenticate Salesforce
`sf org login web -a production` → `sf org list` → `{{cli.sf_query}} "SELECT Id FROM Account LIMIT 1" --json`
**Errors:** `No authorization found` → re-run login

## Step 5 [CLI] – Validate Wiki + Workflow
`{{cli.wiki_list}} --json`
`{{cli.workflow_prepare}} -w <test-id> --json` → verify success
`{{cli.workflow_reset}} -w <test-id> --force --json` (cleanup)

## Complete
Next → `/phase-01-initialize` with work item ID, then `/phase-02a-grooming-research`.

## Context7 Note
All phases use unified ticket-context.json instead of separate artifacts.
