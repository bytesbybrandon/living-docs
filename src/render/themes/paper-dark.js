import { escapeHtml, renderInline } from '../html.js';

export const palette = {
  bg: '#0a0908',
  surface: '#111010',
  ink: '#ddd5c6',
  muted: '#948c7f',
  hair: '#332e28',
  rule: '#ddd5c6',
  accent: '#d1783c',
  accentSoft: '#2a1c12',
  box: '#0f0e0d',
  boxStroke: '#5f584d'
};

const CSS = `
:root{
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","Times New Roman",serif;
  --sans:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  --mono:"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
*,*::before,*::after{box-sizing:border-box}
html{background:#0a0908}
body{margin:0;background:#0a0908;color:#ddd5c6;font-family:var(--serif);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.sheet{max-width:1140px;margin:0 auto;padding:22px 44px 26px;border-top:1px solid #4a443c}
.runhead{display:flex;justify-content:space-between;gap:20px;font-family:var(--sans);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#8d8578;padding-bottom:8px;border-bottom:1px solid #2a2621}
.masthead{text-align:center;margin:34px auto 24px;max-width:900px}
.doc-title{font-size:clamp(34px,5.2vw,60px);line-height:1.02;letter-spacing:-.015em;font-weight:700;margin:0 0 14px}
.doc-subtitle{font-style:italic;font-size:clamp(16px,1.8vw,21px);line-height:1.35;margin:0 auto 18px;max-width:720px;color:#cdc5b6}
.doc-author{font-size:13px;color:#a49b8d;margin:0 0 4px}
.doc-affil{font-size:11px;color:#8d8578;margin:0}
.doc-date{font-size:11px;color:#8d8578;margin:10px 0 0;letter-spacing:.06em}
.abstract{max-width:880px;margin:0 auto 12px;font-size:14px;line-height:1.62;text-align:justify;hyphens:auto;padding-left:34px}
.abstract .run-in{font-style:italic;font-weight:600}
.abstract .terms{font-size:11.5px;color:#b1a89a;margin-top:6px}
.abstract .terms em{color:#ddd5c6}
.columns{column-count:2;column-gap:46px;font-size:14.2px;line-height:1.62;text-align:justify;hyphens:auto;margin-top:18px}
p.prose{margin:0 0 .72em}
p.prose.lead::first-letter{float:left;font-size:52px;line-height:.76;padding:6px 8px 0 0;font-weight:700;color:#e5ded0}
h2.sec-head{display:flex;gap:10px;align-items:baseline;font-family:var(--sans);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#b6ada0;border-top:1px solid #4a443c;padding-top:8px;margin:22px 0 9px;break-after:avoid}
.sec-num{color:#ddd5c6;font-variant-numeric:tabular-nums}
h3.sub-head{font-size:14px;font-weight:600;margin:15px 0 5px;break-after:avoid}
.sec-subtitle{font-style:italic;font-size:12.5px;color:#948c7f;margin:-4px 0 8px}
.fig{margin:16px 0;break-inside:avoid}
.fig-frame svg,.fig-frame img{display:block;width:100%;height:auto}
figcaption{font-family:var(--sans);font-size:10.4px;line-height:1.5;color:#a49b8d;margin-top:7px}
.fig-num,.tbl-num{color:#ddd5c6;font-weight:600}
.tbl{margin:16px 0;break-inside:avoid}
.tbl figcaption{font-family:var(--sans);font-size:10.2px;letter-spacing:.08em;text-transform:uppercase;color:#948c7f;text-align:right;margin:0 0 6px}
table{width:100%;border-collapse:collapse;font-size:11.6px;line-height:1.5}
thead th{font-family:var(--sans);font-variant:small-caps;letter-spacing:.08em;font-weight:500;color:#bcb3a5;text-align:left;border-top:1px solid #6a6256;border-bottom:1px solid #6a6256;padding:5px 6px}
tbody td{padding:5px 6px;vertical-align:top;color:#cfc7b8}
tbody tr:last-child td{border-bottom:1px solid #6a6256}
.t-right{text-align:right}.t-center{text-align:center}
.algo{border:1px solid #4a4239;background:#0d0c0b;margin:16px 0;break-inside:avoid}
.algo-head{display:flex;gap:8px;align-items:baseline;font-family:var(--sans);font-size:10.5px;color:#b6ada0;padding:7px 11px;border-bottom:1px solid #332e28}
.algo-num{color:#ddd5c6;font-weight:600}
.algo-caption{font-style:italic;font-family:var(--serif);font-size:11.5px;color:#a49b8d;padding:6px 11px 0}
.algo-body{padding:8px 11px 10px;font-family:var(--mono);font-size:10.2px;line-height:1.6;color:#c4bbac}
.algo-line{display:flex;gap:10px;padding:1px 4px;align-items:flex-start}
.algo-text{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
.algo-line.is-highlight{background:#1b1611;color:#e7dfd0}
.algo-ln{color:#6a6256;min-width:12px;text-align:right;user-select:none}
.algo-comment{color:#8d8578;font-style:italic}
.callout{border:1px dashed #b06a38;background:#120f0d;padding:12px 16px;margin:18px 0;break-inside:avoid}
.callout-title{font-family:var(--sans);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#d1783c;margin-bottom:5px}
.callout-body{font-size:14px;line-height:1.55;color:#d8cdb9}
.callout-takeaway{border-color:#c97840}
.callout-takeaway .callout-body{font-style:italic;font-size:16px;color:#dfa074}
.callout-note{border-color:#5f584d;background:#100f0e}
.callout-note .callout-title{color:#a49b8d}
.callout-warn{border-color:#c04a32;background:#150e0c}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin:18px 0;break-inside:avoid}
.stat{border-top:1px solid #4a443c;padding-top:7px;display:flex;flex-direction:column;gap:3px}
.stat-value{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;color:#e5ded0}
.stat-label{font-family:var(--sans);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#948c7f}
.stat-note{font-size:10px;color:#8d8578}
.stats-caption{font-family:var(--sans);font-size:10px;color:#8d8578;margin:-10px 0 16px}
.doc-list{margin:0 0 .85em;padding-left:18px}
.doc-list li{margin:0 0 .3em}
.list-dash{list-style:none;padding-left:0}
.list-dash li::before{content:'—';margin-right:9px;color:#b06a38}
.quote{margin:16px 0;padding:0 0 0 16px;border-left:1px solid #b06a38}
.quote p{margin:0 0 5px;font-style:italic;color:#d8cdb9}
.quote cite{font-family:var(--sans);font-size:9.5px;letter-spacing:.06em;color:#8d8578}
.code-block{margin:16px 0;break-inside:avoid}
.code-block pre{margin:0;background:#0d0c0b;border:1px solid #332e28;padding:10px 12px;overflow-x:auto;font-family:var(--mono);font-size:10.4px;line-height:1.6;color:#c4bbac}
.code-lang{font-family:var(--sans);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8d8578}
.footnotes{border-top:1px solid #332e28;margin-top:26px;padding-top:10px;font-size:9.8px;line-height:1.5;column-count:2;column-gap:40px;color:#a49b8d}
.footnotes ol{margin:0;padding-left:14px}
.footnotes li{margin-bottom:5px}
.fn-ref{font-size:.72em;vertical-align:super;line-height:0;color:#d1783c}
.ticker{font-family:var(--mono);font-size:10.5px;color:#8d8578;border-top:1px solid #332e28;border-bottom:1px solid #332e28;padding:5px 0;margin:14px 0}
.span-page{column-span:all}
.doc-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #332e28;margin-top:30px;padding-top:8px;font-family:var(--sans);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
/* console blocks degrade to annotated cards */
.panel-grid{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:1px;background:#2a2621;column-span:all;margin:18px 0;border:1px solid #2a2621}
.panel{background:#0c0b0a;padding:11px 12px 13px;font-family:var(--sans);min-width:0}
.panel-head{display:flex;gap:6px;align-items:baseline;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#8d8578}
.panel-index{color:#ddd5c6;font-weight:600}
.panel-title{flex:1;color:#a49b8d}
.panel-tag{color:#6a6256}
.panel-body{margin-top:8px;font-size:10.2px;line-height:1.45;color:#c4bbac}
.p-repo-name{font-size:16px;font-weight:600;font-family:var(--serif);color:#e5ded0;line-height:1.2}
.p-owner,.p-by{color:#8d8578;font-size:9px}
.p-stars{color:#dfa074;font-size:11px;margin-top:3px;font-weight:600}
.p-note{color:#a49b8d;margin:4px 0 0}
.p-bar{display:grid;grid-template-columns:34px 1fr 46px;gap:6px;align-items:center;margin-top:4px}
.p-bar-label{font-size:8.5px;letter-spacing:.08em;color:#8d8578}
.p-bar-track{height:4px;background:#241f1a;display:block}
.p-bar-track i{display:block;height:100%;background:#6a6256}
.p-bar.is-active .p-bar-track i{background:#d1783c}
.p-bar.is-active .p-bar-label{color:#e7dfd0}
.p-bar-value{text-align:right;font-size:9px;font-variant-numeric:tabular-nums;color:#c4bbac}
.p-list-title{font-weight:600;font-size:11px;color:#e5ded0}
.p-rows{display:grid;grid-template-columns:58px 1fr;gap:3px 7px;margin:6px 0 0}
.p-rows dt{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
.p-rows dd{margin:0;font-size:10px;color:#c4bbac}
.p-foot{color:#8d8578;font-size:8.5px;margin-top:7px;border-top:1px solid #241f1a;padding-top:4px}
.p-radar{display:flex;gap:10px;align-items:center}
.p-radar .radar{width:80px;height:80px}
.p-radar-meta{display:flex;flex-direction:column;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
.p-radar-meta b{font-size:16px;color:#e5ded0;letter-spacing:0}
.p-tree-root{color:#8d8578;font-size:8.5px;margin-bottom:4px}
.p-tree{list-style:none;margin:0;padding:0}
.p-tree li{display:flex;justify-content:space-between;gap:8px;padding:2px 0;font-size:9.5px;border-bottom:1px solid #1c1916}
.p-tree li.is-active{background:#17130f;border-left:2px solid #d1783c;padding-left:5px;color:#e7dfd0}
.p-tree .t-tag{color:#6a6256;font-size:8px}
.p-log{list-style:none;margin:0;padding:0;font-size:9.2px}
.p-log li{display:flex;gap:6px;padding:1px 0}
.p-log .l-n{color:#6a6256;min-width:14px;text-align:right}
.p-log .l-verb{color:#d1783c}
.p-log .l-text{flex:1;color:#b8af9f}
.p-heat{margin-top:2px}
.p-heat .h-row{display:grid;grid-template-columns:32px repeat(var(--heat-cols,6),1fr);gap:2px;align-items:center;margin-bottom:2px}
.p-heat .h-head span{font-size:7px;color:#8d8578;text-align:center;letter-spacing:.04em}
.p-heat .h-label{font-size:7.5px;color:#8d8578}
.p-heat .h-cell{height:8px;background:#241f1a;display:block}
.p-heat .h-cell.is-on{background:#d1783c}
.p-big{font-size:30px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:#e5ded0}
.p-spark .spark{width:100%;height:42px}
.p-legend{display:flex;gap:9px;margin-top:5px;font-size:8px;letter-spacing:.08em;color:#8d8578}
.p-legend-item::before{content:'';display:inline-block;width:6px;height:6px;margin-right:3px;background:#6a6256}
.p-legend-item.tone-1::before{background:#d1783c}
.p-legend-item.tone-2::before{background:#8a9a8a}
.p-code-head{display:flex;justify-content:space-between;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
.p-code{margin:3px 0 0;font-family:var(--mono);font-size:8.4px;line-height:1.55;white-space:pre-wrap;color:#a49b8d}
.p-hist{display:flex;align-items:flex-end;gap:2px;height:54px;margin-top:2px}
.p-hist i{flex:1;background:#332e28;display:block}
.p-hist i:nth-last-child(-n+3){background:#d1783c}
.p-hist-meta{display:flex;justify-content:space-between;font-size:9px;color:#8d8578;margin-top:5px}
.p-hist-meta b{font-size:11px;color:#e5ded0}
.p-metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.p-metric{display:flex;flex-direction:column}
.p-metric span{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
.p-metric b{font-size:15px;color:#e5ded0;font-variant-numeric:tabular-nums}
.p-metric em{font-size:7.5px;color:#8d8578;font-style:normal}
.p-diff-head{font-size:8px;color:#8d8578;letter-spacing:.08em}
.p-diff{font-family:var(--mono);font-size:8.2px;line-height:1.55;margin:3px 0 0;white-space:pre-wrap}
.p-diff .d-add{color:#7fa07a}
.p-diff .d-del{color:#c0785a}
.scene-fallback{border:1px solid #332e28;background:#0c0b0a;padding:16px 18px;margin:18px 0;column-span:all}
.fb-title{font-family:var(--sans);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b6ada0}
.fb-meta{display:flex;gap:12px;flex-wrap:wrap;font-family:var(--mono);font-size:9px;color:#8d8578;margin-top:6px}
.fb-tabs{display:flex;gap:14px;font-family:var(--sans);font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#8d8578;border-top:1px solid #332e28;border-bottom:1px solid #332e28;padding:6px 0;margin:12px 0}
.fb-tab.is-active{color:#ddd5c6}
.fb-command{font-family:var(--mono);font-size:10px;background:#141210;padding:6px 9px;color:#a49b8d}
.fb-prompt{color:#d1783c}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px}
.fb-label{font-family:var(--sans);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#8d8578;margin-bottom:5px}
.fb-labels{margin:0;padding-left:14px;font-size:10px;color:#a49b8d}
.fb-card{border:1px solid #332e28;background:#111010;padding:11px 12px}
.fb-card-title{font-family:var(--sans);font-size:11px;color:#e5ded0}
.fb-rows{display:grid;grid-template-columns:60px 1fr;gap:3px 8px;margin:7px 0 0}
.fb-rows dt{font-family:var(--sans);font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#8d8578}
.fb-rows dd{margin:0;font-size:10px;color:#c4bbac}
.fb-card-foot{font-family:var(--sans);font-size:8px;letter-spacing:.12em;text-align:right;color:#8d8578;margin-top:7px}
@media (max-width:860px){
  .sheet{padding:18px 20px 22px}
  .columns{column-count:1;font-size:13.4px}
  .abstract{padding-left:0}
  .runhead{font-size:8.5px}
  .panel-grid{grid-template-columns:1fr 1fr}
  .fb-grid{grid-template-columns:1fr}
  .footnotes{column-count:1}
}
@media print{
  @page{size:letter;margin:15mm}
  html,body{background:#0a0908}
  .sheet{padding:0;max-width:none}
  .columns{font-size:9.6pt;line-height:1.5}
  .fig,.tbl,.algo,.callout,.stats,.code-block,.panel-grid,.scene-fallback{break-inside:avoid}
}
`;

function runhead(model) {
  const meta = model.meta;
  const left = meta.kicker || `Reading notes · ${meta.title}`;
  const right = meta.runningHead || (meta.date ? `Living docs · ${meta.date}` : 'Living docs');
  return `<div class="runhead"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>`;
}

function masthead(model) {
  const meta = model.meta;
  return `<header class="masthead">
    <h1 class="doc-title">${renderInline(meta.title)}</h1>
    ${meta.subtitle ? `<p class="doc-subtitle">${renderInline(meta.subtitle)}</p>` : ''}
    ${meta.author ? `<p class="doc-author">${renderInline(meta.author)}</p>` : ''}
    ${meta.affiliation ? `<p class="doc-affil">${renderInline(meta.affiliation)}</p>` : ''}
    ${meta.date ? `<p class="doc-date">${escapeHtml(meta.date)}</p>` : ''}
  </header>`;
}

function abstractBlock(model) {
  const meta = model.meta;
  if (!meta.abstract) return '';
  const terms = (meta.indexTerms || []).length
    ? `<p class="terms"><em>Index terms:</em> ${meta.indexTerms.map(term => escapeHtml(term)).join(', ')}</p>`
    : '';
  return `<section class="abstract"><p><span class="run-in">Abstract.</span> ${renderInline(meta.abstract)}</p>${terms}</section>`;
}

export function document({ model, blocksHtml }) {
  const meta = model.meta;
  const foot = `<footer class="doc-foot">
    <span>${escapeHtml(meta.title)}</span>
    <span>1</span>
    <span>${escapeHtml(meta.footer || 'living-docs')}</span>
  </footer>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="living-docs">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(meta.title)}</title>
<style>${CSS}</style>
</head>
<body class="theme-paper-dark">
<div class="sheet">
  ${runhead(model)}
  ${masthead(model)}
  ${abstractBlock(model)}
  <main class="columns">
    ${blocksHtml}
  </main>
  ${foot}
</div>
</body>
</html>`;
}
