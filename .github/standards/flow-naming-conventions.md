---
standard_type: flow
category: naming
version: 1.0
last_updated: 2025-11-02
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/9595/Flow-Building-Naming-conventions
applies_to: salesforce, flow, naming, automation
---

# Flow Building Naming Conventions

We use naming conventions for flows and their elements to improve readability. Consistent natural language names make the flow easy to read. Coded or acronym-heavy names make it hard for new team members to understand the flow.

## Flow Naming Conventions

- Object names are capitalized (i.e., Lead, Contact, Task)
- First word of the description is capitalized, but all other words are lower-case (i.e., Check if eligible to delete)

| Flow Type | Naming Convention | Example |
| --- | --- | --- |
| Record-Triggered Flow | Before Save | `<Object Name> - Before - <Short Yet Meaningful Description>` | `Account- Before - Status change` |
| Record-Triggered Flow | After-Save | `<Object Name> - After - <Short Yet Meaningful Description>` | `Account - After - Status change` |
| Record-Triggered Flow | Before-Delete | `<Object Name> - Delete - <Short Yet Meaningful Description>` | `Account - Delete – Check if eligible to delete` |
| Schedule-Triggered Flow | | `<Object Name> - Scheduled - <Short Yet Meaningful Description>` | `Account - Scheduled - Close old accounts` |
| Autolaunched Flow (If Subflow) | | `<Object Name> - Subflow - <Short Yet Meaningful Description>` | `Account - Subflow - Format names` |
| Autolaunched Flow | | `<Object Name> - <Short Yet Meaningful Description>` | `Account - Format names` |
| Platform Event-Triggered Flow | | `<Event Name> - After - <Short Yet Meaningful Description>` | `Account Creation - After - Process new account` |
| Screen Flow | | `<Object Name> - Screen - <Short Yet Meaningful Description>` | `Account - Screen - Create new account` |

## Resources Naming Conventions

- Use camel case

| Data Type | Type | Naming Convention | Examples |
| --- | --- | --- | --- |
| Boolean | Variable | `shortDescription` | `optIn` |
| Currency | Variable | `shortDescription` | `currentPrice` |
| Date | Variable | `shortDescription` | `today` |
| DateTime | Variable | `shortDescription` | `startDateTime` |
| Multi-Select Picklist | Variable | `shortDescription` | `spokenLanguages` |
| Number | Variable | `shortDescription` | `count` |
| Picklist | Variable | `shortDescription` | `status` |
| Record Collection Variable | Variable | `objectsShortDescription` | `accountsUpdated` |
| Record Variable | Variable | `objectShortDescription` | `accountUpdated` |
| Text | Variable | `shortDescription` | `name` |
| Constant | Constant | `shortDescription` | `yes` |
| Boolean | Formula | `shortDescription` | `hasEnrolled` |
| Currency | Formula | `shortDescription` | `newPrice` |
| Date | Formula | `shortDescription` | `tomorrow` |
| DateTime | Formula | `shortDescription` | `nextStartDateTime` |
| Number | Formula | `shortDescription` | `updatedCount` |
| Text | Formula | `shortDescription` | `fullName` |
| Text Template | Text Template | `shortDescription` | `disclaimer` |
| Choice | Choice | `shortDescription` | `menu` |
| Record Choice Set | Record Choice Set | `shortDescription` | `accountSelected` |
| Picklist Choice Set | Picklist Choice Set | `shortDescription` | `servedBy` |
| Collection Choice Set | Collection Choice Set | `shortDescription` | `questions` |
| Stage | Stage | `shortDescription` | `steps` |

## Data Elements Naming Conventions

- Object names are capitalized (i.e., Lead, Contact, Task)
- First word of the element is capitalized, but all other words are lower-case (i.e., Get active Lead)

| Element Type | Naming Convention | Examples |
| --- | --- | --- |
| Create Records | `Create <Object> <Short Description>` | `Create Contact for new student` |
| Delete Records | `Delete <Object> <Short Description>` | `Delete canceled Events` |
| Get Records | `Get <Object> <Short Description>` | `Get active Lead` |
| Update Records | `Update <Object> <Short Description>` | `Update Account status` |
| Roll Back Records | `Rollback <Object> <Short Description>` | `Rollback canceled Events` |
| Transform | `Transform <Short Description>` | `Transform Leads into Contacts` |

## Logic Elements Naming Conventions

- If only API names are used, such as screen components, camel case should be used.
- For descriptions, the object name and first word should be capitalized, but all other words should be lower-case.

| Element Type | Naming Convention | Examples |
| --- | --- | --- |
| Screen | `Screen # - <Short Description>` | `Screen 1 - Student degree information` |
| Screen Components | `screen#ShortDescription` | `screen1FirstName` |
| Action | `<Short Description>` | `Calculate business hours` |
| Subflow | `<Short Description>` | `Evaluate Lead score` |

## Interaction Elements Naming Conventions

- Object names are capitalized (i.e., Lead, Contact, Task)
- First word of the description is capitalized, but all other words are lower-case (i.e., Check if eligible to delete)

| Element Type | Naming Convention | Examples |
| --- | --- | --- |
| Assignment – Record Variable | `Set <variable> Values <Short Description>` | `Set Account values for new student` |
| Loop | `Loop through <Collection>` | `Loop through overdue Tasks` |
| Collection Sort | `Sort <Collection>` | `Sort Tasks by due date` |
| Custom Error Message | `<Short Description>` | `Error when child Case not closed` |

## Decision Element Naming Conventions

- Object names are capitalized (i.e., Lead, Contact, Task)
- First word of the description is capitalized, but all other words are lower-case (i.e., Check if eligible to delete)

### Two Branches

If a decision results in only two branches, it is ideal to turn it into a simple Yes or No question to make it easier to understand or follow. Additionally, the default path should be given a proper label.

| Element Type | Naming Convention | Examples |
| --- | --- | --- |
| Decision | `<Question>` | `Is the Task overdue?` |
| Decision Outcome Label | `<Answer>` | `Yes`<br>`No` |
| Decision Outcome API | `<Answer>` | `Yes_the_task_was_overdue`<br>`No_the_task_was_not_overdue` |

### More Than Two Branches

If a decision results in more than two branches, the labels on the paths should provide descriptive answers. Keep the labels short, as the flow canvas may cut off longer text, making it harder to read. Additionally, the default path should be given a proper label.

| Element Type | Naming Convention | Examples |
| --- | --- | --- |
| Decision | `<Question>` | `What is the tasks status?` |
| Decision Outcome Label | `<Short Answer>` | `In Progress` |
| Decision Outcome API | `< Short Answer>` | `In_Progress` |

## Key Principles

### Use Natural Language

- Avoid abbreviations and acronyms when possible
- Use complete words that clearly describe the purpose
- Make names self-documenting

### Consistency Matters

- Follow the established patterns consistently
- If you establish a naming pattern, stick to it throughout the flow
- Use the same terminology across related flows

### Capitalization Rules

- **Object Names**: Always capitalize (Account, Contact, Lead)
- **Flow Names**: Capitalize first word, lowercase others (Update loyalty status)
- **Variable Names**: Use camelCase (customerAccountStatus)
- **Element Descriptions**: Capitalize object name and first word, lowercase others

### Examples of Good Naming

```
Flow Name: Account - After - Update loyalty status
Variable: accountsEligibleForUpgrade
Decision: Has customer met loyalty requirements?
Outcome: Yes - Upgrade tier
Element: Get active Opportunities for Account
```

### Examples of Poor Naming

```
Flow Name: AcctProc
Variable: var1
Decision: Decision1
Outcome: Path1
Element: Get Rec1
```

## Benefits of Consistent Naming

1. **Improved Readability**: Team members can quickly understand what flows and elements do
2. **Faster Onboarding**: New team members learn flows faster when names are self-explanatory
3. **Reduced Errors**: Clear names prevent misunderstandings that lead to bugs
4. **Better Maintenance**: Well-named flows are easier to update and modify
5. **Enhanced Collaboration**: Consistent naming creates a shared language for the team

