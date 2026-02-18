# Util – Setup
Mission: First-time environment setup, authentication, and end-to-end validation.
Config: `#file:config/shared.json` · `#file:.github/prompts/util-base.prompt.md` · `#file:README.md`

## Step 1 [CLI] – Prerequisites
Verify all required tools are installed:
- `node --version` → must be v18+
- `npm --version` → must be present
- `az --version` → Azure CLI required for ADO auth
- `sf --version` → Salesforce CLI required for SF auth

If any are missing → install from official sources. **STOP** if Node < 18.

## Step 2 [CLI] – Install Dependencies
A1: Run in `{{paths.scripts}}/`: `npm install`
A2: Run in `{{paths.scripts}}/`: `npm run build`
A3: Verify `{{paths.scripts}}/dist/` contains compiled `.js` files

**Errors:** `npm ERR!` → check Node version, delete `node_modules` and retry.

## Step 3 [CLI] – Authenticate & Validate ADO
B1: `az login` → `az account show` → confirm correct tenant
B2: **Search** — `{{cli.ado_search}} --text "Journey Pipeline" --type "User Story" --top 5 --json`
  - Verify results returned (confirms ADO connection + project access)
B3: **Get** — pick first result ID → `{{cli.ado_get}} <id> --expand Relations --json`
  - Verify work item fields, relations, and tags are readable

**Errors:**
- `AADSTS` → re-run `az login`
- `TF401019` → check project permissions in ADO
- `TF401027` → PAT expired, re-authenticate
- Empty search results → verify `{{ado_defaults.project}}` is correct

## Step 4 [CLI] – Authenticate & Validate Salesforce
C1: `sf org login web -a {{sf_defaults.default_org}}` → `sf org list` → confirm org alias appears
C2: **Describe** — `{{cli.sf_describe}} Journey_Pipeline__c --fields-only --json`
  - Verify object metadata is returned (confirms SF connection + object access)
C3: **Query** — `{{cli.sf_query}} "SELECT Id, Name, Stage_Primary__c FROM Journey_Pipeline__c LIMIT 5" --json`
  - Verify records returned (confirms data access)

**Errors:**
- `No authorization found` → re-run `sf org login web`
- `INVALID_TYPE` → check object API name and org permissions
- `INVALID_FIELD` → check field-level security for the connected user

## Step 5 [CLI] – Validate Wiki Access
D1: **Search** — `{{cli.wiki_search}} "Journey Pipeline" --json`
  - Verify wiki search returns results (confirms wiki connection)
D2: **Read** — pick first result path → `{{cli.wiki_get}} --path "<page_path>" --json`
  - Verify page content is returned (confirms read access)
D3: **List** — `{{cli.wiki_list}} --path "/" --json`
  - Verify top-level wiki structure is readable

**Errors:**
- `404 WikiPageNotFoundException` → verify `{{ado_defaults.wiki}}` name is correct
- `403` → check wiki permissions for the authenticated user

## Step 6 [CLI] – Validate Workflow Tools
E1: `{{cli.workflow_status}} -w 217045 --json` → verify status output (uses existing test work item)

**Errors:**
- `Cannot find module` → re-run `npm run build` in `{{paths.scripts}}/`
- `ENOENT` → verify `{{paths.artifacts_root}}/` directory exists

## Complete
All tools authenticated and validated. Report results:

| Tool | Status | Evidence |
|------|--------|----------|
| ADO | ✅/❌ | Search returned N results, work item #ID readable |
| Salesforce | ✅/❌ | Journey_Pipeline__c described, N records returned |
| Wiki | ✅/❌ | Search returned N results, page readable |
| Workflow | ✅/❌ | Status check succeeded |

Next → `/ticket-grooming-phase-01-research` with a work item ID.
