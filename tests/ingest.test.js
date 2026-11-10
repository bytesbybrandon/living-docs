import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ingestSource, outlineOf, selectSection, draftModel } from '../src/ingest/index.js';
import { validateDoc } from '../src/model/validate.js';
import { renderDoc } from '../src/render/index.js';
import { parseMarkdown } from '../src/model/markdown.js';

const sourcePath = path.resolve('samples/source/harness-notes.md');

test('ingests markdown into a flat outline of sections', async () => {
  const ingested = await ingestSource({ path: sourcePath });
  const outline = outlineOf(ingested);
  assert.equal(outline.title, 'Notes on Harness Engineering');
  assert.deepEqual(outline.sections.map(section => section.title), [
    'The seven subsystems',
    'Extensibility standards',
    'From tool to platform',
    'A selection procedure'
  ]);
  assert.equal(outline.sections[0].id, 'the-seven-subsystems');
  assert.ok(outline.sections[0].words > 10);
  assert.ok(ingested.preamble.length >= 2);
});

test('returns one bounded section by index or id', async () => {
  const ingested = await ingestSource({ path: sourcePath });
  const byIndex = selectSection(ingested, '2');
  const byId = selectSection(ingested, 'extensibility-standards');
  assert.equal(byIndex.title, 'Extensibility standards');
  assert.equal(byId.title, 'Extensibility standards');
  assert.equal(selectSection(ingested, '99'), null);
  assert.ok(byIndex.blocks.some(block => block.type === 'list'));
});

test('draft model validates and renders in every theme', async () => {
  const ingested = await ingestSource({ path: sourcePath });
  const model = draftModel(ingested, { theme: 'paper-dark' });
  const validation = validateDoc(model);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  for (const theme of ['paper-light', 'paper-dark', 'hud']) {
    const result = renderDoc(model, { theme });
    assert.equal(result.ok, true, `${theme}: ${JSON.stringify(result.errors)}`);
    assert.ok(result.html.includes('<table>'), 'markdown table survives the draft');
    assert.ok(result.html.includes('class="doc-list'), 'markdown list survives the draft');
  }
});

test('parses markdown blocks without a parser dependency', () => {
  const blocks = parseMarkdown([
    '# Title',
    '',
    'Paragraph one.',
    '',
    '```js',
    'const x = 1;',
    '```',
    '',
    '- one',
    '- two',
    '',
    '> quoted',
    '',
    '| a | b |',
    '| --- | --- |',
    '| 1 | 2 |'
  ].join('\n'));
  assert.deepEqual(blocks.map(block => block.type), ['heading', 'paragraph', 'code', 'list', 'quote', 'table']);
  assert.deepEqual(blocks[3].items, ['one', 'two']);
  assert.deepEqual(blocks[5].rows, [['1', '2']]);
});

test('extracts headings and tables from html', async () => {
  const ingested = await ingestSource({
    text: `<html><head><title>HTML Doc</title></head><body>
      <h1>Real Title</h1>
      <p>Intro paragraph with enough words to look like prose in a draft model.</p>
      <h2>Part One</h2>
      <p>Body.</p>
      <table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>
      <script>alert(1)</script>
    </body></html>`,
    kind: 'html'
  });
  assert.equal(ingested.meta.title, 'HTML Doc');
  assert.deepEqual(ingested.sections.map(section => section.title), ['Part One']);
  const table = ingested.sections[0].blocks.find(block => block.type === 'table');
  assert.deepEqual(table.columns, ['A', 'B']);
  assert.deepEqual(table.rows, [['1', '2']]);
});

test('detects numbered headings in plain text and pdf-shaped text', async () => {
  const ingested = await ingestSource({
    text: 'Preamble text.\n\n1 Introduction\n\nBody text here.\n\n2.1 The Loop\n\nLoop body.\n\n3 Results\n\nResults body.\n',
    kind: 'text'
  });
  const titles = ingested.sections.map(section => section.title);
  assert.ok(titles.includes('Introduction'));
  assert.ok(titles.includes('Results'));
});

test('rejects missing sources with a typed error', async () => {
  await assert.rejects(() => ingestSource({}), /Pass one of: path, url, text/);
  await assert.rejects(() => ingestSource({ path: path.join(os.tmpdir(), 'living-docs-missing.md') }), /Source not found/);
});

test('reads utf-8 files with a BOM', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-'));
  const file = path.join(dir, 'bom.md');
  fs.writeFileSync(file, '\ufeff# BOM Title\n\nBody.\n');
  const ingested = await ingestSource({ path: file });
  assert.equal(ingested.meta.title, 'BOM Title');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('keeps escaped pipes and inline markup inside table cells', async () => {
  const ingested = await ingestSource({
    text: ['# Doc', '', '## Flags', '', '| Flag | Purpose |', '| --- | --- |', '| `--section <n\\|id>` | pick **one** |', ''].join('\n'),
    kind: 'markdown'
  });
  const table = ingested.sections[0].blocks.find(block => block.type === 'table');
  assert.deepEqual(table.columns, ['Flag', 'Purpose']);
  assert.deepEqual(table.rows, [['`--section <n|id>`', 'pick **one**']]);

  const model = draftModel(ingested);
  const result = renderDoc(model, { theme: 'paper-light' });
  assert.equal(result.ok, true);
  assert.match(result.html, /<code>--section &lt;n\|id&gt;<\/code>/);
  assert.match(result.html, /<strong>one<\/strong>/);
});

test('draft model does not repeat the abstract as the first paragraph', async () => {
  const intro = 'This opening paragraph is long enough to be treated as the abstract of the document by the outline step, so it must not be printed twice.';
  const ingested = await ingestSource({ text: ['# Doc', '', intro, '', '## Part', '', 'Body of the part.'].join('\n'), kind: 'markdown' });
  assert.equal(ingested.meta.abstract, intro);
  const model = draftModel(ingested);
  const prose = model.blocks.filter(block => block.type === 'prose').map(block => block.markdown);
  assert.deepEqual(prose, ['Body of the part.']);
  assert.equal(model.meta.abstract, intro);
});
