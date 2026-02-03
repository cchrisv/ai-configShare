# Profiles & Permissions Standards - Recommended Updates

Based on research of current Salesforce best practices (December 2025), here are recommended enhancements to our Profiles & Permissions Standards.

---

## 1. Add Apex Security Enforcement Section

### Gap Identified
The current standard focuses on declarative security (permission sets, profiles) but lacks guidance on **programmatic security enforcement in Apex code**.

### Recommended Addition: Section 12 - Apex Security Enforcement

```markdown
## 12. Apex Security Enforcement

### 12.1 Enforcing Object and Field Permissions in Apex

Apex code runs in **system context** by default, bypassing user permissions. Developers must explicitly enforce security.

**Required Practices:**

1. **Use `with sharing` keyword** on all classes that access user data:
   ```apex
   public with sharing class EnrollmentCaseService {
       // Respects sharing rules
   }
   ```

2. **Enforce FLS with `WITH SECURITY_ENFORCED`** for read operations:
   ```apex
   SELECT Id, Name, FERPA_Flag__c FROM Contact 
   WHERE Id = :contactId 
   WITH SECURITY_ENFORCED
   ```

3. **Use `Security.stripInaccessible()`** for DML operations:
   ```apex
   List<Contact> contacts = [SELECT Id, Name, FERPA_Flag__c FROM Contact];
   SObjectAccessDecision decision = Security.stripInaccessible(
       AccessType.READABLE, contacts
   );
   List<Contact> sanitizedContacts = decision.getRecords();
   ```

4. **Check permissions explicitly** before sensitive operations:
   ```apex
   if (Schema.sObjectType.Contact.fields.FERPA_Flag__c.isAccessible()) {
       // Proceed with FERPA field access
   }
   ```

### 12.2 Checking Custom Permissions in Apex

Use `FeatureManagement.checkPermission()` to gate features:

```apex
public class ICSegmentService {
    public static void overrideSegment(Id contactId, String newSegment) {
        if (!FeatureManagement.checkPermission('Can_Override_ICSegmentAssignment')) {
            throw new SecurityException('Insufficient permissions to override IC Segment');
        }
        // Proceed with override logic
    }
}
```

**Best Practices:**
- Always use the API name of the custom permission (e.g., `Can_Override_ICSegmentAssignment`)
- Fail securely with meaningful error messages
- Log security denials for audit purposes

### 12.3 Checking Custom Permissions in Flow

Use the `$Permission` global variable:
```
{!$Permission.Can_Override_ICSegmentAssignment}
```

Use Decision elements to gate supervisor-only paths.

### 12.4 Elevated Permissions Pattern (User Mode with Permission Set)

For scenarios requiring temporary elevation, use `AccessLevel.withPermissionSetId()`:

```apex
@isTest
public class ElevatedAccessExample {
    public static void createRecordWithElevation(Account acc, Id permSetId) {
        // Run in user mode but with additional permission set
        Database.insert(acc, AccessLevel.User_mode.withPermissionSetId(permSetId));
        // Elevation is NOT persisted to subsequent operations
    }
}
```

**Important**: Elevated access is not persisted—each operation requires explicit elevation.
```

---

## 2. Add Permission Set Group Testing Section

### Gap Identified
No guidance on testing permission set groups in Apex tests, which is critical for CI/CD pipelines.

### Recommended Addition: Section 12.5

```markdown
### 12.5 Testing Permission Set Groups in Apex

When tests depend on PSG permissions, use `Test.calculatePermissionSetGroup()`:

```apex
@isTest 
public class EnrollmentAgentTest {
    @isTest 
    static void testTier1AgentAccess() {
        // Get the PSG by developer name
        PermissionSetGroup psg = [
            SELECT Id, Status 
            FROM PermissionSetGroup 
            WHERE DeveloperName = 'Access_EnrollmentServices_Tier1Agent'
        ];
        
        // Force calculation if PSG is not yet calculated
        if (psg.Status != 'Updated') {
            Test.calculatePermissionSetGroup(psg.Id);
        }
        
        // Create test user with minimum access profile
        User testUser = TestDataFactory.createUser('Profile_SF_Internal_MinAccess');
        
        // Assign PSG to test user
        insert new PermissionSetAssignment(
            PermissionSetGroupId = psg.Id, 
            AssigneeId = testUser.Id
        );
        
        System.runAs(testUser) {
            // Test that user can perform expected operations
            Test.startTest();
            EnrollmentCaseService.createCase('Test Case');
            Test.stopTest();
            
            // Assert expected behavior
        }
    }
}
```

**Key Points:**
- PSGs may be in "Outdated" status after deployment; use `Test.calculatePermissionSetGroup()` to force recalculation
- Always test with realistic user contexts using `System.runAs()`
- Validate both positive (can do) and negative (cannot do) scenarios
```

---

## 3. Add Session-Based Permission Sets Section

### Gap Identified
No guidance on session-based permission sets (SBPS), which are increasingly important for just-in-time access.

### Recommended Addition: Section 13

```markdown
## 13. Session-Based Permission Sets (Advanced)

### 13.1 When to Use Session-Based Permission Sets

Session-Based Permission Sets (SBPS) grant temporary, elevated access that expires when the session ends.

**Use SBPS for:**
- Temporary supervisor escalation
- Sensitive data access requiring re-authentication
- Audit-sensitive operations (e.g., FERPA data access)

**Example Naming:**
- `Session Access – FERPA – Elevated View`
- `Session Access – LCA – Emergency Override`

**API Name:**
- `SessionAccess_FERPA_ElevatedView`
- `SessionAccess_LCA_EmergencyOverride`

### 13.2 Activating Session-Based Permission Sets

Activation happens via Flow, Apex, or Connect API:

```apex
// Activate session-based permission set
SessionPermissionSetActivation activation = new SessionPermissionSetActivation(
    PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'SessionAccess_FERPA_ElevatedView'].Id,
    UserId = UserInfo.getUserId()
);
// Activation automatically expires at session end
```

### 13.3 Rules
- Always log activation events for audit
- Combine with MFA or step-up authentication when possible
- Do not use SBPS as a workaround for proper PSG design
```

---

## 4. Enhance Custom Permissions Section with Documentation Requirements

### Gap Identified
No requirement to document where custom permissions are used, making them hard to maintain.

### Recommended Addition to Section 6.2

```markdown
### 6.4 Custom Permission Documentation Requirements

Every custom permission MUST have:

1. **Description Field** (in Salesforce):
   - What behavior it controls
   - Where it is checked (Lightning page, Flow, Apex class, validation rule)
   
2. **Code Comments** (in Apex/Flow):
   ```apex
   // Custom Permission: Can_Override_ICSegmentAssignment
   // Allows: Supervisors to override automatic IC Segment assignments
   // Used in: ICSegmentService.overrideSegment(), IC_Segment_Override_Screen_Flow
   if (FeatureManagement.checkPermission('Can_Override_ICSegmentAssignment')) {
   ```

3. **Permission Set Membership Log** (in wiki or documentation):
   | Custom Permission | Included In | Description |
   |-------------------|-------------|-------------|
   | `Can_Override_ICSegmentAssignment` | `FeatureAccess_Admissions_ICSegmentOverride` | IC Segment manual override |
   | `Can_View_StudentFERPAData` | `ObjAccess_Contact_FERPAFields` | FERPA field visibility |
```

---

## 5. Add Integration User Section

### Gap Identified
No guidance on security model for integration users and API-only access.

### Recommended Addition: Section 14

```markdown
## 14. Integration Users and API Access

### 14.1 Integration User Profiles

Integration users (system-to-system) should use:

**Profile Naming:**
- `Profile – Integration – [System] – [Purpose]`
  - `Profile – Integration – MuleSoft – DataSync`
  - `Profile – Integration – Marketing Cloud – ContactSync`

**API Name:**
- `Profile_Int_[System]_[Purpose]`

### 14.2 Integration Permission Sets

Integration-specific capabilities:

**Naming:**
- `Integration Access – [System] – [Capability]`
  - `Integration Access – MuleSoft – Contact Read`
  - `Integration Access – Marketing Cloud – Lead Sync`

**API Name:**
- `IntAccess_[System]_[Capability]`

### 14.3 Rules

1. **Principle of Least Privilege**: Grant only the specific objects/fields the integration needs
2. **No UI Access**: Integration profiles should have "API Only User" enabled where possible
3. **Separate by System**: Each external system should have its own integration user
4. **Audit Fields**: Integration users should have access to audit fields (`CreatedById`, `LastModifiedById`) for sync purposes
5. **Named Credentials**: Always use Named Credentials for outbound callouts—never hardcode credentials
```

---

## 6. Add Permission Set Audit Section

### Gap Identified
No guidance on ongoing governance and audit of the permission model.

### Recommended Addition: Section 15

```markdown
## 15. Permission Model Governance

### 15.1 Quarterly Permission Audit

Every quarter, review:

1. **Unused Permission Sets**: Remove or archive permission sets with zero assignments
2. **Orphaned PSG Assignments**: Users with PSGs no longer matching their role
3. **Permission Set Sprawl**: Consolidate similar permission sets
4. **Custom Permission Orphans**: Custom permissions not referenced anywhere

### 15.2 Permission Set Metadata Best Practices

1. **Include descriptions** in all permission set metadata:
   ```xml
   <PermissionSet>
       <label>Domain Access – Enrollment Services – Core</label>
       <description>
           Core CRUD+FLS for Enrollment Services domain: Case, Contact, Task, Event, 
           and related custom objects. Assigned via PSG to Enrollment agents.
       </description>
   </PermissionSet>
   ```

2. **Use Permission Set Groups** in deployments:
   - Deploy capability permission sets first
   - Deploy PSGs that bundle them
   - Assign PSGs to users (not individual permission sets)

### 15.3 CI/CD Considerations

1. **Test PSG assignments** before deployment (see Section 12.5)
2. **Validate permission set dependencies** in pre-deployment scripts
3. **Use destructive changes carefully** for permission removals—these can break user access
```

---

## 7. Summary of Recommended Changes

| Section | Addition | Priority |
|---------|----------|----------|
| **12. Apex Security Enforcement** | FLS, sharing, custom permission checks | High |
| **12.5 PSG Testing** | `Test.calculatePermissionSetGroup()` patterns | High |
| **13. Session-Based Permission Sets** | SBPS for temporary elevation | Medium |
| **6.4 Custom Permission Docs** | Documentation requirements | Medium |
| **14. Integration Users** | API/system integration patterns | Medium |
| **15. Permission Governance** | Quarterly audit, CI/CD practices | Medium |

---

## Implementation Notes

1. **Version Bump**: Update standard to v1.1 after incorporating changes
2. **Wiki Update**: Sync changes to Azure DevOps wiki
3. **Training**: Consider Trailhead trail for team onboarding:
   - [Data Security Module](https://trailhead.salesforce.com/content/learn/modules/data_security)
   - [Permission Set Groups Module](https://trailhead.salesforce.com/content/learn/modules/permission-set-groups)

---

*Generated: December 2025*
*Based on: Salesforce Apex Developer Guide, Trailhead Best Practices, Well-Architected Framework*
