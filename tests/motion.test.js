import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDoc } from '../src/render/index.js';
import { validateDoc } from '../src/model/validate.js';

const base = {
  schemaVersion: 1,
  theme: 'paper-dark',
  meta: { title: 'Motion' },
  blocks: [
    {
      type: 'figure',
      caption: 'Animated diagram',
      spec: 'diagram',
      motion: 'draw',
      diagram: {
        width: 400,
        height: 200,
        nodes: [
          { id: 'a', label: 'A', x: 20, y: 60, w: 120, h: 50 },
          { id: 'b', label: 'B', x: 240, y: 60, w: 120, h: 50 }
        ],
        edges: [{ from: 'a', to: 'b', style: 'arrow' }]
      }
    },
    {
      type: 'figure',
      caption: 'Animated bars',
      spec: 'chart',
      motion: 'steps',
      chart: {
        kind: 'bar',
        series: [{ name: 'bars', kind: 'bar', values: [3, 5, 2], labels: ['a', 'b', 'c'] }]
      }
    }
  ]
};

test('renders scoped draw and steps animation with print and reduced-motion fallbacks', () => {
  const result = renderDoc(base, { theme: 'paper-dark' });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const html = result.html;
  assert.match(html, /pathLength="1"/);
  assert.match(html, /@keyframes ld-draw/);
  assert.match(html, /#fig-1 \.ld-line/);
  assert.match(html, /#fig-2 \.ch-bar/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /@media print\{[^}]*#fig-1 \*/);
});

test('motion is off by default and emits no animation styles', () => {
  const model = structuredClone(base);
  delete model.blocks[0].motion;
  delete model.blocks[1].motion;
  const result = renderDoc(model, { theme: 'paper-dark' });
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.html, /@keyframes ld-draw/);
  assert.doesNotMatch(result.html, /prefers-reduced-motion/);
});

test('rejects unknown motion values', () => {
  const model = structuredClone(base);
  model.blocks[0].motion = 'spin';
  const validation = validateDoc(model);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some(error => error.path === 'blocks[0].motion'));
});
