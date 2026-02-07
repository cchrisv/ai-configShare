````markdown
---
standard_type: async_processing
category: architecture
version: 1.1
last_updated: 2025-12-03
source_url: https://architect.salesforce.com/decision-guides/async-processing
framework_source: https://architect.salesforce.com/decision-guides/step_based_async_framework
mass_action_scheduler: https://github.com/sfdx-mass-action-scheduler/sfdx-mass-action-scheduler
applies_to: salesforce, apex, batch, queueable, future, platform-events, flows, mass-action-scheduler
---

# Asynchronous Processing Standards

## Overview

Asynchronous processing increases scalability by allowing higher limits per context. Asynchronous requests execute in their own threads behind the scenes, enabling users to continue working while tasks execute in the background. This standard defines how we design, implement, and monitor asynchronous processing on the Salesforce Platform.

## Key Principles

### 1. Async-First for Scale

Modern Salesforce architectures should embrace an asynchronous-first approach when:
- Processing large data volumes (thousands to millions of records)
- Performing complex integrations with multiple external systems
- Running operations that don't require immediate user feedback
- Building systems that need to scale horizontally within Salesforce

### 2. Understand the Limitations

Before using asynchronous processing, understand these critical constraints:

| Constraint | Description |
|------------|-------------|
| **No SLA** | Asynchronous processes have no guaranteed completion time |
| **Variable Latency** | Response times can vary significantly between executions |
| **Governor Limits** | Subject to daily limits and fair usage algorithms |
| **Finite Resources** | Platform has limited asynchronous threads available |

### 3. Choose the Right Tool

Different asynchronous tools serve different purposes. Select based on your specific requirements:

| Tool | Best For | Skills Required | Licensing |
|------|----------|-----------------|-----------|
| **Scheduled Flows** | Batch record processing via Flow | Low-code | No additional |
| **Asynchronous Flows** | Record-triggered async operations | Low-code | No additional |
| **Mass Action Scheduler** | Declarative batch processing with flexible data sources | Low-code | No additional (open source) |
| **Queueable Apex** | Long-running database operations, callouts, job chaining | Pro-code | No additional |
| **Batch Apex** | Complex pro-code batch processing | Pro-code | No additional |
| **Scheduled Apex** | Time-based executions (cron-driven) | Pro-code | No additional |
| **Platform Events** | Loose coupling, event-driven communication | Low-code + Pro-code | Add-on for high volume |

## Queueable Apex (Preferred)

### When to Use

Queueable Apex is the preferred approach for asynchronous Apex processing. It supersedes `@future` methods and offers these advantages:

- **Job IDs**: Track and monitor progress via `AsyncApexJob`
- **Non-primitive types**: Pass complex objects (sObjects, custom classes)
- **Job chaining**: Start subsequent jobs from running jobs
- **Maximum depth control**: Prevent unexpected recursion
- **Deduplication signatures**: Detect and remove duplicate jobs
- **Configurable delay**: Delay execution up to 10 minutes
- **Transaction finalizers**: Handle post-job actions and retry logic

### Implementation Pattern

```apex
public class AccountProcessingQueueable implements Queueable, Database.AllowsCallouts {
    
    private List<Id> accountIds;
    private Integer retryCount;
    
    public AccountProcessingQueueable(List<Id> accountIds) {
        this.accountIds = accountIds;
        this.retryCount = 0;
    }
    
    public void execute(QueueableContext context) {
        Logger.setScenario('Account Processing');
        Logger.info('Processing {0} accounts', new List<Object>{ accountIds.size() });
        
        try {
            // Attach finalizer for retry handling
            System.attachFinalizer(new AccountProcessingFinalizer(this));
            
            List<Account> accounts = [
                SELECT Id, Name, Industry 
                FROM Account 
                WHERE Id IN :accountIds
                WITH SECURITY_ENFORCED
            ];
            
            // Process accounts
            processAccounts(accounts);
            
        } catch (Exception e) {
            Logger.error('Failed to process accounts', e);
            throw e; // Re-throw to trigger finalizer
        } finally {
            Logger.saveLog();
        }
    }
    
    private void processAccounts(List<Account> accounts) {
        // Business logic here
    }
}
```

### Transaction Finalizers

Use transaction finalizers to handle job completion, including retry logic:

```apex
public class AccountProcessingFinalizer implements Finalizer {
    
    private static final Integer MAX_RETRIES = 5;
    private AccountProcessingQueueable parentJob;
    
    public AccountProcessingFinalizer(AccountProcessingQueueable parentJob) {
        this.parentJob = parentJob;
    }
    
    public void execute(FinalizerContext context) {
        switch on context.getResult() {
            when UNHANDLED_EXCEPTION {
                handleFailure(context);
            }
            when SUCCESS {
                Logger.info('Account processing completed successfully');
            }
        }
        Logger.saveLog();
    }
    
    private void handleFailure(FinalizerContext context) {
        if (parentJob.retryCount < MAX_RETRIES) {
            parentJob.retryCount++;
            Logger.warn('Retrying account processing. Attempt: {0}', 
                       new List<Object>{ parentJob.retryCount });
            System.enqueueJob(parentJob);
        } else {
            Logger.error('Max retries exceeded for account processing', 
                        context.getException());
        }
    }
}
```

### Best Practices for Queueable

**DO:**
- Use Queueable instead of `@future` methods for all new development
- Implement `Database.AllowsCallouts` when making external calls
- Attach finalizers for retry logic and cleanup operations
- Use `System.AsyncOptions` for deduplication and delayed execution
- Log async context using Nebula Logger's `Logger.setAsyncContext()`

**DON'T:**
- Enqueue from actions generated by large volumes of end-user activity
- Enqueue more than one async action per synchronous action
- Create batches with very small scope sizes or fast processing times
- Rely on immediate execution—async has no SLA

## Batch Apex

### When to Use

Use Batch Apex for:
- Processing large record sets (thousands to millions of records)
- Complex operations requiring extended processing time
- Operations that should run during off-peak hours
- Scenarios requiring batch-level transaction isolation

### Implementation Pattern

```apex
public class AccountCleanupBatch implements Database.Batchable<SObject>, Database.Stateful {
    
    private Integer recordsProcessed = 0;
    private Integer errorsEncountered = 0;
    
    public Database.QueryLocator start(Database.BatchableContext bc) {
        Logger.setScenario('Account Cleanup Batch');
        Logger.info('Starting batch job: {0}', new List<Object>{ bc.getJobId() });
        Logger.saveLog();
        
        return Database.getQueryLocator([
            SELECT Id, Name, LastModifiedDate 
            FROM Account 
            WHERE LastModifiedDate < LAST_N_YEARS:2
            WITH SECURITY_ENFORCED
        ]);
    }
    
    public void execute(Database.BatchableContext bc, List<Account> scope) {
        Logger.setAsyncContext(bc);
        
        List<Database.DeleteResult> results = Database.delete(scope, false);
        
        for (Integer i = 0; i < results.size(); i++) {
            if (results[i].isSuccess()) {
                recordsProcessed++;
            } else {
                errorsEncountered++;
                Logger.error('Failed to delete account', scope[i].Id, 
                            results[i].getErrors()[0]);
            }
        }
        
        Logger.saveLog();
    }
    
    public void finish(Database.BatchableContext bc) {
        Logger.setAsyncContext(bc);
        Logger.info('Batch completed. Processed: {0}, Errors: {1}', 
                   new List<Object>{ recordsProcessed, errorsEncountered });
        Logger.saveLog();
    }
}
```

### Batch Apex Considerations

| Consideration | Guidance |
|---------------|----------|
| **Scope Size** | Default 200 records; avoid very small scopes to prevent queue flooding |
| **Concurrent Jobs** | Maximum 5 simultaneous batch jobs |
| **Flex Queue** | Maximum 100 jobs in the flex queue |
| **Scheduling** | Use `System.scheduleBatch()` for scheduled batch execution |
| **Error Handling** | Implement `BatchApexErrorEvent` for error notifications |
| **Callouts** | Implement `Database.AllowsCallouts` interface |

### Avoid These Anti-Patterns

```apex
// BAD: Enqueueing batch from trigger with no safeguards
trigger AccountTrigger on Account (after insert) {
    Database.executeBatch(new SomeBatch()); // Can exhaust flex queue!
}

// GOOD: Use scheduling with proper safeguards
public class BatchScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        // Check if previous batch is still running
        List<AsyncApexJob> runningJobs = [
            SELECT Id FROM AsyncApexJob 
            WHERE ApexClass.Name = 'AccountCleanupBatch'
            AND Status IN ('Queued', 'Preparing', 'Processing')
        ];
        
        if (runningJobs.isEmpty()) {
            Database.executeBatch(new AccountCleanupBatch());
        }
    }
}
```

## Step-Based Async Framework

### Overview

For complex, multi-step asynchronous workflows, implement a step-based framework that:
- Breaks work into independently executable steps
- Enables predictable performance and safer retries
- Provides full operational visibility through centralized logging
- Scales horizontally within Salesforce without off-platform orchestration

### Step Interface

```apex
public interface Step {
    void execute();
    void finalize();
    String getName();
    Boolean shouldRestart();
}
```

### Step Processor Pattern

```apex
public class StepProcessor implements Queueable, Finalizer, Database.AllowsCallouts {
    
    private final List<Step> steps = new List<Step>();
    private Step currentStep;
    
    public void execute(QueueableContext context) {
        this.currentStep = this.currentStep ?? this.steps.remove(0);
        
        if (context != null) {
            System.attachFinalizer(this);
            Logger.setAsyncContext(context);
        }
        
        Logger.info('Executing step: {0}', new List<Object>{ this.currentStep.getName() });
        
        try {
            this.currentStep.execute();
        } catch (Exception e) {
            Logger.error('Step execution failed', e);
            throw e;
        }
        
        Logger.saveLog();
    }
    
    public void execute(FinalizerContext context) {
        Logger.info('Finalizing step: {0}', new List<Object>{ this.currentStep.getName() });
        
        switch on context.getResult() {
            when UNHANDLED_EXCEPTION {
                Logger.error('Unhandled exception in step', context.getException());
            }
            when SUCCESS {
                this.currentStep.finalize();
                
                if (this.currentStep.shouldRestart()) {
                    kickoff();
                } else if (!this.steps.isEmpty()) {
                    this.currentStep = this.steps.remove(0);
                    kickoff();
                }
            }
        }
        
        Logger.saveLog();
    }
    
    public String kickoff() {
        return this.steps.isEmpty() ? null : System.enqueueJob(this);
    }
}
```

### Cursor-Based Processing

For high-volume processing, use Apex Cursors within the step framework:

```apex
public abstract class CursorStep implements Step {
    
    private static final Integer MAX_CHUNK_SIZE = 2000;
    protected Database.Cursor cursor;
    private Integer chunkSize = Limits.getLimitDMLRows();
    private Integer position = 0;
    
    protected abstract Database.Cursor getCursor();
    protected abstract void innerExecute(List<SObject> records);
    public abstract String getName();
    
    public void execute() {
        this.cursor = this.cursor ?? this.getCursor();
        List<SObject> records = this.cursor.fetch(this.position, this.chunkSize);
        this.innerExecute(records);
        this.position += this.chunkSize;
    }
    
    public Boolean shouldRestart() {
        return this.position < this.cursor.getNumRecords();
    }
    
    public void finalize() {
        Logger.info('Cursor step completed: {0}', new List<Object>{ getName() });
    }
}
```

### When to Use Step-Based Framework

**Use this framework when:**
- Processing large Salesforce record sets on a schedule
- Breaking down processing into discrete, independently executable steps
- Building hierarchical or tree-based record processing
- Needing observability and governance across long-running processes

**Don't use this framework when:**
- Creating/updating records requires immediate recalculation
- External systems host primary data (consider Bulk API integration instead)
- Simple single-step async operations suffice

## Platform Events

### When to Use

Platform Events are ideal for:
- Loosely coupling Salesforce with external systems
- Event-driven communication between async components
- High-volume outbound integrations (with middleware)
- Processing that should survive transaction rollback (logging)

### Implementation Pattern

```apex
// Publishing events
public class LeadConversionService {
    
    public static void convertLeads(List<Lead> leads) {
        List<Lead_Converted__e> events = new List<Lead_Converted__e>();
        
        for (Lead l : leads) {
            events.add(new Lead_Converted__e(
                Lead_Id__c = l.Id,
                Converted_Date__c = System.today()
            ));
        }
        
        List<Database.SaveResult> results = EventBus.publish(events);
        
        for (Database.SaveResult sr : results) {
            if (!sr.isSuccess()) {
                Logger.error('Failed to publish event', sr.getErrors()[0]);
            }
        }
    }
}

// Subscribing to events (Platform Event Trigger)
trigger LeadConvertedTrigger on Lead_Converted__e (after insert) {
    LeadConvertedEventHandler.handle(Trigger.new);
}
```

### Publish Behavior

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Publish After Commit** | Events published after transaction commits | Standard use; guarantees ordering |
| **Publish Immediately** | Events published during transaction | Logging; captures even if transaction rolls back |

### Platform Event Considerations

- Events are published to the event bus asynchronously
- Trigger/Flow batch size affects processing—choose carefully
- Subject to platform event limits (daily delivery allocations)
- Consider parallel subscriptions for high-volume custom events
- Callouts are NOT allowed from platform event triggers

## Scheduled Flows (Preferred for Simple Batch Operations)

### When to Use

Scheduled Flows are the **preferred first choice** for batch processing when:
- Daily or weekly batch processing via declarative tools
- Admin-configurable scheduled operations
- Operations that benefit from Flow's metadata-driven approach
- Teams with limited Apex resources
- Processing requirements are straightforward with standard Flow elements

### Best Practices

1. **Environment Gating**: Add a Decision element to check `{!$Api.Enterprise_Server_URL_100}` to prevent unintended execution in sandboxes

2. **Fault Handling**: Always add fault paths wired to Nebula Logger

3. **Batch Size Awareness**: Scheduled flows process 200 records per invocation with concurrent threads for larger sets

### Example Flow Structure

```
[Start (Scheduled)]
    ↓
[Decision: Is Production Environment?]
    ↓ Yes                    ↓ No
[Pause Element]              [End]
    ↓
[Get Records]
    ↓
[Loop Through Records]
    ↓
[Update Records]
    ↓
[Fault Path → Log Entry Action]
```

### When to Escalate to Mass Action Scheduler

Consider Mass Action Scheduler when:
- You need flexible data sources (Reports, List Views, SOQL, custom Apex)
- Field mapping between source and target is required
- You need execution logging and monitoring out of the box
- Complex scheduling requirements beyond Flow's capabilities

## Mass Action Scheduler (Preferred for Advanced Declarative Batch)

### Overview

Mass Action Scheduler (MAS) is an open-source declarative automation platform that bridges the gap between Flow-based processing and custom Batch Apex. It enables administrators to schedule batch automation against records from various data sources without writing custom code.

**Key Benefits:**
- **Declarative Configuration**: Point-and-click setup without Apex development
- **Flexible Data Sources**: Reports, List Views, SOQL queries, or custom Apex iterables
- **Multiple Target Actions**: Flows, Quick Actions, Email Alerts, Invocable Apex, Anonymous Apex
- **Built-in Monitoring**: Execution logs and Platform Event-based status updates
- **Admin-Friendly**: Full UI for configuration, scheduling, and monitoring

### When to Use Mass Action Scheduler

MAS is the **preferred choice** when Scheduled Flows are insufficient and before resorting to Batch Apex:

| Use MAS When | Use Batch Apex Instead When |
|--------------|-----------------------------|
| Data source is a Report or List View | Complex transaction control needed |
| Need to invoke existing Flows/Actions | Custom retry logic required |
| Admin team will maintain the automation | Cursor-based high-volume processing |
| Built-in logging/monitoring is desired | Integration with Step-Based Framework |
| No Apex development resources available | CPU-intensive calculations per record |

### Data Sources

MAS supports four data source types:

| Source Type | Configuration Field | Best For |
|-------------|--------------------|-----------|
| **Reports** | `Source_Report_ID__c` | Leveraging existing reports with complex filters |
| **List Views** | `Source_List_View_ID__c` | Using predefined list view filters |
| **SOQL** | `Source_SOQL_Query__c` | Custom query logic with full SOQL flexibility |
| **Apex** | Custom Apex class | Complex data sources or external system data |

### Target Actions

MAS can execute these automation types:

| Target Type | Use Case | Configuration |
|-------------|----------|---------------|
| **Flow** | Auto-launched Flows with input variables | `Target_Action_Name__c` |
| **Quick Action** | Object-specific create/update actions | `Target_SObject_Type__c` + `Target_Action_Name__c` |
| **Email Alert** | Bulk email notifications | `Target_SObject_Type__c` + `Target_Action_Name__c` |
| **Workflow** | Legacy workflow rule execution | `ContextId` mapping only |
| **Invocable Apex** | `@InvocableMethod` execution | `Target_Action_Name__c` |
| **Anonymous Apex** | Custom Apex script execution | `Target_Apex_Script__c` |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mass Action Scheduler                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Data Sources    │    │ Target Actions  │                     │
│  │ ─────────────── │    │ ─────────────── │                     │
│  │ • Reports       │───►│ • Flows         │                     │
│  │ • List Views    │    │ • Quick Actions │                     │
│  │ • SOQL Queries  │    │ • Email Alerts  │                     │
│  │ • Custom Apex   │    │ • Invocable Apex│                     │
│  └─────────────────┘    └─────────────────┘                     │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────┐                    │
│  │        Field Mapping Layer              │                    │
│  │  Mass_Action_Mapping__c records         │                    │
│  └─────────────────────────────────────────┘                    │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────┐                    │
│  │        Batch Execution Engine           │                    │
│  │  MA_*SourceBatchable classes            │                    │
│  └─────────────────────────────────────────┘                    │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────┐                    │
│  │        Monitoring & Logging             │                    │
│  │  Mass_Action_Log__c + Platform Events   │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration Example

**Scenario**: Process all Opportunities closing this month and invoke a Flow to send reminder emails.

1. **Create Configuration Record** (`Mass_Action_Configuration__c`):
   - Name: "Monthly Close Reminder"
   - Source Type: Report
   - Source Report ID: [Your Report ID]
   - Target Type: Flow
   - Target Action Name: `Send_Close_Reminder_Flow`

2. **Create Field Mappings** (`Mass_Action_Mapping__c`):
   - Map `OPPORTUNITY_ID` → `recordId` (Flow input)
   - Map `OWNER_ID` → `ownerId` (Flow input)

3. **Schedule Execution**:
   - Configure cron schedule for weekly execution
   - Enable email notifications for job completion

### Best Practices for Mass Action Scheduler

**DO:**
- Use Reports or List Views when filters already exist
- Leverage Field Mappings for flexible source-to-target mapping
- Enable execution logging for troubleshooting
- Use Platform Event notifications for real-time status monitoring
- Test configurations in sandbox before production deployment

**DON'T:**
- Use MAS for real-time/synchronous processing needs
- Bypass MAS's built-in logging (valuable for debugging)
- Use Anonymous Apex target when Invocable Apex is possible (harder to test)
- Schedule overlapping jobs that process the same records

### Integration with Existing Patterns

MAS works well with our other standards:

```apex
// Example: Invocable Apex target action with Nebula Logger
public class ProcessOpportunityAction {
    
    @InvocableMethod(label='Process Opportunity for MAS')
    public static void processOpportunities(List<OpportunityInput> inputs) {
        Logger.setScenario('MAS Opportunity Processing');
        
        try {
            for (OpportunityInput input : inputs) {
                // Process each opportunity
                Logger.debug('Processing Opportunity: {0}', 
                            new List<Object>{ input.opportunityId });
            }
        } catch (Exception e) {
            Logger.error('Failed to process opportunities', e);
            throw e;
        } finally {
            Logger.saveLog();
        }
    }
    
    public class OpportunityInput {
        @InvocableVariable(required=true)
        public Id opportunityId;
        
        @InvocableVariable
        public Id ownerId;
    }
}
```

### Monitoring MAS Executions

MAS provides built-in monitoring via:

1. **Mass_Action_Log__c**: Stores execution history and status
2. **Platform Events**: Real-time job status updates
   - `Mass_Action_Job_Change_Event__e`: Job scheduling/abortion
   - `Mass_Action_Batch_Apex_Status_Event__e`: Batch execution progress

```apex
// Query recent MAS execution logs
List<Mass_Action_Log__c> recentLogs = [
    SELECT Id, Mass_Action_Configuration__c, 
           Mass_Action_Configuration__r.Name,
           Job_ID__c, Submitted_Date__c, 
           Total_Batches__c, Processed_Batches__c,
           Message__c
    FROM Mass_Action_Log__c
    WHERE Submitted_Date__c = LAST_N_DAYS:7
    ORDER BY Submitted_Date__c DESC
    LIMIT 100
];
```

## Monitoring and Observability

### Required Monitoring

All asynchronous processes MUST include monitoring:

1. **Log All Executions**: Use Nebula Logger with appropriate scenarios and tags
2. **Track Progress**: Log start, progress milestones, and completion
3. **Capture Errors**: Log all exceptions with full context
4. **Monitor Queue Health**: Query `AsyncApexJob` for job status

### AsyncApexJob Query Pattern

```apex
public class AsyncJobMonitor {
    
    public static List<AsyncApexJob> getRecentFailures(Integer hours) {
        DateTime lookback = DateTime.now().addHours(-hours);
        
        return [
            SELECT Id, ApexClass.Name, Status, ExtendedStatus, 
                   NumberOfErrors, JobItemsProcessed, TotalJobItems,
                   CreatedDate, CompletedDate
            FROM AsyncApexJob
            WHERE Status = 'Failed'
            AND CreatedDate >= :lookback
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }
    
    public static void alertOnStuckJobs() {
        DateTime stuckThreshold = DateTime.now().addHours(-2);
        
        List<AsyncApexJob> stuckJobs = [
            SELECT Id, ApexClass.Name, Status, CreatedDate
            FROM AsyncApexJob
            WHERE Status IN ('Queued', 'Preparing', 'Processing')
            AND CreatedDate < :stuckThreshold
        ];
        
        if (!stuckJobs.isEmpty()) {
            Logger.warn('Found {0} potentially stuck async jobs', 
                       new List<Object>{ stuckJobs.size() });
            Logger.saveLog();
        }
    }
}
```

### Nebula Logger Integration

```apex
public class AccountBatch implements Database.Batchable<SObject>, Database.Stateful {
    
    private String parentLogTransactionId;
    
    public Database.QueryLocator start(Database.BatchableContext bc) {
        Logger.setScenario('Account Batch Processing');
        this.parentLogTransactionId = Logger.getTransactionId();
        Logger.info('Starting batch: {0}', new List<Object>{ bc.getJobId() });
        Logger.saveLog();
        return Database.getQueryLocator('SELECT Id FROM Account');
    }
    
    public void execute(Database.BatchableContext bc, List<Account> scope) {
        // Link child log to parent
        Logger.setParentLogTransactionId(this.parentLogTransactionId);
        Logger.setAsyncContext(bc);
        
        // Process scope...
        
        Logger.saveLog();
    }
    
    public void finish(Database.BatchableContext bc) {
        Logger.setParentLogTransactionId(this.parentLogTransactionId);
        Logger.info('Batch completed');
        Logger.saveLog();
    }
}
```

## Flow Control and Fair Usage

### Understanding Platform Governance

The Salesforce Platform uses two mechanisms to manage asynchronous workloads:

1. **Flow Control**: Prevents one org from flooding a message queue; re-enqueues messages to the back of the queue when an org dominates

2. **Fair Usage**: Tier-based system ensuring fair thread allocation; reduces available threads for orgs dominating a message type

### Avoiding Throttling

| Practice | Reason |
|----------|--------|
| Avoid small batch sizes | Prevents queue flooding |
| Don't chain excessive async jobs | Consumes thread resources |
| Process during off-peak hours | More resources available |
| Use Platform Events for high-volume callouts | Better scalability than Queueable callouts |
| Batch related operations | Reduces total async invocations |

## Anti-Patterns to Avoid

### 1. DML/SOQL in Loops (in Async Context)

```apex
// BAD: Even in async context, avoid DML in loops
public void execute(QueueableContext context) {
    for (Account acc : accounts) {
        acc.Status__c = 'Processed';
        update acc; // Still hits DML limits!
    }
}

// GOOD: Bulk operations
public void execute(QueueableContext context) {
    for (Account acc : accounts) {
        acc.Status__c = 'Processed';
    }
    update accounts;
}
```

### 2. Assuming Immediate Execution

```apex
// BAD: Assuming async job runs immediately after sync transaction
public void createOrderWithShipment(Order__c order) {
    insert order;
    System.enqueueJob(new ShipmentQueueable(order.Id));
    // DON'T assume shipment exists immediately in subsequent code
}

// GOOD: Design for eventual consistency
public void createOrderWithShipment(Order__c order) {
    insert order;
    order.Shipment_Status__c = 'Pending'; // Track state explicitly
    update order;
    System.enqueueJob(new ShipmentQueueable(order.Id));
}
```

### 3. Enqueueing from Triggers Without Guards

```apex
// BAD: Can exhaust daily limits with bulk data loads
trigger OpportunityTrigger on Opportunity (after insert) {
    for (Opportunity opp : Trigger.new) {
        System.enqueueJob(new OpportunityProcessor(opp.Id));
    }
}

// GOOD: Batch async operations
trigger OpportunityTrigger on Opportunity (after insert) {
    if (FeatureFlagUtil.isEnabled('Opportunity_Async_Processing')) {
        System.enqueueJob(new OpportunityBatchProcessor(Trigger.newMap.keySet()));
    }
}
```

### 4. Missing Error Handling

```apex
// BAD: Silent failures
public void execute(QueueableContext context) {
    try {
        processRecords();
    } catch (Exception e) {
        // Exception swallowed - no visibility!
    }
}

// GOOD: Log and handle appropriately
public void execute(QueueableContext context) {
    try {
        processRecords();
    } catch (Exception e) {
        Logger.error('Record processing failed', e);
        throw e; // Re-throw to trigger finalizer
    } finally {
        Logger.saveLog();
    }
}
```

### 5. Using @future Instead of Queueable

```apex
// DEPRECATED: Avoid @future for new development
@future
public static void processAsync(Set<Id> accountIds) {
    // Limited functionality, no job tracking
}

// PREFERRED: Use Queueable
public class AccountProcessor implements Queueable {
    private Set<Id> accountIds;
    
    public AccountProcessor(Set<Id> accountIds) {
        this.accountIds = accountIds;
    }
    
    public void execute(QueueableContext context) {
        // Full functionality, job tracking, chaining support
    }
}
```

## Integration with Feature Flags

Always protect new async functionality with feature flags:

```apex
public class OrderProcessor implements Queueable {
    
    public void execute(QueueableContext context) {
        if (!FeatureFlagUtil.isEnabled('Order_Async_Processing')) {
            Logger.info('Feature disabled, skipping processing');
            return;
        }
        
        // Process orders...
    }
}
```

## Testing Standards

### Test Async Code Thoroughly

```apex
@IsTest
private class AccountProcessingQueueableTest {
    
    @IsTest
    static void shouldProcessAccountsSuccessfully() {
        // Arrange
        List<Account> accounts = TestDataFactory.createAccounts(200);
        insert accounts;
        
        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();
        
        // Act
        Test.startTest();
        System.enqueueJob(new AccountProcessingQueueable(new List<Id>(accountIds)));
        Test.stopTest();
        
        // Assert
        List<Account> processedAccounts = [
            SELECT Id, Status__c FROM Account WHERE Id IN :accountIds
        ];
        for (Account acc : processedAccounts) {
            Assert.areEqual('Processed', acc.Status__c);
        }
    }
    
    @IsTest
    static void shouldHandleEmptyList() {
        // Test edge case with empty list
        Test.startTest();
        System.enqueueJob(new AccountProcessingQueueable(new List<Id>()));
        Test.stopTest();
        
        // Assert no exceptions thrown
    }
    
    @IsTest
    static void shouldHandleBulkVolume() {
        // Arrange - test with realistic volume
        List<Account> accounts = TestDataFactory.createAccounts(10000);
        insert accounts;
        
        // Act
        Test.startTest();
        Database.executeBatch(new AccountCleanupBatch(), 200);
        Test.stopTest();
        
        // Assert batch completed
    }
}
```

## Decision Matrix

Use this matrix to select the appropriate async pattern. **Follow the Flow-First approach**: start with declarative solutions and escalate to pro-code only when necessary.

### Decision Hierarchy (Flow-First)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SCHEDULED FLOWS (First Choice)                              │
│     Simple batch processing with standard Flow elements         │
│     ↓ If insufficient...                                        │
├─────────────────────────────────────────────────────────────────┤
│  2. MASS ACTION SCHEDULER (Second Choice)                       │
│     Flexible data sources, field mapping, built-in monitoring   │
│     ↓ If insufficient...                                        │
├─────────────────────────────────────────────────────────────────┤
│  3. BATCH APEX (Last Resort for Batch)                          │
│     Complex logic, cursor processing, custom retry/error        │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Decision Matrix

| Scenario | 1st Choice | 2nd Choice | 3rd Choice | Reasoning |
|----------|-----------|-----------|-----------|------------|
| Simple daily record updates | Scheduled Flow | MAS | Batch Apex | Declarative, maintainable |
| Process records from Report | MAS | — | Batch Apex | MAS has native Report support |
| Process records from List View | MAS | Scheduled Flow | Batch Apex | MAS has native List View support |
| Invoke existing Flows in batch | MAS | Scheduled Flow | — | MAS orchestrates Flow execution |
| Send bulk Email Alerts | MAS | Scheduled Flow | Batch Apex | MAS has native Email Alert target |
| Admin-configurable batch ops | Scheduled Flow | MAS | — | Both declarative; MAS for complexity |
| Complex field transformations | MAS | Batch Apex | — | MAS Field Mappings vs. custom code |
| Single callout after DML | Queueable | — | — | Avoid mixed DML, supports callouts |
| Processing 1-200 records async | Queueable | — | — | Simple, fast startup |
| CPU-intensive per-record logic | Batch Apex | — | — | Pro-code for complex calculations |
| Cursor-based high-volume | Batch Apex | Step Framework | — | Apex Cursors for memory efficiency |
| Multi-step complex workflows | Step Framework | Batch Apex | — | Modular, observable, retry-safe |
| Real-time external notifications | Platform Events | — | — | Loosely coupled, survives rollback |
| High-volume outbound integration | Platform Events + Middleware | — | — | Scalable, avoids async limits |

### Quick Reference: When to Use Each Tool

| Tool | Use When | Avoid When |
|------|----------|------------|
| **Scheduled Flow** | Simple logic, standard objects, admin-maintained | Complex transformations, multiple data sources |
| **Mass Action Scheduler** | Report/ListView source, Flow invocation, field mapping | Real-time needs, complex Apex logic per record |
| **Batch Apex** | Complex calculations, cursor processing, custom error handling | Simple updates that Flow/MAS can handle |
| **Queueable** | Single async operation, callouts, job chaining | Large record volumes (use Batch instead) |
| **Platform Events** | Real-time notifications, event-driven architecture | Batch processing, scheduled operations |

## Resources

### Salesforce Architect Guides
- [Salesforce Async Processing Decision Guide](https://architect.salesforce.com/decision-guides/async-processing)
- [Step-Based Async Framework](https://architect.salesforce.com/decision-guides/step_based_async_framework)

### Mass Action Scheduler
- [Mass Action Scheduler GitHub](https://github.com/sfdx-mass-action-scheduler/sfdx-mass-action-scheduler)
- [MAS Documentation (DeepWiki)](https://deepwiki.com/sfdx-mass-action-scheduler/sfdx-mass-action-scheduler)
- [MAS AppExchange Listing](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FeF5GUAV)

### Salesforce Developer Documentation
- [Queueable Apex Documentation](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_queueing_jobs.htm)
- [Batch Apex Documentation](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_batch.htm)
- [Platform Events Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/)
- [Apex Cursors Documentation](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_cursors.htm)
- [Governor Limits](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm)


````
