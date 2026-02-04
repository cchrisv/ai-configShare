---
standard_type: triggers
category: architecture
version: 1.0
last_updated: 2025-11-25
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/10129/Trigger-Well-Architected
framework_source: https://github.com/mitchspano/trigger-actions-framework
applies_to: salesforce, apex, triggers, automation, custom-metadata
---

# Trigger Actions Framework Standards

## Overview

The Trigger Actions Framework is a metadata-driven approach to Apex trigger development that enables partitioning, ordering, and bypassing record-triggered automations. The framework supports both Apex and Flow-based trigger actions, providing a unified "Automation Studio" view of all automations for a given sObject.

This standard defines how we implement, configure, and maintain triggers using the Trigger Actions Framework, ensuring consistency, testability, and maintainability across all Salesforce automations.

## Key Principles

The Trigger Actions Framework adheres to the following software design principles:

1. **Open-Closed Principle**: Classes are open for extension but closed for modification. New trigger logic is added through new classes, not by modifying existing handler classes.

2. **Single Responsibility Principle**: Each trigger action class has one specific purpose and handles one aspect of the automation.

3. **Strategy Pattern**: The framework dynamically instantiates and executes trigger actions based on custom metadata configuration.

4. **Separation of Concerns**: Trigger definitions are minimal; all logic resides in dedicated action classes.

## Framework Components

### Custom Metadata Types

#### sObject_Trigger_Setting__mdt

Defines trigger settings for each sObject enabled for the framework.

| Field | Description | Required |
|-------|-------------|----------|
| `Object_API_Name__c` | API name of the sObject (without namespace prefix) | Yes |
| `Object_Namespace__c` | Namespace of the sObject (for managed packages) | No |
| `Bypass_Execution__c` | Bypass all trigger actions for this sObject | No |
| `Bypass_Permission__c` | Custom permission to bypass all actions | No |
| `Required_Permission__c` | Custom permission required to execute actions | No |
| `TriggerRecord_Class_Name__c` | API name of TriggerRecord subclass for entry criteria | No |

#### Trigger_Action__mdt

Defines individual trigger actions and their execution context.

| Field | Description | Required |
|-------|-------------|----------|
| `Apex_Class_Name__c` | Fully qualified name of the Apex class | Yes |
| `Order__c` | Execution order within the context (lower = earlier) | Yes |
| `Before_Insert__c` | Link to sObject setting for before insert context | No* |
| `After_Insert__c` | Link to sObject setting for after insert context | No* |
| `Before_Update__c` | Link to sObject setting for before update context | No* |
| `After_Update__c` | Link to sObject setting for after update context | No* |
| `Before_Delete__c` | Link to sObject setting for before delete context | No* |
| `After_Delete__c` | Link to sObject setting for after delete context | No* |
| `After_Undelete__c` | Link to sObject setting for after undelete context | No* |
| `Bypass_Execution__c` | Bypass this specific action | No |
| `Bypass_Permission__c` | Custom permission to bypass this action | No |
| `Required_Permission__c` | Custom permission required to execute | No |
| `Flow_Name__c` | API name of Flow (when using TriggerActionFlow) | No |
| `Allow_Flow_Recursion__c` | Allow Flow to execute recursively | No |
| `Entry_Criteria__c` | Formula to filter which records are processed | No |

*At least one context field must be populated.

### Core Classes

| Class | Purpose |
|-------|---------|
| `MetadataTriggerHandler` | Main handler class invoked from triggers |
| `TriggerBase` | Base class providing bypass and finalization utilities |
| `TriggerAction` | Interface definitions for all trigger contexts |
| `TriggerActionFlow` | Enables Flow-based trigger actions |
| `TriggerRecord` | Base class for entry criteria formula support |
| `TriggerTestUtility` | Testing utilities including fake ID generation |

## Trigger Implementation

### Trigger Definition

All triggers should follow this minimal pattern, delegating to the `MetadataTriggerHandler`:

```apex
trigger AccountTrigger on Account (
    before insert,
    after insert,
    before update,
    after update,
    before delete,
    after delete,
    after undelete
) {
    new MetadataTriggerHandler().run();
}
```

**Important**: Include all contexts in the trigger definition, even if not all are initially needed. This prevents future deployment issues when adding new trigger actions.

### Trigger Naming Convention

| Component | Convention | Example |
|-----------|------------|---------|
| Trigger | `{SObjectName}Trigger` | `AccountTrigger`, `OpportunityTrigger` |
| Trigger Action Class | `TA_{SObjectName}_{ActionName}` | `TA_Account_SetDefaultValues` |
| Test Class | `TA_{SObjectName}_{ActionName}Test` | `TA_Account_SetDefaultValuesTest` |
| TriggerRecord Class | `{SObjectName}TriggerRecord` | `AccountTriggerRecord` |

## Apex Trigger Actions

### Interface Implementation

Trigger actions must implement the appropriate `TriggerAction` interface(s) for their context:

| Context | Interface | Method Signature |
|---------|-----------|------------------|
| Before Insert | `TriggerAction.BeforeInsert` | `void beforeInsert(List<SObject> triggerNew)` |
| After Insert | `TriggerAction.AfterInsert` | `void afterInsert(List<SObject> triggerNew)` |
| Before Update | `TriggerAction.BeforeUpdate` | `void beforeUpdate(List<SObject> triggerNew, List<SObject> triggerOld)` |
| After Update | `TriggerAction.AfterUpdate` | `void afterUpdate(List<SObject> triggerNew, List<SObject> triggerOld)` |
| Before Delete | `TriggerAction.BeforeDelete` | `void beforeDelete(List<SObject> triggerOld)` |
| After Delete | `TriggerAction.AfterDelete` | `void afterDelete(List<SObject> triggerOld)` |
| After Undelete | `TriggerAction.AfterUndelete` | `void afterUndelete(List<SObject> triggerNew)` |
| DML Finalizer | `TriggerAction.DmlFinalizer` | `void execute()` |

### Trigger Action Class Structure

```apex
/**
 * @description Validates that Opportunity Stage is 'Prospecting' on insert.
 * @group Opportunity Automation
 */
public with sharing class TA_Opportunity_StageInsertRules implements TriggerAction.BeforeInsert {

    @TestVisible
    private static final String PROSPECTING = 'Prospecting';
    @TestVisible
    private static final String INVALID_STAGE_INSERT_ERROR = 'The Stage must be \'Prospecting\' when an Opportunity is created';

    /**
     * @description Validates Stage value for new Opportunities.
     * @param triggerNew List of Opportunities being inserted.
     */
    public void beforeInsert(List<SObject> triggerNew) {
        for (Opportunity opp : (List<Opportunity>) triggerNew) {
            if (opp.StageName != PROSPECTING) {
                opp.addError(INVALID_STAGE_INSERT_ERROR);
            }
        }
    }
}
```

### Multi-Context Actions

When a class needs to handle multiple contexts, implement multiple interfaces:

```apex
public with sharing class TA_Account_AuditTracking implements TriggerAction.AfterInsert, TriggerAction.AfterUpdate {

    public void afterInsert(List<SObject> triggerNew) {
        createAuditRecords((List<Account>) triggerNew, null);
    }

    public void afterUpdate(List<SObject> triggerNew, List<SObject> triggerOld) {
        createAuditRecords((List<Account>) triggerNew, (List<Account>) triggerOld);
    }

    private void createAuditRecords(List<Account> newAccounts, List<Account> oldAccounts) {
        // Audit logic here
    }
}
```

### Accessing Old Values in Update Context

Use a Map for efficient old value lookups:

```apex
public with sharing class TA_Opportunity_StageChangeRules implements TriggerAction.BeforeUpdate {

    public void beforeUpdate(List<SObject> triggerNew, List<SObject> triggerOld) {
        Map<Id, Opportunity> oldMap = new Map<Id, Opportunity>((List<Opportunity>) triggerOld);

        for (Opportunity opp : (List<Opportunity>) triggerNew) {
            Opportunity oldOpp = oldMap.get(opp.Id);
            if (opp.StageName != oldOpp.StageName) {
                // Handle stage change
            }
        }
    }
}
```

## Flow-Based Trigger Actions

### Flow Requirements

To use Flows as trigger actions:

1. Create an **Auto-launched Flow** (not Record-Triggered)
2. Define the required flow variables:

| Variable | Type | Available for Input | Available for Output | Description |
|----------|------|---------------------|----------------------|-------------|
| `record` | Record (sObject) | Yes | Yes | Current record state |
| `recordPrior` | Record (sObject) | Yes | No | Previous record state (update/delete only) |

### Flow Action Configuration

Configure the `Trigger_Action__mdt` record:

- **Apex_Class_Name__c**: `TriggerActionFlow`
- **Flow_Name__c**: API name of the Flow
- **Allow_Flow_Recursion__c**: `true` only if recursion is intentional

### Flow Recursion Warning

> **Important**: Flow trigger actions are subject to a maximum recursion depth of 3 (lower than the standard trigger depth of 16). Use Entry Criteria to limit when flows execute and avoid complex cascading DML operations in Flow trigger actions.

## Entry Criteria Formula

Entry criteria formulas filter which records are processed by a trigger action.

### TriggerRecord Class Setup

Create a global class extending `TriggerRecord`:

```apex
global class AccountTriggerRecord extends TriggerRecord {
    global Account record {
        get {
            return (Account) this.newSObject;
        }
    }
    global Account recordPrior {
        get {
            return (Account) this.oldSObject;
        }
    }
}
```

Register the class in `sObject_Trigger_Setting__mdt.TriggerRecord_Class_Name__c`.

### Formula Examples

```
record.Name = "Bob" && recordPrior.Name = "Joe"
```

```
record.Industry = "Technology" && record.AnnualRevenue > 1000000
```

> **Limitation**: Entry criteria formulas cannot traverse relationships (e.g., `record.RecordType.DeveloperName` is not supported). Only direct field references are allowed.

## Bypass Mechanisms

### Bypass Hierarchy

1. **Global Bypass** (Custom Metadata): `Bypass_Execution__c` checkbox on metadata records
2. **Permission-Based Bypass**: `Bypass_Permission__c` field with custom permission API name
3. **Transaction Bypass**: Programmatic bypass during code execution

### Bypass from Apex

```apex
// Bypass all actions on an sObject
TriggerBase.bypass('Account');

// Bypass a specific action class
MetadataTriggerHandler.bypass('TA_Account_SetDefaultValues');
// Or using Type:
MetadataTriggerHandler.bypass(TA_Account_SetDefaultValues.class);

// Bypass a specific Flow
TriggerActionFlow.bypass('My_Trigger_Action_Flow');

// Check if bypassed
if (TriggerBase.isBypassed('Account')) {
    // Handle bypass scenario
}

// Clear bypass
TriggerBase.clearBypass('Account');
MetadataTriggerHandler.clearBypass('TA_Account_SetDefaultValues');
TriggerActionFlow.clearBypass('My_Trigger_Action_Flow');

// Clear all bypasses
TriggerBase.clearAllBypasses();
MetadataTriggerHandler.clearAllBypasses();
```

### Bypass from Flow

Use the `TriggerActionFlowBypass.bypass` invocable action:
- **Bypass Type**: `Apex`, `Flow`, or `Object`
- **Name**: API name of the class, flow, or sObject

## DML Finalizers

DML Finalizers execute exactly once at the end of a complete DML operation, useful for:
- Enqueueing queueable jobs
- Inserting aggregated logs
- Performing cleanup operations

### Implementing a Finalizer

```apex
public class MyLogFinalizer implements TriggerAction.DmlFinalizer {

    private static List<Log__c> logsToInsert = new List<Log__c>();

    public static void addLog(Log__c log) {
        logsToInsert.add(log);
    }

    public void execute() {
        if (!logsToInsert.isEmpty()) {
            insert logsToInsert;
            logsToInsert.clear();
        }
    }
}
```

### Finalizer Caveats

1. **No Further DML**: Finalizers cannot perform DML that would trigger additional framework execution
2. **sObject Independent**: Finalizers run once per transaction, not per sObject
3. **Universal Adoption**: All sObjects in the org should use the framework for predictable finalizer behavior

## Recursion Prevention

The framework automatically tracks recursion for update operations via:
- `TriggerBase.idToNumberOfTimesSeenBeforeUpdate`
- `TriggerBase.idToNumberOfTimesSeenAfterUpdate`

### Example Usage

```apex
public with sharing class TA_Opportunity_UpdateRelatedAccount implements TriggerAction.AfterUpdate {

    public void afterUpdate(List<SObject> triggerNew, List<SObject> triggerOld) {
        List<Opportunity> firstTimeOpps = new List<Opportunity>();

        for (Opportunity opp : (List<Opportunity>) triggerNew) {
            if (TriggerBase.idToNumberOfTimesSeenAfterUpdate.get(opp.Id) == 1) {
                firstTimeOpps.add(opp);
            }
        }

        if (!firstTimeOpps.isEmpty()) {
            // Process only on first execution
        }
    }
}
```

## Testing Standards

### DML-Less Testing

The framework enables testing without actual DML operations using `TriggerTestUtility.getFakeId()`:

```apex
@IsTest
private class TA_Opportunity_StageChangeRulesTest {

    @IsTest
    static void shouldPreventInvalidStageChange() {
        // Arrange
        Opportunity oldOpp = new Opportunity(
            Id = TriggerTestUtility.getFakeId(Schema.Opportunity.SObjectType),
            StageName = 'Prospecting'
        );
        Opportunity newOpp = oldOpp.clone(true, true, true, true);
        newOpp.StageName = 'Closed Won';

        List<Opportunity> triggerNew = new List<Opportunity>{ newOpp };
        List<Opportunity> triggerOld = new List<Opportunity>{ oldOpp };

        // Act
        new TA_Opportunity_StageChangeRules().beforeUpdate(triggerNew, triggerOld);

        // Assert
        System.Assert.isTrue(newOpp.hasErrors(), 'Record should have an error');
        System.Assert.areEqual(
            TA_Opportunity_StageChangeRules.INVALID_STAGE_CHANGE_ERROR,
            newOpp.getErrors()[0].getMessage(),
            'Error message should match'
        );
    }
}
```

### Testing Bypass Scenarios

```apex
@IsTest
static void shouldNotExecuteWhenBypassed() {
    // Arrange
    MetadataTriggerHandler.bypass(TA_Account_SetDefaultValues.class);

    Account acc = new Account(
        Id = TriggerTestUtility.getFakeId(Schema.Account.SObjectType)
    );
    List<Account> triggerNew = new List<Account>{ acc };

    // Act
    new TA_Account_SetDefaultValues().beforeInsert(triggerNew);

    // Assert - verify bypass prevented execution
    // Note: Actual bypass check happens in framework, not individual action
}

@IsTest
static void afterTest() {
    // Always clear bypasses after tests
    MetadataTriggerHandler.clearAllBypasses();
    TriggerBase.clearAllBypasses();
}
```

### Test Coverage Requirements

- Each trigger action class must have its own test class
- Test both successful execution and error scenarios
- Test bypass scenarios when applicable
- Test boundary conditions (empty lists, null values)
- Aim for 100% code coverage on trigger action classes

## Integration with Feature Flags

Combine the Trigger Actions Framework with Feature Flags for controlled rollouts:

```apex
public with sharing class TA_Account_NewFeature implements TriggerAction.AfterInsert {

    public void afterInsert(List<SObject> triggerNew) {
        if (!FeatureFlagUtil.isEnabled('Account New Feature')) {
            return;
        }

        // Feature logic here
    }
}
```

Alternatively, use the `Required_Permission__c` field on the `Trigger_Action__mdt` record to control access.

## Integration with Nebula Logger

Log significant events within trigger actions using Nebula Logger:

```apex
public with sharing class TA_Account_ComplexProcessing implements TriggerAction.AfterUpdate {

    public void afterUpdate(List<SObject> triggerNew, List<SObject> triggerOld) {
        Logger.setScenario('Account Processing');

        try {
            // Processing logic
            Logger.info('Processed {0} accounts', new List<Object>{ triggerNew.size() });
        } catch (Exception e) {
            Logger.error('Failed to process accounts', e);
            throw e;
        } finally {
            Logger.saveLog();
        }
    }
}
```

## Best Practices

### DO

1. **Use descriptive class names** that clearly indicate the action's purpose
2. **Keep actions focused** - one responsibility per class
3. **Use @TestVisible** for constants and internal methods to support testing
4. **Document classes and methods** with ApexDoc comments
5. **Cast SObject lists** to concrete types at the start of methods
6. **Use Entry Criteria** to filter records and improve performance
7. **Clear bypasses** after operations that set them
8. **Order actions logically** - validations before field updates, field updates before related record operations

### DON'T

1. **Don't use static variables** for state between trigger contexts (use Custom Settings or Platform Cache instead)
2. **Don't perform SOQL/DML in loops** - bulkify operations
3. **Don't rely on trigger order** outside of what's defined in metadata
4. **Don't hardcode values** - use Custom Metadata, Custom Settings, or Custom Labels
5. **Don't catch and swallow exceptions** - log and re-throw
6. **Don't mix trigger framework approaches** - use Trigger Actions Framework consistently

## Configuration Checklist

When adding a new trigger action:

- [ ] Create sObject trigger (if first action on object)
- [ ] Create `sObject_Trigger_Setting__mdt` record (if first action on object)
- [ ] Create `TriggerRecord` class for entry criteria (optional)
- [ ] Create trigger action class implementing appropriate interface(s)
- [ ] Create `Trigger_Action__mdt` record(s) for each context
- [ ] Set appropriate `Order__c` values
- [ ] Configure bypass permissions (if needed)
- [ ] Create test class with comprehensive coverage
- [ ] Document the automation in team wiki

## Managed Package Support

For sObjects from managed packages, configure the `sObject_Trigger_Setting__mdt` with separate namespace and API name:

| Object Namespace | Object API Name |
|------------------|-----------------|
| `PackageNamespace` | `Custom_Object__c` |

Example for `Acme__Explosives__c`:
- **Object_Namespace__c**: `Acme`
- **Object_API_Name__c**: `Explosives__c`

## Resources

- [Trigger Actions Framework GitHub Repository](https://github.com/mitchspano/trigger-actions-framework)
- [Framework Documentation](https://github.com/mitchspano/trigger-actions-framework/tree/main/docs)
- [Salesforce Custom Metadata Types](https://help.salesforce.com/s/articleView?id=sf.custommetadatatypes_overview.htm)
- [Apex Trigger Best Practices](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_triggers_bestpract.htm)


````