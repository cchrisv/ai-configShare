---
standard_type: lwc
category: architecture
version: 1.0
last_updated: 2025-11-25
source_url: https://dev.azure.com/UMGC/Digital%20Platforms/_wiki/wikis/Digital%20Platforms%20Wiki/8875/Lightning-Web-Component-Well-Architected-Framework
applies_to: salesforce, lightning-web-components, frontend, ui
---

# Lightning Web Component Well-Architected Framework

## Overview

The Lightning Web Component Well-Architected Framework provides a structured approach to building scalable, maintainable Salesforce interfaces using the atomic design pattern. This framework transforms component development from building individual pages to building comprehensive design systems that enable rapid, consistent interface construction.

## Core Philosophy: Building Systems, Not Pages

The fundamental shift in this framework is moving from asking "How do I build this page?" to asking "What system of reusable components will build this page and every future page?" This transformation creates:

- **Faster Development**: Assembling proven components rather than building from scratch
- **Consistent UX**: Users experience predictable, learnable interfaces
- **Easier Maintenance**: Changes happen in one place and benefit everywhere
- **Better Team Collaboration**: Clear patterns enable parallel development

## The Atomic Design Pattern

The atomic design pattern uses chemistry as a metaphor for building interface hierarchies. Components build upon each other to create increasingly complex and complete user experiences.

### The Seven Levels

| Level | Prefix | Full Format | Example | Data Fetching | Business Logic |
|-------|--------|-------------|---------|---------------|----------------|
| Atom | `Atom` | `{app}Atom{Name}` | `coreAtomButton` | Never | Never |
| Molecule | `Molecule` | `{app}Molecule{Name}` | `coreMoleculeSearchBar` | Never | Simple coordination |
| Organism | `Organism` | `{app}Organism{Name}` | `emplidLoaderOrganismStudentSearch` | Yes | Yes |
| Template | `Template` | `{app}Template{Name}` | `coreTemplateListView` | Never | Never |
| Page | `Page` | `{app}Page{Name}` | `emplidLoaderPageEmplidManager` | Orchestration | Process coordination |
| Utility | `Utility` | `{app}Utility{Name}` | `coreUtilityFormatters` | Varies | Technical services |
| Flow | `Flow` | `{app}Flow{Name}` | `admissionsFlowApplicationSelector` | Via delegation | Via delegation |

### Level 1: Atoms

Atoms are the smallest functional units—components that cannot be broken down further while maintaining usefulness.

**Characteristics:**
- Do one thing exceptionally well
- Receive data through properties only
- Communicate through simple events
- Never fetch data or implement business logic
- Purely presentational or simple interaction

**Examples:**
- `coreAtomButton` - Consistent button styling and behavior
- `coreAtomBadge` - Status indicator display
- `coreAtomCurrencyDisplay` - Monetary value formatting
- `coreAtomFormattedDate` - Date formatting
- `emplidLoaderAtomIdBadge` - Emplid-specific ID display
- `admissionsAtomStatusIndicator` - Application status display

**Template:**
```javascript
// coreAtomButton.js
import { LightningElement, api } from 'lwc';

export default class CoreAtomButton extends LightningElement {
    /** Button label text */
    @api label = '';
    
    /** Button variant: base, brand, destructive, success */
    @api variant = 'base';
    
    /** Whether button is disabled */
    @api disabled = false;

    handleClick(event) {
        // Emit simple event - describe what happened, not what should happen
        this.dispatchEvent(new CustomEvent('click', {
            detail: { timestamp: Date.now() }
        }));
    }
}
```

### Level 2: Molecules

Molecules combine multiple atoms to create functional units that handle specific interaction patterns.

**Characteristics:**
- Combine 2-5 atoms typically
- Manage local state for coordination
- Transform child events into meaningful parent events
- Represent single interaction patterns
- Don't fetch external data

**Examples:**
- `coreMoleculeSearchBar` - Input + button + icon coordination
- `coreMoleculeFormField` - Label + input + validation display
- `coreMoleculeRecordHeader` - Avatar + title + subtitle + actions
- `emplidLoaderMoleculeIdValidation` - ID format validation display
- `admissionsMoleculeApplicationSummary` - Application quick view

**Template:**
```javascript
// coreMoleculeSearchBar.js
import { LightningElement, api, track } from 'lwc';

export default class CoreMoleculeSearchBar extends LightningElement {
    /** Placeholder text for search input */
    @api placeholder = 'Search...';
    
    /** Minimum characters before emitting search */
    @api minCharacters = 3;

    @track searchTerm = '';

    handleInputChange(event) {
        this.searchTerm = event.target.value;
    }

    handleSearch() {
        if (this.searchTerm.length >= this.minCharacters) {
            this.dispatchEvent(new CustomEvent('search', {
                detail: { searchTerm: this.searchTerm }
            }));
        }
    }

    handleClear() {
        this.searchTerm = '';
        this.dispatchEvent(new CustomEvent('clear'));
    }
}
```

### Level 3: Organisms

Organisms are business-aware components that understand Salesforce data, implement business rules, and manage complex state.

**Characteristics:**
- Clear business domain focus
- Fetch data through wire adapters or Apex
- Implement business rules
- Comprehensive error and loading states
- Work across contexts (desktop, mobile, Experience Cloud)
- Respect field-level security and sharing

**Examples:**
- `coreOrganismAccountCard` - Complete account display with actions
- `coreOrganismRelatedList` - Generic related record display
- `emplidLoaderOrganismStudentSearch` - Student lookup with ID validation
- `emplidLoaderOrganismBatchUploader` - Bulk ID upload interface
- `admissionsOrganismApplicationCard` - Application display with actions

**Template:**
```javascript
// coreOrganismAccountCard.js
import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import ACCOUNT_INDUSTRY from '@salesforce/schema/Account.Industry';
import ACCOUNT_TIER from '@salesforce/schema/Account.CustomerTier__c';

const FIELDS = [ACCOUNT_NAME, ACCOUNT_INDUSTRY, ACCOUNT_TIER];

export default class CoreOrganismAccountCard extends LightningElement {
    /** Account record ID */
    @api recordId;
    
    /** Whether to show action buttons */
    @api showActions = true;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    account;

    get accountName() {
        return getFieldValue(this.account.data, ACCOUNT_NAME);
    }

    get industry() {
        return getFieldValue(this.account.data, ACCOUNT_INDUSTRY);
    }

    get customerTier() {
        return getFieldValue(this.account.data, ACCOUNT_TIER);
    }

    get isLoading() {
        return !this.account.data && !this.account.error;
    }

    get hasError() {
        return !!this.account.error;
    }

    get tierBadgeVariant() {
        // Business logic: determine badge styling based on tier
        const tier = this.customerTier;
        if (tier === 'Gold') return 'success';
        if (tier === 'Silver') return 'warning';
        return 'default';
    }

    handleEdit() {
        this.dispatchEvent(new CustomEvent('edit', {
            detail: { recordId: this.recordId }
        }));
    }
}
```

### Level 4: Templates

Templates define structural patterns without committing to specific content. They establish spatial relationships and information hierarchy.

**Characteristics:**
- Define layout regions using slots
- Responsive design for different screen sizes
- No hard-coded content or business logic
- Coordinate between regions
- Flexible for various content types

**Examples:**
- `coreTemplateListView` - Header, filters, scrollable content
- `coreTemplateDetailPage` - Header, main content, sidebar
- `coreTemplateMasterDetail` - List panel + detail panel
- `emplidLoaderTemplateUploadWizard` - Multi-step upload flow
- `admissionsTemplateApplicationReview` - Review workflow layout

**Template:**
```html
<!-- coreTemplateListView.html -->
<template>
    <div class="slds-grid slds-grid_vertical">
        <!-- Header Region -->
        <div class="slds-col header-region">
            <slot name="header"></slot>
        </div>
        
        <!-- Filter Region -->
        <div class="slds-col filter-region">
            <slot name="filters"></slot>
        </div>
        
        <!-- Search Region -->
        <div class="slds-col search-region">
            <slot name="search"></slot>
        </div>
        
        <!-- Content Region - Scrollable -->
        <div class="slds-col content-region slds-scrollable_y">
            <slot name="content"></slot>
        </div>
        
        <!-- Footer Region -->
        <div class="slds-col footer-region">
            <slot name="footer"></slot>
        </div>
    </div>
</template>
```

### Level 5: Pages

Pages combine templates with specific organisms to serve specific user needs. They implement complete business processes and handle navigation.

**Characteristics:**
- Select appropriate templates
- Orchestrate data flow between organisms
- Implement complete user journeys
- Handle navigation and routing
- Connect to real data sources

**Examples:**
- `corePageAccountList` - Browse and search accounts
- `emplidLoaderPageEmplidManager` - Main Emplid management interface
- `emplidLoaderPageBatchHistory` - Upload history and status
- `admissionsPageApplicationDashboard` - Application overview
- `journeyBuilderPageJourneyDashboard` - Journey management interface

### Level 6: Utilities

Utility components provide cross-cutting technical functionality that supports atomic components without being part of the visual hierarchy.

**Characteristics:**
- Often don't render UI directly
- Can be imported by any level
- Encapsulate technical concerns
- Stateless when possible
- Comprehensive method documentation

**Examples:**
- `coreUtilityErrorBoundary` - Error catching and display
- `coreUtilityDataCache` - Client-side data caching
- `coreUtilityFormatters` - Shared formatting functions
- `emplidLoaderUtilityIdValidator` - Emplid format validation
- `emplidLoaderUtilityBatchProcessor` - Batch upload processing
- `admissionsUtilityEligibilityChecker` - Eligibility rule engine

### Level 7: Flow Screen Components

Flow components are thin wrappers that enable atomic components to work within Salesforce Screen Flows.

**Characteristics:**
- Delegate functionality to other atomic components
- Translate between Flow variables and component properties
- Implement Flow-specific interfaces
- Handle Flow attribute change events
- Minimal business logic (delegated to organisms)

**Examples:**
- `admissionsFlowApplicationSelector` - Application picker for Flow screens
- `emplidLoaderFlowStudentLookup` - Student search embedded in Flows
- `registrationFlowCourseSelector` - Course selection for registration Flows
- `coreFlowRecordPicker` - Generic record selection component

## Naming Structure

### Naming Convention Rules

**Important:** LWC folder names must use **camelCase only**—no hyphens, underscores, or special characters are allowed in folder/file names. However, when referencing components in HTML, Salesforce automatically converts camelCase to kebab-case.

| Context | Format | Example |
|---------|--------|--------|
| Folder/File Name | camelCase | `emplidLoaderOrganismStudentSearch` |
| HTML Reference | kebab-case (auto-converted) | `<c-emplid-loader-organism-student-search>` |
| Class Name | PascalCase | `EmplidLoaderOrganismStudentSearch` |

### App-Level Prefixes

All components belonging to a specific application or feature set MUST use an app-level prefix. This creates a three-part naming structure:

**Format:** `{appPrefix}{AtomicLevel}{ComponentName}`

- **appPrefix**: Lowercase app identifier (e.g., `emplidLoader`, `journeyBuilder`, `core`)
- **AtomicLevel**: Capitalized level (e.g., `Atom`, `Molecule`, `Organism`, `Template`, `Page`, `Utility`, `Flow`)
- **ComponentName**: PascalCase descriptive name (e.g., `StudentSearch`, `IdValidation`)

**Examples:**
- `emplidLoaderOrganismStudentSearch`
- `emplidLoaderMoleculeIdValidation`
- `journeyBuilderPageJourneyDashboard`
- `admissionsOrganismApplicationCard`
- `coreAtomButton`
- `coreUtilityFormatters`

#### Why App-Level Prefixes Matter

1. **Immediate Ownership Identification**: When viewing any component—in the org, during deployment, or in error logs—you instantly know which application or team owns it. No detective work required.

2. **Conflict Prevention**: Different teams can build similar components without naming collisions. `admissionsAtomButton` and `registrationAtomButton` can coexist, each styled for their app's needs.

3. **Deployment Safety**: App prefixes create natural deployment boundaries. You can confidently deploy `emplidLoader*` components knowing you won't affect `journeyBuilder*` components.

4. **Impact Analysis**: When evaluating changes, app prefixes make dependency analysis trivial. A change to `emplidLoaderUtilityValidator` only affects `emplidLoader*` components.

5. **Codebase Navigation**: In a flat `lwc/` folder with hundreds of components, app prefixes create logical groupings when sorted alphabetically. All `emplidLoader*` components appear together.

6. **Governance and Metrics**: Track component counts, test coverage, and technical debt by application. App prefixes enable automated reporting by team or feature area.

7. **Onboarding Acceleration**: New developers immediately understand component scope. Seeing `emplidLoader` tells them this is Emplid Loader territory without documentation lookup.

#### Choosing App Prefixes

| App/Feature Area | Prefix | Example Components |
|------------------|--------|-------------------|
| Emplid Loader | `emplidLoader` | `emplidLoaderOrganismStudentSearch` |
| Journey Builder | `journeyBuilder` | `journeyBuilderPageJourneyDashboard` |
| Admissions | `admissions` | `admissionsOrganismApplicationCard` |
| Registration | `registration` | `registrationMoleculeCoursePicker` |
| Shared/Core | `core` | `coreAtomButton`, `coreUtilityFormatter` |

**Guidelines for App Prefixes:**
- Use camelCase for multi-word prefixes: `emplidLoader`, not `emplid_loader` or `EmplidLoader`
- Keep prefixes concise but recognizable (8-15 characters ideal)
- Document all app prefixes in your team's configuration
- Use `core` for truly shared components used across multiple applications
- Register new prefixes before use to prevent duplicates

### Folder Structure

Salesforce DX requires all LWC components be direct children of the `lwc` folder. Component folder names use camelCase:

```
force-app/
└── main/
    └── default/
        └── lwc/
            ├── coreAtomButton/
            ├── coreAtomBadge/
            ├── coreAtomCurrencyDisplay/
            ├── coreMoleculeSearchBar/
            ├── coreMoleculeRecordHeader/
            ├── coreUtilityErrorBoundary/
            ├── coreUtilityFormatters/
            ├── emplidLoaderAtomIdBadge/
            ├── emplidLoaderMoleculeIdValidation/
            ├── emplidLoaderOrganismStudentSearch/
            ├── emplidLoaderOrganismBatchUploader/
            ├── emplidLoaderTemplateUploadWizard/
            ├── emplidLoaderPageEmplidManager/
            ├── journeyBuilderAtomStepIndicator/
            ├── journeyBuilderMoleculeJourneyNode/
            ├── journeyBuilderOrganismJourneyCanvas/
            ├── journeyBuilderPageJourneyDashboard/
            └── admissionsFlowApplicationSelector/
```

**In HTML templates**, use kebab-case (Salesforce auto-converts):
```html
<!-- These reference the components above -->
<c-core-atom-button label="Save"></c-core-atom-button>
<c-emplid-loader-organism-student-search></c-emplid-loader-organism-student-search>
<c-journey-builder-page-journey-dashboard></c-journey-builder-page-journey-dashboard>
```

## Core Principles

### 1. Deep Components Over Shallow Hierarchies

Build components that provide substantial functionality behind simple interfaces. Parents shouldn't need to coordinate multiple children to accomplish meaningful work.

**Anti-Pattern (Shallow):**
```html
<!-- Parent must coordinate everything -->
<c-search-input onchange={handleSearchChange}></c-search-input>
<c-search-button onclick={handleSearchClick}></c-search-button>
<c-loading-spinner if:true={isSearching}></c-loading-spinner>
<c-search-results results={searchResults}></c-search-results>
<c-error-display if:true={hasError} error={error}></c-error-display>
```

**Correct Pattern (Deep):**
```html
<!-- Single component handles the entire search experience -->
<c-emplid-loader-organism-student-search 
    onsearchcomplete={handleSearchComplete}>
</c-emplid-loader-organism-student-search>
```

### 2. Respect Natural Boundaries

Split components at natural boundaries driven by genuine differences in responsibility, not arbitrary metrics.

**Signs of natural boundaries:**
- Genuine reusability in multiple contexts
- Different rates of change
- Complex enough to warrant isolation
- Independent testing needs

**Signs of artificial boundaries:**
- Splitting just to reduce file size
- Arbitrary line count limits
- Premature optimization
- Theoretical future needs

**Apply the Rule of Three:**
1. First time: Implement inline
2. Second time: Consider copying (duplication is okay temporarily)
3. Third time: Extract to reusable component

### 3. Documentation Through Design

Design components to be self-documenting through clear naming and structure.

**Naming Requirements:**
- Component names tell complete stories: `emplidLoaderOrganismStudentSearch`
- Property names express roles: `customerEligibilityThreshold`
- Method names use domain language: `validateEmplidFormat`
- Event names describe what happened: `selectionchanged` (not `onselect`)

**JSDoc All Public APIs:**
```javascript
/**
 * Displays account information in a card format with optional actions.
 * @fires CoreOrganismAccountCard#edit - When edit action is triggered
 * @fires CoreOrganismAccountCard#delete - When delete action is triggered
 */
export default class CoreOrganismAccountCard extends LightningElement {
    /**
     * The Salesforce record ID of the account to display.
     * @type {string}
     */
    @api recordId;
    
    /**
     * Whether to show action buttons (edit, delete).
     * @type {boolean}
     * @default true
     */
    @api showActions = true;
}
```

### 4. Unidirectional Data Flow

Data flows down through properties; events bubble up to communicate changes.

| Level | Data Direction | Responsibility |
|-------|---------------|----------------|
| Atoms | Receive via `@api` | Display only |
| Molecules | Receive via `@api`, local state for coordination | Coordinate children |
| Organisms | Fetch via wire/apex | Data management, business logic |
| Templates | Pass through slots | Layout only |
| Pages | Orchestrate | Route data between organisms |

### 5. Performance-First Design

Design for Salesforce's constraints from the start.

**Governor Limit Considerations:**
- Centralize data fetching in organisms
- Use Lightning Data Service for automatic caching
- Batch related queries together
- Consider pagination for large datasets

**Rendering Optimization:**
- Keep component hierarchies as flat as reasonable
- Use conditional rendering judiciously
- Implement virtual scrolling for large lists
- Cache expensive calculations with `@track` getters

**Cardinal Rules:**
- Never make Apex calls in loops
- Always implement loading states
- Test with realistic data volumes
- Consider mobile performance

## Standard Operating Procedures

### SOP 1: Component Level Determination

When creating a component, follow this decision tree:

1. **Is it cross-cutting technical functionality?** → Utility
2. **Does it need to fetch Salesforce data?** → Organism or Page
3. **Does it combine multiple components?**
   - Yes, with business logic → Organism
   - Yes, simple coordination → Molecule
   - No → Atom
4. **Does it define layout without content?** → Template
5. **Does it represent a complete user view?** → Page

### SOP 2: Building Components at Each Level

**For Atoms:**
1. Define single responsibility in one sentence (no "and")
2. List all required `@api` properties with types
3. Design events that describe what happened
4. Implement without external dependencies
5. Document every property and event

**For Molecules:**
1. Identify the specific interaction pattern to standardize
2. List required atoms (keep to 2-5 components)
3. Design coordination logic for internal state
4. Create event transformation layer
5. Test coordination scenarios

**For Organisms:**
1. Define the business domain clearly
2. Plan data fetching strategy (wire vs. imperative)
3. Map all business rules and edge cases
4. Design for loading, error, and empty states
5. Ensure cross-context compatibility

**For Templates:**
1. Define distinct layout regions with slots
2. Create responsive behavior for all screen sizes
3. Avoid any hard-coded content
4. Test with various content types and sizes

**For Pages:**
1. Select appropriate template
2. Plan data orchestration between organisms
3. Implement complete user journey
4. Handle all navigation scenarios
5. Test end-to-end user flows

### SOP 3: Code Review Checklist

**Universal Requirements:**
- [ ] App prefix present and registered
- [ ] Single, clear purpose evident
- [ ] All `@api` properties documented with types
- [ ] All events documented with data structures
- [ ] Error handling comprehensive and graceful
- [ ] Accessibility met (ARIA labels, keyboard navigation)
- [ ] SLDS guidelines followed consistently
- [ ] Naming follows `{appPrefix}{AtomicLevel}{ComponentName}` convention (camelCase)

**Level-Specific Requirements:**

**Atoms:**
- [ ] No data fetching
- [ ] No complex state management
- [ ] No custom component dependencies
- [ ] Purely presentational or simple interaction

**Molecules:**
- [ ] Combines 2-5 components
- [ ] Manages only coordination state
- [ ] Clear event transformation
- [ ] Single interaction pattern

**Organisms:**
- [ ] Clear business domain
- [ ] Appropriate data strategy
- [ ] Business rules correctly implemented
- [ ] Loading, error, empty states handled
- [ ] Works across contexts

**Templates:**
- [ ] Flexible slot-based regions
- [ ] Responsive design implemented
- [ ] No hard-coded content
- [ ] Clear regional coordination

**Pages:**
- [ ] Appropriate template selected
- [ ] Complete user journey
- [ ] Navigation handled correctly
- [ ] Data orchestration clear

**Utilities:**
- [ ] Single technical concern
- [ ] Stateless when possible
- [ ] Comprehensive method documentation
- [ ] Clear public API

### SOP 4: Migration Strategy

When refactoring existing components to follow the atomic pattern:

1. **Audit Current State**
   - Inventory all data fetching, business logic, display logic
   - Document current dependencies
   - Identify reusability opportunities

2. **Extract Atoms First**
   - Find repeated styling/formatting elements
   - Create atoms for basic UI elements
   - Immediate reusability benefits, minimal risk

3. **Identify Molecule Patterns**
   - Find groups of atoms that appear together
   - Extract as molecules with coordination logic
   - Reveals natural component boundaries

4. **Refactor to Organisms**
   - Move data fetching to organism level
   - Centralize business logic
   - Design clear component interfaces

5. **Create Templates**
   - Extract common layouts
   - Use slots for flexibility
   - Ensure responsive behavior

### SOP 5: Flow Screen Components

When creating components for Screen Flows:

1. **Use `Flow` level after app prefix**: `admissionsFlowApplicationSelector`
2. **Implement required interfaces**: Use `@api` for Flow variables
3. **Create thin wrappers**: Delegate to atomic components
4. **Handle Flow state**: Translate between Flow and component patterns

```javascript
// admissionsFlowApplicationSelector.js
import { LightningElement, api } from 'lwc';

export default class AdmissionsFlowApplicationSelector extends LightningElement {
    // Flow input variable
    @api inputAccountIds = [];
    
    // Flow output variable
    @api selectedAccountId;

    handleSelection(event) {
        // Translate from organism event to Flow output
        this.selectedAccountId = event.detail.recordId;
        
        // Notify Flow of change
        this.dispatchEvent(new FlowAttributeChangeEvent(
            'selectedAccountId', 
            this.selectedAccountId
        ));
    }
}
```

## Testing Standards

### Testing by Level

**Atoms:** Unit tests verifying rendering and event emission
```javascript
import { createElement } from 'lwc';
import CoreAtomButton from 'c/coreAtomButton';

describe('coreAtomButton', () => {
    it('renders with correct label', async () => {
        const element = createElement('c-core-atom-button', { is: CoreAtomButton });
        element.label = 'Click Me';
        document.body.appendChild(element);
        
        const button = element.shadowRoot.querySelector('button');
        expect(button.textContent).toBe('Click Me');
    });
    
    it('emits click event', async () => {
        const handler = jest.fn();
        element.addEventListener('click', handler);
        element.shadowRoot.querySelector('button').click();
        expect(handler).toHaveBeenCalled();
    });
});
```

**Molecules:** Coordination and event transformation tests
```javascript
import { createElement } from 'lwc';
import CoreMoleculeSearchBar from 'c/coreMoleculeSearchBar';

describe('coreMoleculeSearchBar', () => {
    it('transforms input to search event', async () => {
        const element = createElement('c-core-molecule-search-bar', { is: CoreMoleculeSearchBar });
        const handler = jest.fn();
        element.addEventListener('search', handler);
        
        const input = element.shadowRoot.querySelector('c-core-atom-input');
        input.dispatchEvent(new CustomEvent('change', { 
            detail: { value: 'test query' } 
        }));
        
        element.shadowRoot.querySelector('c-core-atom-button').click();
        
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: { searchTerm: 'test query' }
            })
        );
    });
});
```

**Organisms:** Business logic, data fetching, error handling tests
```javascript
import { createElement } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import CoreOrganismAccountCard from 'c/coreOrganismAccountCard';

describe('coreOrganismAccountCard', () => {
    it('displays loading state initially', async () => {
        const element = createElement('c-core-organism-account-card', { is: CoreOrganismAccountCard });
        // Test loading state
    });
    
    it('displays account data correctly', async () => {
        // Mock wire adapter response
        getRecord.emit(mockAccountRecord);
        // Verify display
    });
    
    it('handles error state gracefully', async () => {
        getRecord.error();
        // Verify error display
    });
    
    it('applies business rules for tier badge', async () => {
        // Test tier-based badge variant logic
    });
});
```

### Test Data Patterns

Create test data utilities that support all levels:

```javascript
// testDataFactory.js
export const createMockAccount = (overrides = {}) => ({
    Id: '001xx000003EXAMPLE',
    Name: 'Test Account',
    Industry: 'Technology',
    CustomerTier__c: 'Silver',
    ...overrides
});

export const createMockAccountRecord = (account = {}) => ({
    apiName: 'Account',
    fields: {
        Name: { value: account.Name || 'Test Account' },
        Industry: { value: account.Industry || 'Technology' },
        CustomerTier__c: { value: account.CustomerTier__c || 'Silver' }
    }
});
```

## Anti-Patterns to Avoid

### 1. The God Component

**What It Looks Like:** A single component handling display, data fetching, business logic, and user interactions for multiple domains.

**Why It's Bad:** Impossible to reuse, test, or maintain.

**How to Fix:** Split by atomic level and domain.

### 2. Prop Drilling

**What It Looks Like:** Passing props through multiple levels of components that don't use them.

**Why It's Bad:** Creates tight coupling and maintenance burden.

**How to Fix:** Use organisms to fetch data where needed, or consider LMS for cross-hierarchy communication.

### 3. Premature Abstraction

**What It Looks Like:** Creating atoms and molecules for things used only once.

**Why It's Bad:** Adds complexity without benefit.

**How to Fix:** Apply the Rule of Three.

### 4. Shallow Components

**What It Looks Like:** Components that require extensive parent coordination.

**Why It's Bad:** Moves complexity rather than encapsulating it.

**How to Fix:** Build deep components with simple interfaces.

### 5. Mixed Levels

**What It Looks Like:** An "atom" that fetches data, or a "molecule" with business logic.

**Why It's Bad:** Breaks predictability and reusability.

**How to Fix:** Strictly follow level responsibilities.

### 6. Missing App Prefix

**What It Looks Like:** Components named `atomButton` or `organismAccountCard` without app context.

**Why It's Bad:** 
- Cannot determine ownership or deployment scope
- Risk of naming collisions across teams
- Difficult to track metrics by application
- Unclear impact analysis for changes

**How to Fix:** Always include the app prefix: `coreAtomButton`, `emplidLoaderOrganismStudentSearch`.

## Integration with Other Standards

### Apex Integration

When organisms call Apex:
- Follow [Apex Well-Architected Framework](#file:config/standards/apex-well-architected.md) patterns
- Use cacheable methods where appropriate
- Handle all error scenarios
- Implement loading states

### Error Handling

Integrate with Nebula Logger:
- Log errors from organism level
- Provide user-friendly error messages
- Include context for debugging
- See [Nebula Logger Standards](#file:config/standards/nebula-logger-standards.md)

### Feature Flags

When implementing feature toggles:
- Check flags at organism or page level
- Follow [Feature Flags Standards](#file:config/standards/feature-flags-standards.md)
- Provide graceful fallbacks

## Resources

- [Salesforce Lightning Web Components Developer Guide](https://developer.salesforce.com/docs/component-library/documentation/en/lwc)
- [Lightning Design System](https://www.lightningdesignsystem.com/)
- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [LWC Recipes GitHub Repository](https://github.com/trailheadapps/lwc-recipes)
- [Testing Lightning Web Components](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.testing)

---

*This framework transforms how you build Salesforce interfaces. By thinking in systems rather than pages, you create components that scale with your organization's needs while remaining maintainable and consistent.*
