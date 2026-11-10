import { BLOCKS, META, THEMES, TIMELINE, BLOCK_ID, CUE_ACTIONS } from './schema.js';
import { MARK_RE } from './markdown.js';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function checkSpec(spec, value, path, err) {
  if (value === undefined || value === null) {
    if (!spec.optional) err(path, `required ${spec.kind}`);
    return;
  }
  switch (spec.kind) {
    case 'string':
      if (typeof value !== 'string' || value.trim() === '') err(path, 'must be a non-empty string');
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) err(path, 'must be a finite number');
      break;
    case 'boolean':
      if (typeof value !== 'boolean') err(path, 'must be true or false');
      break;
    case 'enum':
      if (!spec.values.includes(value)) err(path, `must be one of: ${spec.values.join(', ')}`);
      break;
    case 'array':
      if (!Array.isArray(value)) { err(path, 'must be an array'); break; }
      value.forEach((item, i) => checkSpec(spec.of, item, `${path}[${i}]`, err));
      break;
    case 'object': {
      if (!isObj(value)) { err(path, 'must be an object'); break; }
      for (const [name, field] of Object.entries(spec.fields)) {
        checkSpec(field, value[name], `${path}.${name}`, err);
      }
      for (const name of Object.keys(value)) {
        if (!(name in spec.fields)) err(`${path}.${name}`, `unknown field (allowed: ${Object.keys(spec.fields).join(', ')})`);
      }
      break;
    }
    case 'any':
      break;
    default:
      break;
  }
  if (spec.check) spec.check(value, path, err);
}

/**
 * Validate a document model.
 * @returns {{ok: boolean, errors: {path: string, message: string}[], theme: string|null}}
 */
export function validateDoc(doc, { defaultTheme = null } = {}) {
  const errors = [];
  const err = (path, message) => errors.push({ path: path || '<doc>', message });

  if (!isObj(doc)) {
    return { ok: false, errors: [{ path: '<doc>', message: 'document must be a JSON object' }], theme: null };
  }

  for (const name of Object.keys(doc)) {
    if (!['schemaVersion', 'theme', 'meta', 'blocks', 'timeline'].includes(name)) {
      err(name, 'unknown top-level field (allowed: schemaVersion, theme, meta, blocks, timeline)');
    }
  }
  if (doc.schemaVersion !== undefined && doc.schemaVersion !== 1) err('schemaVersion', 'must be 1');
  if (doc.theme !== undefined && !THEMES[doc.theme]) err('theme', `must be one of: ${Object.keys(THEMES).join(', ')}`);

  checkSpec({ kind: 'object', fields: META }, doc.meta, 'meta', err);

  if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) {
    err('blocks', 'must be a non-empty array of blocks');
    return { ok: false, errors, theme: doc.theme || defaultTheme };
  }

  const ids = new Set();
  doc.blocks.forEach((block, i) => {
    const path = `blocks[${i}]`;
    if (!isObj(block)) { err(path, 'must be an object with a `type`'); return; }
    const type = block.type;
    if (!type) { err(`${path}.type`, `required (one of: ${Object.keys(BLOCKS).join(', ')})`); return; }
    const def = BLOCKS[type];
    if (!def) { err(`${path}.type`, `unknown block type "${type}" (one of: ${Object.keys(BLOCKS).join(', ')})`); return; }
    for (const name of Object.keys(block)) {
      if (name !== 'type' && name !== 'id' && !(name in def.fields)) {
        err(`${path}.${name}`, `unknown field for ${type} (allowed: ${Object.keys(def.fields).join(', ')})`);
      }
    }
    for (const [name, field] of Object.entries(def.fields)) {
      checkSpec(field, block[name], `${path}.${name}`, err);
    }
    if (def.check) def.check(block, path, err);
    checkSpec(BLOCK_ID, block.id, `${path}.id`, err);
    if (typeof block.id === 'string') {
      if (!ID_RE.test(block.id)) err(`${path}.id`, 'must match ^[a-z][a-z0-9-]*$');
      else if (ids.has(block.id)) err(`${path}.id`, `duplicate block id "${block.id}"`);
      ids.add(block.id);
    }
    if (type === 'panels' && Array.isArray(block.items)) {
      block.items.forEach((item, j) => {
        const wanted = String(j + 1).padStart(2, '0');
        if (item?.index && item.index !== wanted) {
          err(`${path}.items[${j}].index`, `expected "${wanted}" to keep panel numbering sequential`);
        }
      });
    }
  });

  if (doc.timeline !== undefined) checkTimeline(doc, err);

  return { ok: errors.length === 0, errors, theme: doc.theme || defaultTheme };
}

const ID_RE = /^[a-z][a-z0-9-]*$/;

// Parts a cue can address inside a block: diagram nodes, panels, scene labels.
function blockParts(block) {
  if (block.type === 'figure' && block.spec === 'diagram') return (block.diagram?.nodes || []).map(node => node.id);
  if (block.type === 'panels') return (block.items || []).map((item, i) => item.index || String(i + 1).padStart(2, '0'));
  if (block.type === 'graphScene') return (block.graph?.labels || []).slice(0, 9); // the scene draws the first 9
  return [];
}

function collectMarks(value, path, marks, err) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(MARK_RE)) {
      if (marks.has(match[1])) err(path, `duplicate mark id "${match[1]}"`);
      marks.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectMarks(item, `${path}[${i}]`, marks, err));
  } else if (isObj(value)) {
    for (const [key, item] of Object.entries(value)) collectMarks(item, `${path}.${key}`, marks, err);
  }
}

function checkTimeline(doc, err) {
  checkSpec({ kind: 'object', fields: TIMELINE }, doc.timeline, 'timeline', err);
  if (!isObj(doc.timeline) || !Array.isArray(doc.timeline.cues)) return;

  const blocks = new Map();
  for (const block of doc.blocks) {
    if (isObj(block) && typeof block.id === 'string' && !blocks.has(block.id)) blocks.set(block.id, block);
  }
  const marks = new Set();
  collectMarks(doc.meta, 'meta', marks, err);
  collectMarks(doc.blocks, 'blocks', marks, err);

  doc.timeline.cues.forEach((cue, i) => {
    const path = `timeline.cues[${i}]`;
    if (!isObj(cue) || typeof cue.target !== 'string' || !CUE_ACTIONS[cue.do]) return;
    if (typeof cue.at === 'number' && cue.at < 0) err(`${path}.at`, 'must be 0 or more');
    if (typeof cue.dur === 'number' && cue.dur <= 0) err(`${path}.dur`, 'must be more than 0');
    if (cue.zoom !== undefined && cue.do !== 'camera') err(`${path}.zoom`, 'only camera cues take zoom');
    const target = cue.target;
    if (target === 'page') {
      if (cue.do !== 'camera') err(`${path}.target`, '"page" is only a camera target');
      return;
    }
    if (target.startsWith('mark:')) {
      const id = target.slice(5);
      if (!marks.has(id)) err(`${path}.target`, `unknown mark "${id}" (add [[mark:${id}|text]] to a prose string)`);
      else if (cue.do === 'camera' || cue.do === 'activate') err(`${path}.do`, `${cue.do} cannot target a mark`);
      return;
    }
    const [blockId, part, extra] = target.split('/');
    const block = blocks.get(blockId);
    if (!block || extra !== undefined) {
      err(`${path}.target`, `unknown block id "${blockId}" (known: ${[...blocks.keys()].join(', ') || 'none'})`);
      return;
    }
    if (part !== undefined) {
      const parts = blockParts(block);
      if (!parts.includes(part)) err(`${path}.target`, `unknown part "${part}" in ${blockId} (known: ${parts.join(', ') || 'none'})`);
    }
    if (cue.do === 'activate' && (block.type !== 'graphScene' || part === undefined)) {
      err(`${path}.target`, 'activate needs "<graphScene id>/<label>"');
    }
  });
}

export function formatErrors(errors, limit = 25) {
  const shown = errors.slice(0, limit);
  const lines = shown.map(e => `${e.path}: ${e.message}`);
  if (errors.length > shown.length) lines.push(`... ${errors.length - shown.length} more`);
  return lines.join('\n');
}
