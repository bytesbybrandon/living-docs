import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDoc } from '../src/render/index.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = path.join(root, 'docs');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(path.join(root, 'samples')).filter(file => file.endsWith('.json'));
const rows = [];

for (const file of files) {
  const modelPath = path.join(root, 'samples', file);
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const theme = model.theme || 'paper-light';
  const result = renderDoc(model, { theme, baseDir: path.dirname(modelPath) });
  if (!result.ok) {
    console.error(`failed: ${file}`);
    for (const error of result.errors) console.error(`  ${error.path}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  const out = path.join(outDir, file.replace(/\.json$/, '.html'));
  fs.writeFileSync(out, result.html);
  rows.push([file, theme, result.stats.words, result.stats.bytes, result.warnings.length]);
}

if (rows.length) {
  console.log('sample,theme,words,bytes,warnings');
  for (const row of rows) console.log(row.join(','));
}
