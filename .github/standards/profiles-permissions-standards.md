---
standard_type: security
category: access-control
version: 1.0
last_updated: 2025-12-04
applies_to: salesforce, security, profiles, permission-sets, permission-set-groups, custom-permissions
---

# Salesforce Profiles & Permissions Standard

## 1. Purpose & Scope

This standard defines how we design and implement our Salesforce security model using:

* Profiles
* Permission Sets
* Permission Set Groups
* Muting Permission Sets
* Custom Permissions
* Roles / Sharing (record access – covered at a high level)

Goals:

1. Move to a **profile-light, permission-set-heavy** model.
2. Represent **business personas** as reusable **Personas** implemented via Permission Set Groups.
3. Ensure **least privilege**, maintainability, and clarity.
4. Make it easy for any admin/developer to understand and extend our security model without creating chaos.

This standard applies to **all** new Salesforce features and any refactoring of legacy access.

---

## 2. Conceptual Model

Think of user access as layered:

1. **User License** – defines what's even possible (Sales, Service, Platform, etc.).
2. **Profile** – base login shell and defaults (login hours/IP, default apps, record types, layouts).
3. **Capability Permission Sets** – additive blocks that grant object, app, and feature access.
4. **Personas (Permission Set Groups)** – bundles of capability permission sets that represent personas (e.g., "Service – Tier 1 Agent").
5. **Muting Permission Sets** – persona-specific removals of over-granted permissions inside a group.
6. **Custom Permissions** – feature/behavior flags for UI, Flows, and Apex.
7. **Record Access** – controlled via roles, sharing rules, teams, and manual sharing (not the focus of this doc, but must be consistent with it).

We design **capabilities** first (permission sets), then **personas** (permission set groups), and only use **profiles** where Salesforce forces us to.

---

## 3. Profiles

### 3.1 Role of Profiles

Profiles are **login shells and defaults**, not our primary authorization mechanism.

Profiles control:

* Login hours
* Login IP ranges
* Session settings
* Password policies (often inherited from org-level policy)
* Default apps
* Default record type per object
* Page layout assignment (Classic layouts / Lightning record pages via activation by app/profile/record type)

Profiles **should not** be used to define:

* Object CRUD or field-level security (FLS)
* App access (for new work)
* Feature-level permissions
* Persona-specific capabilities

These belong in permission sets and permission set groups.

### 3.2 When to Create or Modify a Profile

**Create or modify a profile only when you need a new combination of:**

* Login hours or login IP ranges
* Default apps
* Default record types / page layouts
* Profile-only flags that cannot be moved (e.g., some session settings)

**Do not create a new profile** because:

* A user needs one extra permission → use a permission set.
* A persona is slightly different from another → adjust the persona's permission set group.

### 3.3 Profile Naming

**Label pattern**

* `Profile – [License] – [Domain] – [Persona]`

  * Examples:

    * `Profile – Salesforce – Internal – Minimum Access`
    * `Profile – Salesforce – Service – Agent`
    * `Profile – Platform – Data Integrations`

**API Name pattern**

* `Profile_[License]_[Domain]_[Persona]`

  * `Profile_SF_Internal_MinAccess`
  * `Profile_SF_Service_Agent`
  * `Profile_Platform_DataIntegrations`

Do **not** encode object permissions or features into the profile name.

---

## 4. Permission Sets (Capabilities)

### 4.1 Role of Permission Sets

Permission Sets represent **capabilities**, not people.

Each permission set should answer: **"What capability does this grant?"**, not **"Who is this for?"**

We use three main types of capability permission sets:

1. **Data/Object Access** – CRUD+FLS for one or more closely related objects in a domain (plus optional object-specific overlays).
2. **App Access** – access to specific apps, tabs, and related navigation.
3. **Feature/Process Access** – access to specific features or processes.

### 4.2 Data/Object Access Permission Sets

**Purpose:** CRUD+FLS for one or more closely related objects that form a coherent business capability.

We support **two patterns** here:

1. **Domain/Data Access (multi-object)** – a small set of tightly related objects that always travel together in a given domain.
2. **Object-Specific Add-ons** – fine-grained sets for a single object when you need to override or supplement a domain set.

#### 4.2.1 Domain/Data Access Permission Sets (multi-object)

Use these where it would be artificial or noisy to split:

* `Domain Access – Enrollment Services – Core` (Case, Contact, Task/Event, core Enrollment Services custom objects)
* `Domain Access – Admissions – Core` (Lead, Contact, Opportunity, Admit Term, core Admissions custom objects)
* `Domain Access – Student Success – Core` (Case, Contact, Individualized Care records, core Student Success objects)
* `Domain Access – LCA – Core` (Lead, Contact, Assignment Rule objects for Traction Complete)

**Label pattern**

* `Domain Access – [Domain] – [Capability]`

  * `Domain Access – Enrollment Services – Core`
  * `Domain Access – Admissions – Core`
  * `Domain Access – Student Success – Read Only`

**API Name pattern**

* `DomainAccess_[Domain]_[Capability]`

  * `DomainAccess_EnrollmentServices_Core`
  * `DomainAccess_Admissions_Core`
  * `DomainAccess_StudentSuccess_ReadOnly`

Rules:

* Group **only objects that are tightly coupled in real workflows** for that domain.
* It should be reasonable to say: "If you can use this domain, you need access to all of these objects at this level."
* Do **not** dump unrelated objects into the same domain set (no kitchen sinks).

#### 4.2.2 Object-Specific Add-On Permission Sets

Use object-specific sets when you need finer control than the domain-level set provides.

Examples:

* `Object Access – Case – Supervisor Edit` (adds Delete or special fields above the core Enrollment Services domain level).
* `Object Access – Contact – FERPA Fields` (gives access to FERPA-protected student data for limited personas).
* `Object Access – Lead – LCA Admin` (gives access to Traction Complete assignment configuration fields).

**Label pattern**

* `Object Access – [Object] – [Capability]`

  * `Object Access – Case – Supervisor Edit`
  * `Object Access – Contact – FERPA Fields`
  * `Object Access – Lead – LCA Admin`

**API Name pattern**

* `ObjAccess_[Object]_[Capability]`

  * `ObjAccess_Case_SupervisorEdit`
  * `ObjAccess_Contact_FERPAFields`
  * `ObjAccess_Lead_LCAAdmin`

Rules:

* These are "overlay" sets used in addition to domain-level sets.
* Use them to:

  * Elevate access for a subset of personas (e.g., supervisors/managers).
  * Isolate FERPA-protected fields or PII from the general domain access.
  * Grant access to LCA/Traction Complete configuration fields for admins.

### 4.3 App Access Permission Sets

**Purpose:** Access to Lightning apps, tabs, and navigation.

**Label pattern**

* `App Access – [App/Domain] – [Scope]`

  * `App Access – Enrollment Console – Standard`
  * `App Access – Admissions Console – Advanced`
  * `App Access – Student Success Console – Standard`

**API Name pattern**

* `AppAccess_[AppShort]_[Scope]`

  * `AppAccess_EnrollmentConsole_Standard`
  * `AppAccess_AdmissionsConsole_Advanced`
  * `AppAccess_StudentSuccessConsole_Standard`

### 4.4 Feature/Process Access Permission Sets

**Purpose:** Feature-level capabilities not tied to a single object.

**Label pattern**

* `Feature Access – [Domain] – [Feature]`

  * `Feature Access – Knowledge – Author`
  * `Feature Access – Case – Bulk Close`
  * `Feature Access – LCA – Rule Management`
  * `Feature Access – Admissions – IC Segment Override`

**API Name pattern**

* `FeatureAccess_[Domain]_[Feature]`

  * `FeatureAccess_Knowledge_Author`
  * `FeatureAccess_Case_BulkClose`
  * `FeatureAccess_LCA_RuleManagement`
  * `FeatureAccess_Admissions_ICSegmentOverride`

Rules:

* A Feature Access perm set is the main home for:

  * App/tool access that doesn't map neatly to a single object.
  * Associated custom permissions for that feature.

---

## 5. Permission Set Groups (Personas)

### 5.1 Role of Permission Set Groups

Permission Set Groups (PSGs) represent **personas**. Each PSG bundles the capability permission sets a persona needs.

A PSG bundles the capability permission sets a persona needs. A muting permission set then removes any over-granted permissions for that persona.

### 5.2 PSG Naming

**Label pattern**

* `Access – [Domain] – [Persona]`

  * `Access – Enrollment Services – Tier 1 Agent`
  * `Access – Enrollment Services – Tier 2 Agent`
  * `Access – Admissions – Advisor`
  * `Access – Student Success – Coach`
  * `Access – LCA – Administrator`

**API Name pattern**

* `Access_[Domain]_[Persona]`

  * `Access_EnrollmentServices_Tier1Agent`
  * `Access_EnrollmentServices_Tier2Agent`
  * `Access_Admissions_Advisor`
  * `Access_StudentSuccess_Coach`
  * `Access_LCA_Administrator`

### 5.3 Muting Permission Sets in PSGs

Every PSG has an associated **muting permission set**.

**Label pattern**

* `Access – [Domain] – [Persona] – Muting`

  * `Access – Enrollment Services – Tier 1 Agent – Muting`

**Usage**

* Use muting to:

  * Remove `Delete` or `Modify All` access that a shared capability perm set might grant.
  * Strip advanced system permissions not appropriate for this persona.
* Do **not** use muting to compensate for fundamentally bad perm set design. If you're muting the same thing in multiple PSGs, revisit the underlying perm sets.

### 5.4 When to Create a New PSG vs Reuse

Create a new PSG when:

* There is a **new persona** with clearly distinct responsibilities from existing roles:

  * Different primary apps (Enrollment Console vs Admissions Console).
  * Different core object mix (Case-heavy vs Lead/Opportunity-heavy).
  * Different process responsibilities (can approve escalations, can override IC Segment assignments, can manage LCA rules).
* You repeatedly assign the same cluster of 3–5 permission sets to many users.

Do **not** create a PSG when:

* It will be used by exactly one person with a one-off use case.
* It differs from an existing PSG only by one minor feature that could be a separate Feature Access perm set or custom permission.

Pattern for "similar but more powerful" roles:

* Base PSG: `Access – Enrollment Services – Tier 1 Agent`
* Add-on Feature Access perm set: `Feature Access – Enrollment Services – Tier 2 Enhancements`
* Higher role = **Base PSG + Add-on**, not a fully cloned PSG.

---

## 6. Custom Permissions

### 6.1 Role of Custom Permissions

Custom Permissions are **feature and behavior flags**, especially for UI behavior on Lightning pages and Dynamic Forms.

We use custom permissions to:

* Control **component visibility** on Lightning record pages.
* Control **field/section/action visibility** in Dynamic Forms / Dynamic Actions.
* Gate **Flows** and **Apex** (e.g., supervisor-only paths, experimental features).
* Support carefully designed **validation-rule exceptions**.

We **do not** use custom permissions to replace CRUD/FLS.

### 6.2 Naming Custom Permissions

**Label pattern**

* `Can [Verb] [Object/Feature/Section]`

  * `Can View Student FERPA Data`
  * `Can Override IC Segment Assignment`
  * `Can Manage LCA Assignment Rules`
  * `Can Bypass Case Close Validation`
  * `Can View Admit Term Sensitive Fields`

**API Name pattern**

* `Can_[Verb]_[ObjectOrFeature]`

  * `Can_View_StudentFERPAData`
  * `Can_Override_ICSegmentAssignment`
  * `Can_Manage_LCAAssignmentRules`
  * `Can_Bypass_CaseCloseValidation`
  * `Can_View_AdmitTermSensitiveFields`

Rules:

* Name custom permissions **positively** (what the user *can* do).
* Scope each one to **a single behavior**.
* Assign them **via permission sets** (typically Feature Access perm sets), not directly via profiles.
* Document where they're used (Lightning visibility, Flow, Apex, validation).

### 6.3 When to Create vs Reuse a Custom Permission

Create a new custom permission when:

* You need to control a distinct behavior:

  * Showing/hiding a specific component or page section.
  * Enabling a specific Flow path or Apex feature.
* That behavior will likely be reused across multiple pages, flows, or Apex entry points.

Reuse an existing custom permission when:

* The behavior you're gating is conceptually **the same power** already controlled elsewhere (e.g., "override advisor assignment" should use the same custom perm everywhere).

---

## 7. Record Types & Page Layouts

### 7.1 Objectives

Our org uses many record types and personas. We want to avoid:

* "Record type soup" (too many, poorly understood record types).
* Layout confusion (users seeing the wrong fields or flows).

### 7.2 Rules

1. **Record Type Access**

   * Profiles and permission sets can both grant record type access.
   * For new design, grant record type **visibility** primarily via permission sets.

2. **Default Record Types**

   * Default record type per object is controlled by **profile**.
   * Choose the default based on:

     * The persona's most common creation scenario.
     * The primary process they own.
   * If a user legitimately works across very different processes, consider a separate persona/PSG rather than overloading one profile.

3. **Page Layouts / Lightning Record Pages**

   * Controlled by **profile** (and record type, app, form factor).
   * Align page layouts with **record type + persona** as much as possible.
   * Use Dynamic Forms to reduce the number of separate layouts when appropriate, but still respect record type semantics.

4. **Permission Sets and Record Types**

   * Use dedicated perm sets like `Object Access – Case – Escalation RT` or `Object Access – Lead – Prospective Student RT` to grant access to specific record types.
   * Use these in PSGs to control which personas can create/own given record types (e.g., only Admissions Advisors can create Prospective Student leads).

---

## 8. When to Create vs Reuse: Summary Heuristics

### 8.1 Profiles

Create or modify a profile when:

* Login hours / IP / session settings or default apps/record types/layouts must differ.

Otherwise:

* **Reuse** existing profiles and adjust PSG/perm sets.

### 8.2 Permission Sets

**Edit an existing permission set when all are true:**

* The new access is part of the **same capability** the perm set already represents.
* Every persona that uses this perm set **should** receive this new access.
* The perm set is used in only a few PSGs and all target personas align with the capability.

**Create a new permission set when any are true:**

* The new access represents a **distinct capability** (different object or feature area).
* Only some of the personas using the current perm set should get the new permission.
* You're tempted to add a permission and then mute it for multiple PSGs.

Heuristics:

* If a perm set covers objects from **different domains** (e.g., Service + Marketing + Finance), split by domain.
* If a perm set's description can't be summarized as a single capability (e.g., "random stuff"), it's too broad.
* If you can't imagine at least two personas using a capability perm set, rethink its scope or whether it belongs in an existing domain or object add-on perm set.

### 8.3 Permission Set Groups

Create a new PSG (Persona) when:

* A new persona has clearly distinct responsibilities.
* A repeatable pattern of 3–5 perm sets is being assigned to many users.

Do not create a new PSG when:

* It would be used by only one user with a temporary need.
* The difference from an existing PSG is a single minor feature that can be handled via an add-on Feature Access perm set or custom permission.

### 8.4 Custom Permissions

Create a new custom permission when:

* You need to control a clear, reusable behavior across UI/Flow/Apex.

Reuse an existing custom permission when:

* You're gating the same conceptual capability as an existing custom permission.

---

## 9. Anti-Patterns to Avoid

Raise a flag in design/code review if you see:

* Permission set labels that look like personas (e.g., `Sales Manager`) instead of capabilities.
* PSG labels that do not start with `Access –`.
* Permission sets that touch many unrelated objects with no clear theme.
* Cloned PSGs that differ only by one or two permissions.
* Custom permissions whose names do not start with `Can_` or that combine multiple unrelated behaviors.
* New profiles created just to fix individual permission gaps.

These are signs that the model is drifting toward unmaintainable complexity.

---

## 10. Implementation Checklist

When designing access for a **new feature**:

1. Identify impacted objects, apps, and features.
2. Decide whether access is:

   * Data/Object access (Domain/Data or Object-Specific Access perm set).
   * App/navigation (App Access perm set).
   * Feature/process behavior (Feature Access perm set + custom permission).
3. Update or create capability perm sets as per rules above.
4. Update relevant PSGs (Personas) to include new capability perm sets.
5. Configure muting permissions on PSGs if any over-granted permissions must be removed.
6. If UI/behavior gating is needed, design and create custom permissions and wire them into Lightning visibility rules, Dynamic Forms, Flows, and Apex.
7. Update documentation (feature spec, knowledge, runbooks) to reference:

   * Profiles used.
   * Permission sets and PSGs involved.
   * Custom permissions and where they are checked.

When onboarding a **new persona**:

1. Document what they need to do (objects, apps, features).
2. Reuse existing capability perm sets where possible.
3. Create a new PSG (Persona) if needed, or reuse existing and add add-on perm sets.
4. Confirm the assigned profile's defaults align with their primary record types/layouts.

---

## 11. For New Team Members

If you are new to this team, here's the quick mental model:

1. **Profiles** = login shell + defaults only. Do not add auth here unless Salesforce forces you to.
2. **Permission Sets** = capabilities (object, app, feature). They are small, reusable building blocks.
3. **Permission Set Groups** = personas. They bundle capabilities; muting enforces least privilege.
4. **Custom Permissions** = feature/behavior flags used in UI/Flow/Apex, especially on Lightning pages.
5. When in doubt, ask:

   * Is this a **capability** (permission set)?
   * Is this a **persona** (permission set group)?
   * Is this a **default/login constraint** (profile)?
   * Is this a **behavioral toggle** (custom permission)?

Following this standard keeps the org secure, understandable, and maintainable as we continue to add more personas, record types, and features.
