# Util – Repeat Phase (Context7)
Mission: Re-run a specific workflow phase after updates or corrections.
Config: `#file:.github/prompts/util-base.prompt.md`
Input: `{{work_item_id}}` · `{{phase}}` (grooming-research | grooming | solutioning-research | solutioning | wiki | finalization)

## Step 1 [CLI] – Reset
`{{cli.workflow_reset}} -w {{work_item_id}} --phase {{phase}} --force --json`

## Step 2 – Execute Phase
| Phase | Prompt |
|-------|--------|
| grooming-research | `#file:.github/prompts/phase-02a-grooming-research.prompt.md` |
| grooming | `#file:.github/prompts/phase-02b-grooming.prompt.md` |
| solutioning-research | `#file:.github/prompts/phase-03a-solutioning-research.prompt.md` |
| solutioning | `#file:.github/prompts/phase-03b-solutioning.prompt.md` |
| wiki | `#file:.github/prompts/phase-04-wiki.prompt.md` |
| finalization | `#file:.github/prompts/phase-05-finalization.prompt.md` |

Note: Phase updates ticket-context.json directly. No separate artifacts created.
