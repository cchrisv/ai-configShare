# UMGC Organizational Context

This document describes the UMGC organizational knowledge base used by AI agents during ticket research and grooming phases. It provides context about UMGC's strategic goals, departments, personas, and contacts to improve ticket understanding and requirements quality.

## Purpose

The organizational context knowledge base enables AI agents to:

- **Identify departments** associated with work items through deterministic matching
- **Match personas** to understand who will use features and their specific needs
- **Understand strategic alignment** by linking work items to UMGC strategic goals
- **Map stakeholders** by identifying relevant contacts and their roles
- **Improve requirements** by using department vision, persona goals, and pain points
- **Enhance classification** by considering department priorities and strategic importance

## Structure

The organizational context is stored in `.github/config/umgc-organizational-context.json` and includes:

### Top-Level Elements

- **Strategic Goals**: UMGC's high-level strategic objectives (e.g., Student Success, Digital Transformation)
- **Vision**: UMGC's overall mission and vision statement

### Departments

Each department entry contains:

- **Name**: Department name
- **Description**: What the department does
- **Vision**: Department-specific vision/mission
- **Priorities**: Key priorities and important areas for the department
- **Primary Contacts**: Key contacts (name, role, email) for stakeholder mapping
- **Personas**: User personas within the department (see Persona Structure below)
- **Related Salesforce Objects**: Salesforce objects commonly used by this department
- **Common Work Patterns**: Typical work patterns or processes

### Persona Structure

Each persona includes:

- **Name**: Persona name (e.g., "Academic Advisor", "Enrollment Counselor")
- **Role**: Job title/role
- **Description**: What this persona does day-to-day
- **Goals**: Primary goals this persona is trying to achieve
- **Pain Points**: Common challenges or frustrations
- **Technology Usage**: How they interact with systems
- **Typical Tasks**: Common tasks this persona performs

## Deterministic Matching Algorithms

AI agents use deterministic algorithms to match work items to organizational context. These algorithms ensure consistent, repeatable results.

### Department Matching (Priority Order)

1. **Area Path Match** (High Confidence)
   - Extract `System.AreaPath` from work item
   - Match department name in area path (case-insensitive, partial match OK)
   - Example: "Digital Platforms\\Enrollment Management" → Enrollment Management department

2. **Keyword Match** (Medium Confidence)
   - Extract keywords from work item title, description, tags
   - Match department name or aliases in keywords
   - Example: Work item mentions "Student Affairs" → Student Affairs department

3. **Contact Match** (High Confidence)
   - Extract names/emails from work item comments, `System.AssignedTo`, `System.CreatedBy`
   - Match against `primary_contacts[]` in each department
   - Example: Work item assigned to contact in Enrollment Management → Enrollment Management department

4. **Default** (Low Confidence)
   - If no match found, use first department as default
   - Log warning for manual review

### Persona Matching (Scoring System)

Personas are scored and top matches selected:

1. **Role Keyword Match** (+2 points per match)
   - Match `personas[].role` or `personas[].name` in work item keywords

2. **Task Match** (+1 point per matching task)
   - Match `personas[].typical_tasks[]` in work item descriptions

3. **Goal/Pain Point Match** (+1 point per match)
   - Match `personas[].goals[]` and `personas[].pain_points[]` in work item

4. **Selection**: Sort by score (descending), select top 3 personas (or first if no matches)

### Strategic Goal Matching

- Extract keywords from work item (title, description, AC)
- Match strategic goal keywords
- Minimum 1 strategic goal required (use first if none match)

## Usage in Research Phase

During the research phase (`research-business-context.prompt.md`), agents:

1. **Load organizational context** at the start of business context research
2. **Match department** using deterministic algorithm
3. **Match personas** using scoring system
4. **Match strategic goals** using keyword matching
5. **Extract contacts** by matching work item contacts to department contacts
6. **Save results** to `02-business-context.json` artifact with `organizational_context` section

## Usage in Grooming Phase

During the grooming phase (`grooming.prompt.md`), agents:

1. **Load matching results** from research phase (if available) or perform matching
2. **Use matched persona** in User Story format: "As a [persona.name] ([persona.role]), I want..."
3. **Reference strategic goals** in Goals & Business Value section
4. **Use persona goals and pain points** to write business value statements
5. **Use persona typical tasks** to inform acceptance criteria scenarios
6. **Apply department priorities** to effort/risk classification
7. **Save matching results** to `organizational-context-match.json` artifact

### Template Filling Rules

When applying templates, agents must:

- **User Story Section**: Use `matched_persona.name` and `matched_persona.role` exactly as provided
- **Goals & Business Value**: First bullet must reference strategic goal, second must reference persona goal, third must reference persona pain point
- **Acceptance Criteria**: At least 2 ACs must reference `matched_persona.typical_tasks[]`
- **Summary**: Must include department name, strategic alignment, and persona reference

### Classification Enhancement

Organizational context influences classification:

- **Effort**: Add points if work aligns with department priorities or supports multiple strategic goals
- **Risk**: Set higher risk if department priorities include "compliance" or "security", or if work affects student-facing personas
- **Work Class Type**: Consider strategic alignment and department priorities when determining work class type

## Maintenance

### Updating Organizational Context

1. **Edit** `.github/config/umgc-organizational-context.json`
2. **Update** `last_updated` field with current date
3. **Add new departments** as they interact with Digital Platforms
4. **Add new personas** as user types are identified
5. **Update contacts** as roles change
6. **Update strategic goals** annually or as they change

### Review Schedule

- **Quarterly**: Review for accuracy and completeness
- **Annually**: Review strategic goals and vision
- **As needed**: Update when departments or roles change

## Examples

### Example 1: Department Match via Area Path

**Work Item:**
- Area Path: "Digital Platforms\\Enrollment Management\\Admissions"
- Title: "Improve application processing time"

**Matching Result:**
- Department: Enrollment Management (matched via area path, high confidence)
- Personas: Admissions Specialist (matched via role keyword)
- Strategic Goals: Student Success, Operational Excellence

### Example 2: Persona Match via Task

**Work Item:**
- Title: "Enable advisors to track student progress"
- Description: "Advisors need to see student academic history and progress toward graduation"

**Matching Result:**
- Department: Academic Affairs (matched via keyword "advisors")
- Personas: Academic Advisor (matched via task "track student progress")
- Strategic Goals: Student Success

### Example 3: Template Usage

**Matched Context:**
- Department: Student Affairs
- Persona: Student Success Coordinator
- Strategic Goal: Student Success

**User Story Generated:**
"As a Student Success Coordinator (Student Success Coordinator), I want to identify at-risk students early, so that I can provide timely interventions and improve student retention rates."

**Goals & Business Value:**
- "Student Success: Reduce student attrition by 15% through early intervention"
- "Identify and support struggling students: Enable proactive outreach to at-risk students"
- "Address difficulty identifying at-risk students early: Provide automated risk indicators and alerts"

## References

- Configuration File: `.github/config/umgc-organizational-context.json`
- Research Phase Integration: `.github/prompts/research-business-context.prompt.md`
- Grooming Phase Integration: `.github/prompts/grooming.prompt.md`
- Core Instructions: `.github/copilot-instructions.md`

