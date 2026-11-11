import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ingestSource, outlineOf, draftModel, selectSection } from '../ingest/index.js';
import { renderDoc, themeList } from '../render/index.js';
import { validateDoc, formatErrors } from '../model/validate.js';
import { BLOCKS, THEMES, META, STYLE, blockFieldSummary } from '../model/schema.js';
import { createPreviewServer } from '../server/preview.js';
import { exportVideo, FORMATS } from '../export/video.js';

const HOME = os.homedir();
const BIN = fileURLToPath(new URL('../../bin/living-docs-axi.js', import.meta.url));

class UsageError extends Error {}

const FLAGS = {
  '--theme': 'value',
  '--seed': 'value',
  '--out': 'value', '-o': 'value',
  '--section': 'value',
  '--url': 'value',
  '--text': 'value',
  '--max-chars': 'value',
  '--port': 'value',
  '--outline': 'bool',
  '--draft': 'bool',
  '--static': 'bool',
  '--json': 'bool',
  '--stdout': 'bool',
  '--no-open': 'bool',
  '--full': 'bool',
  '--block': 'value',
  '--format': 'value',
  '--size': 'value',
  '--fps': 'value',
  '--scale': 'value',
  '--help': 'bool', '-h': 'bool'
};

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  const canonical = { '-o': 'out', '-h': 'help' };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('-') || token === '-') { positionals.push(token); continue; }
    const [name, inline] = token.includes('=') ? token.split(/=(.*)/s, 2) : [token, null];
    const kind = FLAGS[name];
    if (!kind) throw new UsageError(`unknown flag ${name}`);
    const key = canonical[name] || name.replace(/^-+/, '');
    if (kind === 'bool') { flags[key] = true; continue; }
    const value = inline !== null ? inline : argv[++i];
    if (value === undefined) throw new UsageError(`flag ${name} needs a value`);
    flags[key] = value;
  }
  return { command: positionals[0], args: positionals.slice(1), flags };
}

const quoteCell = value => {
  const text = String(value ?? '');
  return /[",\n]|^\s|\s$/.test(text) ? JSON.stringify(text) : text;
};
const toon = (name, fields, rows) => {
  if (!rows.length) return `0 ${name}`;
  const head = `${name}[${rows.length}]{${fields.join(',')}}:`;
  return [head, ...rows.map(row => '  ' + row.map(quoteCell).join(','))].join('\n');
};
const displayPath = value => {
  const resolved = path.resolve(value);
  return resolved.startsWith(HOME) ? '~' + resolved.slice(HOME.length) : resolved;
};

function helpLines(lines) {
  return lines.length ? `\nhelp[${lines.length}]:\n${lines.map(line => `  ${line}`).join('\n')}` : '';
}

function themeRows() {
  return themeList().map(theme => [theme.name, theme.best]);
}

function home() {
  const docsDir = path.resolve('docs');
  const docs = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter(name => name.endsWith('.html'))
    : [];
  const lines = [
    `bin: ${displayPath(BIN)}`,
    'description: turn a source document into a designed, self-contained living doc',
    `docs: ${docs.length} built${docs.length ? ` (${docs.slice(0, 3).join(', ')}${docs.length > 3 ? ', …' : ''})` : ''}`,
    '',
    toon('themes', ['name', 'best'], themeRows())
  ];
  lines.push(helpLines([
    'Run `living-docs-axi ingest <path|url> --outline`',
    'Run `living-docs-axi ingest <path> --draft -o docs/model.json`',
    'Run `living-docs-axi render <model.json> --theme paper-dark -o docs/doc.html`',
    'Run `living-docs-axi preview`'
  ]));
  return lines.join('\n');
}

function themes() {
  const rows = themeList().map(theme => [theme.name, theme.summary, theme.best]);
  return toon('themes', ['name', 'summary', 'best'], rows) + helpLines([
    'Run `living-docs-axi schema --block figure`',
    'Run `living-docs-axi render <model.json> --theme <name>`'
  ]);
}

function schema(flags) {
  if (flags.block === 'style') {
    return toon('style', ['name', 'kind', 'required', 'desc'], Object.entries(STYLE).map(([name, spec]) => [
      name,
      spec.values ? `enum(${spec.values.join('|')})` : spec.kind,
      spec.optional ? 'no' : 'yes',
      spec.desc
    ])) + helpLines(['Run `living-docs-axi schema --block figure`']);
  }
  if (flags.block) {
    const summary = blockFieldSummary(flags.block);
    if (!summary) throw new UsageError(`unknown block "${flags.block}" (one of: ${Object.keys(BLOCKS).join(', ')})`);
    const lines = [
      `block: ${summary.type}`,
      `summary: ${summary.summary}`,
      '',
      toon('fields', ['name', 'kind', 'required', 'desc'], summary.fields.map(field => [
        field.name,
        field.values ? `enum(${field.values.join('|')})` : field.kind,
        field.required ? 'yes' : 'no',
        field.desc
      ]))
    ];
    return lines.join('\n');
  }
  const rows = Object.entries(BLOCKS).map(([type, def]) => [type, def.summary]);
  const metaRows = Object.entries(META).map(([name, spec]) => [
    name,
    spec.kind === 'array' ? `array<${spec.of?.kind || 'value'}>` : spec.kind,
    spec.optional ? 'no' : 'yes'
  ]);
  return [
    toon('blocks', ['type', 'summary'], rows),
    '',
    toon('meta', ['field', 'kind', 'required'], metaRows)
  ].join('\n') + helpLines([
    'Run `living-docs-axi schema --block figure`',
    'Run `living-docs-axi render <model.json> --theme paper-dark`'
  ]);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function plainBlockText(block) {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
      return block.text;
    case 'heading':
      return `${'#'.repeat(block.level)} ${block.text}`;
    case 'list':
      return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : '-'} ${item}`).join('\n');
    case 'code':
      return `\`\`\`${block.lang || ''}\n${block.text}\n\`\`\``;
    case 'table':
      return [block.columns.join(' | '), ...block.rows.map(row => row.join(' | '))].join('\n');
    case 'footnotes':
      return block.items.map((item, i) => `[${i + 1}] ${item}`).join('\n');
    default:
      return '';
  }
}

async function ingest({ args, flags }) {
  const source = args[0];
  const text = flags.text ?? (source === '-' ? await readStdin() : undefined);
  if (!source && text === undefined && !flags.url) throw new UsageError('ingest needs a path, `--url <url>`, `--text <text>`, or `-` for stdin');
  const ingested = await ingestSource({
    path: source && source !== '-' ? source : undefined,
    url: flags.url,
    text,
    kind: flags.text ? 'markdown' : undefined
  });

  if (flags.section) {
    const section = selectSection(ingested, flags.section);
    if (!section) {
      return `error: no section "${flags.section}"\n\n${toon('sections', ['index', 'id', 'title', 'words'], outlineOf(ingested).sections.map(s => [s.index, s.id, s.title, s.words]))}${helpLines(['Run `living-docs-axi ingest <source> --outline`'])}`;
    }
    const limit = Number(flags['max-chars']) || 12000;
    let body = section.blocks.map(plainBlockText).filter(Boolean).join('\n\n');
    const truncated = body.length > limit && !flags.full;
    if (truncated) body = body.slice(0, limit) + `\n… (${section.blocks.map(plainBlockText).join('\n\n').length} chars total; use --full)`;
    return [
      `section: ${section.title}`,
      `id: ${section.id}`,
      `words: ${section.words}`,
      `truncated: ${truncated ? 'yes' : 'no'}`,
      '',
      body
    ].join('\n');
  }

  const outline = outlineOf(ingested);
  const lines = [
    `source: ${outline.source.kind}`,
    `ref: ${outline.source.ref}`,
    `title: ${outline.title}`,
    `words: ${outline.source.words}${outline.source.pages ? ` (${outline.source.pages} pages)` : ''}`,
    `sections: ${outline.count}`,
    '',
    toon('sections', ['index', 'id', 'title', 'words'], outline.sections.map(s => [s.index, s.id, s.title, s.words]))
  ];

  if (flags.draft) {
    if (flags.theme && !THEMES[flags.theme]) throw new UsageError(`unknown theme "${flags.theme}" (one of: ${Object.keys(THEMES).join(', ')})`);
    if (flags.seed && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(flags.seed)) throw new UsageError('--seed must be a hex color like #2f6f8f');
    const model = draftModel(ingested, { theme: flags.theme, seed: flags.seed, cues: !flags.static });
    const theme = model.theme;
    const validation = validateDoc(model);
    if (!validation.ok) {
      return [`error: draft model is invalid`, formatErrors(validation.errors)].join('\n');
    }
    const out = flags.out || path.join('docs', `${model.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'draft'}.json`);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
    lines.push('', `draft: ${displayPath(out)}`, `theme: ${theme}`, `blocks: ${model.blocks.length}`);
    lines.push(helpLines([
      `Run \`living-docs-axi render ${displayPath(out)} --theme ${theme} -o docs/${path.basename(out, '.json')}.html\``,
      'Run `living-docs-axi schema`'
    ]));
  } else {
    lines.push(helpLines([
      `Run \`living-docs-axi ingest ${outline.source.ref} --section 1\``,
      `Run \`living-docs-axi ingest ${outline.source.ref} --draft -o docs/model.json --theme paper-dark\``
    ]));
  }
  return lines.join('\n');
}

function resolveModelPath(input) {
  return input && input !== '-' ? path.resolve(input) : null;
}

function loadModel(input) {
  if (!input || input === '-') {
    return { model: JSON.parse(fs.readFileSync(0, 'utf8')), baseDir: process.cwd() };
  }
  const resolved = resolveModelPath(input);
  if (!fs.existsSync(resolved)) throw new UsageError(`model not found: ${input}`);
  return { model: JSON.parse(fs.readFileSync(resolved, 'utf8')), baseDir: path.dirname(resolved) };
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'document';
}

function runRender(flags, { quiet = false } = {}) {
  const { model, baseDir } = loadModel(flags._input);
  const theme = flags.theme || model.theme || 'paper-light';
  const result = renderDoc(model, { theme, baseDir });
  if (!result.ok) {
    return {
      ok: false,
      status: ['error: model invalid', formatErrors(result.errors)].join('\n') + helpLines([
        'Run `living-docs-axi schema --block <type>`',
        'Run `living-docs-axi validate <model.json>`'
      ])
    };
  }
  const out = flags.out && flags.out !== '-' ? flags.out : path.join('docs', `${slugify(model.meta.title)}-${theme}.html`);
  if (flags.stdout) return { ok: true, status: result.html };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, result.html);
  if (quiet) return { ok: true, status: '' };
  const lines = [
    'ok: true',
    `file: ${displayPath(out)}`,
    `theme: ${result.theme}`,
    `sections: ${result.stats.sections}`,
    `figures: ${result.stats.figures}`,
    `tables: ${result.stats.tables}`,
    `panels: ${result.stats.panels}`,
    `words: ${result.stats.words}`,
    `bytes: ${result.stats.bytes}`
  ];
  if (result.warnings.length) lines.push('', toon('warnings', ['message'], result.warnings.map(w => [w])));
  lines.push(helpLines([
    `Run \`living-docs-axi preview ${displayPath(path.dirname(out))}\``,
    `Run \`living-docs-axi render ${displayPath(flags._input || '<model>')} --theme ${theme === 'paper-light' ? 'paper-dark' : 'paper-light'}\``
  ]));
  return { ok: true, status: lines.join('\n'), file: out, result };
}

async function renderVideo(flags) {
  const format = flags.format;
  const { model, baseDir } = loadModel(flags._input);
  const theme = flags.theme || model.theme || 'paper-light';
  const out = flags.out && flags.out !== '-' ? flags.out : path.join('docs', `${slugify(model.meta?.title || 'document')}-${theme}.${format}`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const started = Date.now();
  let result;
  try {
    result = await exportVideo(model, {
      theme, baseDir, format, out,
      size: flags.size,
      fps: flags.fps ? Number(flags.fps) : undefined,
      scale: flags.scale ? Number(flags.scale) : undefined
    });
  } catch (error) {
    if (error.name !== 'RenderError') throw error;
    process.exitCode = 1;
    return ['error: model invalid', formatErrors(error.errors)].join('\n');
  }
  return [
    'ok: true',
    `file: ${displayPath(out)}`,
    `format: ${format}`,
    `theme: ${result.theme}`,
    `size: ${result.width}x${result.height}`,
    `frames: ${result.frames}`,
    `seconds: ${result.duration}`,
    `bytes: ${fs.statSync(out).size}`,
    `render_ms: ${Date.now() - started}`
  ].join('\n') + helpLines([`Run \`living-docs-axi render ${displayPath(flags._input)} --theme ${theme}\` for the live HTML`]);
}

async function renderCommand({ args, flags }) {
  flags._input = args[0];
  if (!flags._input) throw new UsageError('render needs a model path (or `-` for stdin)');
  if (flags.format && flags.format !== 'html') {
    if (!FORMATS.includes(flags.format)) throw new UsageError(`--format must be one of: html, ${FORMATS.join(', ')}`);
    if (flags.stdout) throw new UsageError('--stdout only works with html');
    return renderVideo(flags);
  }
  const rendered = runRender(flags);
  process.exitCode = rendered.ok ? 0 : 1;
  return rendered.status;
}

function validateCommand({ args }) {
  const { model } = loadModel(args[0]);
  const validation = validateDoc(model);
  if (validation.ok) {
    return [
      'ok: true',
      `blocks: ${model.blocks.length}`,
      `theme: ${model.theme || '(renderer default)'}`
    ].join('\n');
  }
  process.exitCode = 1;
  return ['error: model invalid', formatErrors(validation.errors)].join('\n');
}

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Opening the browser is best effort; the URL is printed either way.
  }
}

async function preview({ args, flags }) {
  const target = args[0] || 'docs';
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    throw new UsageError(`path not found: ${target} (render a document first)`);
  }
  const dir = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
  const port = Number(flags.port) || 4600;
  const served = await createPreviewServer({ dir, port });
  if (!flags['no-open']) openBrowser(served.url);
  console.log(`url: ${served.url}`);
  console.log(`dir: ${displayPath(served.dir)}`);
  console.log(`docs: ${served.docs}`);
  return new Promise(() => {});
}

const COMMAND_HELP = {
  ingest: 'ingest <path|url|-> [--url <url>] [--text <text>] [--outline] [--section <n|id>] [--draft] [--static] [--theme <name>] [--seed <hex>] [-o <file>] [--max-chars <n>] [--full]',
  render: 'render <model.json|-> [--theme <name>] [-o <file>] [--stdout] [--format html|mp4|webm|gif] [--size 1080x1350] [--fps 30] [--scale 1]',
  validate: 'validate <model.json|->',
  preview: 'preview [file|dir] [--port <n>] [--no-open]',
  themes: 'themes',
  schema: 'schema [--block <type>]'
};

function usage(command) {
  if (command && COMMAND_HELP[command]) {
    return [`usage: living-docs-axi ${COMMAND_HELP[command]}`, '', schema({})].join('\n');
  }
  return [
    'usage: living-docs-axi <command> [args]',
    '',
    toon('commands', ['name', 'usage'], Object.entries(COMMAND_HELP).map(([name, usageText]) => [name, usageText]))
  ].join('\n');
}

export async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    process.exitCode = 2;
    return [`error: ${error.message}`, usage()].join('\n');
  }
  const { command, args, flags } = parsed;
  if (flags.help || flags.h || command === 'help') return usage(command === 'help' ? args[0] : command);

  try {
    switch (command) {
      case undefined:
        return home();
      case 'themes':
        return themes();
      case 'schema':
        return schema(flags);
      case 'ingest':
        return await ingest({ args, flags });
      case 'render':
        return await renderCommand({ args, flags });
      case 'validate':
        return validateCommand({ args, flags });
      case 'preview':
        return await preview({ args, flags });
      default:
        process.exitCode = 2;
        return [`error: unknown command "${command}"`, usage()].join('\n');
    }
  } catch (error) {
    if (error instanceof UsageError) {
      process.exitCode = 2;
      return [`error: ${error.message}`, usage()].join('\n');
    }
    process.exitCode = 1;
    const hint = error.hint ? `\nhint: ${error.hint}` : '';
    return `error: ${error.message}${hint}`;
  }
}

export { runRender, slugify, plainBlockText };
