# First-Time Setup

Role: Setup Assistant
Mission: Guide through environment setup, validate authentication.

## Config
Load: `#file:config/shared.json`
Reference: `#file:README.md` (Authentication section)

## Steps

### 1: Check Prerequisites [CLI]
```bash
node --version    # v18+
npm --version
az --version
sf --version
```
If missing: Install from official sources.

### 2: Install Dependencies [CLI]
```bash
cd {{paths.scripts}}
npm install
npm run build
```
Verify: `dist/` contains compiled `.js` files.

### 3: Authenticate Azure DevOps [CLI]
```bash
az login
az account show
{{cli.ado_get}} <test-work-item-id> --json
```
Common issues:
- `AADSTS` → Re-authenticate
- `TF401019` → Check permissions
- Project not found → Verify shared.json settings

### 4: Authenticate Salesforce [CLI]
```bash
sf org login web -a production
sf org list
{{cli.sf_query}} "SELECT Id FROM Account LIMIT 1" --json
```
Common issues:
- `No authorization found` → Re-run login
- `INVALID_SESSION_ID` → Session expired

### 5: Validate Wiki Access [CLI]
```bash
{{cli.wiki_list}} --json
```

### 6: Test Workflow Tools [CLI]
```bash
{{cli.workflow_prepare}} -w <test-work-item-id> --json
```
Verify: `success: true` and artifact structure created.

### 7: Clean Up [CLI]
```bash
{{cli.workflow_reset}} -w <test-work-item-id> --force --json
```

## Complete

Next step: Run `/phase-01-prepare-ticket` with a work item ID.
