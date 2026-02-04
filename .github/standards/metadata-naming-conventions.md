---
standard_type: metadata
category: naming
version: 1.0
last_updated: 2025-11-25
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/10135/Salesforce-Metadata-Naming-Conventions
applies_to: salesforce, metadata, custom-objects, custom-fields, page-layouts, record-types, validation-rules
---

# Salesforce Metadata Naming Conventions

## Overview

This standard defines naming conventions and labeling best practices for Salesforce metadata, including custom objects, custom fields, page layouts, record types, and validation rules. Adhering to these standards ensures consistency, clarity, and maintainability across the Salesforce environment.

**Audience:** Developers, administrators, architects, and anyone creating or maintaining Salesforce metadata.

## General Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| **Consistency** | Use consistent patterns across all metadata types | All custom fields use PascalCase |
| **Descriptive Names** | Names should clearly describe the purpose | `ApplicationStatus__c` not `AppStat__c` |
| **Avoid Abbreviations** | Avoid abbreviations unless industry-standard | `Organization` not `Org` |
| **Case Style** | PascalCase for API names, Title Case for labels | API: `ApplicationStatus__c`, Label: `Application Status` |
| **Avoid Reserved Words** | Do not use Salesforce-reserved words | Don't use `Type`, `Name`, `Id` as custom field names |

### Case Style Reference

| Element | Convention | Example |
|---------|------------|---------|
| **API Names** | PascalCase (no spaces, each word capitalized) | `StudentApplicationStatus__c` |
| **Labels** | Title Case (spaces between words) | `Student Application Status` |
| **Descriptions** | Sentence case | `Tracks the current status of the student's application.` |

## Custom Objects

### Evaluating Standard Objects First

Before creating a custom object, evaluate whether an existing Salesforce standard object can meet requirements.

**Evaluation Steps:**
1. Understand the use case and required relationships
2. Review standard objects (Account, Contact, Individual Application, Contact Point Address, Opportunity, Case)
3. Leverage record types to segment data within standard objects
4. Evaluate customization needs

**Decision Matrix:**

| Use Standard Objects When | Create Custom Objects When |
|---------------------------|----------------------------|
| Custom fields/record types can meet requirements | Use case cannot fit into any standard object |
| Data aligns with standard relationships | Scalability or performance concerns exist |
| Standard reporting meets needs | Data structure necessitates standalone object |

### Custom Object Naming Convention

#### Standalone Objects

A standalone object represents a primary or independent entity.

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[DescriptiveName]__c` | `ErrorLog__c` |
| **Label** | `[Descriptive Name]` (Title Case) | `Error Log` |

**Examples:**
- `ErrorLog__c` → Error Log (tracks system errors)
- `AuditRecord__c` → Audit Record (stores audit trail)
- `IntegrationQueue__c` → Integration Queue (manages pending requests)

#### Extension Objects

An extension object enhances or provides additional functionality for an existing object.

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[ParentObject][Purpose]__c` | `ApplicationFeeWaiver__c` |
| **Label** | `[Parent Object] [Purpose]` (Title Case) | `Application Fee Waiver` |

**Examples:**
- `ApplicationFeeWaiver__c` → Application Fee Waiver (extends Application)
- `ContactPreference__c` → Contact Preference (extends Contact)
- `AccountMetric__c` → Account Metric (extends Account)

## Custom Fields

### Evaluating Standard Fields First

Before creating a custom field, evaluate whether a standard field can meet requirements.

**Evaluation Steps:**
1. Review object schema using Setup or Schema Builder
2. Check if standard field purpose aligns with requirements
3. Leverage picklist values or record types to customize standard fields
4. Avoid duplication with existing fields
5. Assess reporting and integration impact

### Custom Field Naming Convention

#### Standalone Fields

A standalone field is an independent data point describing a unique attribute.

**Characteristics:**
- Independent purpose—distinct attribute
- Describes core object attributes
- No parent dependency

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[DescriptiveName]__c` | `ApplicationStatus__c` |
| **Label** | `[Descriptive Name]` (Title Case) | `Application Status` |

#### Extension Fields

An extension field provides additional information for an existing concept or field.

**Characteristics:**
- Dependent purpose—builds upon another concept
- Provides context or additional details
- Parent dependency—meaning derives from relationship

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[ParentConcept][SpecificPurpose]__c` | `ApplicationStatusDate__c` |
| **Label** | `[Parent Concept] [Specific Purpose]` | `Application Status Date` |

**Extension Field Examples:**

| Parent Field | Extension Field | Purpose |
|--------------|-----------------|---------|
| `ApplicationStatus__c` | `ApplicationStatusDate__c` | When status was set |
| `ApplicationStatus__c` | `ApplicationStatusDetail__c` | Additional status context |
| `ApplicationStatus__c` | `ApplicationStatusReason__c` | Why status was set |

### Field Documentation Requirements

#### Descriptions (Required)

Every custom field **must** have a clear, concise description explaining its purpose.

```
✅ Good: "Tracks the submission date for student applications. 
         Updated automatically when application is submitted."

❌ Bad:  "Date field"
```

#### Help Text (Required)

Include user-friendly help text to guide users when entering data.

```
✅ Good: "Enter the exact date and time the application was submitted. 
         Leave blank if not yet submitted."

❌ Bad:  "Enter date"
```

### Data Governance Requirements

#### Data Owner Assignment

| Requirement | Description |
|-------------|-------------|
| **Every field must have an owner** | Designated person/team responsible for accuracy and maintenance |
| **Document in Description** | Include owner information in field description or metadata |
| **Owner Responsibilities** | Ensure data quality, monitor usage, update as business needs evolve |

#### Field Usage Monitoring

| Activity | Frequency | Purpose |
|----------|-----------|---------|
| **Usage Assessment** | Quarterly | Identify unused or underutilized fields |
| **Cleanup Review** | Bi-annually | Remove or repurpose fields that no longer add value |
| **Documentation Update** | As needed | Keep descriptions current with business changes |

#### Data Sensitivity Classification

| Level | Description | Examples | Access Control |
|-------|-------------|----------|----------------|
| **Public** | Non-sensitive data | Company name, public status | Standard access |
| **Confidential** | Restricted data | Personal contact info, internal notes | Role-based restriction |
| **Highly Confidential** | Sensitive data | Financial info, health data, SSN | Strict field-level security |

#### Compliance Categorization

| Category | Description | Examples | Regulations |
|----------|-------------|----------|-------------|
| **PII** | Personally Identifiable Information | Name, address, phone, email | GDPR, CCPA |
| **PHI** | Protected Health Information | Medical records, health data | HIPAA |
| **Financial** | Financial data | Credit card, bank details | PCI-DSS |
| **General Business** | Non-regulated data | Internal codes, status values | N/A |

## Page Layouts / Lightning Record Pages

### Page Layout Naming Convention

| Element | Convention | Example |
|---------|------------|---------|
| **Standard** | `[ObjectName] - [Purpose]` | `Contact - Minimum Read Access` |
| **Role-Based** | `[ObjectName] - [Role] Access` | `Contact - Administrator Access` |
| **Process-Based** | `[ObjectName] - [ProcessName]` | `Contact - Admissions` |

### Lightning Record Page Naming

| Element | Convention | Example |
|---------|------------|---------|
| **Standard** | `[ObjectName] Record Page - [Purpose]` | `Account Record Page - Default` |
| **App-Specific** | `[ObjectName] Record Page - [AppName]` | `Contact Record Page - Service Console` |

## Record Types

### Record Type Naming Convention

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[RecordTypeName]` (PascalCase) | `Business` |
| **Label** | `[Object Name] - [Record Type]` | `Account - Business` |

### Record Type Examples

| Object | API Name | Label | Purpose |
|--------|----------|-------|---------|
| Account | `Business` | Account - Business | B2B accounts |
| Account | `Individual` | Account - Individual | B2C accounts |
| Contact | `Student` | Contact - Student | Student records |
| Contact | `Staff` | Contact - Staff | Staff members |
| Case | `Support` | Case - Support | Customer support cases |
| Case | `Internal` | Case - Internal | Internal IT requests |

## Validation Rules

### Validation Rule Naming Convention

| Element | Convention | Example |
|---------|------------|---------|
| **API Name** | `[ObjectName]_[ValidationPurpose]` | `Account_Missing_Status` |
| **Error Location** | Field-level when possible | Target the specific field |

### Validation Rule Examples

| Type | API Name | Purpose |
|------|----------|---------|
| **Required Field** | `Account_Missing_Email` | Ensures email is populated |
| **Required Field** | `Account_Missing_Status` | Ensures status is selected |
| **Business Logic** | `Opportunity_Missing_Close_Date` | Requires close date for certain stages |
| **Business Logic** | `Contact_Invalid_Email_Format` | Validates email format |
| **Cross-Field** | `Case_Priority_Requires_Description` | High priority requires description |

### Validation Rule Best Practices

| Practice | Description |
|----------|-------------|
| **Clear Error Messages** | Write user-friendly messages explaining what's wrong and how to fix it |
| **Field-Level Errors** | Display errors on the relevant field when possible |
| **Bypass Mechanism** | Consider bypass for data migrations or integrations |
| **Document Logic** | Include comments in formula explaining the business rule |

**Error Message Example:**

```
✅ Good: "Please enter a valid email address (e.g., name@company.com). 
         Email is required for all business accounts."

❌ Bad:  "Invalid email"
```

## Quick Reference

### Naming Pattern Summary

| Metadata Type | Pattern | Example |
|---------------|---------|---------|
| **Custom Object (Standalone)** | `[DescriptiveName]__c` | `ErrorLog__c` |
| **Custom Object (Extension)** | `[ParentObject][Purpose]__c` | `ApplicationFeeWaiver__c` |
| **Custom Field (Standalone)** | `[DescriptiveName]__c` | `ApplicationStatus__c` |
| **Custom Field (Extension)** | `[ParentConcept][Purpose]__c` | `ApplicationStatusDate__c` |
| **Page Layout** | `[ObjectName] - [Purpose]` | `Contact - Admissions` |
| **Record Type** | `[ObjectName] - [Type]` | `Account - Business` |
| **Validation Rule** | `[ObjectName]_[Purpose]` | `Account_Missing_Email` |

### Case Style Quick Reference

| Element | Style | Example |
|---------|-------|---------|
| API Names | PascalCase | `StudentApplicationStatus__c` |
| Labels | Title Case | `Student Application Status` |
| Descriptions | Sentence case | `Tracks the current status of the application.` |
| Validation Rule Names | Snake_Case | `Account_Missing_Status` |

### Field Documentation Checklist

When creating a custom field:

- [ ] API name follows naming convention
- [ ] Label is clear and in Title Case
- [ ] Description explains purpose and usage
- [ ] Help text guides user data entry
- [ ] Data owner is assigned
- [ ] Sensitivity level is classified
- [ ] Compliance category is assigned (if applicable)
- [ ] Field-level security is configured

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **Cryptic abbreviations** | `AppStat__c` is unclear | Use `ApplicationStatus__c` |
| **Missing descriptions** | No context for field purpose | Always add descriptions |
| **Duplicate fields** | `AccountType__c` when `Type` exists | Evaluate standard fields first |
| **Inconsistent casing** | Mix of styles across metadata | Follow PascalCase for APIs |
| **No data owner** | Orphaned fields with no accountability | Assign owner to every field |
| **Unclear validation messages** | "Error" doesn't help users | Write actionable error messages |

## Enforcement in Solutions

When designing solutions, the solutioning phase MUST:

1. **Validate all proposed metadata names** against this standard
2. **Document any deviations** in the risk register with justification
3. **Include naming validation** in acceptance criteria for new metadata
4. **Apply naming patterns** consistently across all solution components

## Related Standards

- [Flow Naming Conventions](flow-naming-conventions.md) - Flow-specific naming patterns
- [Apex Well-Architected Framework](apex-well-architected.md) - Apex code standards
- [LWC Well-Architected Framework](lwc-well-architected.md) - Component naming patterns
