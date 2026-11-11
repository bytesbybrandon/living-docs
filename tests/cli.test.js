import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/living-docs-axi.js');

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8',
    cwd: path.resolve('.'),
    ...options
  });
  return { code: result.status, out: result.stdout.trim(), err: result.stderr.trim() };
}

test('home view is content first', () => {
  const { code, out } = run([]);
  assert.equal(code, 0);
  assert.match(out, /^bin: /);
  assert.match(out, /^description: /m);
  assert.match(out, /themes\[6\]\{name,best\}:/);
  assert.match(out, /Run `living-docs-axi ingest/);
});

test('themes and schema are compact and complete', () => {
  const themes = run(['themes']);
  assert.equal(themes.code, 0);
  assert.match(themes.out, /paper-light/);
  assert.match(themes.out, /hud/);

  const schema = run(['schema', '--block', 'figure']);
  assert.equal(schema.code, 0);
  assert.match(schema.out, /^block: figure$/m);
  assert.match(schema.out, /fields\[\d+\]\{name,kind,required,desc\}:/);
  assert.match(schema.out, /diagram/);
});

test('ingest prints an outline and one section', () => {
  const outline = run(['ingest', 'samples/source/harness-notes.md']);
  assert.equal(outline.code, 0);
  assert.match(outline.out, /sections: 4/);
  assert.match(outline.out, /the-seven-subsystems/);

  const section = run(['ingest', 'samples/source/harness-notes.md', '--section', '2']);
  assert.equal(section.code, 0);
  assert.match(section.out, /^section: Extensibility standards$/m);
  assert.match(section.out, /MCP for the tool boundary/);
});

test('draft writes a model that validates', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-cli-'));
  const modelPath = path.join(dir, 'draft.json');
  const draft = run(['ingest', 'samples/source/harness-notes.md', '--draft', '--theme', 'paper-dark', '-o', modelPath]);
  assert.equal(draft.code, 0, draft.out + draft.err);
  assert.match(draft.out, /^draft: /m);
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  assert.equal(model.theme, 'paper-dark');
  assert.ok(model.blocks.length > 4);

  const validate = run(['validate', modelPath]);
  assert.equal(validate.code, 0);
  assert.match(validate.out, /^ok: true$/m);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('render writes a file and reports stats', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-cli-'));
  const outPath = path.join(dir, 'doc.html');
  const rendered = run(['render', 'samples/harness-engineering.json', '--theme', 'paper-light', '-o', outPath]);
  assert.equal(rendered.code, 0, rendered.out + rendered.err);
  assert.match(rendered.out, /^file: /m);
  assert.match(rendered.out, /^figures: 3$/m);
  assert.match(rendered.out, /^tables: 1$/m);
  const html = fs.readFileSync(outPath, 'utf8');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.match(html, /class="algo"/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('fails loud on unknown flags and invalid models', () => {
  const unknownFlag = run(['themes', '--nope']);
  assert.equal(unknownFlag.code, 2);
  assert.match(unknownFlag.out, /error: unknown flag --nope/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-cli-'));
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, JSON.stringify({ schemaVersion: 1, meta: { title: 'x' }, blocks: [{ type: 'nope' }] }));
  const invalid = run(['render', bad, '-o', path.join(dir, 'out.html')]);
  assert.equal(invalid.code, 1);
  assert.match(invalid.out, /error: model invalid/);
  assert.match(invalid.out, /blocks\[0\]\.type: unknown block type "nope"/);
  assert.equal(fs.existsSync(path.join(dir, 'out.html')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
