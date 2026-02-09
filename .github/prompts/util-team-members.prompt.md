# Util – Team Members
Role: Organization Analyst
Mission: Discover team members from Microsoft Graph (Azure AD / Entra ID) org hierarchy.
Config: `#file:config/shared.json`

## Constraints
- **CLI-only** – use CLI commands from `{{cli.*}}`; NEVER raw shell (curl, az, git, npm)
- **No hardcoded paths** – use `{{paths.*}}`, `{{cli.*}}` from shared.json
- **Config read-only** – NEVER modify shared.json or CLI scripts unless asked
- **Load config first** – always load shared.json before execution
- **Azure CLI auth required** – **STOP** with "Run `az login` first"

## Execution

### Step 1 [LOGIC] – Validate
A1: Verify Azure CLI auth → **STOP** if unauthenticated
A2: Determine options — `--department` (include department), `--csv`, `--markdown`, `--json`

### Step 2 [CLI] – Discover Team Members
`{{cli.team_discover}} --json`

**Options:**
- `-l, --leader <email>` — root tree at this leader (deterministic, team-centric)
- `-d, --department` — include all members of your department
- `--csv` — export results as CSV
- `--markdown` — export Markdown with Mermaid org chart
- `-o, --output <dir>` — output directory (default: `{{paths.reports}}`)

**Modes:**
- **Without `--leader`** — you-centric: discovers YOUR manager, peers, subordinates
- **With `--leader`** — team-centric: discovers everyone under the leader; anyone on the team gets the same result

**Examples:**
- Team discovery: `{{cli.team_discover}} --leader denise.dyer@umgc.edu --json`
- Team export: `{{cli.team_discover}} --leader denise.dyer@umgc.edu --csv --markdown --json`
- You-centric: `{{cli.team_discover}} --json`
- Full you-centric export: `{{cli.team_discover}} --department --csv --markdown --json`

**Errors:**
- `AADSTS` / `az account show` fails → re-run `az login`
- `Graph API 403` → user may need `User.Read.All` permission in Azure AD
- `Graph API 404` on manager → user has no manager in directory (non-fatal)

### Step 3 [GEN] – Present Results
Parse the JSON output and present a summary:

| Field | Source |
|-------|--------|
| **Current user** | `result.currentUser` |
| **Leader** | `result.leader` (if `--leader`) |
| **Department** | `result.department` |
| **Total members** | `result.summary.total` |
| **Managers** | `result.summary.managers` |
| **Peers** | `result.summary.peers` |
| **Peer's Team** | `result.summary.peerTeam` |
| **Subordinates** | `result.summary.subordinates` |
| **Department colleagues** | `result.summary.department` (if `--department`) |
| **Report files** | paths from `result.files` |
| **Duration** | `result.durationMs` |

**Leader mode:** group as Leader → You → Team Members.
**You-centric mode:** group as Management → You → Peers → Peer's Team → Subordinates → Department.
