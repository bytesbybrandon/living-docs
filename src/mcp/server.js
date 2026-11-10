import fs from 'node:fs';
import path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ingestSource, outlineOf, selectSection, draftModel } from '../ingest/index.js';
import { renderDoc, themeList } from '../render/index.js';
import { validateDoc, formatErrors } from '../model/validate.js';
import { BLOCKS, THEMES, blockFieldSummary } from '../model/schema.js';
import { createPreviewServer } from '../server/preview.js';

const quoteCell = value => {
  const text = String(value ?? '');
  return /[",\n]|^\s|\s$/.test(text) ? JSON.stringify(text) : text;
};
const toon = (name, fields, rows) => {
  if (!rows.length) return `0 ${name}`;
  return [`${name}[${rows.length}]{${fields.join(',')}}:`, ...rows.map(row => '  ' + row.map(quoteCell).join(','))].join('\n');
};

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'document';
}

function toolError(message) {
  return { content: [{ type: 'text', text: `error: ${message}` }], isError: true };
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

const TOOLS = [
  {
    name: 'living_docs_themes',
    description: 'List the three living-doc themes and what each is best for.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'living_docs_schema',
    description: 'Show the document-model schema: block types and fields, or one block in detail.',
    inputSchema: {
      type: 'object',
      properties: { block: { type: 'string', description: 'Block type for detailed fields, e.g. figure' } },
      additionalProperties: false
    }
  },
  {
    name: 'living_docs_ingest',
    description: 'Read a source (path, URL, or text) and return its outline. With draft=true, also build a renderable model from the source.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Source file: md, txt, html, pdf' },
        url: { type: 'string', description: 'Source URL' },
        text: { type: 'string', description: 'Inline source text' },
        section: { type: 'string', description: 'Return one section: 1-based index or id' },
        draft: { type: 'boolean', description: 'Include a draft document model built from the source' },
        theme: { type: 'string', enum: Object.keys(THEMES), description: 'Theme recorded on the draft' },
        out: { type: 'string', description: 'Write the draft model JSON to this path' },
        max_chars: { type: 'number', description: 'Section text limit, default 12000' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'living_docs_render',
    description: 'Validate a document model and write a self-contained HTML doc. Accepts a model object, a model path, or a source to draft from.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'object', description: 'Document model object' },
        model_path: { type: 'string', description: 'Path to a model JSON file' },
        source: { type: 'string', description: 'Source path or URL to ingest and draft from' },
        theme: { type: 'string', enum: Object.keys(THEMES) },
        out: { type: 'string', description: 'Output HTML path, default docs/<title>-<theme>.html' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'living_docs_preview',
    description: 'Serve a built docs directory over HTTP and list the documents. Returns the URL (server stays up in this process).',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Directory to serve, default docs' },
        port: { type: 'number', description: 'Port, default 4600' }
      },
      additionalProperties: false
    }
  }
];

let previewServer = null;

async function handle(name, args = {}) {
  switch (name) {
    case 'living_docs_themes': {
      return textResult(toon('themes', ['name', 'summary', 'best'], themeList().map(theme => [theme.name, theme.summary, theme.best])));
    }
    case 'living_docs_schema': {
      if (args.block) {
        const summary = blockFieldSummary(args.block);
        if (!summary) return toolError(`unknown block "${args.block}" (one of: ${Object.keys(BLOCKS).join(', ')})`);
        return textResult([
          `block: ${summary.type}`,
          `summary: ${summary.summary}`,
          '',
          toon('fields', ['name', 'kind', 'required', 'desc'], summary.fields.map(field => [
            field.name,
            field.values ? `enum(${field.values.join('|')})` : field.kind,
            field.required ? 'yes' : 'no',
            field.desc
          ]))
        ].join('\n'));
      }
      return textResult(toon('blocks', ['type', 'summary'], Object.entries(BLOCKS).map(([type, def]) => [type, def.summary])));
    }
    case 'living_docs_ingest': {
      if (!args.path && !args.url && !args.text) return toolError('pass path, url, or text');
      const ingested = await ingestSource({ path: args.path, url: args.url, text: args.text });
      if (args.section) {
        const section = selectSection(ingested, args.section);
        if (!section) return toolError(`no section "${args.section}"`);
        const body = section.blocks.map(block => {
          if (block.type === 'paragraph' || block.type === 'quote') return block.text;
          if (block.type === 'heading') return `${'#'.repeat(block.level)} ${block.text}`;
          if (block.type === 'list') return block.items.join('\n');
          if (block.type === 'code') return block.text;
          if (block.type === 'table') return [block.columns.join(' | '), ...block.rows.map(row => row.join(' | '))].join('\n');
          return '';
        }).filter(Boolean).join('\n\n');
        const limit = args.max_chars || 12000;
        const truncated = body.length > limit;
        return textResult([
          `section: ${section.title}`,
          `id: ${section.id}`,
          `words: ${section.words}`,
          `truncated: ${truncated ? 'yes' : 'no'}`,
          '',
          truncated ? body.slice(0, limit) + `\n… (${body.length} chars total)` : body
        ].join('\n'));
      }
      const outline = outlineOf(ingested);
      const lines = [
        `source: ${outline.source.kind}`,
        `ref: ${outline.source.ref}`,
        `title: ${outline.title}`,
        `words: ${outline.source.words}`,
        `sections: ${outline.count}`,
        '',
        toon('sections', ['index', 'id', 'title', 'words'], outline.sections.map(section => [section.index, section.id, section.title, section.words]))
      ];
      if (args.draft) {
        const theme = args.theme || 'paper-dark';
        const model = draftModel(ingested, { theme });
        const validation = validateDoc(model);
        if (!validation.ok) return toolError(`draft model invalid:\n${formatErrors(validation.errors)}`);
        if (args.out) {
          fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
          fs.writeFileSync(args.out, JSON.stringify(model, null, 2) + '\n');
          lines.push('', `draft: ${path.resolve(args.out)}`, `blocks: ${model.blocks.length}`);
        } else {
          lines.push('', 'draft model:', JSON.stringify(model));
        }
      }
      return textResult(lines.join('\n'));
    }
    case 'living_docs_render': {
      let model = args.model;
      let baseDir = process.cwd();
      if (!model && args.model_path) {
        model = JSON.parse(fs.readFileSync(path.resolve(args.model_path), 'utf8'));
        baseDir = path.dirname(path.resolve(args.model_path));
      }
      if (!model && args.source) {
        const isUrl = /^https?:\/\//i.test(args.source);
        const ingested = await ingestSource(isUrl ? { url: args.source } : { path: args.source });
        model = draftModel(ingested, { theme: args.theme || 'paper-dark' });
      }
      if (!model) return toolError('pass model, model_path, or source');
      const theme = args.theme || model.theme || 'paper-light';
      const result = renderDoc(model, { theme, baseDir });
      if (!result.ok) return toolError(`model invalid:\n${formatErrors(result.errors)}`);
      const out = args.out || path.join('docs', `${slugify(model.meta.title)}-${theme}.html`);
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, result.html);
      return textResult([
        'ok: true',
        `file: ${path.resolve(out)}`,
        `theme: ${result.theme}`,
        `sections: ${result.stats.sections}`,
        `figures: ${result.stats.figures}`,
        `tables: ${result.stats.tables}`,
        `panels: ${result.stats.panels}`,
        `words: ${result.stats.words}`,
        `bytes: ${result.stats.bytes}`,
        ...(result.warnings.length ? ['', toon('warnings', ['message'], result.warnings.map(w => [w]))] : []),
        '',
        'help[2]:',
        `  Run \`living_docs_preview\` with dir ${path.dirname(path.resolve(out))}`,
        '  Run `living_docs_schema` before adding figures or panels'
      ].join('\n'));
    }
    case 'living_docs_preview': {
      const dir = path.resolve(args.dir || 'docs');
      if (!fs.existsSync(dir)) return toolError(`directory not found: ${dir}`);
      if (!previewServer) {
        previewServer = await createPreviewServer({ dir, port: args.port || 4600 });
      }
      return textResult([
        `url: ${previewServer.url}`,
        `dir: ${previewServer.dir}`,
        `docs: ${previewServer.docs}`,
        'help[1]:',
        '  Open the URL to review; call with a different dir after restarting the server process'
      ].join('\n'));
    }
    default:
      return toolError(`unknown tool "${name}"`);
  }
}

export function createServer() {
  const server = new Server(
    { name: 'living-docs', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions: 'Turn source documents into designed living docs. Ingest to get an outline, author a document model against the schema, then render with paper-light, paper-dark, or hud.'
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      return await handle(request.params.name, request.params.arguments || {});
    } catch (error) {
      return toolError(error.message);
    }
  });

  return server;
}

export async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
