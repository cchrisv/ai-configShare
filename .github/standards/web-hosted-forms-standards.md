# Web Hosted Forms Architecture Standards

> **Version**: 1.0  
> **Last Updated**: January 2025  
> **Status**: Active  
> **Source**: UMGC Integration Services Architecture

## Purpose

This document establishes architectural standards for web-hosted forms that create Cases or Leads in Salesforce. It defines the approved integration patterns and explicitly prohibits anti-patterns that bypass our enterprise integration architecture.

## Scope

These standards apply to:
- Student-facing web forms on umgc.edu (AEM-hosted)
- Any external web form that needs to create Salesforce Cases or Leads
- Third-party form integrations
- Internal applications generating Cases or Leads from web interfaces

## Core Principles

### 1. AEM Owns Student-Facing Web Forms

The Adobe Experience Manager (AEM) team for umgc.edu owns all student-facing web forms. Forms should not be implemented directly within Salesforce for public-facing use cases.

### 2. MuleSoft is the Integration Gateway

All external systems (including AEM web forms) MUST route through MuleSoft APIs to create Cases or Leads in Salesforce. This provides:

- **Centralized governance** – Single point for authentication, authorization, and rate limiting
- **Data transformation** – Consistent mapping to Salesforce objects
- **Guaranteed delivery** – Azure Service Bus integration for reliability
- **Monitoring & alerting** – Unified observability through MuleSoft Runtime Manager
- **Error handling** – Standardized retry logic and failure notifications

### 3. Web-to-Case and Web-to-Lead are Prohibited

Salesforce's native Web-to-Case and Web-to-Lead features are **NOT PERMITTED** for new implementations.

## Approved Architecture

### Integration Pattern

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AEM Web Form  │────▶│   client-ea     │────▶│    crm-ea       │────▶│   Salesforce    │
│   (umgc.edu)    │     │   (MuleSoft)    │     │   (MuleSoft)    │     │   (Cases/Leads) │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Azure Service   │
                        │ Bus (GD Queue)  │
                        └─────────────────┘
```

### MuleSoft API Endpoints

| Purpose | API | Endpoint | Method | Processing |
|---------|-----|----------|--------|------------|
| Create/Update Cases | crm-ea | `/v1/cases` | PUT | Sync or Async |
| Create Leads | crm-ea | `/v1/leads` | PUT | Synchronous |
| AEM Web Forms – Cases | client-ea | `/aem/webForms/cases` | POST | Asynchronous |
| AEM Web Forms – Leads | client-ea | `/aem/webForms/contacts/leads` | POST | Synchronous |

### Processing Modes

| Source System | Processing Mode | Guaranteed Delivery |
|---------------|-----------------|---------------------|
| `WEB_FORM_EMAIL_UNSUBSCRIBE` | Asynchronous | ✅ Yes (5 retries) |
| Standard Case Creation | Synchronous | ❌ No |
| Lead Creation | Synchronous | ❌ No |

### Asynchronous Flow (Recommended for High-Volume Forms)

1. AEM web form submits to `client-ea` API
2. Request is published to Azure Service Bus using MuleSoft GD Connector
3. Listener in the same API dequeues and processes the message
4. Message is routed to `crm-ea` for Salesforce upsert
5. On success, message is acknowledged and removed from queue
6. On failure, message is logged to Error DB and alerts are sent

### Synchronous Flow (Real-Time Requirements)

1. AEM web form submits to `client-ea` API
2. `client-ea` immediately calls `crm-ea`
3. `crm-ea` performs Salesforce operation
4. Response returned to AEM in real-time

## Anti-Patterns (Prohibited)

### ❌ Web-to-Case

**Do NOT use Salesforce Web-to-Case feature.**

Reasons:
- Bypasses enterprise integration layer
- No centralized monitoring or alerting
- Limited data transformation capabilities
- No guaranteed delivery
- Difficult to trace and debug issues
- Creates direct dependency between web forms and Salesforce

### ❌ Web-to-Lead

**Do NOT use Salesforce Web-to-Lead feature.**

Reasons:
- Same issues as Web-to-Case
- Cannot leverage existing duplicate detection logic in MuleSoft
- No ability to match against existing Leads/Contacts before creation
- No SMS opt-in integration

### ❌ Direct Salesforce API Calls from Web Forms

**Do NOT call Salesforce REST/SOAP APIs directly from web applications.**

Reasons:
- Exposes Salesforce credentials to client-side code
- No rate limiting or throttling
- Bypasses data validation and transformation rules
- No audit trail through integration layer

### ❌ Email-to-Case for Form Submissions

**Do NOT use Email-to-Case as a workaround for web form integration.**

Reasons:
- Unreliable delivery
- Complex parsing requirements
- No structured data validation

## Case Creation Logic

When creating Cases via the approved integration:

1. **Contact Lookup** – First attempt to match against existing Contact
2. **Lead Lookup** – If no Contact found, attempt to match against existing Lead
3. **Case Association**:
   - If Contact found → Create Case associated with Contact
   - If Lead found → Create Case by mapping Lead data
   - If neither found → Create standalone Case

## Implementation Guidelines

### For AEM Web Development Team

1. **Use the `client-ea` API** for all web form submissions
2. **Request API credentials** from the Integration team via API Manager
3. **Include required fields** in all submissions:
   - `sourceSystem` – Identifies the form origin
   - `correlationId` – For end-to-end tracing
4. **Handle responses appropriately**:
   - Async endpoints return 202 Accepted
   - Sync endpoints return 200 with Salesforce ID

### For Integration Team

1. **Maintain client-ea and crm-ea APIs** per MuleSoft development standards
2. **Configure alerts** in Runtime Manager for form processing failures
3. **Monitor Azure Service Bus** queue depths and dead-letter queues
4. **Coordinate with AEM team** before and after deployments

### For Salesforce Development Team

1. **Do NOT create Web-to-Case or Web-to-Lead setups**
2. **Ensure Case and Lead objects** have appropriate API-accessible fields
3. **Implement validation rules** that work for both UI and API submissions
4. **Use Trigger Actions Framework** for any automation on Case/Lead creation

## API Access Configuration

### Obtaining Credentials

1. Create an application in MuleSoft API Manager (e.g., `AEM-web-team`)
2. Request access to the `client-ea` instance for the appropriate environment
3. Once approved, obtain the client ID and client secret
4. Store credentials securely; never embed in client-side code

### Environment Endpoints

| Environment | Host | Base Path |
|-------------|------|-----------|
| Development | `svcgateway-nonprod.umgc.edu` | `/dev-crm-ea/` |
| QAT | `svcgateway-nonprod.umgc.edu` | `/qat-crm-ea/` |
| Staging | `svcgateway-nonprod.umgc.edu` | `/stg-crm-ea/` |
| Production | `svcgateway.umgc.edu` | `/crm-ea/` |

## Monitoring & Alerting

### Configured Alerts

| Alert Name | Severity | Condition |
|------------|----------|-----------|
| `client-ea-cases` | Critical | Errors in `put-cases-flow` |
| `exp-crm web form alert` | Warning | SF:BAD_REQUEST errors |
| `AEM Team Alert for Leads` | Warning | FIELD_CUSTOM_VALIDATION_EXCEPTION errors |
| `client-ea-email-unsubscribe` | Critical | Errors in `aem-webforms-cases-sub-flow` |

### Escalation Contacts

| Name | Role |
|------|------|
| Alfred Mbwembwe | Product Owner – Integration Services |
| Chris Tatem | Principal Architect |
| Abhilash Karnati | Team Lead |

## Migration Path for Existing Web-to-Case/Lead

If you have existing Web-to-Case or Web-to-Lead implementations:

1. **Inventory** all current Web-to-Case and Web-to-Lead configurations
2. **Prioritize** based on volume and business criticality
3. **Coordinate with Integration team** to set up equivalent MuleSoft endpoints
4. **Update web forms** to call the new API endpoints
5. **Run in parallel** during testing phase
6. **Disable legacy Web-to-X** once migration is validated
7. **Update documentation** and communicate changes to stakeholders

## References

- [MuleSoft Developer Guide](/Integration-Services/Developer-Notes/MuleSoft-Developer-Guide-(from-MuleSoft))
- [client-ea Implementation Notes](/Integration-Services/Implementation-Notes/client-ea)
- [crm-ea Implementation Notes](/Integration-Services/Implementation-Notes/exp*-(experience-layer-code)/crm-ea)
- [AEM Webform Integration Flows](/Integration-Services/Production-MuleSoft-Support/Application-Support-Pages/crm-ea/AEM-Webform-Integration-Flows)
- [Salesforce Architect Decision Guide - Integration Patterns](https://architect.salesforce.com/decision-guides/integration-patterns)

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Architecture Team | Initial release |
