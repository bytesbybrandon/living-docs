import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, escapeAttr, renderInline, safeUrl } from '../model/markdown.js';

export { escapeHtml, escapeAttr, renderInline, safeUrl };

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif'
};

export function inlineImage(src, baseDir) {
  const resolved = path.resolve(baseDir || process.cwd(), src);
  if (!fs.existsSync(resolved)) throw new Error(`Image not found: ${resolved}`);
  const ext = path.extname(resolved).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Unsupported image type: ${ext}`);
  const data = fs.readFileSync(resolved).toString('base64');
  return `data:${mime};base64,${data}`;
}

export function cssVars(palette) {
  return Object.entries(palette)
    .map(([key, value]) => `--${key.replace(/[A-Z]/g, ch => '-' + ch.toLowerCase())}: ${value};`)
    .join('\n  ');
}
