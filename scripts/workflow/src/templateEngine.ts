/**
 * Template Engine
 * Core library for scaffold generation, rendering, and validation of HTML templates.
 * Separates structure (deterministic, template-driven) from content (AI-generated).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadSharedConfig, getProjectRoot } from './lib/configLoader.js';
import type {
  TemplateRegistry,
  TemplateRegistryEntry,
  TemplateVariable,
  FillSpec,
  FillSlot,
  PhaseFillSpec,
  RenderResult,
  ValidationResult,
  ValidationIssue,
  PhaseRenderResult,
} from './types/templateTypes.js';

// ---------------------------------------------------------------------------
// Registry Loading
// ---------------------------------------------------------------------------

let _registryCache: TemplateRegistry | null = null;

/** Load the template registry from config/templates/template-registry.json */
export function loadRegistry(): TemplateRegistry {
  if (_registryCache) return _registryCache;
  const config = loadSharedConfig();
  const projectRoot = getProjectRoot();
  const registryPath = resolve(projectRoot, config.paths.templates, 'template-registry.json');
  const raw = readFileSync(registryPath, 'utf-8');
  _registryCache = JSON.parse(raw) as TemplateRegistry;
  return _registryCache;
}

/** Clear cached registry (for testing) */
export function clearRegistryCache(): void {
  _registryCache = null;
}

/** Get a single template entry by key */
export function getTemplateEntry(templateKey: string): TemplateRegistryEntry {
  const registry = loadRegistry();
  const entry = registry.templates[templateKey];
  if (!entry) {
    const available = Object.keys(registry.templates).join(', ');
    throw new Error(`Template "${templateKey}" not found in registry. Available: ${available}`);
  }
  return entry;
}

/** Load the raw HTML content for a template */
export function loadTemplateHtml(entry: TemplateRegistryEntry): string {
  const config = loadSharedConfig();
  const projectRoot = getProjectRoot();
  const templatePath = resolve(projectRoot, config.paths.templates, entry.file);
  return readFileSync(templatePath, 'utf-8');
}

/** List templates matching a phase and/or work item type */
export function listTemplates(options: {
  phase?: string;
  workItemType?: string;
}): Record<string, TemplateRegistryEntry> {
  const registry = loadRegistry();
  const result: Record<string, TemplateRegistryEntry> = {};

  for (const [key, entry] of Object.entries(registry.templates)) {
    if (options.phase && entry.phase !== options.phase) continue;
    if (options.workItemType && !entry.work_item_types.includes(options.workItemType)) continue;
    result[key] = entry;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Variable Extraction (from raw HTML)
// ---------------------------------------------------------------------------

/** Extract all {{variable}} tokens from HTML */
export function extractVariables(html: string): string[] {
  const pattern = /\{\{([^}]+)\}\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const captured = match[1];
    if (captured) vars.add(captured.trim());
  }
  return Array.from(vars);
}

// ---------------------------------------------------------------------------
// Fill Spec Generation (scaffold)
// ---------------------------------------------------------------------------

/** Generate a fill spec for a single template */
export function generateFillSpec(
  templateKey: string,
  prefill?: Record<string, unknown>,
): FillSpec {
  const entry = getTemplateEntry(templateKey);

  const slots: Record<string, FillSlot> = {};

  for (const [varName, varDef] of Object.entries(entry.variables)) {
    const prefillValue = prefill?.[varName];

    const slot: FillSlot = {
      variable: varName,
      type: varDef.type,
      required: varDef.required,
      hint: varDef.description,
      value: null,
      items: [],
      rows: [],
    };

    // Attach column defs for table type
    if (varDef.type === 'table' && varDef.columns) {
      slot.columns = varDef.columns;
    }

    // Attach block variable defs for repeatable_block type
    if (varDef.type === 'repeatable_block' && varDef.block_variables) {
      slot.block_variables = varDef.block_variables;
      slot.blocks = [];
    }

    // Apply prefill values
    if (prefillValue !== undefined && prefillValue !== null) {
      if (varDef.type === 'text' || varDef.type === 'html') {
        slot.value = String(prefillValue);
      } else if (varDef.type === 'list' && Array.isArray(prefillValue)) {
        slot.items = prefillValue.map(String);
      } else if (varDef.type === 'table' && Array.isArray(prefillValue)) {
        slot.rows = prefillValue as Record<string, string>[];
      } else if (varDef.type === 'repeatable_block' && Array.isArray(prefillValue)) {
        slot.blocks = prefillValue as Record<string, string | null>[];
      }
    }

    slots[varName] = slot;
  }

  return {
    template: templateKey,
    ado_field: entry.ado_field,
    phase: entry.phase,
    slots,
  };
}

/** Generate fill specs for all templates in a phase for a work item type */
export function generatePhaseFillSpec(
  phase: string,
  workItemType: string,
  workItemId: string,
  prefill?: Record<string, Record<string, unknown>>,
): PhaseFillSpec {
  const templates = listTemplates({ phase, workItemType });
  const templateSpecs: Record<string, FillSpec> = {};

  for (const [key, _entry] of Object.entries(templates)) {
    templateSpecs[key] = generateFillSpec(key, prefill?.[key]);
  }

  return {
    phase,
    work_item_type: workItemType,
    work_item_id: workItemId,
    templates: templateSpecs,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Escape HTML special characters in text content */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape regex special characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Render a single template from filled slots */
export function renderTemplate(
  templateKey: string,
  filledSlots: Record<string, FillSlot>,
): RenderResult {
  const entry = getTemplateEntry(templateKey);
  let html = loadTemplateHtml(entry);

  const warnings: string[] = [];
  let slotsFilled = 0;
  const missingSlots: string[] = [];

  for (const [varName, varDef] of Object.entries(entry.variables)) {
    const slot = filledSlots[varName];

    if (!slot) {
      if (varDef.required) missingSlots.push(varName);
      continue;
    }

    switch (varDef.type) {
      case 'text': {
        if (slot.value !== null && slot.value !== '') {
          html = replaceTokens(html, varName, escapeHtml(slot.value));
          slotsFilled++;
        } else if (varDef.required) {
          missingSlots.push(varName);
        }
        break;
      }

      case 'html': {
        if (slot.value !== null && slot.value !== '') {
          html = replaceTokens(html, varName, slot.value);
          slotsFilled++;
        } else if (varDef.required) {
          missingSlots.push(varName);
        }
        break;
      }

      case 'list': {
        if (slot.items.length > 0) {
          const tokenPrefix = varDef.token_prefix ?? varName;
          html = renderListSlot(html, tokenPrefix, slot.items);
          slotsFilled++;
        } else if (varDef.required) {
          missingSlots.push(varName);
        }
        break;
      }

      case 'table': {
        if (slot.rows.length > 0 && varDef.columns) {
          const tokenPrefix = varDef.token_prefix ?? varName;
          html = renderTableSlot(html, tokenPrefix, slot.rows, varDef.columns);
          slotsFilled++;
        } else if (varDef.required) {
          missingSlots.push(varName);
        }
        break;
      }

      case 'repeatable_block': {
        const blocks = slot.blocks ?? [];
        if (blocks.length > 0 && varDef.block_variables) {
          const tokenPrefix = varDef.token_prefix ?? varName;
          html = renderRepeatableBlockSlot(html, tokenPrefix, blocks, varDef.block_variables);
          slotsFilled++;
        } else if (varDef.required) {
          missingSlots.push(varName);
        }
        break;
      }
    }
  }

  // Strip all HTML comments (template documentation, "Add more" hints, etc.)
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Post-render safety check: warn if any {{...}} tokens remain after rendering
  const remainingTokens = extractVariables(html);
  if (remainingTokens.length > 0) {
    for (const token of remainingTokens) {
      warnings.push(`Token {{${token}}} remains after rendering`);
    }
  }

  return {
    success: missingSlots.length === 0 && remainingTokens.length === 0,
    template: templateKey,
    ado_field: entry.ado_field,
    html: html.trim(),
    html_length: html.trim().length,
    slots_filled: slotsFilled,
    slots_missing: missingSlots.length,
    missing_slots: missingSlots,
    warnings,
  };
}

/** Replace simple {{variable}} tokens in the HTML */
function replaceTokens(html: string, varName: string, value: string): string {
  const pattern = new RegExp(`\\{\\{${escapeRegex(varName)}\\}\\}`, 'g');
  return html.replace(pattern, value);
}

/** Render a list slot — clones the <li> pattern for each item */
function renderListSlot(html: string, varName: string, items: string[]): string {
  // Strategy: find <li> elements containing {{varName_N}} or {{varName}} tokens,
  // use the first as a template, remove all, then generate new ones from items.
  const liPatterns = [
    new RegExp(`(\\s*<li[^>]*>)\\{\\{${escapeRegex(varName)}_\\d+\\}\\}(</li>)`, 'g'),
    new RegExp(`(\\s*<li[^>]*>)\\{\\{${escapeRegex(varName)}\\}\\}(</li>)`, 'g'),
  ];

  for (const pattern of liPatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      const first = matches[0]!;
      const liOpen = first[1] ?? '';
      const liClose = first[2] ?? '';
      const firstIndex = first.index ?? 0;

      // Remove all matching <li> elements (reverse to preserve indices)
      let cleaned = html;
      for (const m of [...matches].reverse()) {
        const idx = m.index ?? 0;
        cleaned = cleaned.substring(0, idx) + cleaned.substring(idx + m[0].length);
      }

      // Generate new <li> elements and insert at first match position
      const newLis = items.map(item => `${liOpen}${escapeHtml(item)}${liClose}`).join('\n');
      cleaned = cleaned.substring(0, firstIndex) + newLis + cleaned.substring(firstIndex);
      return cleaned;
    }
  }

  // Fallback: direct token replacement for numbered vars
  let result = html;
  for (let i = 0; i < items.length; i++) {
    const token = new RegExp(`\\{\\{${escapeRegex(varName)}_${i + 1}\\}\\}`, 'g');
    result = result.replace(token, escapeHtml(items[i] ?? ''));
  }
  result = result.replace(new RegExp(`\\{\\{${escapeRegex(varName)}_\\d+\\}\\}`, 'g'), '');
  return result;
}

/** Render a table slot — clones the <tr> pattern for each row */
function renderTableSlot(
  html: string,
  varName: string,
  rows: Record<string, string>[],
  columns: { key: string; header: string; required: boolean }[],
): string {
  if (columns.length === 0) return html;
  const firstColKey = columns[0]!.key;

  // Find data row: a <tr> containing {{colKey}} or {{varName_colKey}} tokens
  const tokenPatterns = [
    `\\{\\{${escapeRegex(varName)}_${escapeRegex(firstColKey)}\\}\\}`,
    `\\{\\{${escapeRegex(firstColKey)}\\}\\}`,
  ];

  for (const tokenPat of tokenPatterns) {
    const trRegex = new RegExp(`(\\s*<tr[^>]*>(?:(?!<\\/tr>).)*?${tokenPat}(?:(?!<\\/tr>).)*?<\\/tr>)`, 'gs');
    const trMatches = [...html.matchAll(trRegex)];

    if (trMatches.length > 0) {
      const firstTr = trMatches[0]!;
      const templateRow = firstTr[1] ?? firstTr[0];
      const firstIdx = firstTr.index ?? 0;

      // Remove all template data rows (reverse to preserve indices)
      let cleaned = html;
      for (const m of [...trMatches].reverse()) {
        const idx = m.index ?? 0;
        cleaned = cleaned.substring(0, idx) + cleaned.substring(idx + m[0].length);
      }

      // Generate new <tr> elements
      const newRows: string[] = [];
      for (const row of rows) {
        let rowHtml = templateRow;
        for (const col of columns) {
          const value = row[col.key] ?? '';
          rowHtml = rowHtml.replace(
            new RegExp(`\\{\\{(?:${escapeRegex(varName)}_)?${escapeRegex(col.key)}\\}\\}`, 'g'),
            escapeHtml(value),
          );
        }
        newRows.push(rowHtml);
      }

      cleaned = cleaned.substring(0, firstIdx) + newRows.join('\n') + cleaned.substring(firstIdx);
      return cleaned;
    }
  }

  // Fallback: replace individual numbered tokens (e.g. {{component_1_name}})
  let result = html;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {};
    for (const col of columns) {
      const value = row[col.key] ?? '';
      const escaped = escapeHtml(value);
      const pats = [
        new RegExp(`\\{\\{${escapeRegex(varName)}_${i + 1}_${escapeRegex(col.key)}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(varName)}_${escapeRegex(col.key)}_${i + 1}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(col.key)}_${i + 1}\\}\\}`, 'g'),
      ];
      for (const p of pats) {
        result = result.replace(p, escaped);
      }
    }
  }
  // Clean up remaining numbered tokens beyond provided rows
  for (const col of columns) {
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(varName)}_\\d+_${escapeRegex(col.key)}\\}\\}`, 'g'), '');
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(varName)}_${escapeRegex(col.key)}_\\d+\\}\\}`, 'g'), '');
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(col.key)}_\\d+\\}\\}`, 'g'), '');
  }
  return result;
}

/** Render a repeatable_block slot — clones entire div blocks */
function renderRepeatableBlockSlot(
  html: string,
  varName: string,
  blocks: Record<string, string | null>[],
  blockVariables: Record<string, TemplateVariable>,
): string {
  const blockVarKeys = Object.keys(blockVariables);
  if (blockVarKeys.length === 0) return html;

  const firstBlockVar = blockVarKeys[0] ?? '';

  // Find which token pattern the template uses for block 1
  const candidatePatterns: [string, string][] = [
    [`${varName}_1_${firstBlockVar}`, 'prefix_n_var'],
    [`${varName}_${firstBlockVar}_1`, 'prefix_var_n'],
    [`${firstBlockVar}_1`, 'var_n'],
    [`${varName}_1`, 'name_n'],
  ];

  let foundPattern: string | null = null;
  for (const [candidate] of candidatePatterns) {
    if (html.includes(`{{${candidate}}}`)) {
      foundPattern = candidate;
      break;
    }
  }

  // Try prefix variations
  if (!foundPattern) {
    for (const bv of blockVarKeys) {
      const testToken = `${varName.replace(/_$/, '')}_1_${bv}`;
      if (html.includes(`{{${testToken}}}`)) {
        foundPattern = testToken;
        break;
      }
    }
  }

  // Try scanning extracted variables
  if (!foundPattern) {
    const extractedVars = extractVariables(html);
    for (const v of extractedVars) {
      if (v.includes('_1_') || v.endsWith('_1')) {
        foundPattern = v;
        break;
      }
    }
  }

  if (!foundPattern) {
    return renderRepeatableBlockFallback(html, varName, blocks, blockVarKeys);
  }

  // Find block 1 tokens and their containing region
  const block1Tokens = findBlockTokens(html, varName, 1, blockVarKeys);
  if (block1Tokens.length === 0) {
    return renderRepeatableBlockFallback(html, varName, blocks, blockVarKeys);
  }

  const firstToken = block1Tokens[0]!;
  if (!findBlockRegion(html, firstToken)) {
    return renderRepeatableBlockFallback(html, varName, blocks, blockVarKeys);
  }

  // Find ALL numbered block regions
  const allBlockRegions = findAllNumberedBlockRegions(html, varName, blockVarKeys);
  if (allBlockRegions.length === 0) {
    return renderRepeatableBlockFallback(html, varName, blocks, blockVarKeys);
  }

  const firstRegion = allBlockRegions[0]!;
  const templateBlock = firstRegion.html;

  // Safety: verify the detected block region contains ALL block variable tokens.
  // If the region is too small (e.g. matched an inner title div), fall back.
  const tokensInRegion = findBlockTokens(templateBlock, varName, 1, blockVarKeys);
  if (tokensInRegion.length < blockVarKeys.length) {
    return renderRepeatableBlockFallback(html, varName, blocks, blockVarKeys);
  }

  // Remove all existing numbered blocks (reverse order to preserve indices)
  let cleaned = html;
  for (const region of [...allBlockRegions].reverse()) {
    cleaned = cleaned.substring(0, region.start) + cleaned.substring(region.end);
  }

  // Generate new blocks from data
  const newBlocks: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const blockData = blocks[i] ?? {};
    let blockHtml = templateBlock;

    for (const bv of blockVarKeys) {
      const value = blockData[bv] ?? '';
      const escapedValue = escapeHtml(String(value));
      const patterns = [
        new RegExp(`\\{\\{${escapeRegex(varName)}_1_${escapeRegex(bv)}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(varName)}_${escapeRegex(bv)}_1\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(bv)}_1\\}\\}`, 'g'),
      ];
      for (const p of patterns) {
        blockHtml = blockHtml.replace(p, escapedValue);
      }
    }

    // Update counter references (e.g., "Scenario 1" → "Scenario N", ">1</span>" → ">N</span>")
    blockHtml = blockHtml.replace(
      /(<span[^>]*>)\s*(?:Scenario\s+)?1\s*(<\/span>)/i,
      `$1${i + 1}$2`,
    );
    blockHtml = blockHtml.replace(/>1<\/span>/, `>${i + 1}</span>`);

    newBlocks.push(blockHtml);
  }

  cleaned = cleaned.substring(0, firstRegion.start) + newBlocks.join('\n') + cleaned.substring(firstRegion.start);
  return cleaned;
}

/** Fallback: replace numbered tokens directly */
function renderRepeatableBlockFallback(
  html: string,
  varName: string,
  blocks: Record<string, string | null>[],
  blockVarKeys: string[],
): string {
  let result = html;

  for (let i = 0; i < blocks.length; i++) {
    const blockData = blocks[i] ?? {};
    for (const bv of blockVarKeys) {
      const value = blockData[bv] ?? '';
      const escapedValue = escapeHtml(String(value));
      const patterns = [
        new RegExp(`\\{\\{${escapeRegex(varName)}_${i + 1}_${escapeRegex(bv)}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(bv)}_${i + 1}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${escapeRegex(varName)}_${escapeRegex(bv)}_${i + 1}\\}\\}`, 'g'),
      ];
      for (const p of patterns) {
        result = result.replace(p, escapedValue);
      }
    }
  }

  // Clean up remaining numbered tokens
  for (const bv of blockVarKeys) {
    result = result.replace(new RegExp(`\\{\\{(?:${escapeRegex(varName)}_)?${escapeRegex(bv)}_\\d+\\}\\}`, 'g'), '');
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(varName)}_\\d+_${escapeRegex(bv)}\\}\\}`, 'g'), '');
  }
  return result;
}

/** Find all token strings for a specific block number */
function findBlockTokens(
  html: string,
  varName: string,
  blockNum: number,
  blockVarKeys: string[],
): string[] {
  const tokens: string[] = [];
  for (const bv of blockVarKeys) {
    const candidates = [
      `{{${varName}_${blockNum}_${bv}}}`,
      `{{${varName}_${bv}_${blockNum}}}`,
      `{{${bv}_${blockNum}}}`,
      `{{${varName}_${blockNum}}}`,
    ];
    for (const c of candidates) {
      if (html.includes(c)) tokens.push(c);
    }
  }
  return tokens;
}

/** Find the containing div/block element for a token.
 *  When allTokens is provided, ensures the region contains ALL of them
 *  (prevents matching a nested inner div instead of the outer card div). */
function findBlockRegion(
  html: string,
  token: string,
  allTokens?: string[],
): { start: number; end: number; html: string } | null {
  const tokenPos = html.indexOf(token);
  if (tokenPos === -1) return null;

  // Collect candidate start positions walking backward
  const candidates: number[] = [];
  let depth = 0;

  for (let i = tokenPos - 1; i >= 0; i--) {
    if (html.substring(i, i + 5) === '</div') depth++;
    if (html.substring(i, i + 4) === '<div') {
      if (depth > 0) {
        depth--;
      } else {
        const divSnippet = html.substring(i, Math.min(i + 200, html.length));
        if (divSnippet.includes('margin-bottom') || divSnippet.includes('border-left')) {
          let candidateStart = i;
          while (candidateStart > 0 && (html[candidateStart - 1] === ' ' || html[candidateStart - 1] === '\n')) candidateStart--;
          if (html[candidateStart] === '\n') candidateStart++;
          candidates.push(candidateStart);
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Helper: compute the full region (start → matching </div>) for a candidate
  const computeRegion = (start: number): { start: number; end: number; html: string } | null => {
    let d = 0;
    let end = start;
    for (let i = start; i < html.length; i++) {
      if (html[i] === '>') {
        const tagStart = html.lastIndexOf('<', i);
        const tag = html.substring(tagStart, i + 1);
        if (tag.startsWith('<div')) d++;
        else if (tag.startsWith('</div')) {
          d--;
          if (d === 0) {
            end = i + 1;
            if (end < html.length && html[end] === '\n') end++;
            break;
          }
        }
      }
    }
    if (end <= start) return null;
    return { start, end, html: html.substring(start, end) };
  };

  // If no allTokens check needed, use the first (innermost) candidate (legacy behavior)
  if (!allTokens || allTokens.length <= 1) {
    return computeRegion(candidates[0]!);
  }

  // Find the smallest candidate region that contains ALL tokens
  for (const candidateStart of candidates) {
    const region = computeRegion(candidateStart);
    if (!region) continue;
    const allPresent = allTokens.every(t => region.html.includes(t));
    if (allPresent) return region;
  }

  // No candidate contains all tokens — return the outermost as best effort
  return computeRegion(candidates[candidates.length - 1]!);
}

/** Find all numbered block regions in the HTML */
function findAllNumberedBlockRegions(
  html: string,
  varName: string,
  blockVarKeys: string[],
): { start: number; end: number; html: string; blockNum: number }[] {
  const regions: { start: number; end: number; html: string; blockNum: number }[] = [];

  for (let n = 1; n <= 20; n++) {
    const tokens = findBlockTokens(html, varName, n, blockVarKeys);
    if (tokens.length === 0) break;
    const firstToken = tokens[0]!;
    const region = findBlockRegion(html, firstToken, tokens);
    if (region) regions.push({ ...region, blockNum: n });
  }
  return regions;
}

// ---------------------------------------------------------------------------
// Phase-Level Rendering
// ---------------------------------------------------------------------------

/** Render all templates for a phase from filled slots */
export function renderPhaseTemplates(
  phase: string,
  workItemId: string,
  filledSlots: Record<string, Record<string, FillSlot>>,
): PhaseRenderResult {
  const results: Record<string, RenderResult> = {};
  let allValid = true;
  let totalIssues = 0;

  for (const [templateKey, slots] of Object.entries(filledSlots)) {
    const result = renderTemplate(templateKey, slots);
    results[templateKey] = result;
    if (!result.success) allValid = false;
    totalIssues += result.missing_slots.length;
  }

  return {
    success: allValid,
    phase,
    work_item_id: workItemId,
    templates: results,
    all_valid: allValid,
    total_issues: totalIssues,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate rendered HTML against its template registry entry */
export function validateRendered(
  templateKey: string,
  renderedHtml: string,
): ValidationResult {
  const entry = getTemplateEntry(templateKey);
  const issues: ValidationIssue[] = [];

  // Check 1: No unfilled {{...}} tokens
  const unfilledTokens = extractVariables(renderedHtml);
  const noUnfilledTokens = unfilledTokens.length === 0;
  if (!noUnfilledTokens) {
    for (const token of unfilledTokens) {
      issues.push({
        severity: 'error',
        code: 'UNFILLED_TOKEN',
        message: `Unfilled token found: {{${token}}}`,
        location: token,
      });
    }
  }

  // Check 2: Required sections present
  let sectionsPresent = true;
  for (const section of entry.sections) {
    if (!section.required) continue;
    let found = false;
    if (section.gradient_signature) found = renderedHtml.includes(section.gradient_signature);
    if (!found && section.name) found = renderedHtml.includes(section.name);
    if (!found) {
      sectionsPresent = false;
      issues.push({
        severity: 'error',
        code: 'MISSING_SECTION',
        message: `Required section "${section.name}" not found in rendered HTML`,
        location: section.id,
      });
    }
  }

  // Check 3: CSS gradients intact
  const gradientsIntact = renderedHtml.includes('linear-gradient');
  if (!gradientsIntact && entry.sections.some(s => s.gradient_signature)) {
    issues.push({
      severity: 'error',
      code: 'GRADIENTS_MISSING',
      message: 'CSS gradient styles are missing — template structure may have been altered',
    });
  }

  // Check 4: Table headers match
  let tableHeadersMatch = true;
  for (const varDef of Object.values(entry.variables)) {
    if (varDef.type === 'table' && varDef.columns) {
      for (const col of varDef.columns) {
        if (!renderedHtml.includes(col.header)) {
          tableHeadersMatch = false;
          issues.push({
            severity: 'warning',
            code: 'TABLE_HEADER_MISSING',
            message: `Table header "${col.header}" not found`,
            location: col.key,
          });
        }
      }
    }
  }

  // Check 5: No extra sections (heuristic)
  const originalHtml = loadTemplateHtml(entry);
  const originalGradientCount = (originalHtml.match(/linear-gradient/g) ?? []).length;
  const renderedGradientCount = (renderedHtml.match(/linear-gradient/g) ?? []).length;
  const noExtraSections = renderedGradientCount <= originalGradientCount + 2;
  if (!noExtraSections) {
    issues.push({
      severity: 'warning',
      code: 'EXTRA_SECTIONS',
      message: `Rendered HTML has ${renderedGradientCount} gradient sections vs ${originalGradientCount} in template`,
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    template: templateKey,
    issues,
    checks: {
      sections_present: sectionsPresent,
      no_unfilled_tokens: noUnfilledTokens,
      gradients_intact: gradientsIntact,
      table_headers_match: tableHeadersMatch,
      no_extra_sections: noExtraSections,
    },
  };
}
