import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from '../scripts/build-site.js';
import { validateDoc } from '../src/model/validate.js';
import { contrastRatio } from '../src/render/style.js';

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
  for (const rel of ['index.html', '404.html', 'gallery/index.html', 'guide/index.html', 'guide/cli.html', 'guide/timeline.html', 'gallery/harness-engineering.html', 'gallery/agent-skills-audit.model.json', 'demo/paper-light.html', 'demo/paper-dark.html', 'demo/hud.html', 'img/og.jpg', 'img/clip.jpg']) {
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

test('home pins one live demo doc and every scroll step points at a real cue', () => {
  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const demo = JSON.parse(fs.readFileSync(new URL('../site/demo.model.json', import.meta.url), 'utf8'));
  const frames = [...home.matchAll(/<iframe data-skin="([a-z-]+)"([^>]*)>/g)];
  assert.deepEqual(frames.map(m => m[1]), ['paper-light', 'paper-dark', 'hud']);
  assert.equal(frames.filter(m => /\ssrc=/.test(m[2])).length, 1, 'only the default theme loads at first paint');
  assert.ok(frames.every(m => /title="Live demo document/.test(m[2])));
  assert.match(home, /<meta property="og:image" content="https:\/\/[^"]+\/img\/og\.jpg">/);
  const steps = [...home.matchAll(/<li class="step" data-at="([\d.]+)" data-scroll="([a-z-]+)">/g)];
  assert.equal(steps.length, 5);
  const ids = new Set(demo.blocks.map(block => block.id));
  for (const [, at, id] of steps) {
    assert.ok(Number(at) <= demo.timeline.duration, `step at ${at} is inside the timeline`);
    assert.ok(ids.has(id), `step scrolls to a block that exists: ${id}`);
  }
  for (const theme of ['paper-light', 'paper-dark', 'hud']) {
    const doc = fs.readFileSync(path.join(out, `demo/${theme}.html`), 'utf8');
    for (const id of ids) assert.match(doc, new RegExp(`data-cue="${id}"`), `${theme} carries block ${id}`);
  }
});

test('every skin of the home page keeps readable contrast', () => {
  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const blocks = [...home.matchAll(/\[data-theme="([a-z-]+)"\] \{([^}]*)\}/g)];
  assert.equal(blocks.length, 3);
  for (const [, name, body] of blocks) {
    const token = key => body.match(new RegExp(`--color-${key}: (#[0-9a-f]{6});`))[1];
    const paper = token('paper');
    assert.ok(contrastRatio(token('ink'), paper) >= 7, `${name} ink`);
    for (const key of ['ink-2', 'muted', 'accent']) assert.ok(contrastRatio(token(key), paper) >= 4.5, `${name} ${key}`);
    assert.ok(contrastRatio(token('accent-ink'), token('accent')) >= 4.5, `${name} text on accent`);
    assert.ok(contrastRatio(token('muted'), token('paper-2')) >= 4.5, `${name} muted on surface`);
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

test('every site page shares one nav, and each gallery row wears the theme of its document', () => {
  const nav = html => [...html.match(/<header class="nav">.*?<\/header>/s)[0].matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map(m => m[1]).join(',');
  const pagesWithNav = ['index.html', 'gallery/index.html', 'guide/index.html', '404.html'];
  const navs = pagesWithNav.map(rel => nav(fs.readFileSync(path.join(out, rel), 'utf8')));
  assert.ok(navs.every(links => links === 'living-docs,Gallery,Guide,GitHub'), navs.join(' | '));
  const gallery = fs.readFileSync(path.join(out, 'gallery/index.html'), 'utf8');
  const rows = [...gallery.matchAll(/<section class="doc" data-theme="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual(rows, ['paper-light', 'paper-dark', 'hud']);
  assert.match(gallery, /Open document<span class="visually-hidden">: Harness Engineering/);
  for (const rel of ['gallery/harness-engineering.html', 'guide/cli.html']) {
    assert.match(fs.readFileSync(path.join(out, rel), 'utf8'), /<header class="ld-bar"><a class="brand" href="\.\.\/index\.html">living-docs<\/a>/);
  }
});

test('site copy avoids counted slogans such as "One model, three themes"', () => {
  for (const rel of ['index.html', 'gallery/index.html', 'guide/index.html', '404.html']) {
    const text = fs.readFileSync(path.join(out, rel), 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /\b[Oo]ne [a-z-]+, (two|three|four|five|\d) [a-z-]+/, `${rel} has a "one X, N Y" slogan`);
    assert.doesNotMatch(text, /\b(?:two|three|four|five) [a-z-]+ to (?:a|an) [a-z-]+/i, `${rel} has a "N things to a Y" slogan`);
  }
});

test('install commands use the short package name and the workflow publishes it too', () => {
  const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const guides = fs.readdirSync(new URL('../docs/guide/', import.meta.url)).map(name => `docs/guide/${name}`);
  for (const rel of ['README.md', 'site/home.html', 'src/export/video.js', ...guides]) {
    assert.doesNotMatch(read(rel), /-p @bytesbybrandon\/living-docs/, `${rel} still uses the scoped npx form`);
  }
  assert.match(read('site/home.html'), /npx -y living-docs-axi ingest notes\.md --draft/);
  const workflow = read('.github/workflows/publish.yml');
  assert.match(workflow, /npm pkg set name=living-docs-axi/);
  assert.match(workflow, /npm view "\$name@\$version"/, 'the scoped step skips a version already on npm');
  assert.match(workflow, /npm view "living-docs-axi@\$version"/, 'the short step skips a version already on npm');
  assert.match(workflow, /maintainers --json/, 'an existing short name only counts when the maintainers match the scoped package');
  assert.match(workflow, /exit 1/);
  assert.equal((workflow.match(/npm publish --provenance --access public/g) || []).length, 2);
});

test.after(() => fs.rmSync(out, { recursive: true, force: true }));
