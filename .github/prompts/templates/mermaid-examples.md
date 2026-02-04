# Mermaid Diagram Examples for Azure DevOps Wiki

## Quick Reference - Azure DevOps Compatible Mermaid Syntax

### Basic Process Flow (graph TD)
```
::: mermaid
graph TD
  start[User Initiates]
  process[System Processes]
  decision{{Validation Check}}
  success[Success Path]
  error[Error Handler]
  
  start --> process
  process --> decision
  decision -->|Pass| success
  decision -->|Fail| error
:::
```

### Sequence Diagram (API Integration)
```
::: mermaid
sequenceDiagram
  participant User
  participant Salesforce
  participant ApexClass
  participant ExternalAPI
  participant Database
  
  User->>Salesforce: Submit Form
  Salesforce->>ApexClass: Trigger Handler
  ApexClass->>ExternalAPI: HTTP Callout
  ExternalAPI-->>ApexClass: JSON Response
  ApexClass->>Database: Update Record
  Database-->>Salesforce: Success
  Salesforce-->>User: Confirmation
:::
```

### State Diagram (Record Lifecycle)
```
::: mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted
  Submitted --> InReview
  InReview --> Approved
  InReview --> Rejected
  InReview --> Draft
  Rejected --> Draft
  Approved --> Active
  Active --> Closed
  Closed --> [*]
:::
```

### Entity Relationship Diagram (Data Model)
```
::: mermaid
erDiagram
  Account ||--o{ Contact : "has contacts"
  Account ||--o{ Opportunity : "has opportunities"
  Account ||--o{ Case : "has cases"
  
  Contact }o--|| Lead : "converts from"
  Contact ||--o{ Case : "raises"
  
  Opportunity ||--|{ OpportunityLineItem : "contains"
  Product2 ||--o{ OpportunityLineItem : "references"
  
  Account {
    string Name
    string Type
    string Industry
    date CreatedDate
  }
  
  Contact {
    string FirstName
    string LastName
    string Email
    string Phone
  }
  
  Opportunity {
    string Name
    decimal Amount
    date CloseDate
    string StageName
  }
:::
```

### Class Diagram (Apex Architecture)
```
::: mermaid
classDiagram
  class TriggerHandler {
    <<abstract>>
    +beforeInsert()
    +afterInsert()
    +beforeUpdate()
    +afterUpdate()
  }
  
  class AccountTriggerHandler {
    +beforeInsert()
    +afterInsert()
    -validateAccount()
    -updateRelatedRecords()
  }
  
  class AccountService {
    +createAccount()
    +updateAccount()
    +deleteAccount()
    -businessLogic()
  }
  
  class AccountRepository {
    +query()
    +insert()
    +update()
    +delete()
  }
  
  TriggerHandler <|-- AccountTriggerHandler
  AccountTriggerHandler --> AccountService
  AccountService --> AccountRepository
:::
```

### User Journey Map
```
::: mermaid
journey
  title Lead Conversion Process
  section Discovery
    Visit Website: 5: Prospect
    Fill Form: 4: Prospect
    Receive Email: 5: Prospect
  section Engagement
    Sales Contact: 3: Lead
    Demo Scheduled: 4: Lead
    Demo Completed: 5: Lead
  section Conversion
    Proposal Sent: 4: Opportunity
    Negotiate Terms: 3: Opportunity
    Contract Signed: 5: Customer
  section Onboarding
    Account Setup: 4: Customer
    Training Complete: 5: Customer
    Go Live: 5: Customer
:::
```

### Gantt Chart (Implementation Timeline)
```
::: mermaid
gantt
  title Implementation Timeline
  dateFormat YYYY-MM-DD
  
  section Phase 1 - Design
  Requirements Gathering    :done, req, 2025-01-01, 5d
  Technical Design         :done, design, after req, 7d
  Security Review          :active, review, after design, 3d
  
  section Phase 2 - Development
  Core Functionality       :dev1, after review, 10d
  Integration Layer        :dev2, after dev1, 7d
  Unit Testing            :test1, after dev2, 5d
  
  section Phase 3 - Deployment
  Sandbox Deploy          :sandbox, after test1, 2d
  UAT Testing             :uat, after sandbox, 7d
  Production Deploy       :prod, after uat, 1d
  
  section Phase 4 - Post-Launch
  Monitoring             :monitor, after prod, 14d
  Optimization           :optimize, after monitor, 7d
:::
```

### Current State vs Future State (Use Separate Diagrams)
```
::: mermaid
graph LR
  cs1[User Email Request] --> cs2[Manual Spreadsheet]
  cs2 --> cs3[Email Back And Forth]
  cs3 --> cs4[Manual Data Entry]
  cs4 --> cs5[(Salesforce)]
:::

::: mermaid
graph LR
  fs1[User Web Form] --> fs2[Automated Validation]
  fs2 --> fs3[Flow Automation]
  fs3 --> fs4[(Salesforce)]
  fs4 --> fs5[Auto Notification]
:::
```

### Alternative Headings
Add headings in Markdown, not inside the diagram, to label each diagram.

## Node Shape Reference

| Shape | Syntax | Use Case |
|-------|--------|----------|
| Rectangle | `["Label"]` | Standard process/action |
| Rounded | `(["Label"])` | Start/End events |
| Stadium | `(["Label"])` | Alternative start/end |
| Rhombus | `{{"Label"}}` | Decision/branching |
| Subroutine | `[["Label"]]` | Sub-process/module |
| Cylindrical | `[("Label")]` | Database/storage |
| Circle | `(("Label"))` | Connection point |
| Asymmetric | `>"Label"]` | Flag/marker |
| Hexagon | `{{"Label"}}` | Preparation step |

## Styling Notes
Azure DevOps Wiki does not support custom styling (`classDef`) or theme init blocks. Use default Mermaid styling.

## Common Mistakes to Avoid

### ❌ WRONG - Flowchart keyword
```
flowchart TD
  A --> B
```

### ✅ CORRECT - Graph keyword
```
graph TD
  A --> B
```

### ❌ WRONG - Long arrow syntax
```
graph TD
  A ----> B
```

### ✅ CORRECT - Standard arrow
```
graph TD
  A --> B
```

<!-- Removed color examples: classDef not supported in Azure DevOps Wiki -->

### ❌ WRONG - Complex node IDs
```
graph TD
  my-node-1["Label"]
  another_node_2["Label"]
```

### ✅ CORRECT - Simple node IDs
```
graph TD
  nodeone["Label"]
  nodetwo["Label"]
```

### ❌ WRONG - Font Awesome icons
```
graph TD
  A["fas:fa-user User"]
```

### ✅ CORRECT - Emoji or plain text
```
graph TD
  A["👤 User"]
```

## Testing Checklist

Before finalizing any diagram:
- [ ] Uses `::: mermaid` fencing (not ``` mermaid)
- [ ] Uses `graph` not `flowchart`
- [ ] Node IDs are simple (letters preferred)
- [ ] Labels are under 25 characters
- [ ] No Font Awesome icons
- [ ] No HTML tags
- [ ] Colors have no quotes
- [ ] No long arrow syntax `---->`
- [ ] No subgraphs in flowcharts
- [ ] Preview renders correctly in Azure DevOps

---

**Last Updated:** 2025-11-04  
**Purpose:** Quick reference for creating Azure DevOps-compatible Mermaid diagrams
