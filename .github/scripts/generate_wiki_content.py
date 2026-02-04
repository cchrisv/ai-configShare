
import json
import datetime
import sys

# Get work item ID from command line or use default
work_item_id = sys.argv[1] if len(sys.argv) > 1 else "249428"

# Load unified context file
root = f".ai-artifacts/{work_item_id}"
context_file = f"{root}/ticket-context.json"
context = {}

try:
    with open(context_file, 'r', encoding='utf-8') as f:
        context = json.load(f)
except FileNotFoundError:
    print(f"Error: Context file not found at {context_file}")
    sys.exit(1)

# Extract sections from unified context
research = context.get('research', {})
grooming = context.get('grooming', {})
solutioning = context.get('solutioning', {})
metadata = context.get('metadata', {})

# Get specific sub-sections
salesforce_metadata = research.get('salesforce_metadata', {})
dependency_discovery = research.get('dependency_discovery', {})
journey_maps = research.get('journey_maps', {})
ado_workitem = research.get('ado_workitem', {})
classification = grooming.get('classification', {})
templates_applied = grooming.get('templates_applied', {})
solution_design = solutioning.get('solution_design', {})
testing = solutioning.get('testing', {})
test_cases = testing.get('test_cases', [])

timestamp = datetime.datetime.now().isoformat()
title = ado_workitem.get('business_summary', 'Untitled Work Item')

content = f"""# 📋 Autonomous Ticket Preparation - #{work_item_id}

> **Work Item:** #{work_item_id} - {title}
>
> **Generated:** {timestamp}
>
> **Status:** ✅ Complete - Ready for Development

---

[View Ticket in ADO →](https://dev.azure.com/UMGC/Digital%20Platforms/_workitems/edit/{work_item_id})

---

## 📑 Table of Contents

[[_TOC_]]

---

## 🎯 Executive Summary

{research.get('summary_narrative', 'Research summary not available.')}

---

## 📋 Understanding the Request

### 🎯 Business Context

**Who We're Helping:**
- {grooming.get('organizational_context_match', {}).get('persona', {}).get('primary', 'Users')}
- Business objective: {research.get('synthesis', {}).get('unified_truth', {}).get('business_goals', ['Not specified'])[0] if research.get('synthesis', {}).get('unified_truth', {}).get('business_goals') else 'Not specified'}

**Where We Are Today:**
- Current state analysis from research.

### 📊 Requirements Analysis

**What the Solution Must Do:**
{templates_applied.get('applied_content', {}).get('acceptance_criteria', 'Acceptance criteria not available.')}

---

## 🔍 Discovery & Research

### 📚 Learning from Existing Knowledge

**Key Discoveries:**
{chr(10).join(['- ' + item for item in research.get('synthesis', {}).get('unified_truth', {}).get('key_findings', ['No key findings recorded'])])}

### 🏗️ Understanding Our Technical Environment

**Metadata Dependencies Discovered:**

<details>
<summary>📊 Component Usage Analysis (Click to expand)</summary>

**Components Using This Metadata:**
| Type | Component Name | Impact Level | Notes |
|------|---------------|--------------|-------|
"""

# Add dependency data from unified context
usage_tree = dependency_discovery.get('usage_tree', {})
for type_key, items in usage_tree.items():
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                content += f"| {type_key} | {item.get('name', 'Unknown')} | Low | From dependency discovery |\n"

content += """
</details>

### 🗺️ Journey Maps

"""

if journey_maps.get('applicable', False):
    if journey_maps.get('current_state_diagram'):
        content += f"""**Current State:**

::: mermaid
{journey_maps.get('current_state_diagram', '')}
:::

"""
    if journey_maps.get('future_state_diagram'):
        content += f"""**Future State:**

::: mermaid
{journey_maps.get('future_state_diagram', '')}
:::

"""
else:
    content += "*Journey mapping not applicable for this work item.*\n"

content += """
---

## 🎨 Solution Design

### 🏛️ How We'll Build It

**Our Design Philosophy:**
"""

for decision in solution_design.get('architecture_decisions', []):
    content += f"- **{decision.get('pattern', 'Unknown')}:** {decision.get('rationale', '')}\n"

content += """
### 🧩 The Building Blocks

**Core Components We'll Create/Update:**
| Component | Responsibility | Dependencies | Complexity |
|-----------|----------------|--------------|------------|
"""

for comp in solution_design.get('components', []):
    content += f"| {comp.get('name', 'Unknown')} ({comp.get('component_id', '')}) | {comp.get('responsibility', '')} | None | {comp.get('complexity_estimate', 'Low')} |\n"

content += """
### 🔌 Connecting with Other Systems

**Integration Points:**
"""

for point in solution_design.get('integration_points', []):
    content += f"- **{point.get('system', 'Unknown')}:** {point.get('description', '')}\n"

content += """
---

## ✅ Quality & Validation

### 📋 How We'll Know We're Successful

**Acceptance Criteria:**
"""

for ac in solutioning.get('traceability', {}).get('acceptance_criteria', []):
    content += f"- {ac.get('description', 'Not specified')}\n"

content += """
### 🧪 Our Testing Approach

**Test Cases:**

| ID | Title | Path Type | Priority | Covers AC |
|----|-------|-----------|----------|-----------|
"""

for tc in test_cases:
    covers = ", ".join(tc.get('covers_ac', []))
    content += f"| {tc.get('id', '')} | {tc.get('title', '')} | {tc.get('path_type', '')} | {tc.get('priority', '')} | {covers} |\n"

content += f"""
---

## 🚀 Implementation Plan

### 📋 Our Development Journey

This section contains the detailed implementation steps for the developer.

---

## ➡️ Getting Started

### 🎯 Ready to Build? Here's How

Refer to the test cases above for validation steps.

---

## 🔄 Related Work Items

"""

similar = research.get('similar_workitems', {}).get('similar_items_found', [])
if similar:
    for item in similar[:5]:
        content += f"- #{item.get('id', 'Unknown')}: {item.get('title', '')}\n"
else:
    content += "- None identified.\n"

content += f"""
---

*📅 Last Updated: {timestamp}*  
*🤖 Generated by AI Autonomous Ticket Preparation*
"""

# Save wiki content to separate file (for ADO API update)
wiki_content_path = f"{root}/wiki-content.md"
with open(wiki_content_path, "w", encoding="utf-8") as f:
    f.write(content)

# Update unified context with wiki generation metadata
if 'wiki' not in context:
    context['wiki'] = {}
context['wiki']['content_generated_at'] = datetime.datetime.utcnow().isoformat() + "Z"

# Update metadata (ensure it exists first)
if 'metadata' not in context:
    context['metadata'] = {}
context['metadata']['last_updated'] = datetime.datetime.utcnow().isoformat() + "Z"

# Write back to unified context
with open(context_file, "w", encoding='utf-8') as f:
    json.dump(context, f, indent=2)

print(f"Wiki content generated successfully to {wiki_content_path}")
