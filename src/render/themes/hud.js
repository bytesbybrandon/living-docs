import { escapeHtml } from '../html.js';
import { styleCss } from '../style.js';

export const palette = {
  bg: '#04070d',
  surface: '#050a12',
  ink: '#cfe3ee',
  muted: '#6f8f9f',
  hair: '#0e1f2a',
  rule: '#1d3b4a',
  accent: '#5ec8e5',
  accentSoft: '#06222e',
  box: '#07121a',
  boxStroke: '#2a5568'
};

const CSS = `
:root{
  --mono:"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace;
  --sans:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  --bg:#04070d;--panel:#050a12;--ink:#cfe3ee;--dim:#6f8f9f;--hair:#0e1f2a;--line:#1a3644;--accent:#5ec8e5;--accent-2:#2b8aa8;--good:#7fd49a;--warn:#e0a04a;--bad:#e08080;
}
*,*::before,*::after{box-sizing:border-box}
html{background:#020409}
body{margin:0;background:#020409;color:var(--ink);font-family:var(--mono);font-size:12px;line-height:1.55;-webkit-font-smoothing:antialiased}
.hud{max-width:1480px;margin:18px auto 40px;padding:0 22px 18px;border:1px solid rgba(94,200,229,.1);background:linear-gradient(180deg,rgba(6,16,26,.55),rgba(2,5,9,0) 40%),#03060b;box-shadow:0 0 60px rgba(0,0,0,.7)}
.hud-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:14px 0 10px;border-bottom:1px solid #0e1f2a}
.brand-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex:1}
.brand{font-size:clamp(15px,1.55vw,19px);letter-spacing:.15em;font-weight:600;margin:0;color:#dff3fc;text-transform:uppercase}
.live{display:flex;gap:10px;align-items:center;font-size:9.5px;letter-spacing:.14em;color:#7fa6b8;white-space:nowrap}
.live .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px rgba(94,200,229,.9);animation:pulse 2.4s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.meta-row{display:flex;flex-wrap:wrap;gap:7px;align-items:center;padding-top:4px;font-size:9px;letter-spacing:.12em;color:var(--dim);text-transform:uppercase}
.meta-row .sep{color:#2b4754}
.hud-head .date{font-size:9px;letter-spacing:.12em;color:#54727f;text-transform:uppercase;white-space:nowrap}
.tabs{display:flex;gap:26px;padding:0;border-top:1px solid #0e1f2a;border-bottom:1px solid #0e1f2a;margin-top:12px}
.tab{font-size:10px;letter-spacing:.14em;color:#54727f;text-transform:uppercase;padding:9px 0;display:flex;gap:6px;align-items:center;white-space:nowrap}
.tab.is-active{color:#dff3fc;border-bottom:1px solid var(--accent);margin-bottom:-1px}
.tab-dot{width:4px;height:4px;border-radius:50%;background:var(--accent)}
.cmdline{margin:12px 0 0;border:1px solid var(--line);background:#061019;padding:7px 10px;font-size:10.5px;color:#8fb4c4;letter-spacing:.04em}
.cmdline .prompt{color:var(--accent);margin-right:6px}
.scene{border:1px solid #12242e;background:#04080e;margin-top:14px;position:relative;overflow:hidden}
.scene-head{padding:14px 16px 0}
.scene-head .brand-row{padding-bottom:6px}
.scene-top{display:flex;justify-content:space-between;padding:12px 16px 6px;font-size:9px;letter-spacing:.12em;color:#5f8090;text-transform:uppercase}
.scene-stage{position:relative;aspect-ratio:16/8.6;min-height:300px;margin-top:2px;background:radial-gradient(ellipse at 55% 45%,rgba(30,90,120,.35),rgba(4,8,14,0) 66%),#03060b}
.scene-canvas{position:absolute;inset:0;width:100%;height:100%}
.scene-label{position:absolute;transform:translate(-50%,-50%);font-size:9.5px;letter-spacing:.04em;color:#7fa6b8;white-space:nowrap;text-shadow:0 0 6px #03060b;pointer-events:none}
.scene-crosshair{position:absolute;transform:translate(-50%,-50%);width:190px;height:190px;border:1px solid rgba(94,200,229,.22);border-radius:50%;pointer-events:none}
.scene-crosshair::before{content:"";position:absolute;left:50%;top:-80px;bottom:-80px;border-left:1px solid rgba(94,200,229,.14)}
.scene-crosshair::after{content:"";position:absolute;top:50%;left:-80px;right:-80px;border-top:1px solid rgba(94,200,229,.14)}
.scene-active-label{position:absolute;transform:translate(16px,-150%);padding:3px 9px;border:1px solid #3a7188;background:rgba(4,10,16,.86);font-size:11.5px;letter-spacing:.05em;color:#e6f7ff;white-space:nowrap}
.scene-badge{position:absolute;transform:translate(16px,-50%);padding:2px 7px;border:1px solid #2a5568;background:#06222e;font-size:9px;letter-spacing:.14em;color:#8fd8ee}
.scene-card{position:absolute;transform:translate(26px,26px);min-width:236px;max-width:310px;border:1px solid #2a5568;background:rgba(4,12,19,.94);padding:12px 13px;font-size:10px;color:#9fc0cf;box-shadow:0 0 34px rgba(0,0,0,.65)}
.sc-card-title{font-size:13.5px;color:#e6f7ff;margin-bottom:8px;letter-spacing:.03em}
.sc-row{display:flex;justify-content:space-between;gap:14px;padding:2px 0;border-bottom:1px solid #0e1f2a}
.sc-row span{color:#5f8090;font-size:8px;letter-spacing:.1em;text-transform:uppercase}
.sc-row b{font-weight:500;color:#b7d4e1}
.sc-card-foot{margin-top:8px;text-align:right;font-size:8.5px;letter-spacing:.14em;color:var(--accent)}
.scene-status{display:flex;gap:10px;align-items:baseline;border-top:1px solid #0e1f2a;padding:7px 16px;font-size:10.5px;color:#7fa6b8;letter-spacing:.04em;flex-wrap:wrap}
.sc-seq{color:var(--accent)}
.sc-kind{color:var(--dim);text-transform:uppercase;font-size:9px;letter-spacing:.12em}
.sc-text{color:#dff3fc}
.sc-tail{color:#54727f;margin-left:auto;font-size:9px;letter-spacing:.1em}
.actionbar{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #12242e;background:#050a12;margin-top:14px;padding:11px 16px;font-size:13px;color:#dff3fc;letter-spacing:.05em}
.ab-right{font-size:8.5px;letter-spacing:.16em;color:#5f8090;text-transform:uppercase}
.panel-grid{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:1px;background:#10222d;border:1px solid #10222d;margin-top:16px}
.panel{position:relative;background:var(--panel);padding:11px 12px 13px;min-height:158px;display:flex;flex-direction:column;gap:9px;min-width:0;overflow:hidden}
.panel::after{content:"";position:absolute;inset:5px;border:1px solid rgba(94,200,229,.05);pointer-events:none}
.panel-head{display:flex;align-items:baseline;gap:7px;font-size:9px;letter-spacing:.14em;color:#5f8090;text-transform:uppercase}
.panel-index{color:#9fc7d8;font-weight:600}
.panel-title{flex:1;color:#9fc7d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.panel-tag{color:#4f6d7c;white-space:nowrap}
.panel-body{flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
.p-owner{color:#5f8090;font-size:10px;display:block}
.p-repo-name{font-size:21px;line-height:1.15;color:#e6f7ff;letter-spacing:-.01em;word-break:break-word}
.p-stars{color:var(--accent);font-size:13px;margin-top:2px}
.p-by{color:#6f8f9f;font-size:9px;margin-top:1px}
.p-note{color:#a9c5d3;font-size:10.5px;margin:6px 0 0;line-height:1.45}
.p-bar{display:grid;grid-template-columns:36px 1fr 54px;gap:7px;align-items:center;padding:1.5px 0}
.p-bar-label{font-size:9px;letter-spacing:.1em;color:#6f8f9f}
.p-bar-track{height:6px;background:#0d1d27;display:block}
.p-bar-track i{display:block;height:100%;background:#3d6577}
.p-bar.is-active .p-bar-track i{background:var(--accent)}
.p-bar.is-active .p-bar-label{color:#dff3fc}
.p-bar-value{text-align:right;font-size:9.5px;color:#a9c5d3;font-variant-numeric:tabular-nums}
.p-list-title{font-size:15px;color:#e6f7ff;letter-spacing:.01em;word-break:break-word}
.p-rows{display:grid;grid-template-columns:62px 1fr;gap:3px 8px;margin:7px 0 0}
.p-rows dt{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090}
.p-rows dd{margin:0;font-size:10px;color:#b7d4e1}
.p-foot{margin-top:8px;padding-top:5px;border-top:1px solid #0e1f2a;font-size:8.5px;letter-spacing:.08em;color:#5f8090;text-transform:uppercase}
.p-radar{display:flex;gap:10px;align-items:center;flex:1}
.p-radar .radar{width:96px;height:96px}
.p-radar-meta{display:flex;flex-direction:column;gap:1px;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090}
.p-radar-meta b{font-size:19px;color:#dff3fc;letter-spacing:0;line-height:1.1}
.p-tree-root{color:#5f8090;font-size:9px;letter-spacing:.06em;margin-bottom:4px;word-break:break-all}
.p-tree{list-style:none;margin:0;padding:0}
.p-tree li{display:flex;justify-content:space-between;gap:8px;padding:2.5px 4px;font-size:9.5px;color:#a9c5d3;border-bottom:1px solid #0a1822}
.p-tree li.is-active{background:#08202c;border-left:2px solid var(--accent);padding-left:6px;color:#e6f7ff}
.p-tree .t-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p-tree .t-tag{color:#4f6d7c;font-size:8px;letter-spacing:.04em}
.p-log{list-style:none;margin:0;padding:0}
.p-log li{display:flex;gap:7px;font-size:9.2px;padding:1px 0}
.p-log .l-n{color:#4f6d7c;min-width:15px;text-align:right}
.p-log .l-verb{color:var(--accent);min-width:44px}
.p-log .l-text{flex:1;color:#a9c5d3;word-break:break-word}
.p-heat{margin-top:2px}
.p-heat .h-row{display:grid;grid-template-columns:34px repeat(var(--heat-cols,6),1fr);gap:2px;align-items:center;margin-bottom:2px}
.p-heat .h-head span{font-size:7px;letter-spacing:.04em;color:#5f8090;text-align:center}
.p-heat .h-label{font-size:7.5px;letter-spacing:.1em;color:#5f8090}
.p-heat .h-cell{height:9px;background:#0d1d27;display:block}
.p-heat .h-cell.is-on{background:var(--accent);box-shadow:0 0 9px rgba(94,200,229,.5)}
.p-big{font-size:38px;line-height:1;color:#dff3fc;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.p-spark{flex:1;display:flex;flex-direction:column;justify-content:center}
.p-spark .spark{width:100%;height:52px;display:block}
.p-legend{display:flex;gap:12px;margin-top:5px;font-size:8px;letter-spacing:.1em;color:#5f8090;text-transform:uppercase}
.p-legend-item::before{content:"";display:inline-block;width:6px;height:6px;margin-right:4px;background:#3d6577}
.p-legend-item.tone-1::before{background:var(--accent)}
.p-legend-item.tone-2::before{background:#7fd49a}
.p-code-head{display:flex;justify-content:space-between;font-size:8px;letter-spacing:.12em;color:#5f8090;text-transform:uppercase}
.p-code{margin:4px 0 0;font-family:var(--mono);font-size:8.8px;line-height:1.6;white-space:pre-wrap;color:#8fb4c4;overflow:hidden}
.p-hist{display:flex;align-items:flex-end;gap:2px;height:70px;margin-top:2px}
.p-hist i{flex:1;background:#1b3b4a;display:block;min-height:4px}
.p-hist i:nth-last-child(-n+3){background:var(--accent)}
.p-hist-meta{display:flex;justify-content:space-between;align-items:baseline;font-size:9px;color:#5f8090;margin-top:6px}
.p-hist-meta b{font-size:13px;color:#dff3fc}
.p-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.p-metric{display:flex;flex-direction:column;gap:1px}
.p-metric span{font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090}
.p-metric b{font-size:17px;color:#dff3fc;font-weight:500;font-variant-numeric:tabular-nums}
.p-metric em{font-size:7.5px;letter-spacing:.08em;color:#4f6d7c;font-style:normal;text-transform:uppercase}
.p-diff-head{font-size:8.5px;letter-spacing:.1em;color:#5f8090}
.p-diff{margin:4px 0 0;font-family:var(--mono);font-size:8.4px;line-height:1.6;white-space:pre-wrap;color:#8fb4c4;overflow:hidden}
.p-diff .d-add{color:var(--good)}
.p-diff .d-del{color:var(--bad)}
.scene-fallback{border:1px solid #12242e;background:#050a12;padding:16px;margin:16px 0}
.fb-title{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b6cdd8}
.fb-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:9px;color:#5f8090;margin-top:6px;text-transform:uppercase;letter-spacing:.1em}
.fb-tabs{display:flex;gap:14px;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090;border-top:1px solid #12242e;border-bottom:1px solid #12242e;padding:6px 0;margin:12px 0}
.fb-tab.is-active{color:#dff3fc}
.fb-command{font-size:10px;background:#061019;padding:6px 9px;color:#8fb4c4}
.fb-prompt{color:var(--accent)}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:12px}
.fb-label{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090;margin-bottom:4px}
.fb-labels{margin:0;padding-left:14px;font-size:10px;color:#a9c5d3}
.fb-card{border:1px solid #2a5568;background:#07121a;padding:11px 12px}
.fb-card-title{font-size:11px;color:#e6f7ff}
.fb-rows{display:grid;grid-template-columns:60px 1fr;gap:3px 8px;margin:7px 0 0}
.fb-rows dt{font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#5f8090}
.fb-rows dd{margin:0;font-size:10px;color:#b7d4e1}
.fb-card-foot{font-size:8px;letter-spacing:.12em;text-align:right;color:var(--accent);margin-top:7px}
.prose{font-family:var(--sans);font-size:13.4px;line-height:1.7;color:#b9d2df;margin:0 0 1em;max-width:82ch}
.prose.lead{font-size:14.4px;color:#c8dee9}
.sec-head{display:flex;gap:10px;align-items:baseline;font-size:10.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#9fc7d8;border-top:1px solid #12242e;padding-top:8px;margin:24px 0 9px;break-after:avoid}
.sec-num{color:var(--accent)}
.sub-head{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9fc7d8;margin:16px 0 6px;break-after:avoid}
.sec-subtitle{font-family:var(--sans);font-size:11.5px;color:#6f8f9f;margin:-3px 0 8px}
.fig{margin:16px 0;border:1px solid #12242e;background:#050a12;padding:10px;break-inside:avoid}
.fig-frame svg,.fig-frame img{display:block;width:100%;height:auto}
figcaption{font-size:9.5px;line-height:1.5;color:#6f8f9f;margin-top:7px;letter-spacing:.03em}
.fig-num,.tbl-num{color:var(--accent)}
.tbl{margin:16px 0;break-inside:avoid}
.tbl figcaption{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#5f8090;margin:0 0 6px;text-align:right}
table{width:100%;border-collapse:collapse;font-size:10.5px;line-height:1.5}
thead th{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6f8f9f;text-align:left;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:5px 6px}
tbody td{padding:5px 6px;color:#b7d4e1;border-bottom:1px solid #0a1822}
.t-right{text-align:right}.t-center{text-align:center}
.algo{border:1px solid #12242e;background:#050a12;margin:16px 0;break-inside:avoid}
.algo-head{display:flex;gap:8px;align-items:baseline;font-size:9.5px;letter-spacing:.12em;color:#6f8f9f;padding:7px 11px;border-bottom:1px solid #0e1f2a;text-transform:uppercase}
.algo-num{color:var(--accent)}
.algo-caption{font-size:10px;color:#6f8f9f;padding:6px 11px 0}
.algo-body{padding:8px 11px 10px;font-size:10px;line-height:1.65;color:#a9c5d3}
.algo-line{display:flex;gap:10px;padding:1px 4px;align-items:flex-start}
.algo-text{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
.algo-line.is-highlight{background:#08202c;color:#e6f7ff}
.algo-ln{color:#4f6d7c;min-width:14px;text-align:right;user-select:none}
.algo-comment{color:#5f8090;font-style:italic}
.callout{border-left:2px solid var(--accent);background:#061019;padding:10px 14px;margin:16px 0;break-inside:avoid}
.callout-title{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}
.callout-body{font-family:var(--sans);font-size:12.5px;line-height:1.6;color:#b9d2df}
.callout-note{border-left-color:#3d6577}
.callout-note .callout-title{color:#7fa6b8}
.callout-warn{border-left-color:var(--warn)}
.callout-warn .callout-title{color:var(--warn)}
.callout-takeaway .callout-body{color:#dff3fc}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:#10222d;border:1px solid #10222d;margin:16px 0;break-inside:avoid}
.stat{background:#050a12;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.stat-value{font-size:23px;color:#dff3fc;line-height:1.1;font-variant-numeric:tabular-nums}
.stat-label{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#5f8090}
.stat-note{font-size:8.5px;color:#4f6d7c;letter-spacing:.06em}
.stats-caption{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#5f8090;margin:-10px 0 14px}
.doc-list{margin:0 0 1em;padding-left:18px;font-family:var(--sans);font-size:12.8px;color:#b9d2df}
.doc-list li{margin:0 0 .3em}
.list-dash{list-style:none;padding-left:0}
.list-dash li::before{content:">";margin-right:9px;color:var(--accent)}
.quote{margin:16px 0;padding:0 0 0 14px;border-left:2px solid var(--accent)}
.quote p{margin:0 0 4px;font-family:var(--sans);font-size:13.5px;font-style:italic;color:#b9d2df}
.quote cite{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#5f8090;font-style:normal}
.code-block{margin:16px 0;break-inside:avoid}
.code-block pre{margin:0;background:#050a12;border:1px solid #12242e;padding:10px 12px;overflow-x:auto;font-size:10px;line-height:1.6;color:#a9c5d3}
.code-lang{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#5f8090}
.footnotes{border-top:1px solid #12242e;margin-top:26px;padding-top:10px;font-size:9.5px;line-height:1.6;column-count:2;column-gap:40px;color:#6f8f9f}
.footnotes ol{margin:0;padding-left:14px}
.footnotes li{margin-bottom:5px}
.fn-ref{font-size:.72em;vertical-align:super;line-height:0;color:var(--accent)}
.ticker{border-top:1px solid #0e1f2a;border-bottom:1px solid #0e1f2a;padding:5px 0;margin:14px 0;font-size:10px;color:#6f8f9f;letter-spacing:.06em}
.span-page{grid-column:1/-1}
.hud-foot{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #0e1f2a;margin-top:18px;padding-top:8px;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#4f6d7c}
@media (max-width:1000px){
  .hud{margin:0;border:0;padding:0 12px 14px}
  .panel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tabs{gap:16px;overflow-x:auto}
}
@media (max-width:620px){
  .panel-grid{grid-template-columns:1fr}
  .hud-head{flex-direction:column;gap:8px}
  .live{font-size:8px}
  .scene-stage{min-height:240px}
  .scene-card{transform:translate(12px,18px);min-width:200px;max-width:230px}
  .scene-label{font-size:8px}
  .sc-tail{margin-left:0}
  .footnotes{column-count:1}
}
@media (prefers-reduced-motion:reduce){
  .live .dot{animation:none}
}
@media print{
  @page{size:letter;margin:12mm}
  .hud{margin:0;border:0;box-shadow:none;padding:0;max-width:none}
  .scene-stage{min-height:300px}
  .panel{min-height:0}
  .fig,.panel-grid,.algo,.stats{break-inside:avoid}
}
`;

function head(model) {
  const meta = model.meta;
  const metaRow = [meta.kicker, meta.affiliation].filter(Boolean)
    .map(item => `<span>${escapeHtml(item)}</span>`).join('<span class="sep">·</span>');
  return `<header class="hud-head">
    <div>
      <div class="brand-row"><h1 class="brand">${escapeHtml(meta.title)}</h1>
        <div class="live"><i class="dot"></i><span>LIVE</span><span class="clock" data-clock>00:00:00.00</span><span class="fps">30FPS</span></div>
      </div>
      ${metaRow ? `<div class="meta-row">${metaRow}</div>` : ''}
    </div>
    ${meta.date ? `<div class="date">${escapeHtml(meta.date)}</div>` : ''}
  </header>`;
}

const RUNTIME = `
(function(){
  var clocks = document.querySelectorAll('[data-clock]');
  var started = Date.now();
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    var ms = Date.now() - started;
    var cs = Math.floor(ms / 10) % 100;
    var s = Math.floor(ms / 1000) % 60;
    var m = Math.floor(ms / 60000) % 60;
    var h = Math.floor(ms / 3600000);
    var text = pad(h) + ':' + pad(m) + ':' + pad(s) + '.' + pad(cs);
    for (var i = 0; i < clocks.length; i++) clocks[i].textContent = text;
  }
  tick();
  setInterval(tick, 90);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scenes = document.querySelectorAll('.scene');
  for (var s = 0; s < scenes.length; s++) (function(scene){
    var dataEl = scene.querySelector('.scene-data');
    var canvas = scene.querySelector('.scene-canvas');
    if (!dataEl || !canvas || !canvas.getContext) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var width = 0, height = 0;

    function resize(){
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

    var sx = function(){ return width / data.width; };
    var sy = function(){ return height / data.height; };
    var nodes = data.nodes;

    function draw(phase){
      var kx = sx(), ky = sy();
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(94,200,229,0.10)';
      ctx.beginPath();
      for (var e = 0; e < data.edges.length; e++) {
        var a = nodes[data.edges[e][0]], b = nodes[data.edges[e][1]];
        if (!a || !b) continue;
        ctx.moveTo(a.x * kx, a.y * ky);
        ctx.lineTo(b.x * kx, b.y * ky);
      }
      ctx.stroke();

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var drift = reduce ? 0 : Math.sin(phase * 0.0006 + i * 1.7) * 0.9;
        var x = node.x * kx + drift;
        var y = node.y * ky + Math.cos(phase * 0.0005 + i * 2.3) * 0.9;
        var twinkle = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(phase * 0.0004 + i));
        var r = node.r * Math.min(1.6, Math.max(0.7, kx * 0.9));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(150,220,245,' + (0.25 + twinkle * 0.6).toFixed(3) + ')';
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }

      var active = nodes[data.active];
      if (active) {
        var ax = active.x * kx, ay = active.y * ky;
        var pulse = reduce ? 1 : 0.5 + 0.5 * Math.sin(phase * 0.0014);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(220,248,255,0.95)';
        ctx.shadowColor = 'rgba(94,200,229,0.95)';
        ctx.shadowBlur = 18;
        ctx.arc(ax, ay, 3.6, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(94,200,229,' + (0.35 + pulse * 0.35).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.arc(ax, ay, 10 + pulse * 16, 0, 6.2832);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (reduce) {
      draw(0);
      return;
    }
    var frame = 0;
    var last = 0;
    function loop(now){
      if (now - last > 33) {
        last = now;
        draw(now);
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
  })(scenes[s]);
})();
`;

export function document({ model, blocksHtml, palette, style }) {
  const meta = model.meta;
  const hasScene = model.blocks.some(block => block.type === 'graphScene');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="living-docs">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(meta.title)}</title>
<style>${CSS}</style>
<style>${styleCss('hud', palette, style)}</style>
</head>
<body class="theme-hud ${style.className}">
<div class="hud">
  ${hasScene ? '' : head(model)}
  <main>
    ${blocksHtml}
  </main>
  <footer class="hud-foot">
    <span>${escapeHtml(meta.runningHead || meta.title)}</span>
    <span>${escapeHtml(meta.date || '')}</span>
    <span>${escapeHtml(meta.footer || 'living-docs')}</span>
  </footer>
</div>
<script>${RUNTIME}</script>
</body>
</html>`;
}
