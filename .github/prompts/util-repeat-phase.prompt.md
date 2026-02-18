# Util – Repeat Phase (Context7)
Mission: Re-run a specific workflow phase after updates or corrections.
Config: `#file:util-base.prompt.md`
Input: `{{work_item_id}}` · `{{phase}}` (research | grooming | solutioning-research | solutioning | finalization)

## Step 1 [CLI] – Reset
`{{cli.workflow_reset}} -w {{work_item_id}} --phase {{phase}} --force --json`

## Step 2 – Execute Phase
| Phase | Prompt |
|-------|--------|
| research | `#file:ticket-grooming-phase-01-research.prompt.md` |
| grooming | `#file:ticket-grooming-phase-02-grooming.prompt.md` |
| solutioning-research | `#file:ticket-grooming-phase-03-solutioning-research.prompt.md` |
| solutioning | `#file:ticket-grooming-phase-04-solutioning.prompt.md` |
| finalization | `#file:ticket-grooming-phase-05-finalization.prompt.md` |

Note: Phase updates ticket-context.json directly. No separate artifacts created.
