---
standard_type: apex
category: architecture
version: 1.0
last_updated: 2025-11-25
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/10131/Apex-Well-Architected-Framework
framework_source: https://github.com/pgonzaleznetwork/awaf.dev
applies_to: salesforce, apex, triggers, classes, testing
---

# Apex Well-Architected Framework (AWAF)

## Overview

The Apex Well-Architected Framework provides a structured approach to building robust, scalable, and maintainable Apex code in Salesforce. This framework adapts well-architected principles to the unique constraints and opportunities of the Salesforce platform, ensuring your code is production-ready, performant, and aligned with best practices.

## Core Principles

### 1. Security First

Security must be considered from the beginning, not as an afterthought. This includes:
- **Data Access**: Always use with sharing or explicit sharing models
- **Input Validation**: Validate all user inputs and external data
- **SOQL Injection Prevention**: Use bind variables, never string concatenation
- **Object and Field-Level Security**: Respect FLS and OLS in all operations
- **Sensitive Data**: Never log or expose sensitive information

**Example:**
```apex
// Good: Uses bind variables
List<Account> accounts = [
    SELECT Id, Name 
    FROM Account 
    WHERE Industry = :userInput
];

// Bad: String concatenation (SOQL injection risk)
String query = 'SELECT Id FROM Account WHERE Industry = \'' + userInput + '\'';
```

### 2. Performance and Scalability

Design for performance from the start, considering:
- **Governor Limits**: Always design within Salesforce's governor limits
- **Bulkification**: All triggers and batch processes must handle bulk operations
- **Query Optimization**: Minimize SOQL queries, use relationship queries when possible
- **DML Optimization**: Bulk DML operations, avoid DML in loops
- **CPU Time**: Be mindful of CPU-intensive operations

**Cardinal Rules:**
- **Never DML or SOQL in loops**
- **Always bulkify triggers and batch classes**
- **Test with realistic data volumes**

### 3. Reliability and Error Handling

Build resilient code that handles failures gracefully:
- **Exception Handling**: Comprehensive try-catch blocks with appropriate logging
- **Transaction Management**: Understand savepoints and rollback behavior
- **Idempotency**: Design operations to be safely repeatable
- **Graceful Degradation**: Handle partial failures without breaking entire processes
- **Nebula Logger Integration**: Use Nebula Logger for all error logging (see Nebula Logger standards)

**Example:**
```apex
public class AccountService {
    public static void processAccounts(List<Account> accounts) {
        List<Database.SaveResult> results = Database.update(accounts, false);
        
        for (Integer i = 0; i < results.size(); i++) {
            if (!results[i].isSuccess()) {
                Logger.error('Failed to update account', accounts[i].Id, 
                            results[i].getErrors()[0]);
                // Continue processing other records
            }
        }
    }
}
```

### 4. Maintainability

Write code that is easy to understand, modify, and extend:
- **SOLID Principles**: Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clear Naming**: Use descriptive names for classes, methods, and variables
- **Documentation**: Include meaningful comments and documentation
- **Code Organization**: Logical package structure and separation of concerns
- **Design Patterns**: Use proven patterns (Factory, Strategy, Facade, etc.)

### 5. Testability

Design code to be easily testable:
- **Separation of Concerns**: Business logic separate from DML operations
- **Dependency Injection**: Use interfaces and dependency injection
- **Test Data Factories**: Centralized test data creation
- **Mocking**: Use test mocks for external dependencies
- **Coverage**: Aim for meaningful coverage, not just 75%

## Architecture Patterns

### Trigger Pattern

**Standard Trigger Architecture:**
- Trigger handles bulkification only
- Delegates to handler class
- Handler orchestrates service classes
- Service classes contain business logic

**Example:**
```apex
// Trigger
trigger AccountTrigger on Account (after insert, after update) {
    if (Trigger.isAfter) {
        AccountTriggerHandler.handleAfter(Trigger.new, Trigger.oldMap);
    }
}

// Handler
public class AccountTriggerHandler {
    public static void handleAfter(List<Account> newList, Map<Id, Account> oldMap) {
        if (Trigger.isInsert) {
            AccountService.processNewAccounts(newList);
        }
        if (Trigger.isUpdate) {
            AccountService.processUpdatedAccounts(newList, oldMap);
        }
    }
}

// Service
public class AccountService {
    public static void processNewAccounts(List<Account> accounts) {
        // Business logic here
    }
}
```

### Service Layer Pattern

Service classes encapsulate business logic and coordinate between different domain objects:

**Responsibilities:**
- Business rule enforcement
- Cross-object coordination
- Validation logic
- Complex calculations

**Example:**
```apex
public class OpportunityService {
    public static void calculateDiscounts(List<Opportunity> opportunities) {
        for (Opportunity opp : opportunities) {
            if (opp.Account?.CustomerTier__c == 'Gold') {
                opp.Discount__c = 0.20;
            } else if (opp.Account?.CustomerTier__c == 'Silver') {
                opp.Discount__c = 0.10;
            }
        }
    }
}
```

### Selector Pattern

Selector classes encapsulate all SOQL queries for an object:

**Benefits:**
- Centralized query logic
- Consistent field sets
- Easier to maintain and optimize
- Better testability

**Example:**
```apex
public class AccountSelector {
    public static List<Account> selectByIds(Set<Id> accountIds) {
        return [
            SELECT Id, Name, Industry, CustomerTier__c
            FROM Account
            WHERE Id IN :accountIds
        ];
    }
    
    public static List<Account> selectByIndustry(String industry) {
        return [
            SELECT Id, Name, Industry
            FROM Account
            WHERE Industry = :industry
            WITH SECURITY_ENFORCED
        ];
    }
}
```

### Domain Layer Pattern

Domain classes represent business entities and their behavior:

**Responsibilities:**
- Business logic specific to the object
- Validation rules
- Business event handling

**Example:**
```apex
public class Accounts extends fflib_SObjectDomain {
    public Accounts(List<Account> sObjectList) {
        super(sObjectList);
    }
    
    public override void onValidate() {
        for (Account acc : (List<Account>) Records) {
            if (acc.AnnualRevenue != null && acc.AnnualRevenue < 0) {
                acc.addError('Annual Revenue cannot be negative');
            }
        }
    }
}
```

## Bulkification Best Practices

### The Cardinal Rule: Never DML or SOQL in Loops

**Anti-Pattern:**
```apex
// NEVER do this
for (Account acc : accounts) {
    Contact c = new Contact(AccountId = acc.Id, LastName = 'Test');
    insert c; // DML in loop - will fail with bulk data!
}
```

**Correct Pattern:**
```apex
// Collect records first, then bulk DML
List<Contact> contactsToInsert = new List<Contact>();
for (Account acc : accounts) {
    contactsToInsert.add(new Contact(AccountId = acc.Id, LastName = 'Test'));
}
if (!contactsToInsert.isEmpty()) {
    insert contactsToInsert;
}
```

### Query Optimization

**Avoid:**
```apex
// Multiple queries in loop
for (Opportunity opp : opportunities) {
    Account acc = [SELECT Industry FROM Account WHERE Id = :opp.AccountId];
    // Process...
}
```

**Optimize:**
```apex
// Single bulk query with relationship
List<Opportunity> opportunitiesWithAccounts = [
    SELECT Id, Name, Account.Id, Account.Industry
    FROM Opportunity
    WHERE Id IN :opportunityIds
];
```

## Governor Limits Best Practices

### SOQL Queries (100 per transaction)

**Strategies:**
- Use relationship queries to avoid multiple queries
- Cache query results when appropriate
- Use maps for lookups instead of repeated queries
- Consider using Selector pattern for query reuse

### DML Operations (150 per transaction)

**Strategies:**
- Bulk DML operations (lists of 200 records)
- Use Database methods with allOrNone = false for partial success
- Combine multiple DML operations when possible
- Use Database.upsert for create/update scenarios

### CPU Time (10,000ms for synchronous, 60,000ms for asynchronous)

**Strategies:**
- Move heavy processing to asynchronous (Queueable, Batch, Future)
- Cache expensive calculations
- Optimize loops and avoid nested loops when possible
- Use efficient algorithms and data structures

### Heap Size (6MB synchronous, 12MB asynchronous)

**Strategies:**
- Process in chunks for large datasets
- Use Streaming API for very large datasets
- Clear large variables when no longer needed
- Consider batch processing for large operations

## Testing Standards

### Test Class Structure

```apex
@isTest
private class AccountServiceTest {
    @testSetup
    static void setupTestData() {
        // Create test data once for all test methods
        TestDataFactory.createAccounts(10);
    }
    
    @isTest
    static void testProcessNewAccounts_Positive() {
        // Arrange
        List<Account> accounts = TestDataFactory.createAccounts(5);
        
        // Act
        Test.startTest();
        AccountService.processNewAccounts(accounts);
        Test.stopTest();
        
        // Assert
        List<Account> results = [SELECT Id, Status__c FROM Account WHERE Id IN :accounts];
        System.assertEquals(5, results.size());
        for (Account acc : results) {
            System.assertEquals('Processed', acc.Status__c);
        }
    }
    
    @isTest
    static void testProcessNewAccounts_Negative() {
        // Test error scenarios
    }
    
    @isTest
    static void testProcessNewAccounts_Bulk() {
        // Test with bulk data (200+ records)
    }
}
```

### Test Data Factory Pattern

```apex
@isTest
public class TestDataFactory {
    public static List<Account> createAccounts(Integer count) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(new Account(
                Name = 'Test Account ' + i,
                Industry = 'Technology'
            ));
        }
        return accounts;
    }
    
    public static Account createAccountWithContacts(Integer contactCount) {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < contactCount; i++) {
            contacts.add(new Contact(
                AccountId = acc.Id,
                LastName = 'Test Contact ' + i
            ));
        }
        insert contacts;
        
        return acc;
    }
}
```

### Testing Best Practices

1. **Test All Code Paths**: Cover positive, negative, and edge cases
2. **Bulk Testing**: Always test with 200+ records
3. **Governor Limits**: Test that code respects governor limits
4. **Security**: Test with different user contexts (with/without sharing)
5. **Error Scenarios**: Test exception handling
6. **Isolation**: Tests should be independent and not rely on execution order
7. **Meaningful Assertions**: Verify expected outcomes, not just execution

## SOLID Principles in Apex

### Single Responsibility Principle (SRP)

Each class should have one reason to change.

**Example:**
```apex
// Good: Separate concerns
public class AccountValidator {
    public static void validate(Account acc) {
        // Validation logic only
    }
}

public class AccountService {
    public static void processAccount(Account acc) {
        // Business logic only
    }
}

// Bad: Multiple responsibilities
public class AccountHandler {
    public void validateAndProcess(Account acc) {
        // Validation AND processing mixed together
    }
}
```

### Open/Closed Principle (OCP)

Classes should be open for extension but closed for modification.

**Example:**
```apex
public abstract class DiscountCalculator {
    public abstract Decimal calculate(Opportunity opp);
}

public class GoldCustomerDiscount extends DiscountCalculator {
    public override Decimal calculate(Opportunity opp) {
        return opp.Amount * 0.20;
    }
}

public class SilverCustomerDiscount extends DiscountCalculator {
    public override Decimal calculate(Opportunity opp) {
        return opp.Amount * 0.10;
    }
}
```

### Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types.

### Interface Segregation Principle (ISP)

Clients should not be forced to depend on interfaces they don't use.

### Dependency Inversion Principle (DIP)

Depend on abstractions, not concretions.

**Example:**
```apex
public interface IEmailService {
    void send(EmailMessage message);
}

public class AccountService {
    private IEmailService emailService;
    
    public AccountService(IEmailService emailService) {
        this.emailService = emailService;
    }
    
    public void processAccount(Account acc) {
        // Use emailService interface, not concrete class
    }
}
```

## Code Organization

### Package Structure

```
force-app/
├── main/
│   ├── default/
│   │   ├── classes/
│   │   │   ├── triggers/
│   │   │   │   └── AccountTriggerHandler.cls
│   │   │   ├── services/
│   │   │   │   └── AccountService.cls
│   │   │   ├── selectors/
│   │   │   │   └── AccountSelector.cls
│   │   │   └── domains/
│   │   │       └── Accounts.cls
│   │   ├── triggers/
│   │   │   └── AccountTrigger.trigger
│   │   └── test/
│   │       └── classes/
│   │           └── AccountServiceTest.cls
```

### Naming Conventions

- **Classes**: PascalCase (e.g., `AccountService`, `AccountTriggerHandler`)
- **Methods**: camelCase (e.g., `processAccounts`, `validateInput`)
- **Variables**: camelCase (e.g., `accountList`, `isValid`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Triggers**: ObjectName + "Trigger" (e.g., `AccountTrigger`)

## Error Handling Patterns

### Standard Error Handling

```apex
public class AccountService {
    public static void processAccounts(List<Account> accounts) {
        try {
            // Process accounts
            AccountValidator.validateAll(accounts);
            AccountProcessor.process(accounts);
            
            List<Database.SaveResult> results = Database.update(accounts, false);
            handleResults(results, accounts);
            
        } catch (ValidationException e) {
            Logger.error('Validation failed', accounts[0].Id, e);
            throw e;
        } catch (Exception e) {
            Logger.error('Unexpected error processing accounts', accounts[0].Id, e);
            throw new AccountServiceException('Failed to process accounts', e);
        }
    }
    
    private static void handleResults(List<Database.SaveResult> results, 
                                     List<Account> accounts) {
        for (Integer i = 0; i < results.size(); i++) {
            if (!results[i].isSuccess()) {
                Logger.error('Failed to update account', accounts[i].Id, 
                            results[i].getErrors()[0]);
            }
        }
    }
}
```

## Integration with Feature Flags

Always check feature flags before executing new logic:

```apex
public class AccountTriggerHandler {
    public static void handleAfter(List<Account> newList) {
        if (FeatureFlagUtil.isEnabled('NewAccountProcessing')) {
            AccountService.processNewAccounts(newList);
        } else {
            // Legacy logic or skip
        }
    }
}
```

## Performance Monitoring

### Key Metrics to Monitor

1. **SOQL Query Count**: Track queries per transaction
2. **DML Operation Count**: Monitor DML operations
3. **CPU Time**: Measure CPU consumption
4. **Heap Size**: Monitor memory usage
5. **Execution Time**: Track method execution times

### Logging for Performance

Use Nebula Logger to track performance metrics:

```apex
Long startTime = System.now().getTime();
// Perform operation
Long duration = System.now().getTime() - startTime;
Logger.debug('Account processing completed in {0}ms', 
             new List<Object>{ duration });
```

## Anti-Patterns to Avoid

### 1. Hard-Coded IDs

```apex
// Bad
if (acc.Id == '001000000000000AAA') { }

// Good
if (acc.RecordType.DeveloperName == 'Customer') { }
```

### 2. String Literals in SOQL

```apex
// Bad
String query = 'SELECT Id FROM Account WHERE Industry = \'Technology\'';

// Good
List<Account> accounts = [
    SELECT Id FROM Account WHERE Industry = :industry
];
```

### 3. Missing Null Checks

```apex
// Bad
Account acc = accounts[0]; // Could be empty!

// Good
if (!accounts.isEmpty()) {
    Account acc = accounts[0];
}
```

### 4. Over-Complicated Logic

```apex
// Bad: Nested ternary operators
String status = x > 0 ? y > 0 ? 'A' : 'B' : y > 0 ? 'C' : 'D';

// Good: Clear if-else structure
String status;
if (x > 0 && y > 0) {
    status = 'A';
} else if (x > 0) {
    status = 'B';
} else if (y > 0) {
    status = 'C';
} else {
    status = 'D';
}
```

## Resources

- [Salesforce Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/)
- [Governor Limits Documentation](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm)
- [Apex Best Practices](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_best_practices.htm)

