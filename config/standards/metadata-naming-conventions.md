# Salesforce Metadata Naming Conventions

## Principles

PascalCase APIs · Title Case labels · Sentence case descriptions · no abbreviations (unless industry-standard) · no Salesforce-reserved words (`Type`, `Name`, `Id`) · always evaluate standard objects/fields first.

## Custom Objects

| Type | API | Label | Example |
|------|-----|-------|---------|
| Standalone | `[DescriptiveName]__c` | `[Descriptive Name]` | `ErrorLog__c` |
| Extension | `[ParentObject][Purpose]__c` | `[Parent Object] [Purpose]` | `ApplicationFeeWaiver__c` |

Evaluate standard objects first → leverage record types → create custom only when standard can't fit.

## Custom Fields

| Type | API | Example |
|------|-----|---------|
| Standalone | `[DescriptiveName]__c` | `ApplicationStatus__c` |
| Extension | `[ParentConcept][Purpose]__c` | `ApplicationStatusDate__c`, `ApplicationStatusReason__c` |

Evaluate standard fields first → avoid duplication → assess reporting impact.

**Required documentation:** Description (clear purpose, not "Date field") · Help Text (user guidance) · Data Owner · Sensitivity (Public/Confidential/Highly Confidential) · Compliance (PII/PHI/Financial/N/A).

## Page Layouts & Record Pages

| Type | Convention | Example |
|------|-----------|---------|
| Page Layout | `[Object] - [Purpose/Role/Process]` | `Contact - Admissions` |
| Lightning Record Page | `[Object] Record Page - [Purpose]` | `Account Record Page - Default` |

## Record Types

API: PascalCase `[RecordTypeName]` · Label: `[Object] - [Type]` (e.g., `Account - Business`, `Contact - Student`, `Case - Support`)

## Validation Rules

API: `[ObjectName]_[Purpose]` · field-level errors when possible · clear user-friendly messages · bypass mechanism for migrations.

Examples: `Account_Missing_Email` · `Opportunity_Missing_Close_Date` · `Case_Priority_Requires_Description`

## Anti-Patterns

Cryptic abbreviations (`AppStat__c` → `ApplicationStatus__c`) · missing descriptions · duplicate of standard fields · inconsistent casing · no data owner · unclear validation messages.

## Enforcement

Solutioning phase MUST: validate names against this standard · document deviations · include naming validation in acceptance criteria.

**Field checklist:** API convention ✓ · Title Case label ✓ · description ✓ · help text ✓ · data owner ✓ · sensitivity ✓ · compliance ✓ · FLS ✓
