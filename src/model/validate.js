import { BLOCKS, META, THEMES } from './schema.js';

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
    if (!['schemaVersion', 'theme', 'meta', 'blocks'].includes(name)) {
      err(name, 'unknown top-level field (allowed: schemaVersion, theme, meta, blocks)');
    }
  }
  if (doc.schemaVersion !== undefined && doc.schemaVersion !== 1) err('schemaVersion', 'must be 1');
  if (doc.theme !== undefined && !THEMES[doc.theme]) err('theme', `must be one of: ${Object.keys(THEMES).join(', ')}`);

  checkSpec({ kind: 'object', fields: META }, doc.meta, 'meta', err);

  if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) {
    err('blocks', 'must be a non-empty array of blocks');
    return { ok: false, errors, theme: doc.theme || defaultTheme };
  }

  doc.blocks.forEach((block, i) => {
    const path = `blocks[${i}]`;
    if (!isObj(block)) { err(path, 'must be an object with a `type`'); return; }
    const type = block.type;
    if (!type) { err(`${path}.type`, `required (one of: ${Object.keys(BLOCKS).join(', ')})`); return; }
    const def = BLOCKS[type];
    if (!def) { err(`${path}.type`, `unknown block type "${type}" (one of: ${Object.keys(BLOCKS).join(', ')})`); return; }
    for (const name of Object.keys(block)) {
      if (name !== 'type' && !(name in def.fields)) {
        err(`${path}.${name}`, `unknown field for ${type} (allowed: ${Object.keys(def.fields).join(', ')})`);
      }
    }
    for (const [name, field] of Object.entries(def.fields)) {
      checkSpec(field, block[name], `${path}.${name}`, err);
    }
    if (def.check) def.check(block, path, err);
    if (type === 'panels' && Array.isArray(block.items)) {
      block.items.forEach((item, j) => {
        const wanted = String(j + 1).padStart(2, '0');
        if (item?.index && item.index !== wanted) {
          err(`${path}.items[${j}].index`, `expected "${wanted}" to keep panel numbering sequential`);
        }
      });
    }
  });

  return { ok: errors.length === 0, errors, theme: doc.theme || defaultTheme };
}

export function formatErrors(errors, limit = 25) {
  const shown = errors.slice(0, limit);
  const lines = shown.map(e => `${e.path}: ${e.message}`);
  if (errors.length > shown.length) lines.push(`... ${errors.length - shown.length} more`);
  return lines.join('\n');
}
