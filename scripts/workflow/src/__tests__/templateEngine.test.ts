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
