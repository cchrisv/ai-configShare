
import json
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
grooming = context.get('grooming', {})
solutioning = context.get('solutioning', {})
research = context.get('research', {})

classification = grooming.get('classification', {})
solution_design = solutioning.get('solution_design', {})
traceability = solutioning.get('traceability', {})
assumptions = research.get('assumptions', [])

# 1. Complexity Factor (1-3)
# Based on solution design complexity estimate
complexity_map = {"Low": 1, "Medium": 2, "High": 3}
# Default to Low if not found
complexity_str = solution_design.get('components', [{}])[0].get('complexity_estimate', 'Low') if solution_design.get('components') else 'Low'
complexity_score = complexity_map.get(complexity_str, 1)

# 2. Risk Factor (0-3)
risk_score = 0
# Check classification risk
if classification.get('risk') == 'High':
    risk_score += 1
# Check tags
tags = classification.get('tags', {})
final_tags = tags.get('final', []) if isinstance(tags, dict) else tags
if "High-Risk" in final_tags:
    risk_score += 1

# 3. Uncertainty Factor (0-3)
uncertainty_score = 0
# Check assumptions confidence (handles both 'low' and 'Low' for backward compatibility)
low_conf_assumptions = [a for a in assumptions if isinstance(a, dict) and a.get('confidence', '').lower() == 'low']
if len(low_conf_assumptions) > 0:
    uncertainty_score += 1
# Check traceability gaps
if traceability.get('gaps', []):
    uncertainty_score += 1

# Total Score
total_score = complexity_score + risk_score + uncertainty_score

# Fibonacci Mapping
fib_map = {
    0: 1, 1: 1,
    2: 2,
    3: 3,
    4: 5, 5: 5,
    6: 8, 7: 8,
    8: 13 # Cap at 13
}
story_points = fib_map.get(total_score, 13)
if total_score > 8: story_points = 13

print(f"Complexity: {complexity_score}")
print(f"Risk: {risk_score}")
print(f"Uncertainty: {uncertainty_score}")
print(f"Total Score: {total_score}")
print(f"Story Points: {story_points}")

# Update unified context with estimation
if 'run_state' not in context:
    context['run_state'] = {}
context['run_state']['estimation'] = {
    "complexity": complexity_score,
    "risk": risk_score,
    "uncertainty": uncertainty_score,
    "total_score": total_score,
    "story_points": story_points
}

# Write back to unified context
with open(context_file, "w", encoding='utf-8') as f:
    json.dump(context, f, indent=2)
