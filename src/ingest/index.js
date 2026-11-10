import { draftCues } from './cues.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMarkdown, slug, wordCount } from '../model/markdown.js';
import { htmlToMarkdown, htmlTitle } from './html.js';
import { textToMarkdown } from './text.js';

export class IngestError extends Error {
  constructor(message, { code = 'INGEST_FAILED', hint } = {}) {
    super(message);
    this.name = 'IngestError';
    this.code = code;
    this.hint = hint;
  }
}

const MAX_BYTES = 25 * 1024 * 1024;

function kindFromPath(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.md' || ext === '.markdown' || ext === '.mdx') return 'markdown';
  if (ext === '.txt' || ext === '.text' || ext === '.rst') return 'text';
  return 'text';
}

async function readFileBytes(file) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) throw new IngestError(`Source not found: ${file}`, { code: 'ENOENT', hint: 'Pass an existing path, a URL, or inline text.' });
  if (!stat.isFile()) throw new IngestError(`Source is not a file: ${file}`, { code: 'EISDIR' });
  if (stat.size > MAX_BYTES) throw new IngestError(`Source is ${(stat.size / 1048576).toFixed(1)} MB; limit is ${MAX_BYTES / 1048576} MB`, { code: 'TOO_LARGE' });
  return fs.readFile(file);
}

async function fetchSource(url) {
  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'living-docs/0.1 (+https://github.com/bytesbybrandon)' },
      signal: AbortSignal.timeout(30_000)
    });
  } catch (error) {
    throw new IngestError(`Fetch failed for ${url}: ${error.message}`, { code: 'FETCH_FAILED' });
  }
  if (!response.ok) throw new IngestError(`Fetch failed for ${url}: HTTP ${response.status}`, { code: 'FETCH_FAILED' });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new IngestError(`Response is ${(buffer.length / 1048576).toFixed(1)} MB; limit is ${MAX_BYTES / 1048576} MB`, { code: 'TOO_LARGE' });
  const type = (response.headers.get('content-type') || '').toLowerCase();
  const kind = type.includes('pdf') ? 'pdf'
    : type.includes('html') ? 'html'
    : type.includes('markdown') ? 'markdown'
    : kindFromPath(new URL(url).pathname);
  return { buffer, kind, url };
}

async function pdfToText(buffer) {
  let unpdf;
  try {
    unpdf = await import('unpdf');
  } catch {
    throw new IngestError('PDF support needs the `unpdf` dependency (npm install unpdf).', { code: 'PDF_UNAVAILABLE' });
  }
  const { extractText, getDocumentProxy } = unpdf;
  try {
    const document = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(document, { mergePages: true });
    return { text: Array.isArray(text) ? text.join('\n\n') : text, pages: totalPages };
  } catch (error) {
    throw new IngestError(`PDF extraction failed: ${error.message}`, { code: 'PDF_FAILED' });
  }
}

function normalizeBlocks(blocks) {
  return blocks
    .filter(block => block.type !== 'rule')
    .filter(block => block.type !== 'paragraph' || block.text.trim())
    .map(block => {
      if (block.type === 'table') {
        return {
          type: 'table',
          columns: block.columns.map(c => c.trim()),
          rows: block.rows.map(row => row.map(cell => cell.trim()))
        };
      }
      if (block.type === 'list') {
        return { type: 'list', ordered: Boolean(block.ordered), items: block.items.map(item => item.trim()).filter(Boolean) };
      }
      return block;
    });
}

/**
 * Split normalized blocks into sections at the shallowest heading level.
 * Returns { title, abstract, preamble, sections }.
 */
export function splitSections(blocks, { fallbackTitle = 'Untitled source' } = {}) {
  const cleanTitle = text => String(text ?? '').replace(/^\d+(?:\.\d+)*\.?\s+/, '').trim() || String(text ?? '').trim();
  const headingLevels = blocks.filter(b => b.type === 'heading').map(b => b.level);
  if (!headingLevels.length) {
    const text = blocksToText(blocks);
    const words = wordCount(text);
    return {
      title: fallbackTitle,
      abstract: '',
      preamble: blocks,
      sections: [{ id: 'body', level: 2, title: 'Body', words, chars: text.length, blocks }]
    };
  }

  const titleBlock = blocks.find(b => b.type === 'heading' && b.level === 1);
  const sectionLevel = Math.min(...headingLevels.filter(level => !(titleBlock && level === 1)));
  const effectiveLevel = Number.isFinite(sectionLevel) ? sectionLevel : Math.min(...headingLevels);

  const preamble = [];
  const sections = [];
  let current = null;
  const seen = new Set();

  for (const block of blocks) {
    if (block.type === 'heading' && block === titleBlock) continue;
    if (block.type === 'heading' && block.level <= effectiveLevel) {
      if (current) sections.push(current);
      const title = cleanTitle(block.text);
      let id = slug(title) || `section-${sections.length + 1}`;
      if (seen.has(id)) {
        let n = 2;
        while (seen.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      seen.add(id);
      current = { id, level: block.level, title, blocks: [], words: 0, chars: 0 };
      continue;
    }
    if (current) current.blocks.push(block);
    else preamble.push(block);
  }
  if (current) sections.push(current);

  for (const section of sections) {
    const text = blocksToText(section.blocks);
    section.words = wordCount(text);
    section.chars = text.length;
    if (!section.blocks.length) section.blocks = [];
  }

  return {
    title: titleBlock ? titleBlock.text : fallbackTitle,
    abstract: firstParagraph([...preamble, ...(sections[0]?.blocks ?? [])]),
    preamble,
    sections
  };
}

function firstParagraph(blocks) {
  const candidate = blocks.find(b => b.type === 'paragraph' && b.text.length >= 120);
  return candidate ? candidate.text : '';
}

function blocksToText(blocks) {
  return blocks.map(block => {
    if (block.type === 'paragraph' || block.type === 'quote') return block.text;
    if (block.type === 'heading') return block.text;
    if (block.type === 'list') return block.items.join(' ');
    if (block.type === 'code') return block.text;
    if (block.type === 'table') return [...block.columns, ...block.rows.flat()].join(' ');
    return '';
  }).join('\n');
}

export function blockToModelBlock(block) {
  switch (block.type) {
    case 'paragraph':
      return { type: 'prose', markdown: block.text };
    case 'heading':
      return { type: 'heading', title: block.text, level: block.level >= 3 ? 3 : 2 };
    case 'code':
      return { type: 'code', body: block.text, ...(block.lang ? { lang: block.lang } : {}) };
    case 'list':
      return { type: 'list', items: block.items, style: block.ordered ? 'decimal' : 'bullet' };
    case 'quote':
      return { type: 'quote', body: block.text };
    case 'table':
      return {
        type: 'table',
        columns: block.columns.map(label => ({ label })),
        rows: block.rows
      };
    case 'footnotes':
      return block;
    default:
      return null;
  }
}

/**
 * Build a valid draft model straight from a source. This is the zero-judgment path:
 * it renders, then an agent upgrades sections, figures, and callouts.
 */
export function draftModel(ingested, { theme = 'paper-dark', includePreamble = true, maxBlocks = 400, cues = true } = {}) {
  const { meta, sections, preamble } = ingested;
  const blocks = [];
  let abstractPending = Boolean(meta.abstract);
  const takeBlock = block => {
    if (abstractPending && block.type === 'paragraph' && block.text === meta.abstract) {
      abstractPending = false;
      return null;
    }
    return blockToModelBlock(block);
  };
  if (includePreamble && preamble.length) {
    for (const block of preamble) {
      const mapped = takeBlock(block);
      if (mapped) blocks.push(mapped);
    }
  }
  for (const section of sections) {
    blocks.push({ type: 'heading', title: section.title, level: 2 });
    for (const block of section.blocks) {
      const mapped = takeBlock(block);
      if (mapped) blocks.push(mapped);
      if (blocks.length >= maxBlocks) break;
    }
    if (blocks.length >= maxBlocks) break;
  }

  const model = {
    schemaVersion: 1,
    theme,
    meta: {
      title: meta.title,
      ...(meta.subtitle ? { subtitle: meta.subtitle } : {}),
      ...(meta.author ? { author: meta.author } : {}),
      ...(meta.date ? { date: meta.date } : {}),
      ...(meta.abstract ? { abstract: meta.abstract } : {})
    },
    blocks: blocks.length ? blocks : [{ type: 'prose', markdown: meta.title }]
  };
  return cues ? draftCues(model) : model;
}

/**
 * Ingest a source file, URL, or inline text.
 */
export async function ingestSource({ path: filePath, url, text, kind: explicitKind, title } = {}) {
  if (!filePath && !url && (text === undefined || text === null)) {
    throw new IngestError('Pass one of: path, url, text', { code: 'EINVAL' });
  }

  let raw;
  let kind = explicitKind;
  let ref = filePath || url || '<inline>';

  if (text !== undefined && text !== null) {
    raw = String(text);
    kind = kind || 'markdown';
  } else if (url) {
    const fetched = await fetchSource(url);
    raw = fetched.buffer;
    kind = explicitKind || fetched.kind;
    ref = url;
  } else {
    raw = await readFileBytes(filePath);
    kind = kind || kindFromPath(filePath);
  }

  let markdown;
  let pages;
  let htmlDocTitle = '';

  if (kind === 'pdf') {
    const extracted = await pdfToText(Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw)));
    markdown = textToMarkdown(extracted.text);
    pages = extracted.pages;
  } else {
    const source = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
    if (kind === 'html') {
      htmlDocTitle = htmlTitle(source);
      markdown = htmlToMarkdown(source);
    } else if (kind === 'text') {
      markdown = textToMarkdown(source);
    } else {
      markdown = source;
    }
  }

  const blocks = normalizeBlocks(parseMarkdown(markdown));
  const fallbackTitle = title || htmlDocTitle || (filePath ? path.basename(filePath, path.extname(filePath)) : 'Untitled source');
  const split = splitSections(blocks, { fallbackTitle });
  const allText = blocksToText(blocks);

  const meta = {
    title: title || htmlDocTitle || split.title || fallbackTitle,
    ...(split.abstract ? { abstract: split.abstract } : {})
  };

  return {
    source: {
      kind,
      ref,
      words: wordCount(allText),
      chars: allText.length,
      ...(pages ? { pages } : {})
    },
    meta,
    preamble: split.preamble,
    sections: split.sections,
    totals: {
      sections: split.sections.length,
      blocks: blocks.length,
      words: wordCount(allText)
    }
  };
}

export function outlineOf(ingested) {
  return {
    title: ingested.meta.title,
    source: ingested.source,
    count: ingested.sections.length,
    sections: ingested.sections.map((section, i) => ({
      index: i + 1,
      id: section.id,
      level: section.level,
      title: section.title,
      words: section.words
    }))
  };
}

export function selectSection(ingested, selector) {
  if (!selector) return null;
  const asIndex = Number(selector);
  if (Number.isInteger(asIndex) && asIndex >= 1) {
    return ingested.sections[asIndex - 1] || null;
  }
  return ingested.sections.find(section => section.id === selector) || null;
}
