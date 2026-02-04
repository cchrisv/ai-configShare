---
standard_type: feature-flags
category: usage
version: 1.0
last_updated: 2025-11-02
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/9598/Feature-Flags
applies_to: salesforce, apex, flow, feature-flags, custom-metadata
---

# Feature Flags Standards

## Why Use Feature Flags?

Feature flags are an essential tool in Salesforce development for several reasons:

1. **Controlled Rollout**: Feature flags enable developers to deploy new features to a subset of users or environments before rolling them out to the entire organization. This controlled rollout helps in identifying any potential issues or bugs in a real-world scenario without affecting all users.

2. **Quick Reversal**: If a new feature causes unexpected issues, feature flags allow for quick deactivation of the feature without needing a complete rollback of the deployment. This minimizes downtime and disruption to the users.

3. **A/B Testing**: Feature flags facilitate A/B testing by allowing different user groups to experience different versions of a feature. This helps in gathering data on user preferences and behavior, enabling informed decisions on feature improvements or changes.

4. **Incremental Development**: Developers can implement and test parts of a feature incrementally using feature flags. This approach reduces the risk associated with large-scale changes and helps in maintaining a stable production environment.

5. **Customization and Personalization**: Admins can use feature flags to customize user experiences based on specific criteria, such as user roles, profiles, or permissions. This ensures that users only see and interact with features relevant to their needs.

6. **Environment Management**: Feature flags make it easier to manage different environments (development, testing, staging, and production) by toggling features on or off as required for each environment. This simplifies the testing process and ensures consistency across environments.

7. **Continuous Delivery**: By decoupling feature deployment from code deployment, feature flags support continuous delivery practices. Features can be developed, tested, and deployed independently, which streamlines the release process and improves overall agility.

8. **User Feedback and Iteration**: With feature flags, developers can gather feedback from users on new features and make necessary adjustments before a full-scale launch. This iterative approach helps in refining features based on actual user input.

Overall, feature flags are a powerful tool in Salesforce development and administration, providing flexibility, control, and safety in feature deployment and management.

## When are Feature Flags Needed?

Feature Flags will be included in solution summaries by architects for developers to implement. When solutioning and determining whether a Feature Flag is needed, the following will be considered.

### Feature Flag Purpose

Feature Flags should be considered when one of the following scenarios may occur for a given feature, user story, or defect:

- **Gradual Rollout of Features**: If you're introducing a new feature or change and want to release it to a subset of users (e.g., a pilot group) before making it available to everyone, feature flags allow you to control this rollout.

- **Testing and Validation**: When you want to test new features in production with real data without affecting all users, feature flags enable you to selectively enable the feature for certain users or groups.

- **Toggle Experimental Features**: For features that are experimental or might change frequently, feature flags allow you to enable or disable these features without deploying new code each time.

- **Handling Multiple User Segments**: If your organization has different user segments that require different functionalities (e.g., different regions, business units), feature flags allow you to customize the experience based on the segment.

- **Mitigating Risk**: Feature flags can be used as a risk mitigation tool, allowing you to disable a feature quickly if something goes wrong after deployment.

- **Versioning**: If a new version of a feature is created, a feature flag should be created for each version to allow toggling between versions or selectively deploying a new version to specific users.

## Things to Consider

- **Naming Conventions**: Use clear and descriptive names for feature flags. This makes it easier for others to understand what the flag controls and to maintain the system in the future.

- **Scope and Granularity**: Define the scope of the feature flag (e.g., user level, profile level, or organization-wide). Consider whether the flag needs to control a single feature or a set of related features.

- **Lifecycle Management**: Plan the lifecycle of the feature flag. Consider how and when the flag will be removed after the feature is fully rolled out or no longer needed. Ensure that you have a process to clean up deprecated flags.

- **Documentation and Communication**: Document the purpose and usage of each feature flag, including who can enable/disable it and under what conditions. Communicate to the team how and when to use the flag.

- **Performance Impact**: Assess the potential performance impact of the feature flag. Ensure that the flag does not add significant overhead to your application or create a bottleneck.

- **Security Considerations**: Consider how the feature flag affects security. Ensure that enabling/disabling the feature does not introduce vulnerabilities or grant unintended access.

- **Dependency Management**: Evaluate any dependencies between feature flags. If one flag depends on another, ensure that this relationship is clearly understood and managed.

- **Monitoring and Logging**: Implement monitoring and logging around feature flags to track their usage and identify any issues that may arise when toggling them.

## Feature Flag Best Practices

### Declarative Automation

#### Record-Triggered Flows

Incorporate Feature Flags into the trigger criteria of before-save and after-save flows so that the flow is only triggered when a specific Feature Flag is active or inactive, depending on the scenario.

**Formula for Entry Criteria:**
```
{!$CustomMetadata.Feature_Flag__mdt.RecordAPIName.Active__c} = TRUE
```

**Example:**
```
{!$CustomMetadata.Feature_Flag__mdt.Assignment_Tree.Active__c} = TRUE
```

**Best Practice**: Create an Assignment element at the beginning of the flow that sets a `featureName` variable to the name of the picklist value in the Feature__c picklist on Feature Flag custom metadata type. This reduces the need to update the Feature name in multiple places within the flow if the name is changed.

#### Other Flow Types

Use the `hasFeatureFlagEnabled` Apex action within the flow to check whether the specified Feature Flag is active and whether the running user bypasses the Feature Flag.

**Pattern:**
```
Call: Feature Flag - Subflow - Check for Active Feature Flag
Input: Feature name (from variable)
Output: Should proceed? (Boolean)

Decision: Should we proceed with new feature?
  ├─ Yes: Implement new logic
  └─ No: Use existing logic or skip
```

#### Before-Save Record-Triggered Flows

For before-save record-triggered flows, the Apex action cannot be used. Use the following pattern:

1. Use the flow trigger criteria formula above to determine if the Feature Flag is active.
2. Use a Get Records element to retrieve the Feature Flag, adding criteria that it must be active.
3. Use a decision element to check whether an active Feature Flag was found.
4. Use a Get Records element to retrieve the Feature Bypass related to the Feature Flag and the running user's username. The Feature Bypass must be active to run.
5. Use a decision element to check whether an active Feature Bypass was found.
6. If a Feature Bypass was not found, proceed with the flow. If it was found, end the flow. If appropriate, display an end user-friendly custom error message to the user for why the flow did not continue.

**Note**: OR operators cannot be used in Get Records for custom metadata records, so you may need separate Get Records elements for username and profile name checks.

#### Subflows

Feature Flag checks should occur within subflows even if the check occurs as part of the parent flow. This allows for subflows to be reused and maintain Feature Flags independently.

### Apex Automation

#### Use Feature Flags Appropriately

Use the Feature Flag custom metadata records to verify whether the specified feature is active. If it is active, execute the new logic. If it is inactive, based on the required solution, run old logic and/or do not run new logic. The Feature Flag custom metadata record must be verified in After Insert and After Update in trigger handlers.

#### Centralized Feature Flag Service

Use a centralized class to handle the retrieval and management of feature flags. This ensures consistency and reduces duplication across your codebase.

**Example:**
```apex
if (FeatureFlagUtil.isEnabled('Account Trigger')) {
    new AccountTriggerHandler().run();
}
```

#### Minimize Performance Impact

Ensure that the retrieval of feature flags is optimized to avoid performance degradation, especially in triggers and batch jobs where the flag might be checked multiple times.

#### Code Coverage and Testing

Write test methods for both enabled and disabled states of each feature flag to ensure all code paths are covered.

## Configuration

### Custom Metadata Type | Feature Flag

Feature flagging is implemented using custom metadata and a custom metadata record for each feature. The Feature Flag custom metadata type sets the feature and identifies whether it is active.

**Fields:**
- **Active?**: Checkbox that determines whether the feature is active in the current environment.
- **Feature**: Picklist that identifies the specific feature, designed as a picklist for more accurate usage in flows compared to using just the label for identification.
- **Description**: Explains the purpose and usage of the feature, including any related user stories and defects.

### Custom Metadata Type | Feature Bypass

The Feature Bypass custom metadata type determines whether the related Feature Flag can be ignored by a certain user. A separate custom metadata record will be created for each combination of username and feature flag.

**Fields:**
- **Active?**: Checkbox that indicates whether the bypass is currently active in this environment.
- **Feature Flag**: Lookup relationship that identifies the specific feature flag associated with this bypass.
- **Username**: Specifies the Salesforce username of the affected user who should be excluded from the related feature flag.
- **Profile Name**: Specifies the Salesforce profile name of the affected users who should be excluded from the related feature flag.
- **Bypass Reason**: Provides the rationale for excluding a specific user from the active feature flag.

**Important**: Either username or profile name must be populated, but never both.

### Permission Set | Feature Flag Management

This permission set grants users access to the Feature Flag and Feature Bypass custom metadata types. Assigned users can manage all records in those custom metadata types.

## Creating a New Feature Flag

### Step 1: Create Feature Flag Custom Metadata Record

1. Create a picklist value for the Feature Flag field that matches the label of the Feature Flag.
2. Label should be descriptive and clear.
3. Create a description with a good explanation for the use of the feature flag.
4. Set Active? to true or false as needed for development.
5. Add a Description that includes:
   - The reason for the creation
   - Associated user stories and defects
   - The purpose served
   - A link to the documentation about the feature

### Step 2: Create Feature Bypass Custom Metadata Records (if needed)

One record should be created for each user bypassing the feature.

1. Label should be the name of the feature flag appended by the name of the user, such as `Lead Contact Assignment | Kelly Avolio`.
2. Username or Profile Name should match that of the user in the current environment.
   - **Note**: Either Username or Profile Name must be populated, but not both.
3. Active? should be true or false as needed for development.
4. Bypass Reason provides the rationale for excluding a specific user from the active feature flag.

## Implementation Examples

### Declarative Example: Record-Triggered Flow

In a fictional user story, we are creating a new feature that restricts users from modifying Cases if they are not members of the Queue that owns the Case. However, 3 users should be able to modify all Cases regardless of their Queue membership. This change will be completed declaratively.

**Steps:**
1. On the Feature Flag custom metadata type, create a new picklist value for the Feature Flag field called "Restrict Case Modification to Queue Members".
2. Create a Feature Flag record with:
   - Label: `Restrict Case Modification to Queue Members`
   - Active: `True`
   - Feature Flag: `Restrict Case Modification to Queue Members`
   - Description: This feature flag was created for User Story #000001. When active, this feature flag restricts users who do not belong to the Case Queue that owns a Case from modifying that Case. Queue members will be able to modify the Case.
3. Create Feature Bypass custom metadata records for each of the 3 users:
   - Label: `Restrict Case Modification to Queue Members | User Full Name`
   - Feature Flag: Lookup to the Restrict Case Modification to Queue Members custom metadata record
   - Active: `True`
4. Create a before-save record-triggered flow that is triggered when a Case is updated with appropriate entry conditions.
5. Use the flow trigger criteria formula to determine if the Feature Flag is active.
6. Use Get Records to retrieve the Feature Flag, adding criteria that it must be active.
7. Use a decision element to check whether an active Feature Flag was found.
8. Use two Get Records elements to retrieve the Feature Bypass related to the Feature Flag and the running user's username and profile name. The Feature Bypass must be active to run.
   - **Note**: OR operators cannot be used in Get Records for custom metadata records.
9. Use decision elements to check whether an active Feature Bypass was found.
10. If a Feature Bypass was not found, proceed with the flow. If it was found, end the flow. If appropriate, display an end user-friendly custom error message.
11. If the Feature Flag custom metadata record is active and there is no Feature Bypass for the running user, continue the flow logic for the new feature:
    - Check whether the running user is a member of the Case Queue that owns the Case.
    - If they are members of the Case Queue, end the flow.
    - If they are not members of the Case Queue, display a custom message to the running user.

### Apex Example

In this example, we are creating a new feature to disable the 'Account' trigger invoking if the user is 'Integration System Admin'.

**Steps:**
1. On the Feature Flag custom metadata type, create a new picklist value for the Feature Flag field called "Enable Account Trigger".
2. Create a feature flag record with:
   - Label: `Enable Account Trigger`
   - Feature: `Enable Account Trigger`
   - Active: `true`
   - Description: Enable/Disable feature flag for user/profile before invoking account trigger logic
3. Create a Feature bypass Record for 'Integration System Admin' Profile restriction on Account Trigger:
   - Label: `Enable Account Trigger | Integration System Admin`
   - Feature: `Enable Account Trigger`
   - Profile Name: `Integration System Admin`
   - Active?: `true`
   - Bypass Reason: Disable Account Trigger for 'Integration System Admin' profile

**Apex Code:**
```apex
if (FeatureFlagUtil.isEnabled('Account Trigger')) {
    new AccountTriggerHandler().run();
}
```

## Tracking Features in Azure DevOps

To align Azure DevOps tags with Salesforce feature flags, follow this process:

1. **ADO Tags**: ADO tags will be added to user stories, defects, and features.
   - On the Refinement board, the architect will tag the user story, defect, or feature in Azure DevOps (ADO) with a new tag that matches the Feature Flag label in Salesforce.
   - For user stories or defects on the Support board, the appropriate tags will be added during the triage process.

2. **DREAM Team Features List**: The architect will add a new entry to the [DREAM Team Features list](https://acceleredcom.sharepoint.com/sites/IT-SFDCCRM-US/Lists/Dream%20Team%20Solutions/AllItems.aspx?env=WebViewList).
   - This entry should include links to relevant documentation.
   - All fields in the new list entry must be thoroughly completed to ensure that other team members can easily understand and reference the information.

3. **Intake Form**: The architect will contact Michael Watts to request the inclusion of the new feature flag on the intake form, enabling end users to submit requests to the DREAM team for the specified feature.

4. **Developer Implementation**: The developer will create the Feature Flag in Salesforce according to the specified guidelines.

## Resources

- [Salesforce Documentation: Advanced Release Strategies](https://help.salesforce.com/s/articleView?id=sf.availability_create_and_use_advanced_release_strategies.htm&type=5)
- [Salesforce Documentation: Understanding Feature Flagging Mechanism](https://help.salesforce.com/s/articleView?id=001119692&type=1)
- [Github: Salesforce Feature Flag Apex Class](https://github.com/pgonzaleznetwork/salesforce-feature-flags)

