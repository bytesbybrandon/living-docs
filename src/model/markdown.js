// Small markdown subset: enough to ingest prose without pulling a parser stack.
// Inline: `code`, **bold**, *italic*, ~~strike~~, [text](url), [[n]] footnote refs.
// Blocks: ATX headings, paragraphs, fenced code, lists, blockquotes, pipe tables, rules.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ESCAPES[ch]);
export const escapeAttr = escapeHtml;

export function safeUrl(url) {
  const raw = String(url ?? '').trim();
  if (/^(https?:|mailto:|#|\/|\.\.?\/)/i.test(raw)) return escapeAttr(raw);
  return null;
}

export function renderInline(markdown, { allowLinks = true } = {}) {
  const source = String(markdown ?? '');
  const tokens = [];
  const stash = html => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };

  let text = source.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));

  if (allowLinks) {
    text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = safeUrl(url);
      if (!href) return stash(renderInline(label, { allowLinks: false }));
      return stash(`<a href="${href}">${renderInline(label, { allowLinks: false })}</a>`);
    });
  }

  text = escapeHtml(text)
    .replace(/\[\[(\d+)\]\]/g, (_, n) => `<sup class="fn-ref">${n}</sup>`)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}

export function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[`*_[\]()<>#]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const headingRe = /^(#{1,6})\s+(.*)$/;
const fenceRe = /^\s*(```+|~~~+)\s*([\w#+.-]*)\s*$/;
const ulRe = /^\s*[-*+]\s+(.*)$/;
const olRe = /^\s*\d+[.)]\s+(.*)$/;
const hrRe = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

function splitRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  return body.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'));
}

/**
 * Parse markdown into normalized blocks.
 * @returns {Array<object>} blocks: heading, paragraph, code, list, quote, table, rule
 */
export function parseMarkdown(source) {
  const lines = String(source ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const fence = line.match(fenceRe);
    if (fence) {
      const [, marker, lang] = fence;
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${marker[0]}{3,}`).test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', lang: lang || '', text: body.join('\n') });
      continue;
    }

    const heading = line.match(headingRe);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (hrRe.test(line)) { blocks.push({ type: 'rule' }); i++; continue; }

    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: body.join('\n').trim() });
      continue;
    }

    if (ulRe.test(line) || olRe.test(line)) {
      const ordered = olRe.test(line) && !ulRe.test(line);
      const matcher = ordered ? olRe : ulRe;
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(matcher);
        if (!item) {
          if (/^\s{2,}\S/.test(lines[i]) && items.length) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
            continue;
          }
          break;
        }
        items.push(item[1].trim());
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const columns = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const width = columns.length;
      for (const row of rows) while (row.length < width) row.push('');
      blocks.push({ type: 'table', columns, rows });
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !headingRe.test(lines[i]) && !fenceRe.test(lines[i]) && !ulRe.test(lines[i]) && !olRe.test(lines[i]) && !/^\s*>/.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function plainText(markdown) {
  return String(markdown ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\[(\d+)\]\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*~#>_|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(markdown) {
  const text = plainText(markdown);
  return text ? text.split(/\s+/).length : 0;
}
