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

const THEME_LABEL = { 'paper-light': 'Paper light', 'paper-dark': 'Paper dark', hud: 'Console' };

// Every site page wears a skin: the palette and type of one engine theme.
// The home page switches skins with its demo; gallery rows each wear the skin of the document they show.
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
  const blocks = SKINS.map(skin => `[data-theme="${skin.theme}"] { ${skinTokens(skin)} }`);
  const base = SKINS.find(skin => skin.theme === DEFAULT_SKIN);
  return `:root { ${shared} ${skinTokens(base)} }\n${blocks.join('\n')}`;
}

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (outDir, rel, content) => {
  const file = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

/** A page stylesheet is its Hallmark stamp, then the shared system with the skins filled in, then its own rules. */
function pageCss(name) {
  const lines = read(`site/${name}.css`).replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && /^(\/\*| \*)/.test(lines[i])) i++;
  const system = read('site/system.css').replace('/*SKINS*/', () => skinCss());
  return `${lines.slice(0, i).join('\n')}\n${system}\n${lines.slice(i).join('\n')}`;
}

function siteNav(rel, active) {
  const link = (key, label, href) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="nav"><div class="container"><a class="brand" href="${rel}index.html">living-docs</a><nav aria-label="Site">${link('gallery', 'Gallery', `${rel}gallery/index.html`)}${link('guide', 'Guide', `${rel}guide/index.html`)}${link('', 'GitHub', REPO)}</nav></div></header>`;
}

function siteFoot() {
  return `<footer class="site-foot"><div class="container"><span>MIT licensed. Needs Node 20 or newer.</span><span><a href="${REPO}">GitHub</a> <a href="${NPM}">npm</a> <a href="${REPO}/blob/main/ARCHITECTURE.md">Architecture</a></span></div></footer>`;
}

function page({ title, description, css, rel, active, body, image, script = '' }) {
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
<style>${pageCss(css)}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${siteNav(rel, active)}
${body}
${siteFoot()}${script ? `\n<script>${script}</script>` : ''}
</body>
</html>
`;
}

// The bar injected into engine-rendered docs keeps its own scoped styles, since a doc loads no site CSS.
function bar(rel, active) {
  const link = (key, label, href, extra = '') => `<a href="${href}"${extra}${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="ld-bar"><a class="brand" href="${rel}index.html">living-docs</a><nav aria-label="Site">${link('gallery', 'Gallery', `${rel}gallery/index.html`)}${link('guide', 'Guide', `${rel}guide/index.html`)}${link('', 'GitHub', REPO, ' class="gh"')}</nav></header>`;
}

const BAR_CSS = `.ld-bar{position:sticky;top:0;z-index:9999;display:flex;align-items:center;gap:24px;padding:0 24px;min-height:48px;background:#060504;border-bottom:1px solid #4a443c;font:500 14px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.ld-bar .brand{color:#ddd5c6;font:700 18px/1 "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;letter-spacing:-.02em;text-decoration:none}
.ld-bar nav{display:flex;gap:4px;margin-left:auto;align-items:center}
.ld-bar nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;color:#aea79b;text-decoration:none}
.ld-bar nav a:hover,.ld-bar nav a[aria-current="page"]{color:#ddd5c6;text-decoration:underline;text-decoration-color:#d1783c;text-underline-offset:.2em}
@media (max-width:560px){.ld-bar{gap:12px;padding:0 16px}.ld-bar nav a{padding:0 8px}.ld-bar .gh{display:none}}
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
  const rows = pages.map((entry, i) => `<li><a href="./${entry.id}.html"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${escapeHtml(entry.title)}</span><span class="d">${escapeHtml(entry.summary)}</span></a></li>`).join('\n');
  write(outDir, 'guide/index.html', page({
    title: 'Guide | living-docs',
    description: 'Guides for the living-docs pipeline, CLI, document model, style tokens, MCP server, and guarantees.',
    css: 'pages',
    rel: '../',
    active: 'guide',
    body: `<main id="main"><section class="container page-head stand"><h1>Guides, rendered by living-docs</h1><p class="lead">Every page here is Markdown in the repository, rendered by the engine.</p></section><section class="container list-section"><ul class="guide-list">\n${rows}\n</ul><p class="note page-foot">For module boundaries and decisions, read <a href="${REPO}/blob/main/ARCHITECTURE.md">ARCHITECTURE.md</a> on GitHub.</p></section></main>`
  }));
  return pages;
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

const FIT = `function fit(){
  document.querySelectorAll('.doc-shot').forEach(function(shot){
    var frame=shot.querySelector('iframe');
    if(frame){frame.style.transform='scale('+(shot.clientWidth/1440)+')'}
  });
}
fit();
window.addEventListener('resize',fit);
if(window.ResizeObserver){document.querySelectorAll('.doc-shot').forEach(function(s){new ResizeObserver(fit).observe(s)})}`;

function galleryIndex(outDir, entries) {
  const rows = entries.map(entry => {
    const kb = Math.round(entry.stats.bytes / 1024);
    return `<section class="doc" data-theme="${entry.theme}" aria-labelledby="doc-${entry.id}">
  <div class="container doc-grid">
    <div class="doc-shot" aria-hidden="true"><iframe src="./${entry.id}.html" title="${escapeHtml(entry.title)}" loading="lazy" scrolling="no" tabindex="-1"></iframe><a href="./${entry.id}.html" tabindex="-1" aria-label="Open ${escapeHtml(entry.title)}"></a></div>
    <div class="doc-meta">
      <p class="note">${THEME_LABEL[entry.theme]}, ${kb} KB</p>
      <h2 id="doc-${entry.id}">${escapeHtml(entry.title)}</h2>
      <p>${escapeHtml(entry.blurb)}</p>
      <p class="aside"><a href="./${entry.id}.html">Open document<span class="visually-hidden">: ${escapeHtml(entry.title)}</span></a><a href="./${entry.id}.model.json">Model JSON<span class="visually-hidden"> for ${escapeHtml(entry.title)}</span></a></p>
    </div>
  </div>
</section>`;
  }).join('\n');
  write(outDir, 'gallery/index.html', page({
    title: 'Gallery | living-docs',
    description: 'Documents rendered by living-docs: an academic paper, dark reading notes, and a telemetry console.',
    css: 'pages',
    rel: '../',
    active: 'gallery',
    body: `<main id="main"><div class="container"><header class="page-head"><h1>Pages the engine rendered</h1><p class="lead">Each document is a single HTML file, rendered from its JSON model.</p></header></div>\n${rows}</main>`,
    script: FIT
  }));
}

export async function buildSite({ outDir = path.join(root, 'site', 'dist') } = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const entries = buildGallery(outDir);
  galleryIndex(outDir, entries);
  const guide = await buildGuide(outDir);

  buildDemo(outDir);
  write(outDir, 'index.html', page({
    title: 'living-docs: docs that explain themselves',
    description: 'Turn any source into one self-contained page that highlights as it explains, and export the same timeline as MP4, WebM, or GIF. AXI CLI and MCP server.',
    css: 'home',
    rel: './',
    active: '',
    body: homeBody(),
    script: read('site/home.js')
  }));
  fs.cpSync(path.join(root, 'site', 'img'), path.join(outDir, 'img'), { recursive: true });
  write(outDir, '404.html', page({
    title: 'Not found | living-docs',
    description: 'Page not found.',
    css: 'pages',
    rel: SITE_URL,
    active: '',
    body: `<main id="main"><section class="container page-head ledge"><h1>That page is not here</h1><p class="lead">Try the <a href="${SITE_URL}index.html">home page</a>, the <a href="${SITE_URL}gallery/index.html">gallery</a>, or the <a href="${SITE_URL}guide/index.html">guide</a>.</p></section></main>`
  }));

  return { outDir, gallery: entries.length, guide: guide.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildSite();
  console.log(`site built: ${result.gallery} gallery documents, ${result.guide} guide pages -> ${path.relative(process.cwd(), result.outDir)}`);
}
