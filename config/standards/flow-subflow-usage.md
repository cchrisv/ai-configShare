---
standard_type: flow
category: patterns
version: 1.0
last_updated: 2025-11-02
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/9593/Flow-Subflow-Usage
applies_to: salesforce, flow, subflow, automation
---

# Flow Subflow Usage

It is essential to understand when and how to use subflows to enhance the efficiency and maintainability of your Salesforce flows. Here are key guidelines and patterns for using subflows:

## When to Use Subflows

### 1. Reusable Logic

#### Common Actions
If you have logic that needs to be executed across multiple flows, like sending an email, creating a record, or performing calculations, encapsulate it in a subflow. This avoids duplication and simplifies maintenance.

#### Consistent Processes
For processes that must follow the same steps regardless of where they are initiated, such as a standardized approval process or a validation routine.

### 2. Complex Flows

#### Simplify Main Flow
Break down a complex flow into smaller, manageable subflows. This makes the main flow easier to read, understand, and troubleshoot.

#### Isolation of Logic
Separate distinct logical components or stages of a process into subflows to isolate changes and reduce the risk of errors affecting the entire flow.

### 3. Modular Design

#### Encapsulation
Use subflows to encapsulate business logic, making the main flow less cluttered and more modular.

#### Maintainability
Modular design improves maintainability. Changes to a specific business process can be made in one subflow without impacting the entire flow structure.

### 4. Error Handling

#### Dedicated Subflows for Error Handling
Implement error handling logic in subflows to manage exceptions and ensure consistent error management across different parts of the flow.

## Patterns to Use

### 1. Parent-Child Pattern

- **Parent Flow**: This is the main orchestrating flow that controls the overall process.
- **Child Subflows**: These subflows handle specific tasks or stages of the process. The parent flow calls these child subflows as needed.

### 2. Functional Subflows

#### Utility Subflows
These handle common utility tasks like formatting data, performing calculations, or checking conditions.

#### Process Subflows
These represent discrete business processes, like a lead qualification or an order validation process.

### 3. Decision-Driven Subflows

#### Branching Logic
Use decision elements to call different subflows based on conditions. This is useful for handling different paths in a process without cluttering the main flow.

#### Conditional Subflows
Execute subflows only if certain conditions are met, ensuring that only relevant logic is processed.

### 4. Error Handling Subflows

#### Try-Catch Pattern
Implement a try-catch pattern where the main flow attempts an operation and, in case of an error, calls a subflow dedicated to handling the error, logging it, and notifying stakeholders.

## Best Practices

### 1. Clear Naming Conventions

Use clear and natural language descriptive names for subflows to indicate their purpose.

For example, `Calculate how many actions were completed`.

### 2. Manage Inputs and Outputs

Define clear input and output parameters for subflows. Ensure that subflows are designed to be reusable with minimal dependencies on the calling flow.

### 3. Optimize for Performance

Ensure subflows are optimized for performance, especially if they are called frequently or handle large data volumes. Avoid unnecessary operations within subflows to keep them efficient.

### 4. Test Thoroughly

Test subflows independently and within the context of the main flow to ensure they function correctly in all scenarios.

## Available Utility Subflows

Our team has created a library of reusable subflows to reduce redundancy and accelerate flow development. These modular subflows not only simplify maintenance but also make it easier to incorporate new requirements without disrupting the overall flow structure. For instance, if we need to update how users are navigated to a record page, we can modify a single subflow rather than updating every flow that navigates a user to a record page. Additionally, these subflows provide intuitive and consistent interfaces, ensuring clear communication and seamless interaction within flows.

### Utility - Subflow - Error Screen

This subflow is designed for use in screen flows, ensuring error and fault messages are presented to end users in a clear and consistent manner.

**Inputs:**
- `errorMessage`: A user-friendly message describing the error.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Utility - Subflow - Navigate to Internal Page

Use this subflow to navigate to an internal record page, available exclusively in Lightning Experience.

**Inputs:**
- `objectApiName`: The API name of the object associated with the record (e.g., `Action__c`)
- `recordId`: The 18-character ID of the record to navigate to.
- `actionName`: The action to invoke. Supported values include `clone`, `edit`, and `view`.

**Outputs:**
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Utility - Subflow - Navigate to External Page

Use this subflow to navigate to an external page, supported exclusively in Lightning Experience.

**Inputs:**
- `url`: The URL of the external page to navigate to.
- `target`: Specifies how the URL should open:
  - `_blank`: Opens the URL in a new window or tab.
  - `_self`: Opens the URL in the same frame as the current page (default behavior).
  - `_parent`: Opens the URL in the parent frame of the current page.
  - `_top`: Opens the URL in the full body of the window, overriding any frames.

**Outputs:**
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Utility - Subflow - Get Record Types for Running User

Use this subflow to retrieve the record types that the running user has access to for a specific object.

**Inputs:**
- `objectApiName`: The API name of the object for which record type access is being checked (e.g., `Action__c`)

**Outputs:**
- `recordTypes`: A collection of record types the running user has access to for the specified object.
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Utility - Subflow - Display Toast Message

Use this subflow to display a popup toast message during flow screen navigation, supported exclusively in Lightning Experience.

**Inputs:**
- `message`: The message to display in the toast.
- `mode`: Determines the toast's persistence. The default is dismissible. Valid modes include:
  - `dismissible`: Visible until the user clicks close or 3 seconds have passed.
  - `pester`: Visible for 3 seconds and disappears automatically.
  - `sticky`: Visible until the user clicks the close button.
- `title`: The title of the toast alert.
- `variant`: Optionally specify a theme for the toast's appearance. Accepted variants are:
  - `info` (default)
  - `success`
  - `warning`
  - `error`

**Outputs:**
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Utility - Subflow - Display Modal Message

Use this subflow to display a popup modal message during flow screen navigation, supported exclusively in Lightning Experience.

**Inputs:**
- `header`: The header text to display at the top of the modal.
- `message`: A custom message or text template variable to display within the modal body.
- `title`: The title displayed above the modal's body content.
- `variant`: Optionally specify a theme for the modal's appearance. Accepted variants are:
  - `info` (default): Displays an informational modal.
  - `warning`: Displays a warning modal.
  - `error`: Displays an error modal.

**Outputs:**
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

### Case - Subflow - Run Case Assignment Rules

Use this subflow to retrieve the Case Assignment Rules for a specific Case and customize its behavior by configuring key variables.

**Important**: Assignment logic cannot be run synchronously. It must be executed in an asynchronous path or a scheduled path within a flow. Attempting to run it synchronously will result in a flow fault.

**Inputs:**
- `case`: The Case record to run assignment rules against. This must be a Case with a record ID that has already been inserted into the database.
- `triggerAutoResponseEmail`: Set to True to trigger auto-response rules, such as when a Case is created.
- `triggerOtherEmail`: Set to True to trigger emails sent outside the organization, such as notifications to Community Users for Case assignments.
- `triggerUserEmail`: Set to True to trigger emails sent within your organization, such as notification emails configured via lead assignment rules for user assignments.

**Outputs:**
- `error`: A Boolean indicating whether an error occurred.
- `errorMessage`: A user-friendly message describing the error, if one occurred.
- `faultMessage`: A message capturing details of any flow fault that occurred.

## Implementation Guidelines

### When Creating a New Subflow

1. **Identify the Reusability**: Determine if the logic will be used in multiple places or represents a distinct business function.
2. **Define Clear Interface**: Specify inputs and outputs that make the subflow self-documenting.
3. **Handle Errors**: Include appropriate error handling and return error information via outputs.
4. **Document Purpose**: Use clear naming and descriptions to explain what the subflow does and why.
5. **Test Independently**: Ensure the subflow works correctly on its own before integrating with parent flows.

### When Using Subflows in Parent Flows

1. **Call Subflow Early**: If you need to check feature flags or validate conditions, do so early in the parent flow.
2. **Handle Subflow Outputs**: Always check for errors returned from subflows and handle them appropriately.
3. **Pass Complete Context**: Provide all necessary inputs to subflows; avoid making assumptions about data availability.
4. **Maintain Clear Flow**: Keep the main flow readable by delegating complex logic to well-named subflows.

### Anti-Patterns to Avoid

1. **Over-Fragmenting**: Don't create subflows for logic used only once; wait until you see duplication.
2. **Tight Coupling**: Avoid subflows that depend heavily on parent flow context or global variables.
3. **Unclear Interfaces**: Don't use generic input names like `data1` or `value`; be specific.
4. **Missing Error Handling**: Never skip error handling in subflows; always return error status.
5. **Hidden Side Effects**: Don't create subflows that modify data unexpectedly; make all effects explicit through outputs.

