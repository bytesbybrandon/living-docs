import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderDoc } from '../src/render/index.js';

const samplesDir = path.resolve('samples');
const samples = fs.readdirSync(samplesDir).filter(file => file.endsWith('.json'));

function load(file) {
  const modelPath = path.join(samplesDir, file);
  return { model: JSON.parse(fs.readFileSync(modelPath, 'utf8')), baseDir: path.dirname(modelPath) };
}

for (const file of samples) {
  test(`renders ${file} deterministically and self-contained`, () => {
    const { model, baseDir } = load(file);
    const theme = model.theme || 'paper-light';
    const first = renderDoc(model, { theme, baseDir });
    const second = renderDoc(model, { theme, baseDir });
    assert.equal(first.ok, true, JSON.stringify(first.errors));
    assert.equal(first.html, second.html, 'render output must be deterministic');
    const html = first.html;
    assert.ok(html.startsWith('<!doctype html>'));
    assert.match(html, /<meta name="generator" content="living-docs">/);
    assert.doesNotMatch(html, /<link\b/i, 'no external stylesheets');
    assert.doesNotMatch(html, /<script[^>]+src=/i, 'no external scripts');
    assert.doesNotMatch(html, /@import\s/i, 'no css imports');
    assert.doesNotMatch(html, /url\(\s*['"]?https?:/i, 'no remote assets');
    assert.doesNotMatch(html, /<img[^>]+src="https?:/i, 'no remote images');
    assert.ok(first.stats.bytes > 4000);
    assert.ok(first.stats.sections > 0);
  });
}

test('hud theme emits the scene payload and canvas', () => {
  const { model } = load('agent-skills-audit.json');
  const result = renderDoc(model, { theme: 'hud' });
  assert.equal(result.ok, true);
  assert.match(result.html, /class="scene-canvas"/);
  assert.match(result.html, /class="scene-data"/);
  assert.match(result.html, /requestAnimationFrame/);
  assert.match(result.html, /class="panel-grid"/);
  assert.ok(result.stats.panels >= 12);
});

test('paper themes keep two-column and print rules', () => {
  for (const [file, theme] of [['harness-engineering.json', 'paper-light'], ['end-of-harness-engineering.json', 'paper-dark']]) {
    const { model } = load(file);
    const result = renderDoc(model, { theme });
    assert.equal(result.ok, true);
    assert.match(result.html, /column-count:2/);
    assert.match(result.html, /@media print/);
    assert.match(result.html, /class="prose lead"/);
  }
});

test('escapes untrusted text and neutralizes unsafe links', () => {
  const model = {
    schemaVersion: 1,
    theme: 'paper-light',
    meta: {
      title: '<img src=x onerror="alert(1)">',
      abstract: 'Abstract with </script><script>alert(1)</script> inside.'
    },
    blocks: [
      { type: 'prose', markdown: '<script>alert(2)</script> <a href="javascript:alert(3)">x</a> [bad](javascript:alert(4))' },
      { type: 'prose', markdown: '[ok](https://example.com/a?b=1&c=2) `code < tag` **bold**' },
      { type: 'callout', tone: 'note', body: '"><script>alert(4)</script>' },
      { type: 'table', columns: [{ label: '<b>h</b>' }], rows: [['<i>cell</i>']] },
      { type: 'algorithm', title: '<svg onload=alert(5)>', lines: [{ text: 'x < y' }] }
    ]
  };
  const result = renderDoc(model, { theme: 'paper-light' });
  assert.equal(result.ok, true);
  const html = result.html;
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img\s+src=x/i);
  assert.doesNotMatch(html, /onerror="alert/);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.doesNotMatch(html, /<a[^>]*>bad</i, 'unsafe markdown links never become anchors');
  assert.doesNotMatch(html, /<svg onload/);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /<a href="https:\/\/example.com\/a\?b=1&amp;c=2">ok<\/a>/);
  assert.match(html, /<code>code &lt; tag<\/code>/);
});

test('unknown theme is a typed error', () => {
  const { model } = load('harness-engineering.json');
  assert.throws(() => renderDoc(model, { theme: 'nope' }), /Unknown theme/);
});
