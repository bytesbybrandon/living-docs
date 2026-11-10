// Plain text to markdown-ish headings. Handles the two shapes PDFs and transcripts
// actually arrive in: numbered headings ("2.1 The Loop") and short ALL-CAPS lines.

const numbered = /^\s*(\d+(?:\.\d+)*)\.?\s+([A-Z][^.!?]{2,80})$/;
const caps = /^\s*([A-Z][A-Z0-9 ,/&'\-():]{5,80})\s*$/;

export function textToMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let lastBlank = true;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\t/g, ' ').trimEnd();
    const trimmed = line.trim();

    if (!trimmed) { out.push(''); lastBlank = true; continue; }

    let next = '';
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) { next = lines[j].trim(); break; }
    }
    const isShort = trimmed.length <= 80;
    const endsOpen = !/[.!?,;:]$/.test(trimmed);

    const numberedHit = trimmed.match(numbered);
    if (numberedHit && isShort && endsOpen && lastBlank && next) {
      const depth = Math.min(numberedHit[1].split('.').length, 4);
      out.push('', `${'#'.repeat(depth + 1)} ${numberedHit[1]} ${numberedHit[2].trim()}`, '');
      lastBlank = true;
      continue;
    }

    const capsHit = trimmed.match(caps);
    if (capsHit && isShort && endsOpen && lastBlank && next) {
      const words = trimmed.split(/\s+/);
      if (words.length <= 10 && !/^(FIGURE|TABLE|ALGORITHM)\b/i.test(trimmed)) {
        out.push('', `## ${titleCase(trimmed)}`, '');
        lastBlank = true;
        continue;
      }
    }

    out.push(line);
    lastBlank = false;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b([a-z])/g, (_, ch) => ch.toUpperCase());
}
