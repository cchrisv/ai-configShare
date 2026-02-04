---
standard_type: code_quality
category: architecture
version: 1.0
last_updated: 2025-01-27
source_url: https://docs.pmd-code.org, https://rules.sonarsource.com
applies_to: salesforce, apex, lwc, javascript, typescript, code_review
---

# Code Complexity Standards

## Overview

Code complexity metrics help us understand the maintainability, testability, and understandability of our codebase. This standard defines how we measure and evaluate complexity for Apex and Lightning Web Components (LWC) using industry-standard tools and metrics.

## Complexity Metrics

### 1. Cyclomatic Complexity (CC) - Classic McCabe

Cyclomatic Complexity measures the number of independent paths through code by counting decision points.

**Formula:** M = E - N + 2P

Where:
- **E** = number of edges (transitions)
- **N** = number of nodes (statements)
- **P** = number of connected components (usually 1 for a single method)

**What it counts:**
- `if`, `else if` statements
- `for`, `while`, `do` loops
- `switch`, `case` statements
- `catch` blocks
- Ternary (`?:`) operators

**Source:** PMD Apex rules (docs.pmd-code.org)

**Tool:** PMD via Salesforce Code Analyzer

### 2. Cognitive Complexity (CoC)

Cognitive Complexity measures how hard code is to understand by a human, factoring in:

- **Nesting depth** - Deeper nesting increases cognitive load
- **Unfamiliar or non-linear control structures** - Breaks in expected flow patterns
- **Recursion** - Self-referential logic increases mental overhead
- **Breaks in the flow** - `continue`, `goto`, `try/catch` blocks disrupt linear reading

**Source:** SonarQube/SonarCloud analyzers (SonarSource Rules for Apex and JS/TS)

**Tool:** SonarQube/SonarCloud (optional but recommended for dashboards and PR decorations)

### 3. Extended Cyclomatic Complexity (Tool-specific)

Some tools may extend the classic McCabe metric to include additional constructs:

- **Logical operators** (`&&`, `||`) as separate branches
- **Exception handling** (`throw`, `finally`) as additional paths
- **Apex-specific constructs** like `Database.query()`, SOQL FOR loops

This is often tool-specific and may align closely with Cognitive Complexity in intent.

## Guardrails and Thresholds

### Apex Methods

- **Cyclomatic Complexity:** ≤10/method (warn ≥10, fail >15)
- **Cognitive Complexity:** ≤15/method (fail on PRs over 15)

### LWC JavaScript Functions

- **Cyclomatic Complexity:** ≤10/function
- **Cognitive Complexity:** ≤15/function

### Quality Gates

- **PR Quality Gates:** Fail builds/PRs when thresholds are exceeded
- **CI/CD Integration:** Automated validation via Salesforce Code Analyzer
- **Exceptions:** Document mitigation strategies or refactoring plans if guardrails must be exceeded

## Tooling and Configuration

### Salesforce Code Analyzer

Salesforce Code Analyzer is the primary CLI tool that runs PMD for Apex and ESLint for JS/LWC.

**Installation:**
```bash
sf plugins install @salesforce/sfdx-scanner
```

**Running Complexity Checks:**

```bash
sf scanner run --target "force-app/main/default/classes/**/*.cls" \
  --engine pmd --pmdconfig ./pmd-apex-complexity.xml --format table
```

### PMD Ruleset Configuration

Create a PMD ruleset file (e.g., `pmd-apex-complexity.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ruleset name="Apex Complexity"
         xmlns="http://pmd.sourceforge.net/ruleset/2.0.0">
  <description>Complexity guardrails for Apex</description>
  <!-- Cyclomatic Complexity: warn above 10, error above 15 -->
  <rule ref="category/apex/design.xml/StdCyclomaticComplexity">
    <properties>
      <property name="reportLevel" value="10"/>
      <property name="violationSuppressXPath" value=""/>
    </properties>
  </rule>
</ruleset>
```

### SonarQube/SonarCloud (Optional)

SonarQube/SonarCloud provides:
- Cognitive Complexity analysis for Apex and JavaScript/TypeScript
- Dashboards and trend analysis
- PR decorations showing complexity violations
- Integration with CI/CD pipelines

**Configuration:**
- Enable SonarSource rules for Apex and JavaScript/TypeScript
- Set Cognitive Complexity thresholds: ≤15 for Apex methods, ≤15 for JS functions
- Configure PR quality gates to fail on threshold violations

## Scoring Guidelines

### Complexity Levels

Based on guardrails, complexity levels are defined as:

**Cyclomatic Complexity (Apex/LWC):**
- **Low:** <10 (Pass)
- **Medium:** 10-15 (Warn)
- **High:** >15 (Fail)

**Cognitive Complexity (Apex):**
- **Low:** ≤15 (Pass)
- **High:** >15 (Fail)

**Cognitive Complexity (LWC JS):**
- **Low:** ≤15 (Pass)
- **High:** >15 (Fail)

### Impact on Well-Architected Pillars

Complexity directly impacts the Salesforce Well-Architected pillars:

**Trusted:**
- High complexity increases risk of bugs and security vulnerabilities
- Complex code is harder to audit and verify
- Mitigation: Refactor to reduce complexity, add comprehensive tests

**Easy:**
- High complexity reduces maintainability and increases operational effort
- Complex code takes longer to understand and modify
- Mitigation: Break down complex methods into smaller, focused functions

**Adaptable:**
- High complexity reduces extensibility and modularity
- Complex code is harder to evolve with business needs
- Mitigation: Apply SOLID principles, use design patterns to reduce coupling

### Refactoring Recommendations

**When to refactor:**
- Cyclomatic Complexity >15 (Apex) or >10 (LWC)
- Cognitive Complexity >15 (Apex or LWC)
- Multiple nested levels (>3-4 levels deep)
- Methods/functions exceeding 50-100 lines
- High complexity combined with low test coverage

**Refactoring strategies:**
- Extract methods/functions to reduce decision points
- Use early returns to reduce nesting
- Apply Strategy or Factory patterns for complex conditionals
- Break large methods into smaller, single-responsibility functions
- Use guard clauses to simplify control flow

## Examples

### Apex Example

**High Complexity (Needs Refactoring):**
```apex
public void processAccount(Account acc) {
    if (acc != null) {
        if (acc.Industry == 'Technology') {
            if (acc.AnnualRevenue > 1000000) {
                if (acc.NumberOfEmployees > 100) {
                    // Complex nested logic
                    if (acc.Rating == 'Hot') {
                        // Process...
                    } else if (acc.Rating == 'Warm') {
                        // Process...
                    } else {
                        // Process...
                    }
                }
            }
        }
    }
}
```

**Refactored (Lower Complexity):**
```apex
public void processAccount(Account acc) {
    if (acc == null || !isEligibleAccount(acc)) {
        return;
    }
    
    processByRating(acc);
}

private Boolean isEligibleAccount(Account acc) {
    return acc.Industry == 'Technology' 
        && acc.AnnualRevenue > 1000000 
        && acc.NumberOfEmployees > 100;
}

private void processByRating(Account acc) {
    switch on acc.Rating {
        when 'Hot' {
            processHotAccount(acc);
        }
        when 'Warm' {
            processWarmAccount(acc);
        }
        when else {
            processOtherAccount(acc);
        }
    }
}
```

### LWC JavaScript Example

**High Complexity (Needs Refactoring):**
```javascript
handleDataChange(event) {
    if (this.data) {
        if (this.data.status === 'active') {
            if (this.data.type === 'premium') {
                if (this.data.amount > 1000) {
                    if (this.data.paymentMethod === 'credit') {
                        // Complex nested logic
                    } else if (this.data.paymentMethod === 'debit') {
                        // More complex logic
                    }
                }
            }
        }
    }
}
```

**Refactored (Lower Complexity):**
```javascript
handleDataChange(event) {
    if (!this.isEligibleForProcessing(this.data)) {
        return;
    }
    
    this.processByPaymentMethod(this.data);
}

isEligibleForProcessing(data) {
    return data 
        && data.status === 'active'
        && data.type === 'premium'
        && data.amount > 1000;
}

processByPaymentMethod(data) {
    const processors = {
        'credit': () => this.processCredit(data),
        'debit': () => this.processDebit(data)
    };
    
    const processor = processors[data.paymentMethod];
    if (processor) {
        processor();
    }
}
```

## Quality Gates

### CI/CD Integration

**Salesforce Code Analyzer in CI:**
```yaml
# Example GitHub Actions workflow
- name: Run Code Analyzer
  run: |
    sf scanner run \
      --target "force-app/**/*.{cls,js}" \
      --engine pmd \
      --pmdconfig ./pmd-apex-complexity.xml \
      --format table \
      --severity-threshold 2
```

**PR Quality Gates:**
- Fail PRs when Cyclomatic Complexity >15 (Apex) or >10 (LWC)
- Fail PRs when Cognitive Complexity >15 (Apex or LWC)
- Require mitigation strategies or refactoring plans for exceptions
- Display complexity metrics in PR comments/decorations

### Pre-commit Hooks

Consider adding pre-commit hooks to catch complexity violations early:
```bash
#!/bin/bash
sf scanner run --target "$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cls|js)$')" \
  --engine pmd --pmdconfig ./pmd-apex-complexity.xml --format table
```

## Integration with Solutioning Phase

When evaluating solution options and designing components:

1. **Estimate Complexity Early:** During option evaluation, estimate complexity for proposed components
2. **Compare Against Guardrails:** Use thresholds to assess impact on Easy and Adaptable pillars
3. **Document Mitigation:** If guardrails must be exceeded, document mitigation strategies
4. **Plan Refactoring:** Include refactoring steps in implementation plans for high complexity components
5. **Test Coverage:** High complexity components require more comprehensive test coverage

**Reference in Solution Design:**
- Include estimated Cyclomatic and Cognitive Complexity for each component
- Document threshold status (Pass/Warn/Fail)
- Specify mitigation strategies if guardrails are exceeded
- Plan for automated validation via Salesforce Code Analyzer in CI

## References

- PMD Documentation: https://docs.pmd-code.org
- SonarSource Rules: https://rules.sonarsource.com
- Salesforce Code Analyzer: https://developer.salesforce.com/tools/sfdx-scanner
- Salesforce Well-Architected Framework: https://architect.salesforce.com/well-architected/overview

