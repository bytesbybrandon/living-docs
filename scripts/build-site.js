import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ingestSource, draftModel } from '../src/ingest/index.js';
import { renderDoc } from '../src/render/index.js';
import { escapeHtml } from '../src/model/markdown.js';
import { mix, ensureContrast, contrastRatio } from '../src/render/style.js';
import { palette as lightPalette } from '../src/render/themes/paper-light.js';
import { palette as darkPalette } from '../src/render/themes/paper-dark.js';
import { palette as hudPalette } from '../src/render/themes/hud.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/bytesbybrandon/living-docs';
const NPM = 'https://www.npmjs.com/package/@bytesbybrandon/living-docs';
const SITE_URL = 'https://bytesbybrandon.github.io/living-docs/';

const GUIDE = [
  ['pipeline', 'Pipeline', 'Source to HTML, and the zero-judgment draft path'],
  ['cli', 'CLI reference', 'Commands, flags, and exit codes'],
  ['document-model', 'Document model', 'Meta, blocks, figures, and console panels'],
  ['style-tokens', 'Style tokens', 'Palette, seed, type, density, figure, and motion'],
  ['mcp', 'MCP server', 'Client configuration and the five tools'],
  ['reactive-workflow', 'Reactive workflow', 'The optional agent workflow around the CLI'],
  ['timeline', 'Timeline and video', 'Cues, drafted timelines, and MP4, WebM, or GIF export'],
  ['guarantees', 'Guarantees', 'Self-contained, deterministic, escaped, print ready']
];

const SAMPLES = [
  { id: 'harness-engineering', blurb: 'A source-code study set as an academic paper: seven-subsystem diagram, comparison table, adoption chart, and an algorithm.' },
  { id: 'end-of-harness-engineering', blurb: 'Reading notes on one paper, in dark editorial type with animated figures and a takeaway strip.' },
  { id: 'agent-skills-audit', blurb: 'A repo audit as a telemetry console: graph hero, twelve panels, and a live clock.' }
];

const THEME_LABEL = { 'paper-light': 'paper-light', 'paper-dark': 'paper-dark', hud: 'hud' };

// The home page demo: one model, three skins. The page takes the palette of the theme on the stage.
const SKINS = [
  { theme: 'paper-light', label: 'Paper light', palette: lightPalette, scheme: 'light', mono: false },
  { theme: 'paper-dark', label: 'Paper dark', palette: darkPalette, scheme: 'dark', mono: false },
  { theme: 'hud', label: 'Console', palette: hudPalette, scheme: 'dark', mono: true }
];
const DEFAULT_SKIN = 'paper-dark';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", monospace';

function skinTokens({ palette: p, scheme, mono }) {
  const paper = scheme === 'light' ? mix(p.hair, p.bg, 0.5) : mix(p.bg, '#000000', 0.45);
  const accent = ensureContrast(p.accent, paper, 4.6);
  const onAccent = contrastRatio(paper, accent) >= contrastRatio(p.ink, accent) ? paper : p.ink;
  return [
    ['--color-paper', paper],
    ['--color-paper-2', p.surface],
    ['--color-ink', p.ink],
    ['--color-ink-2', mix(p.ink, paper, 0.22)],
    ['--color-muted', ensureContrast(p.muted, paper, 4.6)],
    ['--color-rule', mix(p.hair, p.ink, 0.3)],
    ['--color-accent', accent],
    ['--color-accent-ink', ensureContrast(onAccent, accent, 4.5)],
    ['--color-focus', p.ink],
    ['--font-display', mono ? MONO : SERIF],
    ['color-scheme', scheme]
  ].map(([name, value]) => `${name}: ${value};`).join(' ');
}

function skinCss() {
  const shared = `--font-body: ${SANS}; --font-mono: ${MONO};`;
  const blocks = SKINS.map(skin => `html[data-theme="${skin.theme}"] { ${skinTokens(skin)} }`);
  const base = SKINS.find(skin => skin.theme === DEFAULT_SKIN);
  return `:root { ${shared} ${skinTokens(base)} }\n${blocks.join('\n')}`;
}

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (outDir, rel, content) => {
  const file = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

function bar(rel, active) {
  const link = (key, label, href) => `<a href="${rel}${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="ld-bar"><a class="brand" href="${rel}index.html"><i aria-hidden="true"></i>living-docs</a><nav aria-label="Site">${link('home', 'Home', 'index.html')}${link('gallery', 'Gallery', 'gallery/index.html')}${link('guide', 'Guide', 'guide/index.html')}<a class="gh" href="${REPO}">GitHub</a></nav></header>`;
}

const css = () => read('site/site.css');

function shell({ title, description, rel, active, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="living-docs">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
<style>${css()}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${bar(rel, active)}
${body}
<footer class="site"><div class="wrap"><span>MIT licensed &middot; built with living-docs</span><span><a href="${REPO}">GitHub</a> &middot; <a href="${NPM}">npm</a> &middot; <a href="${REPO}/blob/main/ARCHITECTURE.md">Architecture</a></span></div></footer>
<script>
document.querySelectorAll('[data-copy]').forEach(function(button){
  button.addEventListener('click',function(){
    var text=button.getAttribute('data-copy');
    var done=function(){var old=button.textContent;button.textContent='Copied';setTimeout(function(){button.textContent=old},1400)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done)}
  });
});
function fit(){
  document.querySelectorAll('.shot').forEach(function(shot){
    var frame=shot.querySelector('iframe');
    if(frame){frame.style.transform='scale('+(shot.clientWidth/1440)+')'}
  });
}
fit();
window.addEventListener('resize',fit);
if(window.ResizeObserver){document.querySelectorAll('.shot').forEach(function(s){new ResizeObserver(fit).observe(s)})}
</script>
</body>
</html>
`;
}

const BAR_CSS = `.ld-bar{position:sticky;top:0;z-index:9999;display:flex;align-items:center;gap:24px;padding:10px 24px;background:rgba(9,10,15,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08);font:500 13px/1 "Inter","Segoe UI",system-ui,sans-serif}
.ld-bar .brand{display:flex;align-items:center;gap:8px;color:#F4F4F6;font:600 13px/1 "SF Mono","JetBrains Mono",Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;text-decoration:none}
.ld-bar .brand i{width:7px;height:7px;border-radius:50%;background:#63B3ED;box-shadow:0 0 10px rgba(99,179,237,.8)}
.ld-bar nav{display:flex;gap:16px;margin-left:auto;align-items:center}
.ld-bar nav a{color:#A1A4B5;padding:6px 4px;text-decoration:none}
.ld-bar nav a:hover,.ld-bar nav a[aria-current="page"]{color:#F4F4F6}
.ld-bar nav a[aria-current="page"]{box-shadow:inset 0 -2px 0 #63B3ED}
@media (max-width:560px){.ld-bar{gap:12px;padding:10px 16px}.ld-bar nav{gap:12px}.ld-bar .gh{display:none}}
.ld-bar[hidden]{display:none}
@media print{.ld-bar{display:none}}`;

/** Insert the site bar as the first child of a rendered doc, with its own scoped styles. */
function withBar(html, rel, active) {
  const injected = html.replace(/(<body[^>]*>)/, `$1<style>${BAR_CSS}</style>${bar(rel, active)}<script>if(self!==top){document.querySelector('.ld-bar').hidden=true}</script>`);
  if (injected === html) throw new Error('rendered document has no <body> to attach the site bar to');
  return injected;
}

function rewriteGuideLinks(markdown) {
  return markdown.replace(/\]\(([a-z0-9-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => `](./${name}.html${hash})`);
}

async function buildGuide(outDir) {
  const pages = [];
  for (const [id, title, summary] of GUIDE) {
    const markdown = rewriteGuideLinks(read(`docs/guide/${id}.md`));
    const ingested = await ingestSource({ text: markdown, kind: 'markdown', title });
    const model = draftModel(ingested, { theme: 'paper-dark', cues: false }); // reference pages stay still
    model.meta.kicker = 'living-docs guide';
    model.meta.runningHead = 'Guide';
    model.meta.subtitle = summary;
    model.meta.footer = 'living-docs';
    model.meta.style = { palette: 'ocean', type: 'technical', density: 'normal', figure: 'outline', layout: 'single' };
    const result = renderDoc(model, { theme: 'paper-dark' });
    if (!result.ok) throw new Error(`guide ${id}: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
    write(outDir, `guide/${id}.html`, withBar(result.html, '../', 'guide'));
    pages.push({ id, title, summary });
  }
  const rows = pages.map((page, i) => `<li><a class="row" href="./${page.id}.html"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${escapeHtml(page.title)}</span><span class="d">${escapeHtml(page.summary)}</span></a></li>`).join('\n');
  write(outDir, 'guide/index.html', shell({
    title: 'Guide | living-docs',
    description: 'Guides for the living-docs pipeline, CLI, document model, style tokens, MCP server, and guarantees.',
    rel: '../',
    active: 'guide',
    body: `<main id="main"><div class="wrap"><div class="page-head"><div class="eyebrow">Guide</div><h1>Guides, rendered by living-docs</h1><p class="lead">Every page here is a Markdown file in the repository, ingested and rendered by the engine this site documents.</p></div><ul class="list">\n${rows}\n</ul><p class="sec-sub" style="margin-top:var(--space-6)">For module boundaries and decisions, read <a href="${REPO}/blob/main/ARCHITECTURE.md">ARCHITECTURE.md</a> on GitHub.</p></div></main>`
  }));
  return pages;
}

function frame(src, label) {
  return `<div class="shot" aria-hidden="true"><iframe src="${src}" title="${escapeHtml(label)}" loading="lazy" scrolling="no" tabindex="-1"></iframe><a href="${src}" tabindex="-1" aria-label="Open ${escapeHtml(label)}"></a></div>`;
}

function buildGallery(outDir) {
  const entries = [];
  for (const sample of SAMPLES) {
    const modelPath = path.join(root, 'samples', `${sample.id}.json`);
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const theme = model.theme || 'paper-light';
    const result = renderDoc(model, { theme, baseDir: path.dirname(modelPath) });
    if (!result.ok) throw new Error(`sample ${sample.id}: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
    write(outDir, `gallery/${sample.id}.html`, withBar(result.html, '../', 'gallery'));
    write(outDir, `gallery/${sample.id}.model.json`, JSON.stringify(model, null, 2) + '\n');
    entries.push({ ...sample, theme, title: model.meta.title, stats: result.stats });
  }
  return entries;
}

/** Render the demo model once per skin; the home page pins one of them and plays its timeline. */
function buildDemo(outDir) {
  const model = JSON.parse(read('site/demo.model.json'));
  for (const skin of SKINS) {
    const result = renderDoc(model, { theme: skin.theme });
    if (!result.ok) throw new Error(`demo ${skin.theme}: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
    write(outDir, `demo/${skin.theme}.html`, result.html);
  }
  write(outDir, 'demo/model.json', JSON.stringify(model, null, 2) + '\n');
}

function homeBody() {
  const radios = SKINS.map(skin => `          <input type="radio" name="skin" id="skin-${skin.theme}" value="${skin.theme}"${skin.theme === DEFAULT_SKIN ? ' checked' : ''}><label for="skin-${skin.theme}">${skin.label}</label>`).join('\n');
  const frames = SKINS.map(skin => {
    const live = skin.theme === DEFAULT_SKIN;
    return `        <iframe data-skin="${skin.theme}" ${live ? `src="demo/${skin.theme}.html"` : `data-src="demo/${skin.theme}.html" hidden`} title="Live demo document, ${skin.label}" scrolling="no" tabindex="-1"></iframe>`;
  }).join('\n');
  return read('site/home.html')
    .replace('%%SKINS%%', radios)
    .replace('%%FRAMES%%', frames)
    .replaceAll('%%REPO%%', REPO)
    .replaceAll('%%NPM%%', NPM);
}

function homePage() {
  const title = 'living-docs: docs that explain themselves';
  const description = 'Turn any source into one self-contained page that highlights as it explains, and export the same timeline as MP4, WebM, or GIF. AXI CLI and MCP server.';
  return `<!doctype html>
<html lang="en" data-theme="${DEFAULT_SKIN}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="living-docs">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:image" content="${SITE_URL}img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<title>${escapeHtml(title)}</title>
<style>${read('site/home.css').replace('/*SKINS*/', () => skinCss())}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="container"><a class="brand" href="./index.html">living-docs</a><nav aria-label="Site"><a href="./gallery/index.html">Gallery</a><a href="./guide/index.html">Guide</a><a href="${REPO}">GitHub</a></nav></div></header>
${homeBody()}
<footer class="site-foot"><div class="container"><span>MIT licensed. Needs Node 20 or newer.</span><span><a href="${REPO}">GitHub</a> <a href="${NPM}">npm</a> <a href="${REPO}/blob/main/ARCHITECTURE.md">Architecture</a></span></div></footer>
<script>${read('site/home.js')}</script>
</body>
</html>
`;
}

function galleryIndex(outDir, entries) {
  const cards = entries.map(entry => `        <article class="card">
          ${frame(`./${entry.id}.html`, entry.title)}
          <div class="meta"><div class="tag">${THEME_LABEL[entry.theme]}</div><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.blurb)}</p></div>
          <div class="links"><a href="./${entry.id}.html">Open document</a><a href="./${entry.id}.model.json">Model JSON</a></div>
        </article>`).join('\n');
  write(outDir, 'gallery/index.html', shell({
    title: 'Gallery | living-docs',
    description: 'Three documents rendered by living-docs: an academic paper, dark reading notes, and a telemetry console.',
    rel: '../',
    active: 'gallery',
    body: `<main id="main"><div class="wrap"><div class="page-head"><div class="eyebrow">Gallery</div><h1>Three themes, real pages</h1><p class="lead">Each document is one self-contained HTML file rendered from the JSON model linked beside it. Open one, then print it or resize the window.</p></div><div class="cards">\n${cards}\n</div></div></main>`
  }));
}

export async function buildSite({ outDir = path.join(root, 'site', 'dist') } = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const entries = buildGallery(outDir);
  galleryIndex(outDir, entries);
  const guide = await buildGuide(outDir);

  buildDemo(outDir);
  write(outDir, 'index.html', homePage());
  fs.cpSync(path.join(root, 'site', 'img'), path.join(outDir, 'img'), { recursive: true });
  write(outDir, '404.html', shell({
    title: 'Not found | living-docs',
    description: 'Page not found.',
    rel: SITE_URL,
    active: '',
    body: `<main id="main"><div class="wrap"><div class="page-head"><div class="eyebrow">404</div><h1>That page is not here</h1><p class="lead">Try the <a href="${SITE_URL}index.html">home page</a>, the <a href="${SITE_URL}gallery/index.html">gallery</a>, or the <a href="${SITE_URL}guide/index.html">guide</a>.</p></div></div></main>`
  }));

  return { outDir, gallery: entries.length, guide: guide.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildSite();
  console.log(`site built: ${result.gallery} gallery documents, ${result.guide} guide pages -> ${path.relative(process.cwd(), result.outDir)}`);
}
