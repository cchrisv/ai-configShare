# Initialize Work Item Artifacts

This prompt initializes the folder structure and state file for a new work item.

## Inputs
- `work_item_id`: The ID of the work item to initialize.

## Instructions

1.  **Create Directory Structure**
    Create the following directory structure for the work item:
    - `.ai-artifacts/{work_item_id}/`
    - `.ai-artifacts/{work_item_id}/research/`
    - `.ai-artifacts/{work_item_id}/grooming/`
    - `.ai-artifacts/{work_item_id}/solutioning/`
    - `.ai-artifacts/{work_item_id}/wiki/`

2.  **Initialize Run State**
    Create a file named `.ai-artifacts/{work_item_id}/run-state.json` with the following initial content:
    ```json
    {
      "workItemId": "{work_item_id}",
      "version": 1,
      "currentPhase": "research",
      "phaseOrder": [
        "research",
        "grooming",
        "solutioning",
        "wiki",
        "finalization"
      ],
      "completedSteps": [],
      "generationHistory": {},
      "errors": [],
      "metrics": {
        "phases": {}
      },
      "lastUpdated": "{current_timestamp_iso}"
    }
    ```

3.  **Confirmation**
    Verify that the folders and file have been created successfully.
