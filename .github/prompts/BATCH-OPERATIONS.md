# Batch Operations Quick Reference

## Overview

Batch operations allow you to query multiple Salesforce objects/components in a single CLI call, executed in parallel for massive speed improvements.

## Performance Impact

| Operation | Objects | Sequential | Batch | Speedup |
|-----------|---------|-----------|-------|---------|
| Describe | 1 | 2 sec | 2 sec | 1x |
| Describe | 3 | 6 sec | 2-3 sec | **2-3x** |
| Describe | 5 | 10 sec | 2-3 sec | **4-5x** |
| Validation Rules | 3 | 6 sec | 2-3 sec | **2-3x** |
| Discover | 3 | 12 sec | 4-5 sec | **2-3x** |

## Commands with Batch Support

### 1. Describe Objects

**Sequential (old way):**
```bash
npx sf-tools describe Account --json
npx sf-tools describe Contact --json
npx sf-tools describe Opportunity --json
# Total: ~6 seconds
```

**Batch (new way):**
```bash
npx sf-tools describe Account,Contact,Opportunity --batch --json
# Total: ~2 seconds (3x faster)
```

**Output format:**
```json
[
  {
    "objectName": "Account",
    "success": true,
    "data": { /* full describe result */ }
  },
  {
    "objectName": "Contact",
    "success": true,
    "data": { /* full describe result */ }
  },
  {
    "objectName": "InvalidObject__c",
    "success": false,
    "error": "No such object"
  }
]
```

### 2. Validation Rules

**Sequential:**
```bash
npx sf-tools validation-rules Account --json
npx sf-tools validation-rules Contact --json
```

**Batch:**
```bash
npx sf-tools validation-rules Account,Contact --batch --json
```

**Output format:**
```json
[
  {
    "objectName": "Account",
    "success": true,
    "rules": [ /* validation rules array */ ]
  },
  {
    "objectName": "Contact",
    "success": true,
    "rules": [ /* validation rules array */ ]
  }
]
```

### 3. Discover Dependencies

**Sequential:**
```bash
npx sf-tools discover --type CustomObject --name Account --json
npx sf-tools discover --type CustomObject --name Contact --json
```

**Batch:**
```bash
npx sf-tools discover --type CustomObject --name Account,Contact --batch --json
```

**Output format:**
```json
[
  {
    "componentName": "Account",
    "success": true,
    "graph": { /* dependency graph */ },
    "pills": { /* component counts */ },
    "warnings": [],
    "executionTime": "3.2s"
  },
  {
    "componentName": "Contact",
    "success": true,
    "graph": { /* dependency graph */ },
    "pills": { /* component counts */ },
    "warnings": [],
    "executionTime": "2.8s"
  }
]
```

## Usage in Prompts

### Before (Sequential)
```prompt
### B: Metadata Discovery
B1 [CLI]: For each object in {{object_names}}:
  - Execute: {{cli.sf_describe}} {{object_name}} --json
  - Parse result
  - Move to next object
B2 [CLI]: For each object in {{object_names}}:
  - Execute: {{cli.sf_validation}} {{object_name}} --json
  - Parse result
```

### After (Batch)
```prompt
### B: Batch Metadata Retrieval
B1 [CLI]: Describe all objects at once:
  - Execute: {{cli.sf_describe}} {{object1}},{{object2}},{{object3}} --batch --json
  - Parse array of results
B2 [CLI]: Get validation rules for all objects:
  - Execute: {{cli.sf_validation}} {{object1}},{{object2}},{{object3}} --batch --json
  - Parse array of results
```

## Error Handling

Batch operations return per-object success/failure:

```json
[
  {"objectName": "Account", "success": true, "data": {...}},
  {"objectName": "BadObject__c", "success": false, "error": "Object not found"},
  {"objectName": "Contact", "success": true, "data": {...}}
]
```

**Best practice:**
```typescript
const results = await executeBatchDescribe(objects);

// Separate successes from failures
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

// Log failures but continue with successful ones
if (failed.length > 0) {
  console.warn(`Failed to describe: ${failed.map(f => f.objectName).join(', ')}`);
}

// Process successful results
for (const result of successful) {
  // Work with result.data
}
```

## Combining Batch + Subagents

For maximum performance, combine batch operations with subagent parallelization:

```prompt
### A: Batch Describe (1 call for all objects)
Execute: {{cli.sf_describe}} Account,Contact,Opportunity --batch --json
Parse results to extract basic info for all objects

### B: Parallel Discovery (subagents per object)
Launch subagents simultaneously:
- Subagent 1: Discover Account dependencies
- Subagent 2: Discover Contact dependencies  
- Subagent 3: Discover Opportunity dependencies

Each subagent runs independently, completing in ~30-60 seconds
```

**Result:** Research 3 objects in 2-3 minutes instead of 6-8 minutes!

## When to Use Batch

✅ **Use batch when:**
- Researching 2+ objects
- Objects are known upfront
- You need describe/validation/discover for all

❌ **Don't use batch when:**
- Only 1 object to research
- Object names discovered dynamically during iteration
- Need specialized per-object handling

## Implementation Checklist

When implementing batch operations:

- [ ] CLI tools updated to support `--batch` flag
- [ ] Commands accept comma-separated input
- [ ] Return format is array of results (not single object)
- [ ] Each result has `success` field
- [ ] Failed operations don't block successful ones
- [ ] Error messages captured per-object
- [ ] Prompts updated to use batch syntax
- [ ] Documentation updated with examples

## See Also

- [phase-03e-research-salesforce-parallel.prompt.md](.github/prompts/phase-03e-research-salesforce-parallel.prompt.md) - Full SF research with batch + subagents
- [util-subagent-sf-discovery.prompt.md](.github/prompts/util-subagent-sf-discovery.prompt.md) - Per-object discovery template
- [sf-tools.ts](scripts/workflow/cli/sf-tools.ts) - CLI implementation
- [copilot-instructions.md](.github/copilot-instructions.md) - Configuration reference

