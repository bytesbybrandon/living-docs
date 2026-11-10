import { escapeHtml, renderInline } from '../html.js';
import { styleCss } from '../style.js';

export const palette = {
  bg: '#ffffff',
  surface: '#fbfaf7',
  ink: '#1a1a1a',
  muted: '#5b554c',
  hair: '#d9d3c7',
  rule: '#1a1a1a',
  accent: '#b4532a',
  accentSoft: '#f6e7dc',
  box: '#f5f2ec',
  boxStroke: '#9c9484'
};

const CSS = `
:root{
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","Times New Roman",serif;
  --sans:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  --mono:"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
*,*::before,*::after{box-sizing:border-box}
html{background:#e7e4dc}
body{margin:0;background:#e7e4dc;color:#1a1a1a;font-family:var(--serif);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.sheet{position:relative;max-width:1040px;margin:32px auto;background:#fff;padding:52px 62px 34px;border:1px solid #ddd8cd;box-shadow:0 22px 60px rgba(28,24,18,.13)}
.masthead{text-align:center;max-width:880px;margin:0 auto 22px}
.doc-title{font-family:var(--serif);font-weight:700;font-size:clamp(30px,4.4vw,46px);line-height:1.08;letter-spacing:-.012em;margin:0 0 12px}
.doc-subtitle{font-family:var(--serif);font-size:clamp(15px,1.6vw,20px);line-height:1.35;margin:0 auto 24px;max-width:720px;color:#242424}
.doc-author{font-size:16.5px;margin:0 0 10px}
.doc-affil{font-size:12.5px;line-height:1.5;color:#4e4a44;margin:0}
.doc-date{font-size:12.5px;color:#3c3934;margin:12px 0 0}
.margin-stamp{position:absolute;left:7px;top:110px;writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--mono);font-size:9px;letter-spacing:.05em;color:#8b857b;max-height:430px;overflow:hidden}
.abstract{border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;padding:13px 0 11px;margin:0 0 26px;font-size:13.4px;line-height:1.55;text-align:justify;hyphens:auto}
.abstract h2{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;text-align:center;margin:0 0 8px}
.abstract p{margin:0 0 8px}
.abstract .run-in{font-weight:700}
.abstract .terms{font-size:11.6px;margin:7px 0 0;font-style:italic}
.columns{column-count:2;column-gap:34px;font-size:13.6px;line-height:1.55;text-align:justify;hyphens:auto}
p.prose{margin:0 0 .68em}
p.prose.lead::first-letter{float:left;font-size:48px;line-height:.78;padding:5px 7px 0 0;font-weight:700}
h2.sec-head{display:flex;gap:10px;align-items:baseline;font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;border-top:1px solid #1a1a1a;padding-top:7px;margin:20px 0 8px;break-after:avoid}
.sec-num{font-variant-numeric:tabular-nums;color:#1a1a1a}
h3.sub-head{font-size:13.5px;font-weight:700;margin:14px 0 5px;break-after:avoid}
.sec-subtitle{font-size:12px;color:#555;margin:-4px 0 8px}
.fig{margin:14px 0;break-inside:avoid}
.fig-frame svg,.fig-frame img{display:block;width:100%;height:auto}
figcaption{font-family:var(--sans);font-size:10.2px;line-height:1.45;color:#3a3630;margin-top:6px}
.fig-num,.tbl-num{font-weight:700}
.tbl{margin:14px 0;break-inside:avoid}
.tbl figcaption{font-family:var(--sans);font-size:10.2px;line-height:1.4;margin:0 0 5px;color:#3a3630}
table{width:100%;border-collapse:collapse;font-size:11px;line-height:1.4}
thead th{font-family:var(--sans);font-variant:small-caps;letter-spacing:.07em;font-weight:600;text-align:left;border-top:1.4px solid #1a1a1a;border-bottom:1px solid #1a1a1a;padding:5px}
tbody td{padding:4.5px 5px;vertical-align:top}
tbody tr:last-child td{border-bottom:1.4px solid #1a1a1a}
.t-right{text-align:right}.t-center{text-align:center}
.algo{border:1px solid #bdb5a8;background:#faf8f4;margin:14px 0;break-inside:avoid}
.algo-head{display:flex;gap:8px;align-items:baseline;font-family:var(--sans);font-size:10.5px;padding:6px 10px;border-bottom:1px solid #e2dbcf}
.algo-num{font-weight:700}
.algo-caption{font-family:var(--sans);font-size:9.8px;color:#5b554c;padding:5px 10px 0}
.algo-body{padding:7px 10px 9px;font-family:var(--mono);font-size:10px;line-height:1.55}
.algo-line{display:flex;gap:9px;padding:1px 4px;align-items:flex-start}
.algo-text{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
.algo-line.is-highlight{background:#f3e8d8}
.algo-ln{color:#9a9387;min-width:12px;text-align:right;user-select:none}
.algo-comment{color:#7c7466;font-style:italic}
.callout{border:1px solid #b4532a;background:#fdf7f1;padding:10px 14px;margin:14px 0;break-inside:avoid}
.callout-title{font-family:var(--sans);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin-bottom:4px}
.callout-body{font-size:13px;line-height:1.5}
.callout-note{border-color:#8a8a8a;background:#f7f7f5}
.callout-warn{border-color:#a03a2a;background:#fbf0ed}
.callout-takeaway .callout-body{font-style:italic;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:16px 0;break-inside:avoid}
.stat{border-top:1px solid #1a1a1a;padding-top:6px;display:flex;flex-direction:column;gap:2px}
.stat-value{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.stat-label{font-family:var(--sans);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#4f4a43}
.stat-note{font-size:10px;color:#6a645c}
.stats-caption{font-family:var(--sans);font-size:10px;color:#5b554c;margin:-8px 0 14px}
.doc-list{margin:0 0 .8em;padding-left:18px;font-size:13.2px}
.doc-list li{margin:0 0 .25em}
.list-dash{list-style:none;padding-left:0}
.list-dash li::before{content:'—';margin-right:8px;color:#8a6a4a}
.quote{margin:14px 0;padding:0 0 0 14px;border-left:2px solid #b4532a}
.quote p{margin:0 0 4px;font-style:italic}
.quote cite{font-family:var(--sans);font-size:10px;color:#5b554c}
.code-block{margin:14px 0;break-inside:avoid}
.code-block pre{margin:0;background:#f6f3ed;border:1px solid #ddd5c7;padding:9px 11px;overflow-x:auto;font-family:var(--mono);font-size:10.2px;line-height:1.55}
.code-lang{font-family:var(--sans);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#6a645c}
.footnotes{border-top:1px solid #1a1a1a;margin-top:22px;padding-top:8px;font-size:9.6px;line-height:1.45;column-count:2;column-gap:30px}
.footnotes ol{margin:0;padding-left:14px}
.footnotes li{margin-bottom:4px}
.fn-ref{font-size:.72em;vertical-align:super;line-height:0}
.ticker{display:none}
.span-page{column-span:all}
.doc-foot{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1a1a1a;margin-top:26px;padding-top:7px;font-family:var(--sans);font-size:9.5px;color:#5b554c;letter-spacing:.05em}
/* console blocks degrade to annotated cards */
.panel-grid{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:12px;column-span:all;margin:16px 0}
.panel{border-top:2px solid #1a1a1a;padding-top:6px;font-family:var(--sans);min-width:0}
.panel-head{display:flex;gap:6px;align-items:baseline;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#4f4a43}
.panel-index{font-weight:700}
.panel-title{flex:1}
.panel-tag{color:#7a7369}
.panel-body{margin-top:7px;font-size:10.5px;line-height:1.45}
.p-repo-name{font-size:15px;font-weight:700;font-family:var(--serif);line-height:1.2}
.p-owner,.p-by{color:#6a645c;font-size:9.5px}
.p-stars{color:#b4532a;font-size:11px;font-weight:600;margin-top:3px}
.p-note{color:#4f4a43;margin:4px 0 0}
.p-bar{display:grid;grid-template-columns:34px 1fr 48px;gap:5px;align-items:center;margin-top:3px}
.p-bar-track{height:4px;background:#eee9df;display:block}
.p-bar-track i{display:block;height:100%;background:#3c3830}
.p-bar.is-active .p-bar-track i{background:#b4532a}
.p-bar-value{text-align:right;font-size:9.5px}
.p-list-title{font-weight:700;font-size:11.5px}
.p-rows{display:grid;grid-template-columns:56px 1fr;margin:5px 0 0;gap:2px 6px}
.p-rows dt{color:#7a7369;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase}
.p-rows dd{margin:0;font-size:10px}
.p-foot{color:#7a7369;font-size:9px;margin-top:6px}
.p-radar{display:flex;gap:8px;align-items:center}
.p-radar .radar{width:76px;height:76px}
.p-radar-meta{display:flex;flex-direction:column;font-size:8.5px;color:#7a7369;text-transform:uppercase;letter-spacing:.08em}
.p-radar-meta b{font-size:14px;color:#1a1a1a;letter-spacing:0}
.p-tree-root{color:#7a7369;font-size:9px;margin-bottom:4px}
.p-tree{list-style:none;margin:0;padding:0}
.p-tree li{display:flex;justify-content:space-between;gap:8px;padding:2px 0;font-size:10px;border-bottom:1px solid #f0ece3}
.p-tree li.is-active{background:#f6e7dc;padding-left:4px}
.p-tree .t-tag{color:#8a857c;font-size:8.5px}
.p-log{list-style:none;margin:0;padding:0;font-size:9.5px}
.p-log li{display:flex;gap:6px;padding:1px 0}
.p-log .l-n{color:#9a9387;min-width:14px;text-align:right}
.p-log .l-verb{color:#b4532a}
.p-log .l-text{flex:1}
.p-heat{margin-top:2px}
.p-heat .h-row{display:grid;grid-template-columns:34px repeat(var(--heat-cols,6),1fr);gap:2px;align-items:center;margin-bottom:2px}
.p-heat .h-head span{font-size:7.5px;color:#7a7369;text-align:center;letter-spacing:.04em}
.p-heat .h-label{font-size:8px;color:#7a7369}
.p-heat .h-cell{height:8px;background:#eee9df;display:block}
.p-heat .h-cell.is-on{background:#3c3830}
.p-big{font-size:26px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.p-spark .spark{width:100%;height:40px}
.p-legend{display:flex;gap:8px;margin-top:4px;font-size:8.5px;color:#4f4a43}
.p-legend-item::before{content:'';display:inline-block;width:6px;height:6px;margin-right:3px;background:#3c3830}
.p-legend-item.tone-1::before{background:#b4532a}
.p-legend-item.tone-2::before{background:#8a9a8a}
.p-code-head{display:flex;justify-content:space-between;font-size:8px;color:#7a7369;letter-spacing:.08em;text-transform:uppercase}
.p-code{margin:3px 0 0;font-family:var(--mono);font-size:8.6px;line-height:1.5;white-space:pre-wrap;color:#3c3830}
.p-hist{display:flex;align-items:flex-end;gap:2px;height:52px;margin-top:2px}
.p-hist i{flex:1;background:#cfc7b9;display:block}
.p-hist i:nth-last-child(-n+3){background:#3c3830}
.p-hist-meta{display:flex;justify-content:space-between;font-size:9px;color:#7a7369;margin-top:4px}
.p-hist-meta b{font-size:11px;color:#1a1a1a}
.p-metrics{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.p-metric{display:flex;flex-direction:column}
.p-metric span{font-size:7.5px;letter-spacing:.08em;text-transform:uppercase;color:#7a7369}
.p-metric b{font-size:14px;font-variant-numeric:tabular-nums}
.p-metric em{font-size:8px;color:#7a7369;font-style:normal}
.p-diff-head{font-size:8.5px;color:#7a7369;letter-spacing:.06em}
.p-diff{font-family:var(--mono);font-size:8.4px;line-height:1.5;margin:3px 0 0;white-space:pre-wrap}
.p-diff .d-add{color:#2f6b3c}
.p-diff .d-del{color:#a03a2a}
.scene-fallback{border:1px solid #d9d3c7;background:#fbfaf7;padding:14px 16px;margin:16px 0;column-span:all}
.fb-title{font-family:var(--sans);font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700}
.fb-meta{display:flex;gap:10px;flex-wrap:wrap;font-family:var(--mono);font-size:9px;color:#5b554c;margin-top:5px}
.fb-tabs{display:flex;gap:12px;font-family:var(--sans);font-size:9px;letter-spacing:.1em;text-transform:uppercase;border-top:1px solid #d9d3c7;border-bottom:1px solid #d9d3c7;padding:5px 0;margin:10px 0}
.fb-tab.is-active{font-weight:700}
.fb-command{font-family:var(--mono);font-size:10px;background:#f3efe7;padding:5px 8px}
.fb-prompt{color:#b4532a}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.fb-label{font-family:var(--sans);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#7a7369;margin-bottom:4px}
.fb-labels{margin:0;padding-left:14px;font-size:10px}
.fb-card{border:1px solid #d9d3c7;background:#fff;padding:10px}
.fb-card-title{font-family:var(--sans);font-weight:700;font-size:11px}
.fb-rows{display:grid;grid-template-columns:56px 1fr;gap:2px 6px;margin:6px 0 0}
.fb-rows dt{font-family:var(--sans);font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#7a7369}
.fb-rows dd{margin:0;font-size:10px}
.fb-card-foot{font-family:var(--sans);font-size:8.5px;letter-spacing:.1em;text-align:right;color:#7a7369;margin-top:6px}
@media (max-width:820px){
  .sheet{margin:0;padding:26px 20px;border:0;box-shadow:none}
  .columns{column-count:1}
  .abstract{font-size:13px}
  .margin-stamp{display:none}
  .panel-grid{grid-template-columns:1fr 1fr}
  .fb-grid{grid-template-columns:1fr}
  .footnotes{column-count:1}
}
@media print{
  @page{size:letter;margin:15mm}
  html,body{background:#fff}
  .sheet{margin:0;max-width:none;border:0;box-shadow:none;padding:0}
  .margin-stamp{display:none}
  .columns{font-size:10pt;line-height:1.45}
  .fig,.tbl,.algo,.callout,.stats,.code-block,.panel-grid,.scene-fallback{break-inside:avoid}
  .doc-foot{border-top:1px solid #000}
  a{color:inherit;text-decoration:none}
}
`;

function masthead(model) {
  const meta = model.meta;
  return `<header class="masthead">
    <h1 class="doc-title">${renderInline(meta.title)}</h1>
    ${meta.subtitle ? `<p class="doc-subtitle">${renderInline(meta.subtitle)}</p>` : ''}
    ${meta.author ? `<p class="doc-author">${renderInline(meta.author)}</p>` : ''}
    ${meta.affiliation ? `<p class="doc-affil">${renderInline(meta.affiliation)}</p>` : ''}
    ${meta.date ? `<p class="doc-date">${renderInline(meta.date)}</p>` : ''}
  </header>`;
}

function abstractBlock(model) {
  const meta = model.meta;
  if (!meta.abstract) return '';
  const terms = (meta.indexTerms || []).length
    ? `<p class="terms"><em>Index Terms</em>—${meta.indexTerms.map(term => escapeHtml(term)).join(', ')}</p>`
    : '';
  return `<section class="abstract">
    <h2>Abstract</h2>
    <p><span class="run-in">Abstract.</span> ${renderInline(meta.abstract)}</p>
    ${terms}
  </section>`;
}

export function document({ model, ctx, blocksHtml, palette, style }) {
  const meta = model.meta;
  const stamp = (meta.stamps || []).length
    ? `<div class="margin-stamp">${escapeHtml(meta.stamps.join('   '))}</div>`
    : '';
  const footer = `<footer class="doc-foot">
    <span>${escapeHtml(meta.runningHead || meta.kicker || meta.title)}</span>
    <span>1</span>
    <span>${escapeHtml(meta.footer || 'living-docs')}</span>
  </footer>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="living-docs">
<title>${escapeHtml(meta.title)}</title>
<style>${CSS}</style>
<style>${styleCss('paper-light', palette, style)}</style>
</head>
<body class="theme-paper-light ${style.className}">
<div class="sheet">
  ${stamp}
  ${masthead(model)}
  ${abstractBlock(model)}
  <main class="columns">
    ${blocksHtml}
  </main>
  ${footer}
</div>
</body>
</html>`;
}
