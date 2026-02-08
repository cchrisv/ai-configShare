# Flow Naming Conventions

Natural language naming. Object names capitalized · first word of description capitalized, rest lower-case · no codes/abbreviations.

## Flow Names

| Flow Type | Convention | Example |
|-----------|-----------|---------|
| Record-Triggered (Before) | `<Object> - Before - <Description>` | `Account - Before - Status change` |
| Record-Triggered (After) | `<Object> - After - <Description>` | `Account - After - Status change` |
| Record-Triggered (Delete) | `<Object> - Delete - <Description>` | `Account - Delete - Check if eligible to delete` |
| Schedule-Triggered | `<Object> - Scheduled - <Description>` | `Account - Scheduled - Close old accounts` |
| Subflow | `<Object> - Subflow - <Description>` | `Account - Subflow - Format names` |
| Autolaunched | `<Object> - <Description>` | `Account - Format names` |
| Platform Event | `<Event> - After - <Description>` | `Account Creation - After - Process new account` |
| Screen Flow | `<Object> - Screen - <Description>` | `Account - Screen - Create new account` |

## Resources (camelCase)

| Type | Convention | Example |
|------|-----------|---------|
| Variable | `shortDescription` | `optIn`, `currentPrice`, `count` |
| Record Collection | `objectsShortDescription` | `accountsUpdated` |
| Record Variable | `objectShortDescription` | `accountUpdated` |
| Constant / Formula / Text Template / Choice | `shortDescription` | `hasEnrolled`, `newPrice`, `disclaimer` |

## Data Elements

| Element | Convention | Example |
|---------|-----------|---------|
| Create / Delete / Get / Update Records | `<Action> <Object> <Description>` | `Create Contact for new student` |
| Roll Back Records | `Rollback <Object> <Description>` | `Rollback canceled Events` |
| Transform | `Transform <Description>` | `Transform Leads into Contacts` |

## Logic & Interaction Elements

| Element | Convention | Example |
|---------|-----------|---------|
| Screen | `Screen # - <Description>` | `Screen 1 - Student degree information` |
| Screen Components | `screen#ShortDescription` (camelCase) | `screen1FirstName` |
| Action / Subflow | `<Description>` | `Calculate business hours` |
| Assignment | `Set <variable> Values <Description>` | `Set Account values for new student` |
| Loop | `Loop through <Collection>` | `Loop through overdue Tasks` |
| Collection Sort | `Sort <Collection>` | `Sort Tasks by due date` |
| Custom Error | `<Description>` | `Error when child Case not closed` |

## Decision Elements

**Two branches** — Yes/No question. Default path must have a label.
- Decision: `Is the Task overdue?` → Outcomes: `Yes` / `No` (API: `Yes_the_task_was_overdue`)

**3+ branches** — descriptive short answers. Keep labels short.
- Decision: `What is the tasks status?` → Outcomes: `In Progress` / `In_Progress`

## Capitalization

Objects Capitalized (`Account`) · Flow names first-word capitalized (`Update loyalty status`) · Variables camelCase (`customerAccountStatus`) · Elements: Object + first word capitalized (`Get active Opportunities for Account`)
