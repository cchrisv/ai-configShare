# Event-Driven Architecture Standards

> **Version**: 1.0  
> **Last Updated**: December 2025  
> **Status**: Active  
> **Source**: [Salesforce Architect Decision Guide - Event-Driven Architecture](https://architect.salesforce.com/decision-guides/event-driven)

## Purpose

This document establishes standards for implementing event-driven architectures involving Salesforce. Event-driven architectures enable loosely coupled systems to communicate through events, supporting near real-time updates and scalable integration patterns.

## Scope

These standards apply to:
- Platform Events implementation
- Change Data Capture (CDC) usage
- Pub/Sub API integrations
- Event-driven integrations with external systems
- Internal event-driven communication within Salesforce orgs

## Core Principles

### 1. Use Event-Driven for Asynchronous Processes

Event-driven architectures are designed for processes that do not require synchronous responses. They provide:
- **Data consistency** across systems
- **Scalability** for high-volume scenarios
- **Reuse** of integration patterns
- **Reduced technical debt** as the application landscape evolves

### 2. Pub/Sub API for New Implementations

- Use **Pub/Sub API** for any new publish/subscribe patterns
- Plan to migrate existing event communications from Streaming API to Pub/Sub API
- Pub/Sub API provides a unified interface for platform events, CDC events, and Real-Time Event Monitoring events

### 3. Preferred Publishing Mechanisms

| Mechanism | Use Case | Status |
|-----------|----------|--------|
| **Platform Events** | Custom event data, application integration | ✅ Recommended |
| **Change Data Capture (CDC)** | Record change notifications | ✅ Recommended |
| **Pub/Sub API** | Unified subscription interface | ✅ Recommended |
| **Outbound Messages** | Legacy workflow-based integrations | ⚠️ Limited investment |
| **PushTopic / Generic Events** | Legacy streaming scenarios | ❌ Deprecated |

### 4. ESB/Middleware Integration

If MuleSoft or another Enterprise Service Bus (ESB) is part of the existing landscape, use it where possible. ESB solutions are purpose-built for event-driven patterns.

## Event-Driven Patterns

### Pattern Selection Matrix

| Pattern | Near Real-Time | Unique Message Copy | Guarantee Delivery | Reduce Message Size | Transform Data |
|---------|---------------|---------------------|-------------------|---------------------|----------------|
| Publish/Subscribe | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fanout | ✅ | ✅ | ✅ | ❌ | ❌ |
| Passed Messages | ✅ | ❌ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ❌ | ❌ |
| Queueing | ✅ | ✅ | ✅ | ❌ | ❌ |

### When to Use Event-Driven Architecture

**✅ Good Fit:**
- Near real-time notifications to multiple applications
- Parallel processing of large data volumes
- High-volume reads with subscriber processing constraints
- High-volume writes from multiple sources
- Sending the same data to different systems
- Frequently introducing new systems into IT landscape
- IoT device integrations
- Mobile devices with intermittent connectivity

**❌ Poor Fit:**
- Processes requiring synchronous responses
- Human-in-the-loop waiting for responses
- Infrequently changing source data (use batch instead)
- Systems that don't support event-driven patterns
- Scenarios requiring immediate response guarantees

## Platform Events Standards

### Naming Conventions

```
<Domain>_<Action>_<Version>__e

Examples:
- Order_Placed__e
- Account_Updated__e
- Payment_Processed__e
- Lead_Qualified_v2__e
```

### Required Fields

All platform events MUST include:

| Field | Type | Purpose |
|-------|------|---------|
| `Transaction_Id__c` | Text(36) | Correlation ID for tracing |
| `Source_System__c` | Text(50) | Publishing system identifier |
| `Event_Time__c` | DateTime | When the event occurred |

### Publish Behavior

| Behavior | When to Use |
|----------|-------------|
| **Publish After Commit** | Default behavior; use for most scenarios |
| **Publish Immediately** | Logging events that should persist regardless of transaction outcome |

> ⚠️ **Warning**: Publish Immediately events can cause race conditions if consumed within the same transaction. Use with extreme caution.

### Publishing Best Practices

```apex
// ✅ GOOD: Bulk publishing with error handling
public class OrderEventPublisher {
    
    public static void publishOrderEvents(List<Order__c> orders) {
        List<Order_Placed__e> events = new List<Order_Placed__e>();
        
        for (Order__c order : orders) {
            events.add(new Order_Placed__e(
                Transaction_Id__c = generateTransactionId(),
                Source_System__c = 'Salesforce-CRM',
                Event_Time__c = System.now(),
                Order_Id__c = order.Id,
                Order_Number__c = order.Order_Number__c,
                Total_Amount__c = order.Total__c
            ));
        }
        
        List<Database.SaveResult> results = EventBus.publish(events);
        
        for (Integer i = 0; i < results.size(); i++) {
            if (!results[i].isSuccess()) {
                Logger.error('Failed to publish Order_Placed__e', 
                            events[i].Order_Id__c,
                            results[i].getErrors()[0]);
            }
        }
        Logger.saveLog();
    }
    
    private static String generateTransactionId() {
        return UUID.randomUUID().toString();
    }
}
```

### Subscription Best Practices

```apex
// Platform Event Trigger with retry awareness
trigger OrderPlacedTrigger on Order_Placed__e (after insert) {
    OrderPlacedEventHandler.handle(Trigger.new, Trigger.operationType);
}

public class OrderPlacedEventHandler {
    
    public static void handle(List<Order_Placed__e> events, System.TriggerOperation operation) {
        Logger.setScenario('Order Placed Event Processing');
        
        // Get replay ID for debugging
        for (Order_Placed__e event : events) {
            Logger.debug('Processing event: ReplayId={0}, TransactionId={1}', 
                        new List<Object>{ 
                            EventBus.getReplayId(event),
                            event.Transaction_Id__c 
                        });
        }
        
        try {
            processEvents(events);
        } catch (Exception e) {
            Logger.error('Event processing failed', e);
            // Set resume checkpoint if retryable
            EventBus.TriggerContext.currentContext().setResumeCheckpoint(
                events[events.size() - 1].ReplayId
            );
            throw e;
        } finally {
            Logger.saveLog();
        }
    }
    
    private static void processEvents(List<Order_Placed__e> events) {
        // Business logic here
    }
}
```

## Change Data Capture (CDC) Standards

### When to Use CDC

| ✅ Use CDC When | ❌ Use Platform Events Instead When |
|-----------------|-------------------------------------|
| Synchronizing record changes to external systems | Custom business events not tied to records |
| Need predefined payload structure | Need control over event payload |
| Tracking all field changes on an object | Only specific fields matter |
| Building audit/history systems | Application-level events |

### CDC Selection Guidelines

Enable CDC only for objects that:
1. Require external system synchronization
2. Have subscribers actively processing changes
3. Are not high-volume transaction objects (evaluate limits)

### CDC Subscription Pattern

```apex
// CDC Trigger for Account changes
trigger AccountChangeEventTrigger on AccountChangeEvent (after insert) {
    AccountCDCHandler.handle(Trigger.new);
}

public class AccountCDCHandler {
    
    public static void handle(List<AccountChangeEvent> events) {
        Logger.setScenario('Account CDC Processing');
        
        List<String> recordIds = new List<String>();
        
        for (AccountChangeEvent event : events) {
            EventBus.ChangeEventHeader header = event.ChangeEventHeader;
            
            Logger.debug('CDC Event: ChangeType={0}, RecordIds={1}', 
                        new List<Object>{ 
                            header.getChangeType(),
                            header.getRecordIds() 
                        });
            
            // Handle based on change type
            switch on header.getChangeType() {
                when 'CREATE' {
                    handleCreate(event);
                }
                when 'UPDATE' {
                    handleUpdate(event, header.getChangedFields());
                }
                when 'DELETE' {
                    handleDelete(header.getRecordIds());
                }
                when 'UNDELETE' {
                    handleUndelete(header.getRecordIds());
                }
            }
        }
        
        Logger.saveLog();
    }
    
    private static void handleCreate(AccountChangeEvent event) {
        // Sync new account to external system
    }
    
    private static void handleUpdate(AccountChangeEvent event, List<String> changedFields) {
        // Sync changed fields to external system
    }
    
    private static void handleDelete(List<String> recordIds) {
        // Notify external system of deletion
    }
    
    private static void handleUndelete(List<String> recordIds) {
        // Restore in external system
    }
}
```

## Pub/Sub API Standards

### Client Implementation Requirements

1. **gRPC Client**: Use appropriate gRPC client library for your language
2. **Authentication**: Use OAuth 2.0 with appropriate scopes
3. **Retry Logic**: Implement exponential backoff for transient failures
4. **Replay Support**: Store and use ReplayId for guaranteed delivery

### Subscription Best Practices

```java
// Java Pub/Sub API client example structure
public class SalesforcePubSubClient {
    
    private static final int MAX_RETRY_ATTEMPTS = 5;
    private static final int INITIAL_BACKOFF_MS = 1000;
    
    public void subscribe(String topic, String replayId) {
        // Store replay ID persistently
        // Implement exponential backoff
        // Handle flow control
        // Log all events for observability
    }
    
    public void handleEvent(ConsumerEvent event) {
        // Parse event
        // Process business logic
        // Update stored replay ID
        // Log success/failure
    }
}
```

## Anti-Patterns to Avoid

### 1. Infinite Trigger Loops

```apex
// ❌ BAD: Publishing events from trigger on same event
trigger MyEventTrigger on My_Event__e (after insert) {
    List<My_Event__e> newEvents = new List<My_Event__e>();
    for (My_Event__e e : Trigger.new) {
        newEvents.add(new My_Event__e(...)); // INFINITE LOOP!
    }
    EventBus.publish(newEvents);
}
```

### 2. Publishing Before DML Completes

```apex
// ❌ BAD: Publishing before transaction commits
public void processOrder(Order__c order) {
    insert order;
    
    // If next line fails, event is already published but order doesn't exist!
    EventBus.publish(new Order_Placed__e(
        Order_Id__c = order.Id,
        Publish_Behavior__c = 'PublishImmediately' // DANGEROUS
    ));
    
    processPayment(order); // This could fail and rollback!
}
```

### 3. Using Events for Flow Orchestration

```apex
// ❌ BAD: Using events to coordinate within same org
// Instead, use subflows or Flow Orchestrator

// ✅ GOOD: Use events for cross-system communication only
```

### 4. Creating Runtime Dependencies

Don't publish events to facilitate communication between packages without proper dependency management. This creates tight coupling that defeats the purpose of event-driven architecture.

### 5. Unnecessarily Large Payloads

```apex
// ❌ BAD: Including all fields
EventBus.publish(new Account_Changed__e(
    Account_JSON__c = JSON.serialize(account) // TOO LARGE!
));

// ✅ GOOD: Include only necessary fields
EventBus.publish(new Account_Changed__e(
    Account_Id__c = account.Id,
    Account_Name__c = account.Name,
    Industry__c = account.Industry,
    Change_Type__c = 'UPDATE'
));
```

### 6. Unselective Event Handling

When multiple components listen for the same event, ensure handlers only execute when actually needed. Use appropriate filtering logic.

## Event Design Standards

### Payload Design

1. **Minimize payload size** while including all necessary data
2. **Use consistent field naming** across all events
3. **Include correlation IDs** for distributed tracing
4. **Version events** when breaking changes are required

### Versioning Strategy

When event structure must change:
1. Create new version: `Order_Placed_v2__e`
2. Maintain both versions during transition
3. Communicate deprecation timeline to subscribers
4. Remove old version after all subscribers migrate

### Documentation Requirements

Every platform event MUST have:
- Purpose description
- Publisher(s) identified
- Expected subscriber(s)
- Payload field descriptions
- Example payload
- Retry behavior

## Monitoring and Observability

### Required Metrics

| Metric | Description |
|--------|-------------|
| Events Published | Count of events published per type |
| Events Consumed | Count of events processed by subscribers |
| Event Latency | Time between publish and consume |
| Failed Events | Count of events that failed processing |
| Replay Count | Number of replayed events |

### Nebula Logger Integration

All event handlers MUST integrate with Nebula Logger:

```apex
public class EventHandler {
    
    public static void handle(List<My_Event__e> events) {
        Logger.setScenario('My Event Processing');
        
        for (My_Event__e event : events) {
            Logger.debug('Processing event', event.Transaction_Id__c);
        }
        
        try {
            // Process events
        } catch (Exception e) {
            Logger.error('Event processing failed', e);
            throw e;
        } finally {
            Logger.saveLog();
        }
    }
}
```

## Limits and Considerations

### Platform Event Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Event Allocations | Varies by edition | Check org limits |
| Payload Size | 1 MB | Maximum per event |
| Replay Period | 3 days | Events retained for replay |
| Batch Size | Configurable | Default 2000 in Apex triggers |

### CDC Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Objects Enabled | Varies by edition | Standard + Custom |
| Payload Size | 1 MB | Maximum per event |
| Replay Period | 3 days | Events retained for replay |

## Related Standards

- [Async Processing Standards](./async-processing-standards.md)
- [Nebula Logger Standards](./nebula-logger-standards.md)

## Resources

- [Salesforce Event-Driven Architecture Decision Guide](https://architect.salesforce.com/decision-guides/event-driven)
- [Platform Events Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/)
- [Change Data Capture Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.change_data_capture.meta/change_data_capture/)
- [Pub/Sub API Documentation](https://developer.salesforce.com/docs/platform/pub-sub-api/overview)
