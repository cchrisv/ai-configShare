---
standard_type: logging
category: usage
version: 1.0
last_updated: 2025-11-02
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/9596/Nebula-Logger
applies_to: salesforce, apex, logging, nebula-logger
---

# Nebula Logger Standards

## Overview

Nebula Logger is our team's standardized logging solution for Salesforce. It provides comprehensive logging capabilities that help with debugging, monitoring, and troubleshooting across all automation (Apex, Flows, etc.).

## Log Scenarios

Log Scenarios are high-level categorizations of logs to help troubleshooting by refining the logs. Sample scenarios include:

1. Zeta Integration
2. Lead Conversion
3. Lead Contact Assignment
4. EApp Application

### Scenario Rule

Before we start logging, set the scenario:

```apex
Logger.setScenario('<Scenario Name>');
```

### LoggerScenarioRule__mdt

Configure scenario rules using the `LoggerScenarioRule__mdt` custom metadata type to control logging behavior based on scenarios.

## Log Entry Tags

Tags are keywords that help in finding log entries specific to certain features. Use this only when it is needed. Sample tags include:

1. Callout
2. Controller Class
3. EApp
4. LCA
5. Trigger
6. Helper Class
7. Exception
   - Specific Types of Exceptions

## Related Records Component

Related Records lightning component needs to be added to the parent record's related list tab to have the corresponding logs/log entries shown.

## Logger Parameters

See the [Log Parameters spreadsheet](https://acceleredcom.sharepoint.com/:x:/r/sites/IT-SFDCCRM-US/Shared%20Documents/DREAM%20Team/Features/FY25%20Features/Error%20Handling%20%26%20Nebula%20Logger/Log%20Parameters.xlsx?d=wbe93c47382b74a76a70225eeb6782345&csf=1&web=1&e=4Y2Nnb) for detailed parameter configurations.

## User & Profile-Specific Settings

`LoggerSettings__c` has precedence over Scenario Rule.

## Apex Methods

Refer to Logger class for the complete list. Common methods include:

### 1. Exceptions

```apex
Logger.error(LogMessage logMessage, System.Exception apexException)
Logger.error(LogMessage logMessage, SObject record, System.Exception apexException)
Logger.error(LogMessage logMessage, Id recordId, System.Exception apexException)
Logger.error(LogMessage logMessage, List<SObject> records, System.Exception apexException)
```

### 2. Callout Request and Response Logger

```apex
HttpRequest req = new HttpRequest();
HttpResponse res = new HttpResponse();
Logger.info('RisAPICallout: ', contact.id)
    .setHttpRequestDetails(req)
    .setHttpResponseDetails(res);
```

### 3. Database Results (with Errors) - List

```apex
Logger.error(LogMessage logMessage, List<Database.UpsertResult> upsertResults)
Logger.error(LogMessage logMessage, List<Database.UndeleteResult> undeleteResults)
Logger.error(LogMessage logMessage, List<Database.SaveResult> saveResults)
Logger.error(LogMessage logMessage, List<Database.MergeResult> mergeResults)
Logger.error(LogMessage logMessage, List<Database.DeleteResult> deleteResults)
```

### 4. Database Results (Error) - Single Result

```apex
Logger.error(LogMessage logMessage, Database.UndeleteResult undeleteResult)
Logger.error(LogMessage logMessage, Database.UpsertResult upsertResult)
Logger.error(LogMessage logMessage, Database.SaveResult saveResult)
Logger.error(LogMessage logMessage, Database.MergeResult mergeResult)
Logger.error(LogMessage logMessage, Database.DeleteResult deleteResult)
```

### 5. Errors

```apex
Logger.error(LogMessage logMessage, List<SObject> records)
Logger.error(String message, Id recordId)
```

### 6. Warning

```apex
Logger.warn(LogMessage logMessage)
Logger.warn(String message, Id recordId)
```

### 7. Info

```apex
Logger.info(LogMessage logMessage)
Logger.info(String message, Id recordId)
```

### 8. Debug

```apex
Logger.debug(LogMessage logMessage)
Logger.debug(String message, Id recordId)
```

### 9. Fine

```apex
Logger.fine(LogMessage logMessage)
Logger.fine(String message, Id recordId)
```

## Save Method – Default – EVENT BUS (Platform Events)

The `Logger.SaveMethod` enum can be used for both `Logger.setSaveMethod(saveMethod)` and `Logger.saveLog(saveMethod)`:

### Logger.SaveMethod.EVENT_BUS

The default save method, this uses the `EventBus` class to publish `LogEntryEvent__e` records. The default save method can also be controlled declaratively by updating the field `LoggerSettings__c.DefaultSaveMethod__c`.

### Logger.SaveMethod.QUEUEABLE

This save method will trigger Logger to save any pending records asynchronously using a queueable job. This is useful when you need to defer some CPU usage and other limits consumed by Logger.

### Logger.SaveMethod.REST

This save method will use the current user's session ID to make a synchronous callout to the org's REST API. This is useful when you have other callouts being made and you need to avoid mixed DML operations.

### Logger.SaveMethod.SYNCHRONOUS_DML

This save method will skip publishing the `LogEntryEvent__e` platform events, and instead immediately creates `Log__c` and `LogEntry__c` records. This is useful when you are logging from within the context of another platform event and/or you do not anticipate any exceptions to occur in the current transaction.

**Note**: When using this save method, any exceptions will prevent your log entries from being saved - Salesforce will rollback any DML statements, including your log entries! Use this save method cautiously.

## Async Processes Related Logs

In Salesforce, asynchronous jobs like batchable and queueable run in separate transactions - each with their own unique transaction ID. To relate these jobs back to the original log, Apex developers can use the method `Logger.setParentLogTransactionId(String)`. Nebula Logger uses this value to relate child `Log__c` records, using the field `Log__c.ParentLog__c`.

### Batch Apex Example

If we have 6 records with Batch Size 2, then the System creates one parent record log and 4 child related logs:

- Parent log Record (Start())
- 3 child log records (Execute() method)
- Child log record (Finish())

## Data Masking

Automatically mask sensitive data by configuring rules in the custom metadata type `LogEntryDataMaskRule__mdt`.

Even when logging data, you won't want to log some sensitive information due to privacy concerns, security concerns, and so on. This custom metadata type uses RegEx (or "regular expressions") to provide advanced data masking – any sensitive data in your logs can be automatically masked simply by configuring a new rule in your org, with no code changes required. 

Out of the box, Nebula Logger includes data masking rules for:
- US social security numbers
- Visa credit card numbers
- Mastercard credit card numbers

## Logging Levels Best Practices

### When to Use Each Level

1. **ERROR**: Use for exceptions, database errors, and critical failures that prevent the process from completing successfully.
   - Examples: DML exceptions, validation rule failures, required field missing

2. **WARN**: Use for situations that are unusual but don't prevent the process from completing.
   - Examples: Missing optional related records, deprecated method usage, performance concerns

3. **INFO**: Use for important business events and significant state changes.
   - Examples: Record created, major process steps completed, integration calls

4. **DEBUG**: Use for detailed diagnostic information that helps troubleshoot issues.
   - Examples: Variable values, decision branch taken, intermediate calculation results

5. **FINE/FINER/FINEST**: Use for very detailed diagnostic information that is typically only needed during active debugging.
   - Examples: Loop iterations, detailed state dumps, verbose processing details

### Additional Notes

1. For less critical entries (but entries that may still provide useful info in certain situations), use DEBUG, FINE, FINER or FINEST logging levels.

2. Not everything you log should always be logged - use levels ERROR, WARN or INFO for the truly important info.

## Best Practices

### 1. Always Log Exceptions

When catching exceptions, always log them with full context:

```apex
try {
    // Your code
} catch (Exception e) {
    Logger.error('Failed to process account', accountId, e);
    throw e; // Re-throw if needed
}
```

### 2. Include Context in Log Messages

Provide meaningful context that helps identify where and why the log entry was created:

```apex
// Good
Logger.info('Processed payment for order', orderId);

// Better
Logger.info('Payment processed successfully for order {0}. Amount: {1}', 
            new List<Object>{ orderId, amount });
```

### 3. Use Scenarios for Categorization

Set scenarios at the beginning of your process to categorize related logs:

```apex
Logger.setScenario('Order Processing');
```

### 4. Log at Decision Points

Log important decisions and state changes:

```apex
if (isEligible) {
    Logger.debug('Customer eligible for upgrade', customerId);
    // Process upgrade
} else {
    Logger.debug('Customer not eligible for upgrade. Reason: {0}', 
                 new List<Object>{ ineligibilityReason });
}
```

### 5. Log Integration Calls

Always log integration requests and responses:

```apex
HttpRequest req = new HttpRequest();
// Set up request
Logger.info('Calling external API', contactId)
    .setHttpRequestDetails(req);

HttpResponse res = http.send(req);
Logger.info('Received API response', contactId)
    .setHttpResponseDetails(res);
```

### 6. Log Database Operations

Log DML operations, especially when they might fail:

```apex
List<Database.SaveResult> results = Database.update(records, false);
for (Integer i = 0; i < results.size(); i++) {
    if (!results[i].isSuccess()) {
        Logger.error('Failed to update record', records[i].Id, results[i].getErrors()[0]);
    }
}
```

## Anti-Patterns to Avoid

1. **Logging Everything**: Don't log at INFO level for every small operation. Use appropriate levels.
2. **Missing Context**: Don't log without providing record IDs or other identifying information.
3. **Not Logging Errors**: Always log exceptions and errors with full context.
4. **Logging Sensitive Data**: Be careful not to log passwords, credit card numbers, or other sensitive data without proper masking.
5. **Logging in Loops**: Be mindful of logging inside loops that process many records - use appropriate log levels.

