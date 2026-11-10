import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveStyle, contrastRatio } from '../src/render/style.js';
import { renderDoc } from '../src/render/index.js';
import { validateDoc } from '../src/model/validate.js';
import { palette as lightPalette } from '../src/render/themes/paper-light.js';
import { palette as darkPalette } from '../src/render/themes/paper-dark.js';
import { palette as hudPalette } from '../src/render/themes/hud.js';

test('seed colors derive a readable accent for every theme', () => {
  for (const [theme, base] of [['paper-light', lightPalette], ['paper-dark', darkPalette], ['hud', hudPalette]]) {
    for (const seed of ['#2f6f8f', '#c9703f', '#7a4a6e', '#d9d9d9', '#121212']) {
      const resolved = resolveStyle(theme, base, { seed });
      const ratio = contrastRatio(resolved.palette.accent, base.bg);
      assert.ok(ratio >= 4.0, `${theme} ${seed}: contrast ${ratio.toFixed(2)}`);
    }
  }
});

test('presets and legacy accent overrides recolor without touching surfaces', () => {
  const preset = resolveStyle('paper-dark', darkPalette, { palette: 'ocean' });
  assert.notEqual(preset.palette.accent, darkPalette.accent);
  assert.ok(contrastRatio(preset.palette.accent, darkPalette.bg) >= 4);
  assert.equal(preset.palette.bg, darkPalette.bg);
  assert.notEqual(preset.palette.accentSoft, darkPalette.accentSoft);

  const other = resolveStyle('paper-dark', darkPalette, { palette: 'moss' });
  assert.notEqual(other.palette.accent, preset.palette.accent);

  const legacy = resolveStyle('paper-light', lightPalette, {}, '#14532d');
  assert.ok(contrastRatio(legacy.palette.accent, lightPalette.bg) >= 4);
});

test('type and density are normalized per theme family', () => {
  assert.equal(resolveStyle('hud', hudPalette, { type: 'editorial' }).type, 'mono');
  assert.equal(resolveStyle('paper-light', lightPalette, { type: 'terminal' }).type, 'classic');
  assert.equal(resolveStyle('hud', hudPalette, { type: 'hybrid' }).type, 'hybrid');
  assert.equal(resolveStyle('paper-dark', darkPalette, { density: 'bogus' }).density, 'normal');
});

test('style tokens reach the rendered page', () => {
  const model = {
    schemaVersion: 1,
    theme: 'paper-dark',
    meta: {
      title: 'Styled',
      style: { seed: '#2f6f8f', type: 'technical', density: 'roomy', figure: 'minimal' }
    },
    blocks: [{ type: 'prose', markdown: 'Body text for the styled page.' }]
  };
  const result = renderDoc(model, { theme: 'paper-dark' });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.html, /class="theme-paper-dark density-roomy type-technical fig-minimal layout-columns"/);
  assert.match(result.html, /--ld-accent:#[0-9a-f]{6}/i);
  assert.match(result.html, /\.columns\{font-size:15\.2px/);
  assert.match(result.html, /font-family:var\(--sans\)/);
});

test('minimal figures drop chart gridlines', () => {
  const { timeline, ...base } = JSON.parse(fs.readFileSync(path.resolve('samples/harness-engineering.json'), 'utf8')); // cues target blocks this test drops
  const chartFigure = { ...base, meta: { ...base.meta, style: { figure: 'outline' } }, blocks: base.blocks.filter(block => block.type === 'figure') };
  const minimalFigure = { ...chartFigure, meta: { ...chartFigure.meta, style: { figure: 'minimal' } } };
  const outline = renderDoc(chartFigure, { theme: 'paper-light' });
  const minimal = renderDoc(minimalFigure, { theme: 'paper-light' });
  assert.equal(outline.ok, true);
  assert.equal(minimal.ok, true);
  const count = html => (html.match(/<line /g) || []).length;
  assert.ok(count(minimal.html) < count(outline.html));
});

test('invalid seeds fail validation at their path', () => {
  const model = {
    schemaVersion: 1,
    meta: { title: 'Bad seed', style: { seed: 'orange' } },
    blocks: [{ type: 'prose', markdown: 'x' }]
  };
  const validation = validateDoc(model);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some(error => error.path === 'meta.style.seed' && /hex color/.test(error.message)));
});

test('single layout collapses paper columns and is ignored by the console', () => {
  const model = {
    schemaVersion: 1,
    meta: { title: 'Layout', style: { layout: 'single' } },
    blocks: [{ type: 'prose', markdown: 'Body text for the layout check.' }]
  };
  const paper = renderDoc(model, { theme: 'paper-light' });
  assert.equal(paper.ok, true, JSON.stringify(paper.errors));
  assert.match(paper.html, /layout-single/);
  assert.match(paper.html, /\.columns\{column-count:1;max-width:880px/);

  const hud = renderDoc(model, { theme: 'hud' });
  assert.equal(hud.ok, true);
  assert.match(hud.html, /layout-columns/);
  assert.doesNotMatch(hud.html, /column-count:1;max-width:880px/);

  const invalid = validateDoc({ ...model, meta: { title: 'x', style: { layout: 'wide' } } });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some(error => error.path === 'meta.style.layout'));
});

test('curated looks keep readable contrast and render on their base theme', async () => {
  const { VARIANTS } = await import('../src/render/themes/variants.js');
  const model = JSON.parse(fs.readFileSync('samples/end-of-harness-engineering.json', 'utf8'));
  for (const [name, look] of Object.entries(VARIANTS)) {
    const p = look.palette;
    assert.ok(contrastRatio(p.ink, p.bg) >= 7, `${name} ink`);
    assert.ok(contrastRatio(p.muted, p.bg) >= 4.5, `${name} muted`);
    assert.ok(contrastRatio(p.accent, p.bg) >= 4.5, `${name} accent`);
    const result = renderDoc(model, { theme: name });
    assert.ok(result.ok, name);
    assert.match(result.html, new RegExp(`class="theme-paper-(light|dark) theme-${name} `));
  }
});
