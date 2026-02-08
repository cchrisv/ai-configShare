# Nebula Logger Standards

Standardized logging for Salesforce. Debugging, monitoring, troubleshooting across Apex and Flows.

## Scenarios & Tags

- **Scenarios** — set before logging: `Logger.setScenario('<Name>')`. Configure via `LoggerScenarioRule__mdt`.
- **Tags** — keywords for finding entries (use sparingly): Callout, Controller Class, Trigger, Exception.
- **Related Records** — add Related Records component to parent record's related list.
- **Settings** — `LoggerSettings__c` takes precedence over Scenario Rules.

## Apex API

```apex
// Exceptions
Logger.error(logMessage, apexException)
Logger.error(logMessage, record/recordId/records, apexException)
// Callouts
Logger.info('Callout: ', contactId).setHttpRequestDetails(req).setHttpResponseDetails(res);
// Database Results
Logger.error(logMessage, List<Database.SaveResult/UpsertResult/DeleteResult/MergeResult/UndeleteResult>)
// Standard (each level: error, warn, info, debug, fine)
Logger.error/warn/info/debug/fine(logMessage)
Logger.error/warn/info/debug/fine(message, recordId)
```

## Save Methods

| Method | Use Case |
|--------|----------|
| `EVENT_BUS` (default) | `LogEntryEvent__e` via EventBus |
| `QUEUEABLE` | Async — defers CPU/limits |
| `REST` | Sync callout — avoids mixed DML |
| `SYNCHRONOUS_DML` | Direct insert — ⚠️ rollback risk |

## Async Logs

`Logger.setParentLogTransactionId(String)` → relates child `Log__c` to parent via `ParentLog__c`. Batch: 1 parent (start) + N children (execute/finish).

## Data Masking

`LogEntryDataMaskRule__mdt` with RegEx. Built-in: US SSN, Visa, Mastercard.

## Levels

| Level | Use For |
|-------|---------|
| ERROR | Exceptions, DB errors, critical failures |
| WARN | Unusual but non-blocking (missing optional records, deprecated) |
| INFO | Business events, state changes, integration calls |
| DEBUG | Diagnostic (variable values, decision branches) |
| FINE+ | Verbose active debugging only |

## Best Practices

```apex
// Always: scenario + try/catch + context + saveLog
Logger.setScenario('Order Processing');
try {
    Logger.debug('Eligible: {0}, Reason: {1}', new List<Object>{ isEligible, reason });
    List<Database.SaveResult> results = Database.update(records, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (!results[i].isSuccess())
            Logger.error('Update failed', records[i].Id, results[i].getErrors()[0]);
    }
} catch (Exception e) {
    Logger.error('Failed to process', accountId, e);
    throw e;
} finally { Logger.saveLog(); }
// Callouts
Logger.info('Calling API', contactId).setHttpRequestDetails(req);
Logger.info('API response', contactId).setHttpResponseDetails(res);
```

## Anti-Patterns

- Log everything at INFO → use appropriate levels
- Missing context → always include record IDs
- Not logging errors → always log exceptions + throw
- Logging sensitive data → use `LogEntryDataMaskRule__mdt`
- Excessive logging in loops → use DEBUG/FINE levels
