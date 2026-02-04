# Maintenance Guide

This guide describes how to maintain the unified AI workflow configuration, add new capabilities, and keep overlays in sync.

## Routine Maintenance Checklist

1. **Validate Shared Assets**
   - Run `.github/scripts/sync-check.js` (once created) to verify that prompts do not contain hard-coded prefixes or tag values.
   - Confirm prompts/templates reference shared files with `#file:.github/...` paths.

2. **Review Overlay Integrity**
   - Ensure `.github/` and `.windsurf/` overlay files only contain minimal wrapper instructions and tool-specific assets.
   - Remove any accidentally reintroduced copies of shared files.

3. **Update Standards & Templates**
   - Modify shared standards or templates directly under `.github/`.
   - Communicate impactful changes to development teams (e.g., new acceptance criteria format).

4. **Test Workflow Execution**
   - Execute a dry run for both GitHub Copilot and Cursor using a test work item to ensure prompts, templates, and scripts function end-to-end.

## Adding or Updating Prompts

1. Create or edit files in `.github/prompts/`.
2. Use configuration placeholders for MCP prefixes, tag names, and instruction references.
3. Reference shared templates/standards via `#file:.github/...`.
4. Update corresponding overlay commands (e.g., Windsurf `agents.yml`) if new prompts require wiring.
5. Document the change in section **Prompt Changes** below.

### Prompt Changes Log

| Date | Change | Notes |
|------|--------|-------|
| 2025-11-04 | Initial migration to `.github/prompts/` | Shared prompts now use configuration placeholders. |

## Adding or Updating Templates

1. Modify files in `.github/templates/`.
2. Keep templates tool-neutral; use placeholders for dynamic content where necessary.
3. If new templates are added, record their location in `shared.json` under the `templates` section.

## Updating Standards

1. Edit Markdown documents inside `.github/standards/`.
2. Reference updated standards from prompts or documentation as needed.
3. Capture rationale for significant changes in the changelog below.

### Standards Changelog

| Date | File | Summary |
|------|------|---------|
| 2025-11-04 | Initial migration | Standards relocated from `.github/standards/` to shared directory. |

## Managing Scripts

- Shared scripts belong in `.github/scripts/` with usage notes in `README.md`.
- Tool-specific scripts should remain under their respective overlays and be referenced from overlay instructions.

## Adding a New AI Assistant

1. Create a configuration file under `.github/config/` (e.g., `devbox.json`).
2. Populate MCP prefixes, tag values, and instruction file path.
3. Add a lightweight overlay directory that references `copilot-instructions.md` and provides any required tooling metadata.
4. Update `ARCHITECTURE.md` with the new assistant if necessary.

## Version Control Practices

- Commit shared changes together with overlay updates to avoid inconsistent states.
- Include structured summaries in pull requests referencing the maintenance checklist.
- Avoid editing `.github/config/*.json` through scripts that reformat JSON; maintain stable key ordering for clean diffs.

## Troubleshooting

| Problem | Resolution |
|---------|------------|
| Prompt still references `.github/` path | Run sync script; replace path with `.github/` equivalent. |
| MCP command fails due to prefix | Confirm configuration JSON contains the correct prefix and prompt uses placeholder. |
| Tags show incorrect names | Ensure overlays load tool-specific config and prompts reference `{{config.tags.*}}`. |
| Wiki ancestor pages missing | Verify wiki prompt uses shared logic; overlay-specific scripts may still be required (documented in `.windsurf/.scripts/`). |

## Unknowns Tracking Maintenance

The unknowns tracking system requires ongoing attention to ensure information gaps are properly identified and resolved.

### How Unknowns Should Be Resolved

1. **During Development:**
   - Developers should review the "Known Unknowns & Clarifications Needed" section in the wiki
   - Critical unknowns must be resolved before starting development
   - Non-critical unknowns can be clarified during implementation

2. **Resolution Process:**
   - Contact the suggested stakeholders listed in `who_can_clarify` field
   - Update the work item with clarifications
   - Document resolution in comments or wiki updates
   - Consider updating assumptions register if unknown becomes a validated assumption

3. **Updating Unknowns:**
   - If an unknown is resolved, update `assumptions.json` with resolution details
   - If an unknown becomes an assumption, change `category` from "unknown" to "assumption"
   - Remove unknowns that are no longer relevant

### Maintaining Unknowns Quality

- Review unknowns during code review to ensure they're actionable
- Verify that `who_can_clarify` fields contain valid contacts
- Ensure critical unknowns are truly blocking (not just nice-to-know)
- Update `where_affects` fields to accurately reflect solution impact

## Documentation Updates

- Update this maintenance guide whenever workflow steps, scripts, or overlay responsibilities change.
- Keep `ARCHITECTURE.md` aligned with actual directory layout.
- Record release notes or major updates in project-level communication channels.

