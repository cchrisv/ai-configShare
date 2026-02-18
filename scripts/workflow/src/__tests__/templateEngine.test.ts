/**
 * Template Engine Tests
 * Tests for scaffold generation, rendering, and validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractVariables,
  generateFillSpec,
  generatePhaseFillSpec,
  renderTemplate,
  validateRendered,
  listTemplates,
  getTemplateEntry,
  loadTemplateHtml,
  clearRegistryCache,
} from '../templateEngine.js';
import type { FillSlot } from '../types/templateTypes.js';

beforeEach(() => {
  clearRegistryCache();
});

// ---------------------------------------------------------------------------
// Registry & Listing
// ---------------------------------------------------------------------------
describe('Registry', () => {
  it('should load the template registry', () => {
    const entry = getTemplateEntry('field-user-story-description');
    expect(entry).toBeDefined();
    expect(entry.file).toBe('field-user-story-description.html');
    expect(entry.phase).toBe('grooming');
    expect(entry.ado_field).toBe('System.Description');
  });

  it('should throw for unknown template key', () => {
    expect(() => getTemplateEntry('nonexistent-template')).toThrow(/not found in registry/);
  });

  it('should list templates by phase', () => {
    const grooming = listTemplates({ phase: 'grooming' });
    const keys = Object.keys(grooming);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(grooming[key]!.phase).toBe('grooming');
    }
  });

  it('should list templates by work item type', () => {
    const bugTemplates = listTemplates({ workItemType: 'Bug' });
    const keys = Object.keys(bugTemplates);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(bugTemplates[key]!.work_item_types).toContain('Bug');
    }
  });

  it('should filter by both phase and type', () => {
    const featureGrooming = listTemplates({ phase: 'grooming', workItemType: 'Feature' });
    const keys = Object.keys(featureGrooming);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const entry = featureGrooming[key]!;
      expect(entry.phase).toBe('grooming');
      expect(entry.work_item_types).toContain('Feature');
    }
  });
});

// ---------------------------------------------------------------------------
// Variable Extraction
// ---------------------------------------------------------------------------
describe('extractVariables', () => {
  it('should extract simple variables', () => {
    const vars = extractVariables('<p>{{foo}} and {{bar}}</p>');
    expect(vars).toContain('foo');
    expect(vars).toContain('bar');
    expect(vars).toHaveLength(2);
  });

  it('should deduplicate variables', () => {
    const vars = extractVariables('{{x}} {{x}} {{y}}');
    expect(vars).toHaveLength(2);
  });

  it('should extract from actual template HTML', () => {
    const entry = getTemplateEntry('field-user-story-description');
    const html = loadTemplateHtml(entry);
    const vars = extractVariables(html);
    expect(vars).toContain('summary_text');
    expect(vars).toContain('persona');
    expect(vars).toContain('action');
    expect(vars).toContain('business_value');
  });

  it('should return empty for HTML with no tokens', () => {
    const vars = extractVariables('<div>No tokens here</div>');
    expect(vars).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fill Spec Generation (scaffold)
// ---------------------------------------------------------------------------
describe('generateFillSpec', () => {
  it('should generate a fill spec for user story description', () => {
    const spec = generateFillSpec('field-user-story-description');
    expect(spec.template).toBe('field-user-story-description');
    expect(spec.ado_field).toBe('System.Description');
    expect(spec.phase).toBe('grooming');
    expect(spec.slots).toBeDefined();
    expect(spec.slots['summary_text']).toBeDefined();
    expect(spec.slots['summary_text']!.type).toBe('text');
    expect(spec.slots['summary_text']!.required).toBe(true);
    expect(spec.slots['summary_text']!.value).toBeNull();
  });

  it('should include table column definitions', () => {
    const spec = generateFillSpec('field-user-story-description');
    const assumptions = spec.slots['assumptions'];
    expect(assumptions).toBeDefined();
    expect(assumptions!.type).toBe('table');
    expect(assumptions!.columns).toBeDefined();
    expect(assumptions!.columns!.length).toBeGreaterThan(0);
    expect(assumptions!.columns![0]!.key).toBe('id');
  });

  it('should include block variable definitions for repeatable blocks', () => {
    const spec = generateFillSpec('field-user-story-acceptance-criteria');
    const scenarios = spec.slots['scenarios'];
    expect(scenarios).toBeDefined();
    expect(scenarios!.type).toBe('repeatable_block');
    expect(scenarios!.block_variables).toBeDefined();
    expect(scenarios!.block_variables!['title']).toBeDefined();
    expect(scenarios!.block_variables!['given']).toBeDefined();
    expect(scenarios!.blocks).toEqual([]);
  });

  it('should apply prefill values', () => {
    const spec = generateFillSpec('field-user-story-description', {
      summary_text: 'Pre-filled summary',
      goals: ['Goal 1', 'Goal 2'],
    });
    expect(spec.slots['summary_text']!.value).toBe('Pre-filled summary');
    expect(spec.slots['goals']!.items).toEqual(['Goal 1', 'Goal 2']);
  });
});

describe('generatePhaseFillSpec', () => {
  it('should generate specs for all grooming User Story templates', () => {
    const phase = generatePhaseFillSpec('grooming', 'User Story', '12345');
    expect(phase.phase).toBe('grooming');
    expect(phase.work_item_type).toBe('User Story');
    expect(phase.work_item_id).toBe('12345');
    expect(Object.keys(phase.templates).length).toBeGreaterThan(0);
    expect(phase.templates['field-user-story-description']).toBeDefined();
    expect(phase.templates['field-user-story-acceptance-criteria']).toBeDefined();
  });

  it('should generate specs for grooming Bug templates', () => {
    const phase = generatePhaseFillSpec('grooming', 'Bug', '99999');
    expect(phase.templates['field-bug-description']).toBeDefined();
    expect(phase.templates['field-bug-acceptance-criteria']).toBeDefined();
    expect(phase.templates['field-bug-repro-steps']).toBeDefined();
    expect(phase.templates['field-bug-system-info']).toBeDefined();
    // Should NOT include user story templates
    expect(phase.templates['field-user-story-description']).toBeUndefined();
  });

  it('should generate specs for solutioning templates (all types)', () => {
    const phase = generatePhaseFillSpec('solutioning', 'User Story', '12345');
    expect(phase.templates['field-solution-design']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('renderTemplate', () => {
  it('should render simple text slots', () => {
    const slots: Record<string, FillSlot> = {
      bug_summary_description: {
        variable: 'bug_summary_description',
        type: 'text',
        required: true,
        hint: '',
        value: 'A test bug summary',
        items: [],
        rows: [],
      },
      expected_behavior: {
        variable: 'expected_behavior',
        type: 'text',
        required: true,
        hint: '',
        value: 'It should work',
        items: [],
        rows: [],
      },
      actual_behavior: {
        variable: 'actual_behavior',
        type: 'text',
        required: true,
        hint: '',
        value: 'It does not work',
        items: [],
        rows: [],
      },
      business_impact: {
        variable: 'business_impact',
        type: 'text',
        required: true,
        hint: '',
        value: 'Users are blocked',
        items: [],
        rows: [],
      },
      affected_functionality: {
        variable: 'affected_functionality',
        type: 'text',
        required: true,
        hint: '',
        value: 'Login page',
        items: [],
        rows: [],
      },
    };

    const result = renderTemplate('field-bug-description', slots);
    expect(result.success).toBe(true);
    expect(result.html).toContain('A test bug summary');
    expect(result.html).toContain('It should work');
    expect(result.html).toContain('It does not work');
    expect(result.html).toContain('Users are blocked');
    expect(result.html).toContain('Login page');
    expect(result.html).not.toContain('{{');
    expect(result.slots_filled).toBe(5);
    expect(result.slots_missing).toBe(0);
  });

  it('should report missing required slots', () => {
    const slots: Record<string, FillSlot> = {
      bug_summary_description: {
        variable: 'bug_summary_description',
        type: 'text',
        required: true,
        hint: '',
        value: 'Partial fill',
        items: [],
        rows: [],
      },
    };

    const result = renderTemplate('field-bug-description', slots);
    expect(result.success).toBe(false);
    expect(result.slots_missing).toBeGreaterThan(0);
    expect(result.missing_slots.length).toBeGreaterThan(0);
  });

  it('should escape HTML in text slots', () => {
    const slots: Record<string, FillSlot> = {
      bug_summary_description: {
        variable: 'bug_summary_description',
        type: 'text',
        required: true,
        hint: '',
        value: 'XSS attempt: <script>alert("xss")</script>',
        items: [],
        rows: [],
      },
      expected_behavior: { variable: 'expected_behavior', type: 'text', required: true, hint: '', value: 'safe', items: [], rows: [] },
      actual_behavior: { variable: 'actual_behavior', type: 'text', required: true, hint: '', value: 'safe', items: [], rows: [] },
      business_impact: { variable: 'business_impact', type: 'text', required: true, hint: '', value: 'safe', items: [], rows: [] },
      affected_functionality: { variable: 'affected_functionality', type: 'text', required: true, hint: '', value: 'safe', items: [], rows: [] },
    };

    const result = renderTemplate('field-bug-description', slots);
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('should strip "Add more" comments', () => {
    const result = renderTemplate('field-bug-description', {
      bug_summary_description: { variable: 'bug_summary_description', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      expected_behavior: { variable: 'expected_behavior', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      actual_behavior: { variable: 'actual_behavior', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      business_impact: { variable: 'business_impact', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      affected_functionality: { variable: 'affected_functionality', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
    });
    expect(result.html).not.toMatch(/<!--\s*Add more/i);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('validateRendered', () => {
  it('should pass for fully rendered bug description', () => {
    const slots: Record<string, FillSlot> = {
      bug_summary_description: { variable: 'bug_summary_description', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      expected_behavior: { variable: 'expected_behavior', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      actual_behavior: { variable: 'actual_behavior', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      business_impact: { variable: 'business_impact', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
      affected_functionality: { variable: 'affected_functionality', type: 'text', required: true, hint: '', value: 'test', items: [], rows: [] },
    };
    const rendered = renderTemplate('field-bug-description', slots);
    const validation = validateRendered('field-bug-description', rendered.html);

    expect(validation.valid).toBe(true);
    expect(validation.checks.no_unfilled_tokens).toBe(true);
    expect(validation.checks.sections_present).toBe(true);
    expect(validation.checks.gradients_intact).toBe(true);
  });

  it('should fail when unfilled tokens remain', () => {
    const entry = getTemplateEntry('field-bug-description');
    const rawHtml = loadTemplateHtml(entry);
    const validation = validateRendered('field-bug-description', rawHtml);

    expect(validation.valid).toBe(false);
    expect(validation.checks.no_unfilled_tokens).toBe(false);
    expect(validation.issues.some(i => i.code === 'UNFILLED_TOKEN')).toBe(true);
  });

  it('should fail when gradients are stripped', () => {
    const validation = validateRendered('field-bug-description', '<div>No styles at all</div>');
    expect(validation.checks.gradients_intact).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Repeatable Block Rendering (nested-div regression tests)
// ---------------------------------------------------------------------------
describe('renderTemplate repeatable_block', () => {
  it('should render user-story acceptance criteria with all block variables', () => {
    const spec = generateFillSpec('field-user-story-acceptance-criteria');
    const filledSlots: Record<string, FillSlot> = {
      scenarios: {
        ...spec.slots['scenarios']!,
        blocks: [
          { title: 'Login success', given: 'valid credentials', when: 'user submits login', then: 'dashboard loads' },
          { title: 'Login failure', given: 'invalid password', when: 'user submits login', then: 'error message shown' },
          { title: 'Session timeout', given: 'expired session', when: 'user navigates', then: 'redirect to login' },
        ],
      },
    };
    const result = renderTemplate('field-user-story-acceptance-criteria', filledSlots);
    expect(result.html).not.toContain('{{');
    expect(result.html).toContain('valid credentials');
    expect(result.html).toContain('user submits login');
    expect(result.html).toContain('dashboard loads');
    expect(result.html).toContain('error message shown');
    expect(result.html).toContain('redirect to login');
    expect(result.warnings.filter(w => w.includes('remains after'))).toHaveLength(0);

    const validation = validateRendered('field-user-story-acceptance-criteria', result.html);
    expect(validation.valid).toBe(true);
    expect(validation.checks.no_unfilled_tokens).toBe(true);
  });

  it('should render feature acceptance criteria with all block variables', () => {
    const spec = generateFillSpec('field-feature-acceptance-criteria');
    const filledSlots: Record<string, FillSlot> = {
      success_indicators: {
        ...spec.slots['success_indicators']!,
        blocks: [
          { title: 'Core Capability', given: 'system configured', when: 'pipeline runs', then: '95% accuracy' },
          { title: 'Data Quality', given: 'source data loaded', when: 'validation runs', then: 'zero critical errors' },
          { title: 'Performance', given: 'peak load', when: 'batch executes', then: 'completes in 30 min' },
        ],
      },
    };
    const result = renderTemplate('field-feature-acceptance-criteria', filledSlots);
    expect(result.html).not.toContain('{{');
    expect(result.html).toContain('system configured');
    expect(result.html).toContain('pipeline runs');
    expect(result.html).toContain('95% accuracy');
    expect(result.html).toContain('zero critical errors');
    expect(result.html).toContain('completes in 30 min');

    const validation = validateRendered('field-feature-acceptance-criteria', result.html);
    expect(validation.valid).toBe(true);
  });

  it('should render feature objectives with all block variables', () => {
    const spec = generateFillSpec('field-feature-objectives');
    const filledSlots: Record<string, FillSlot> = {
      objectives: {
        ...spec.slots['objectives']!,
        blocks: [
          { title: 'Foundation Objective', description: 'Establish core data pipeline' },
          { title: 'Visibility Objective', description: 'Real-time dashboards for stakeholders' },
          { title: 'Quality Objective', description: 'Automated validation reduces errors by 40%' },
        ],
      },
    };
    const result = renderTemplate('field-feature-objectives', filledSlots);
    expect(result.html).not.toContain('{{');
    expect(result.html).toContain('Foundation Objective');
    expect(result.html).toContain('Establish core data pipeline');
    expect(result.html).toContain('Real-time dashboards for stakeholders');
    expect(result.html).toContain('Automated validation reduces errors by 40%');

    const validation = validateRendered('field-feature-objectives', result.html);
    expect(validation.valid).toBe(true);
  });

  it('should render blockers critical_blockers with all block variables', () => {
    const spec = generateFillSpec('field-blockers');
    const filledSlots: Record<string, FillSlot> = {
      blocker_count: { ...spec.slots['blocker_count']!, value: '2' },
      escalation_summary: { ...spec.slots['escalation_summary']!, value: 'Two items need leadership attention' },
      critical_blockers: {
        ...spec.slots['critical_blockers']!,
        blocks: [
          { work_item_id: '12345', title: 'Auth blocked', description: 'SSO config pending', impact: 'Blocks all login work', target_date: '2025-02-01', target_date_status: '5 days overdue', days_stalled: '12' },
          { work_item_id: '12346', title: 'API timeout', description: 'External API down', impact: 'Integration stalled', target_date: '2025-02-15', target_date_status: 'On track', days_stalled: '3' },
        ],
      },
      medium_dependencies: { ...spec.slots['medium_dependencies']!, blocks: [] },
      risks: { ...spec.slots['risks']!, blocks: [] },
      resolved_items: { ...spec.slots['resolved_items']!, blocks: [] },
      leadership_ask_text: { ...spec.slots['leadership_ask_text']!, value: 'Escalate SSO config to vendor' },
    };
    const result = renderTemplate('field-blockers', filledSlots);
    expect(result.html).toContain('SSO config pending');
    expect(result.html).toContain('Blocks all login work');
    expect(result.html).toContain('12 days');
    expect(result.html).toContain('External API down');
    expect(result.html).toContain('Integration stalled');
    // No critical_blocker tokens should remain
    expect(result.html).not.toContain('{{blocker_');
  });

  it('should render progress weeks with all block variables', () => {
    const spec = generateFillSpec('field-progress');
    const filledSlots: Record<string, FillSlot> = {
      completion_percent: { ...spec.slots['completion_percent']!, value: '45' },
      completed_count: { ...spec.slots['completed_count']!, value: '27' },
      total_count: { ...spec.slots['total_count']!, value: '60' },
      update_date: { ...spec.slots['update_date']!, value: 'Jun 18, 2025' },
      overall_status_summary: { ...spec.slots['overall_status_summary']!, value: 'Steady progress across all workstreams.' },
      window_start: { ...spec.slots['window_start']!, value: '05/07/2025' },
      window_end: { ...spec.slots['window_end']!, value: '06/18/2025' },
      weeks: {
        ...spec.slots['weeks']!,
        blocks: [
          { start: '06/16', end: '06/18', narrative: 'Auth sprint completed', activities: '<ul><li>Closed 3 stories</li></ul>' },
          { start: '06/09', end: '06/15', narrative: 'Testing focus week', activities: '<ul><li>QA started</li></ul>' },
          { start: '06/02', end: '06/08', narrative: 'Dev ramp-up', activities: '<ul><li>Sprint planning</li></ul>' },
        ],
      },
      leadership_helped_text: { ...spec.slots['leadership_helped_text']!, value: 'Removed procurement blocker' },
      support_needed_text: { ...spec.slots['support_needed_text']!, value: 'No immediate needs' },
    };
    const result = renderTemplate('field-progress', filledSlots);
    expect(result.html).toContain('Auth sprint completed');
    expect(result.html).toContain('Closed 3 stories');
    expect(result.html).toContain('Testing focus week');
    expect(result.html).toContain('QA started');
    expect(result.html).toContain('Dev ramp-up');
    // No week tokens should remain
    expect(result.html).not.toContain('{{week_');
  });

  it('should handle fewer blocks than template slots without leaving tokens', () => {
    const spec = generateFillSpec('field-user-story-acceptance-criteria');
    const filledSlots: Record<string, FillSlot> = {
      scenarios: {
        ...spec.slots['scenarios']!,
        blocks: [
          { title: 'Only scenario', given: 'precond', when: 'action', then: 'result' },
        ],
      },
    };
    const result = renderTemplate('field-user-story-acceptance-criteria', filledSlots);
    // Should not contain any remaining scenario tokens
    expect(result.html).not.toContain('{{scenario_');
    expect(result.html).toContain('precond');
  });

  it('should report warnings when tokens remain after rendering', () => {
    // Render with empty blocks to leave tokens unfilled
    const spec = generateFillSpec('field-user-story-acceptance-criteria');
    const filledSlots: Record<string, FillSlot> = {
      scenarios: {
        ...spec.slots['scenarios']!,
        blocks: [],
      },
    };
    const result = renderTemplate('field-user-story-acceptance-criteria', filledSlots);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: scaffold → fill → render → validate loop
// ---------------------------------------------------------------------------
describe('Full scaffold→fill→render→validate loop', () => {
  it('should work end-to-end for solution design', () => {
    // Step 1: Scaffold
    const spec = generateFillSpec('field-solution-design');
    expect(spec.slots['business_problem_statement']).toBeDefined();
    expect(spec.slots['components']).toBeDefined();

    // Step 2: Fill (simulate AI output)
    const filledSlots: Record<string, FillSlot> = {
      business_problem_statement: {
        ...spec.slots['business_problem_statement']!,
        value: 'Users cannot log in after password reset',
      },
      solution_approach_narrative: {
        ...spec.slots['solution_approach_narrative']!,
        value: 'Add retry logic to the authentication service',
      },
      technical_narrative: {
        ...spec.slots['technical_narrative']!,
        value: 'Implemented a 3-retry mechanism with exponential backoff',
      },
      components: {
        ...spec.slots['components']!,
        rows: [
          { name: 'AuthService', type: 'Apex Class', responsibility: 'Handles login retry logic' },
          { name: 'LoginController', type: 'LWC', responsibility: 'UI for login flow' },
        ],
      },
      integration_points_brief: {
        ...spec.slots['integration_points_brief']!,
        value: 'Integrates with SSO provider via SAML',
      },
    };

    // Step 3: Render
    const result = renderTemplate('field-solution-design', filledSlots);
    expect(result.success).toBe(true);
    expect(result.html).toContain('Users cannot log in after password reset');
    expect(result.html).toContain('AuthService');
    expect(result.html).toContain('LoginController');
    expect(result.html).toContain('linear-gradient');

    // Step 4: Validate
    const validation = validateRendered('field-solution-design', result.html);
    expect(validation.valid).toBe(true);
    expect(validation.checks.no_unfilled_tokens).toBe(true);
    expect(validation.checks.sections_present).toBe(true);
  });
});
