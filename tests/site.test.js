import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from '../scripts/build-site.js';
import { validateDoc } from '../src/model/validate.js';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-site-'));
const built = await buildSite({ outDir: out });

function pages(dir = out) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? pages(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}

test('builds home, gallery, guide, and a 404 page', () => {
  assert.equal(built.gallery, 3);
  assert.equal(built.guide, 8);
  for (const rel of ['index.html', '404.html', 'gallery/index.html', 'guide/index.html', 'guide/cli.html', 'guide/timeline.html', 'gallery/harness-engineering.html', 'gallery/agent-skills-audit.model.json']) {
    assert.ok(fs.existsSync(path.join(out, rel)), `${rel} exists`);
  }
});

test('every relative link, frame, and asset resolves, so the site works under a project base path', () => {
  const missing = [];
  for (const file of pages().filter(page => path.basename(page) !== '404.html')) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
      assert.ok(!target.startsWith('/'), `${path.relative(out, file)} uses a root-absolute URL: ${target}`);
      const resolved = path.resolve(path.dirname(file), target.split('#')[0]);
      if (!fs.existsSync(resolved)) missing.push(`${path.relative(out, file)} -> ${target}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('pages load no remote styles, scripts, or fonts', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /<link\b/i, path.relative(out, file));
    assert.doesNotMatch(html, /<script[^>]+src=/i, path.relative(out, file));
    assert.doesNotMatch(html, /@import|url\(\s*['"]?https?:/i, path.relative(out, file));
    assert.doesNotMatch(html, /%%[A-Z_]+%%/, `${path.relative(out, file)} has an unfilled template token`);
  }
});

test('guide pages keep table cells, code spans, and cross links intact', () => {
  const cli = fs.readFileSync(path.join(out, 'guide/cli.html'), 'utf8');
  assert.match(cli, /<code>--section &lt;n\|id&gt;<\/code>/);
  assert.match(cli, /layout-single/);
  assert.match(cli, /href="\.\/pipeline\.html"/);
  const abstract = (cli.match(/living-docs-axi<\/code> command follows the AXI principles/g) || []).length;
  assert.equal(abstract, 1, 'the opening paragraph appears once');
});

test('docs that carry the site bar hide it when embedded and print without it', () => {
  const doc = fs.readFileSync(path.join(out, 'gallery/end-of-harness-engineering.html'), 'utf8');
  assert.match(doc, /class="ld-bar"/);
  assert.match(doc, /self!==top/);
  assert.match(doc, /@media print\{\.ld-bar\{display:none\}\}/);
});

test('published gallery models still validate', () => {
  for (const name of ['harness-engineering', 'end-of-harness-engineering', 'agent-skills-audit']) {
    const model = JSON.parse(fs.readFileSync(path.join(out, `gallery/${name}.model.json`), 'utf8'));
    const validation = validateDoc(model);
    assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  }
});

test.after(() => fs.rmSync(out, { recursive: true, force: true }));
