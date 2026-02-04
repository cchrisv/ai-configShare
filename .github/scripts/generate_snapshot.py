
import json
import sys
from datetime import datetime

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
wiki = context.get('wiki', {})
metadata = context.get('metadata', {})

# Get specific sub-sections
salesforce_metadata = research.get('salesforce_metadata', {})
ado_workitem = research.get('ado_workitem', {})
classification = grooming.get('classification', {})
option_analysis = solutioning.get('option_analysis', {})
solution_design = solutioning.get('solution_design', {})
testing = solutioning.get('testing', {})
wiki_creation = wiki.get('creation_audit', {})

# Construct Snapshot
snapshot = {
    "work_item_id": work_item_id,
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "research_summary": {
        "objects": [obj.get('api_name') for obj in salesforce_metadata.get('schema', {}).get('objects', []) if obj.get('api_name')],
        "fields": [field.get('api_name') for field in salesforce_metadata.get('schema', {}).get('fields', []) if field.get('api_name')],
        "record_types": [rt.get('developer_name') for rt in salesforce_metadata.get('schema', {}).get('record_types', []) if rt.get('developer_name')]
    },
    "business_requirements": {
        "title": ado_workitem.get('scrubbed_data', {}).get('title') or ado_workitem.get('business_summary', ''),
        "user_story": grooming.get('templates_applied', {}).get('applied_content', {}).get('description', ''),
        "goals": research.get('synthesis', {}).get('unified_truth', {}).get('business_goals', [])
    },
    "solution_approach": {
        "selected_option": option_analysis.get('recommended_option', {}).get('name'),
        "architecture_pattern": solution_design.get('architecture_decisions', [{}])[0].get('pattern') if solution_design.get('architecture_decisions') else None,
        "components": [comp.get('name') for comp in solution_design.get('components', []) if comp.get('name')]
    },
    "quality_bar": {
        "classification": classification.get('quality_gates', {}),
        "solution_compliance": solution_design.get('quality_bar', {}),
        "test_coverage": f"{len(testing.get('test_cases', []))} scenarios defined"
    },
    "state_tracking": {
        "wiki_page": wiki_creation.get('path'),
        "wiki_url": wiki_creation.get('url'),
        "status": "Ready for Development"
    }
}

# Update unified context with finalization snapshot
if 'finalization' not in context:
    context['finalization'] = {}
context['finalization']['context_snapshot'] = snapshot

# Update metadata (ensure it exists first)
if 'metadata' not in context:
    context['metadata'] = {}
context['metadata']['last_updated'] = datetime.utcnow().isoformat() + "Z"
if 'phases_completed' not in context['metadata']:
    context['metadata']['phases_completed'] = []
if 'finalization' not in context['metadata']['phases_completed']:
    context['metadata']['phases_completed'].append('finalization')
context['metadata']['current_phase'] = 'complete'

# Write back to unified context
with open(context_file, "w", encoding='utf-8') as f:
    json.dump(context, f, indent=2)

print("Context snapshot generated and saved to unified context.")
