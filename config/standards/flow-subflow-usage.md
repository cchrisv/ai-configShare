# Flow Subflow Usage

## When to Use

- **Reusable logic** — common actions (email, record creation, calculations, approval, validation)
- **Complex flows** — break into smaller subflows for readability/troubleshooting/isolation
- **Error handling** — dedicated subflows for consistent exception management

## Patterns

- **Parent-Child** — main flow orchestrates; children handle specific tasks
- **Functional** — utility (formatting, calculations) and process (qualification, validation)
- **Decision-Driven** — call subflows based on conditions
- **Try-Catch** — fault path calls error-handling subflow for logging/notification

## Best Practices

- **Naming** — natural language: `Calculate how many actions were completed`
- **Inputs/Outputs** — clear parameters, minimal dependencies
- **Performance** — optimize for frequent calls and large volumes
- **Testing** — test independently AND within parent flow

## Utility Subflow Library

All return standard outputs: `error` (Boolean), `errorMessage`, `faultMessage`.

| Subflow | Purpose | Key Inputs |
|---------|---------|------------|
| **Utility - Subflow - Error Screen** | Display error/fault in screen flows | `errorMessage`, `faultMessage` |
| **Utility - Subflow - Navigate to Internal Page** | Navigate to record page (LEX) | `objectApiName`, `recordId`, `actionName` |
| **Utility - Subflow - Navigate to External Page** | Navigate to external URL (LEX) | `url`, `target` |
| **Utility - Subflow - Get Record Types for Running User** | Accessible record types | `objectApiName` → `recordTypes` |
| **Utility - Subflow - Display Toast Message** | Popup toast (LEX) | `message`, `title`, `mode`, `variant` |
| **Utility - Subflow - Display Modal Message** | Popup modal (LEX) | `header`, `message`, `title`, `variant` |
| **Case - Subflow - Run Case Assignment Rules** | Case assignment ⚠️ **async only** | `case`, `triggerAutoResponseEmail`, `triggerOtherEmail`, `triggerUserEmail` |

## Implementation

**Create:** identify reusability → define interface (inputs/outputs) → handle errors (return error info) → document → test independently.

**Use in parents:** call early (feature flags, validation) → check error outputs → pass complete context.

**Anti-patterns:** over-fragmenting one-time logic · tight coupling to parent context · unclear interfaces (`data1` → specific names) · missing error handling · hidden side effects.
