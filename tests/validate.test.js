import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDoc } from '../src/model/validate.js';

const base = {
  schemaVersion: 1,
  meta: { title: 'Doc' },
  blocks: [{ type: 'prose', markdown: 'Body.' }]
};

function errorsOf(overrides) {
  return validateDoc({ ...base, ...overrides }).errors;
}

function hasError(errors, path, pattern) {
  return errors.some(error => error.path === path && pattern.test(error.message));
}

test('accepts a minimal document', () => {
  assert.deepEqual(validateDoc(base).errors, []);
});

test('rejects unknown block types and fields', () => {
  const unknownType = errorsOf({ blocks: [{ type: 'paragraph', markdown: 'x' }] });
  assert.ok(hasError(unknownType, 'blocks[0].type', /unknown block type "paragraph"/));

  const unknownField = errorsOf({ blocks: [{ type: 'prose', markdown: 'x', caption: 'y' }] });
  assert.ok(hasError(unknownField, 'blocks[0].caption', /unknown field for prose \(allowed: markdown\)/));
});

test('rejects a figure without its spec payload', () => {
  const errors = errorsOf({
    blocks: [{ type: 'figure', caption: 'c', spec: 'diagram' }]
  });
  assert.ok(hasError(errors, 'blocks[0]', /needs `diagram`/));
});

test('rejects table rows that do not match the column count', () => {
  const errors = errorsOf({
    blocks: [{
      type: 'table',
      columns: [{ label: 'a' }, { label: 'b' }],
      rows: [['one']]
    }]
  });
  assert.ok(hasError(errors, 'blocks[0].rows[0]', /expected 2 cells, got 1/));
});

test('rejects diagram edges that point at missing nodes', () => {
  const errors = errorsOf({
    blocks: [{
      type: 'figure',
      caption: 'c',
      spec: 'diagram',
      diagram: {
        nodes: [
          { id: 'a', label: 'A', x: 0, y: 0 },
          { id: 'b', label: 'B', x: 100, y: 0 }
        ],
        edges: [{ from: 'a', to: 'ghost' }]
      }
    }]
  });
  assert.ok(hasError(errors, 'blocks[0].diagram.edges[0].to', /unknown node id "ghost"/));
});

test('rejects duplicate diagram node ids', () => {
  const errors = errorsOf({
    blocks: [{
      type: 'figure',
      caption: 'c',
      spec: 'diagram',
      diagram: {
        nodes: [
          { id: 'a', label: 'A', x: 0, y: 0 },
          { id: 'a', label: 'B', x: 100, y: 0 }
        ]
      }
    }]
  });
  assert.ok(hasError(errors, 'blocks[0].diagram.nodes[1].id', /duplicate node id "a"/));
});

test('rejects non-sequential console panel numbers', () => {
  const errors = errorsOf({
    blocks: [{
      type: 'panels',
      items: [
        { index: '01', title: 'A', kind: 'big', data: { value: '1' } },
        { index: '05', title: 'B', kind: 'big', data: { value: '2' } }
      ]
    }]
  });
  assert.ok(hasError(errors, 'blocks[0].items[1].index', /expected "02"/));
});

test('rejects empty blocks and unknown top-level fields', () => {
  assert.ok(validateDoc({ ...base, blocks: [] }).errors.some(error => error.path === 'blocks'));
  assert.ok(validateDoc({ ...base, extra: 1 }).errors.some(error => error.path === 'extra'));
});
