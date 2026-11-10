// HTML to markdown-ish text. Deliberately regex-based: ingest only needs headings,
// paragraphs, lists, quotes, and tables; the agent supplies judgment for the rest.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', middot: '·', times: '×', copy: '©', reg: '®'
};

export function decodeEntities(text) {
  return String(text ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

function stripTags(html) {
  return decodeEntities(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function htmlToMarkdown(html) {
  let text = String(html ?? '');

  text = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|template|nav|footer|form)[\s\S]*?<\/\1>/gi, '')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, body) => `\n\n\`\`\`\n${decodeEntities(body.replace(/<[^>]+>/g, ''))}\n\`\`\`\n\n`);

  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, body) => {
    const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
      [...row[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(cell => stripTags(cell[1]).replace(/\|/g, '\\|'))
    ).filter(row => row.length);
    if (!rows.length) return '\n\n';
    const width = Math.max(...rows.map(r => r.length));
    const line = row => `| ${row.concat(Array(width - row.length).fill('')).join(' | ')} |`;
    const [head, ...rest] = rows;
    return `\n\n${line(head)}\n|${' --- |'.repeat(width)}\n${rest.map(line).join('\n')}\n\n`;
  });

  text = text
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => `\n\n${'#'.repeat(Number(level))} ${stripTags(body)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => `\n- ${stripTags(body)}`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, body) => `\n\n> ${stripTags(body)}\n\n`)
    .replace(/<(p|div|section|article|header|main|br|hr)\b[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  text = decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

export function htmlTitle(html) {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
}
