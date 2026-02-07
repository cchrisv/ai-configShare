# Advanced Optimization Strategies

Beyond parallel subagents, here are additional ways to speed up the workflow.

## Current Performance
- **Sequential**: 25-40 minutes
- **Parallel (Wave-based)**: 18-30 minutes
- **Target**: <10 minutes

---

## 1. Smart Caching (30-50% reduction)

Cache expensive operations that don't change frequently.

### Organization Dictionary Cache
```json
// Store in memory or fast storage
{
  "lastLoaded": "2026-02-05T10:00:00Z",
  "ttl": 86400, // 24 hours
  "data": { /* dictionary */ }
}
```

**Impact**: Skip 03a entirely if cached (save 1-2 min)

### Similar Work Items Cache
```json
{
  "workItemType": "User Story",
  "areaPath": "Platform/Integration",
  "lastSearched": "2026-02-05T09:00:00Z",
  "results": [ /* cached results */ ]
}
```

**Impact**: Reduce 03f from 2-3 min to 10 sec

### Implementation
```typescript
// Before each research phase
const cached = await getCache(phaseId, context);
if (cached && !cached.isStale()) {
  return cached.data;
}
// Otherwise execute phase
```

---

## 2. Tiered Research Levels (User Choice)

Let users choose speed vs depth:

### Quick Mode (5-8 minutes)
```
Wave 1: ADO + Dictionary only
Wave 2: Skip SF, Wiki, Code, Web
Wave 3: Lightweight synthesis
```
**Use for**: Simple bugs, minor enhancements

### Standard Mode (8-12 minutes) 
```
Wave 1: ADO + Dictionary + Business Context
Wave 2: SF + Similar Items only
Wave 3: Full synthesis
```
**Use for**: Most user stories

### Deep Mode (15-20 minutes)
```
Current parallel approach - all phases
```
**Use for**: Complex features, architectural changes

### Implementation
Add to phase-01-prepare-ticket-parallel.prompt.md:
```prompt
## Input
Work Item ID: {{work_item_id}}
Research Level: {{research_level}} // quick|standard|deep

## Phase 2: Research [PARALLEL]
{{#if research_level == 'quick'}}
  Execute: Quick research (03b, 03z only)
{{else if research_level == 'standard'}}
  Execute: Wave 1 + SF + Similar Items
{{else}}
  Execute: Full parallel research
{{/if}}
```

---

## 3. Reduce Wave Count (20% faster)

Current: 3 waves (Wait → Execute → Wait → Execute → Wait → Execute)

### Optimized 2-Wave Approach

**Wave 1: Foundation (2-3 min)**
- ADO Work Item (critical path)
- Organization Dictionary

**Wave 2: Everything Else (5-7 min)**
- Wiki, Business Context, SF, Similar Items, Code, Web (all parallel)
- Synthesis starts as soon as critical data available

**Impact**: Eliminate one wait period, reduce total by 2-3 min

### Implementation
```javascript
// Wave 1: Only what's absolutely required for Wave 2
const [ado, dict] = await Promise.all([
  subagent_03b_ado(),
  subagent_03a_dict()
]);

// Wave 2: Everything else - maximize parallelization
const results = await Promise.all([
  subagent_03c_wiki(ado),
  subagent_03d_business(ado),
  subagent_03e_sf(ado),
  subagent_03f_similar(ado),
  subagent_03g_code(ado),
  subagent_03h_web(ado, dict)
]);

// Wave 3: Synthesis (can start while Wave 2 still running)
```

---

## 4. Conditional Research (Skip Unnecessary)

Skip phases based on work item type:

```typescript
const researchPlan = {
  'Bug': {
    required: ['03b', '03g'], // ADO + Code only
    optional: ['03e'], // SF if needed
    skip: ['03c', '03d', '03h'] // No wiki, business, web
  },
  'User Story': {
    required: ['03b', '03c', '03d', '03e'], // Most phases
    optional: ['03f', '03g', '03h'],
    skip: []
  },
  'Task': {
    required: ['03b'],
    optional: ['03g'],
    skip: ['03c', '03d', '03e', '03f', '03h'] // Minimal research
  }
};
```

**Impact**: Bugs complete in 4-6 min instead of 8-12 min

---

## 5. Batch API Calls (10-20% faster per phase)

Current: Multiple individual CLI calls
Optimized: Single batch call

### Before (03e - SF Research)
```bash
sf-tools describe Account --json
sf-tools describe Contact --json
sf-tools describe Opportunity --json
# 3 separate calls
```

### After
```bash
sf-tools describe Account,Contact,Opportunity --json --batch
# 1 call with multiple objects
```

### Implementation
Update CLI tools to support batch operations:
```typescript
// sf-tools.ts
.command('describe')
  .option('--batch', 'Batch multiple objects (comma-separated)')
  .action(async (objects, options) => {
    if (options.batch) {
      const objectList = objects.split(',');
      const results = await Promise.all(
        objectList.map(obj => describeObject(obj))
      );
      return results;
    }
    // Single object logic
  });
```

---

## 6. Progressive Synthesis (Pipeline Phases)

Don't wait for ALL research to complete before starting next phase.

### Current
```
Research (100%) → Grooming (0%) → Solutioning (0%)
```

### Progressive
```
Research (50%) → Grooming (30%) → Solutioning (10%)
Research (100%) → Grooming (70%) → Solutioning (40%)
               → Grooming (100%) → Solutioning (100%)
```

Start grooming as soon as ADO + Wiki research complete (don't wait for SF/Code).

### Implementation
```prompt
## Phase 3: Grooming [PROGRESSIVE]
Wait for: 03b (ADO), 03c (Wiki), 03d (Business Context)
Don't wait for: 03e-03h (can refine later)

Execute grooming with available data, update when remaining research completes.
```

**Impact**: Overlap phases, reduce total time by 3-5 min

---

## 7. Pre-warming Common Data

Background process that keeps hot data ready.

### Pre-warm Script
```typescript
// scripts/workflow/prewarm.ts
async function prewarmCache() {
  // Run every 6 hours
  await loadOrganizationDictionary();
  await cacheCommonStandards();
  await indexRecentWorkItems();
  await pingAPIs(); // Keep connections warm
}
```

**Impact**: First phase starts instantly (save 30-60 sec)

---

## 8. Lightweight Artifacts

Reduce what you save to disk.

### Current
```json
{
  "workItemId": 12345,
  "generatedAt": "...",
  "fullWorkItem": { /* 500+ fields */ },
  "allComments": [ /* 50+ comments */ ],
  "allRelations": [ /* 20+ relations */ ],
  // etc - Large artifacts
}
```

### Optimized
```json
{
  "workItemId": 12345,
  "generatedAt": "...",
  "essentialFields": { /* 10-15 key fields */ },
  "summary": "...",
  "keyFindings": [...]
  // Lean artifacts - 80% smaller
}
```

**Impact**: Faster I/O, faster synthesis (save 1-2 min across all phases)

---

## 9. Parallel Post-Research Phases

Why stop at research? Parallelize everything possible.

### Current
```
Research → Grooming → Solutioning → Wiki → Finalization
```

### Optimized
```
Research → [Grooming + Initial Solution Draft] → Finalization
        → [Wiki Search + Template Prep]
```

### Implementation
```javascript
// After research completes
const [grooming, solution, wiki] = await Promise.all([
  executeGrooming(),
  startSolutionDraft(), // Basic structure
  prepareWikiTemplate()
]);

// Then finalize with all data
await executeFinalization(grooming, solution, wiki);
```

**Impact**: Save 3-5 min on post-research phases

---

## 10. Smart Defaults & Auto-Fill

Use AI to pre-populate obvious fields.

```typescript
// Before executing workflow
const autoFilled = {
  workItemType: inferFromTitle(workItem.title),
  estimatedComplexity: assessComplexity(workItem),
  suggestedArea: inferArea(workItem.description),
  likelyDependencies: predictDependencies(workItem)
};

// Skip research for auto-filled fields that are high confidence
```

**Impact**: Skip 1-2 research phases for simple work items

---

## Combined Optimization Impact

| Strategy | Time Saved | Difficulty |
|----------|------------|------------|
| Caching | 2-4 min | Medium |
| Tiered Levels | 5-10 min (quick mode) | Easy |
| 2-Wave Design | 2-3 min | Easy |
| Conditional Research | 3-5 min | Medium |
| Batch API Calls | 1-2 min | Medium |
| Progressive Synthesis | 3-5 min | Hard |
| Pre-warming | 30-60 sec | Medium |
| Lightweight Artifacts | 1-2 min | Easy |
| Parallel Post-Research | 3-5 min | Medium |
| Smart Defaults | 2-4 min | Hard |

### Total Potential Savings
**Current Parallel**: 18-30 min
**Fully Optimized**: **6-10 min** (60-70% additional reduction)

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours work)
1. Tiered research levels
2. 2-wave design
3. Lightweight artifacts

**Result**: 12-15 min total time

### Phase 2: Medium Effort (1-2 days work)
4. Caching infrastructure
5. Conditional research by type
6. Batch API calls

**Result**: 8-12 min total time

### Phase 3: Advanced (1 week work)
7. Progressive synthesis
8. Parallel post-research
9. Pre-warming
10. Smart defaults

**Result**: 6-10 min total time

---

## Next Steps

1. **Start with tiered research** - easiest, biggest immediate impact
2. **Implement caching** - one-time effort, permanent benefit
3. **Optimize CLI tools** - batch operations for all tools
4. **Pipeline phases** - overlap research/grooming/solutioning

Would you like me to implement any of these optimizations?
