import { escapeHtml, renderInline, inlineImage } from './html.js';
import { diagramSvg, chartSvg, sparklineSvg, radarSvg, formatNumber } from './svg.js';
import { graphPayload } from './graph.js';
import { wordCount } from '../model/markdown.js';

export function createContext({ theme, palette, baseDir, model }) {
  return {
    theme,
    palette,
    baseDir,
    model,
    counters: { section: 0, sub: 0, figure: 0, table: 0, algorithm: 0 },
    flags: { leadUsed: false },
    warnings: []
  };
}

const spanClass = block => (block.span === 'page' ? ' span-page' : '');

function motionCss(id, motion) {
  if (!motion || motion === 'none') return '';
  const scope = `#${id}`;
  const reset = `
@media (prefers-reduced-motion: reduce){
  ${scope} *{animation:none !important;opacity:1 !important;transform:none !important;stroke-dashoffset:0 !important}
}
@media print{
  ${scope} *{animation:none !important;opacity:1 !important;transform:none !important;stroke-dashoffset:0 !important}
}`;
  const keyframes = `@keyframes ld-draw{to{stroke-dashoffset:0}}@keyframes ld-fade{to{opacity:1}}@keyframes ld-grow{to{transform:scaleY(1)}}`;
  if (motion === 'draw') {
    return `<style>${keyframes}
${scope} .ld-line{stroke-dasharray:1;stroke-dashoffset:1;animation:ld-draw 1000ms ease-out forwards}
${scope} .d-node,${scope} .ch-point,${scope} .ch-bar,${scope} .ch-legend,${scope} .d-edge-labels{opacity:0.15;animation:ld-fade 420ms ease-out forwards;animation-delay:calc(var(--i,0)*70ms + 420ms)}
${scope} .ch-bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation-name:ld-grow,ld-fade;animation-duration:500ms,300ms;animation-delay:calc(var(--i,0)*50ms + 300ms)}
${reset}</style>`;
  }
  if (motion === 'steps') {
    return `<style>${keyframes}
${scope} .ld-line{stroke-dasharray:1;stroke-dashoffset:1;animation:ld-draw 700ms ease-out forwards;animation-delay:calc(var(--i,0)*140ms)}
${scope} .d-node,${scope} .ch-point,${scope} .ch-legend,${scope} .d-edge-labels{opacity:0.15;animation:ld-fade 360ms ease-out forwards;animation-delay:calc(var(--i,0)*140ms + 120ms)}
${scope} .ch-bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);opacity:0.15;animation:ld-grow 420ms ease-out forwards,ld-fade 200ms ease-out forwards;animation-delay:calc(var(--i,0)*120ms),calc(var(--i,0)*120ms)}
${reset}</style>`;
  }
  return `<style>${keyframes}
${scope} .d-node,${scope} .ch-point,${scope} .ch-bar,${scope} .ch-legend,${scope} .d-edge-labels{opacity:0.15;animation:ld-fade 420ms ease-out forwards;animation-delay:calc(var(--i,0)*70ms)}
${scope} .ld-line{stroke-dasharray:1;stroke-dashoffset:1;animation:ld-draw 800ms ease-out forwards}
${reset}</style>`;
}

function renderFigure(block, ctx) {
  const number = ++ctx.counters.figure;
  const span = block.span || (ctx.theme === 'hud' ? 'column' : 'page');
  const motion = block.motion || 'none';
  let svg = '';
  try {
    svg = block.spec === 'diagram'
      ? diagramSvg(block.diagram, ctx.palette, { figure: ctx.style?.figure, motion })
      : chartSvg(block.chart, ctx.palette, { figure: ctx.style?.figure, motion });
  } catch (error) {
    ctx.warnings.push(`figure ${number}: ${error.message}`);
    svg = `<div class="fig-error">Figure unavailable: ${escapeHtml(error.message)}</div>`;
  }
  const motionStyle = motionCss(`fig-${number}`, motion);
  return `<figure class="fig${span === 'page' ? ' span-page' : ''}" id="fig-${number}">
    ${motionStyle}
    <div class="fig-frame">${svg}</div>
    <figcaption><span class="fig-num">Fig. ${number}.</span> ${renderInline(block.caption)}</figcaption>
  </figure>`;
}

function renderTable(block, ctx) {
  const number = block.caption ? ++ctx.counters.table : ctx.counters.table;
  const caption = block.caption
    ? `<figcaption><span class="tbl-num">Table ${number}</span> ${renderInline(block.caption)}</figcaption>`
    : '';
  const head = block.columns.map(column => `<th${column.align ? ` class="t-${column.align}"` : ''}>${renderInline(column.label)}</th>`).join('');
  const body = block.rows.map(row => `<tr>${row.map((cell, i) => {
    const align = block.columns[i]?.align;
    return `<td${align ? ` class="t-${align}"` : ''}>${renderInline(cell)}</td>`;
  }).join('')}</tr>`).join('');
  return `<figure class="tbl${spanClass(block)}">
    ${caption}
    <div class="tbl-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
  </figure>`;
}

function renderAlgorithm(block, ctx) {
  const number = ++ctx.counters.algorithm;
  const lines = block.lines.map((line, index) => {
    const comment = line.comment ? ` <span class="algo-comment">${escapeHtml(line.comment)}</span>` : '';
    return `<div class="algo-line${line.highlight ? ' is-highlight' : ''}">
      <span class="algo-ln">${index + 1}</span>
      <span class="algo-text">${escapeHtml(line.text)}${comment}</span>
    </div>`;
  }).join('');
  return `<div class="algo" role="group" aria-label="Algorithm ${number}">
    <div class="algo-head"><span class="algo-num">Algorithm ${number}</span><span class="algo-title">${escapeHtml(block.title)}</span></div>
    ${block.caption ? `<div class="algo-caption">${renderInline(block.caption)}</div>` : ''}
    <div class="algo-body">${lines}</div>
  </div>`;
}

function renderCallout(block) {
  const title = block.title ? `<div class="callout-title">${renderInline(block.title)}</div>` : '';
  return `<aside class="callout callout-${block.tone}">${title}<div class="callout-body">${renderInline(block.body)}</div></aside>`;
}

function renderStats(block) {
  const items = block.items.map(item => `<div class="stat">
      <span class="stat-value">${renderInline(item.value)}</span>
      <span class="stat-label">${renderInline(item.label)}</span>
      ${item.note ? `<span class="stat-note">${renderInline(item.note)}</span>` : ''}
    </div>`).join('');
  return `<div class="stats" role="list">${items}</div>${block.caption ? `<p class="stats-caption">${renderInline(block.caption)}</p>` : ''}`;
}

function renderList(block) {
  const style = block.style || 'bullet';
  return `<ul class="doc-list list-${style}">${block.items
    .map(item => `<li>${renderInline(item)}</li>`)
    .join('')}</ul>`;
}

function renderQuote(block) {
  return `<blockquote class="quote"><p>${renderInline(block.body)}</p>${block.cite ? `<cite>${renderInline(block.cite)}</cite>` : ''}</blockquote>`;
}

function renderCode(block) {
  const caption = block.caption
    ? `<figcaption><span class="code-lang">${escapeHtml(block.lang || 'text')}</span> ${renderInline(block.caption)}</figcaption>`
    : block.lang ? `<div class="code-lang">${escapeHtml(block.lang)}</div>` : '';
  return `<figure class="code-block">${caption}<pre><code>${escapeHtml(block.body)}</code></pre></figure>`;
}

function renderFootnotes(block) {
  const items = block.items.map((item, index) => `<li id="fn-${index + 1}">${renderInline(item)}</li>`).join('');
  return `<section class="footnotes" aria-label="Footnotes"><ol>${items}</ol></section>`;
}

function renderImage(block, ctx) {
  let src = block.src;
  try {
    src = inlineImage(block.src, ctx.baseDir);
  } catch (error) {
    ctx.warnings.push(`image: ${error.message}`);
    return `<figure class="fig${spanClass(block)}"><div class="fig-error">${escapeHtml(error.message)}</div></figure>`;
  }
  return `<figure class="fig${spanClass(block)}">
    <div class="fig-frame"><img src="${src}" alt="${escapeHtml(block.alt)}" loading="lazy" decoding="async"></div>
    ${block.caption ? `<figcaption>${renderInline(block.caption)}</figcaption>` : ''}
  </figure>`;
}

function renderGraphSceneFallback(block) {
  const meta = (block.meta || []).map(item => `<span>${escapeHtml(item)}</span>`).join('');
  const tabs = (block.tabs || []).map(tab => `<span class="fb-tab${tab.active ? ' is-active' : ''}">${escapeHtml(tab.label)}</span>`).join('');
  const labels = (block.graph?.labels || []).map(label => `<li>${escapeHtml(label)}</li>`).join('');
  const card = block.graph?.active?.card;
  const rows = (card?.rows || []).map(row => `<dt>${escapeHtml(row.k)}</dt><dd>${escapeHtml(row.v)}</dd>`).join('');
  return `<section class="scene-fallback">
    <div class="fb-title">${escapeHtml(block.title)}</div>
    <div class="fb-meta">${meta}</div>
    ${tabs ? `<div class="fb-tabs">${tabs}</div>` : ''}
    ${block.command ? `<div class="fb-command"><span class="fb-prompt">&gt;</span> ${escapeHtml(block.command)}</div>` : ''}
    <div class="fb-grid">
      <div>
        ${labels ? `<div class="fb-label">Scene labels</div><ul class="fb-labels">${labels}</ul>` : ''}
      </div>
      ${card ? `<div class="fb-card"><div class="fb-card-title">${escapeHtml(card.title)}</div>
        ${rows ? `<dl class="fb-rows">${rows}</dl>` : ''}
        ${card.footer ? `<div class="fb-card-foot">${escapeHtml(card.footer)}</div>` : ''}
      </div>` : ''}
    </div>
  </section>`;
}

function renderGraphScene(block, ctx) {
  if (ctx.theme !== 'hud') return renderGraphSceneFallback(block);
  const graph = block.graph || {};
  const payload = graphPayload(graph);
  const meta = (block.meta || []).map(item => `<span>${escapeHtml(item)}</span>`).join('<span class="sep">·</span>');
  const tabs = (block.tabs || []).map(tab => `<span class="tab${tab.active ? ' is-active' : ''}">${tab.active ? '<i class="tab-dot"></i>' : ''}${escapeHtml(tab.label)}</span>`).join('');
  const card = graph.active?.card;
  const active = payload.active >= 0 ? payload.nodes[payload.active] : { x: 620, y: 300 };
  const left = (active.x / payload.width) * 100;
  const top = (active.y / payload.height) * 100;
  const cardRows = (card?.rows || []).map(row => `<div class="sc-row"><span>${escapeHtml(row.k)}</span><b>${escapeHtml(row.v)}</b></div>`).join('');
  const labels = payload.labels.map(label => `<span class="scene-label" style="left:${(label.x / payload.width) * 100}%;top:${(label.y / payload.height) * 100}%">${escapeHtml(label.text)}</span>`).join('');
  const status = block.status
    ? `<div class="scene-status"><span class="sc-seq">${escapeHtml(block.status.seq)}</span> <span class="sc-kind">${escapeHtml(block.status.kind)}</span> <span class="sc-sep">::</span> <span class="sc-text">${escapeHtml(block.status.text)}</span> <span class="sc-tail">${escapeHtml(block.status.tail)}</span></div>`
    : '';

  return `<section class="scene">
    <header class="scene-head">
      <div class="brand-row">
        <h1 class="brand">${escapeHtml(block.title)}</h1>
        <div class="live"><i class="dot"></i><span>LIVE</span><span class="clock" data-clock>00:00:00.00</span><span class="fps">30FPS</span></div>
      </div>
      ${meta ? `<div class="meta-row">${meta}</div>` : ''}
      ${tabs ? `<nav class="tabs">${tabs}</nav>` : ''}
      ${block.command ? `<div class="cmdline"><span class="prompt">&gt;</span> ${escapeHtml(block.command)}</div>` : ''}
    </header>
    <div class="scene-top">
      <span class="scene-graph">GRAPH · ${escapeHtml(graph.counts || `${payload.nodes.length} NODES`)}</span>
      <span class="scene-azimuth">${escapeHtml(graph.azimuth || '')}</span>
    </div>
    <div class="scene-stage">
      <canvas class="scene-canvas" aria-hidden="true"></canvas>
      <div class="scene-crosshair" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%"></div>
      ${labels}
      <span class="scene-active-label" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${escapeHtml(graph.active?.id || '')}</span>
      ${graph.active?.badge ? `<span class="scene-badge" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${escapeHtml(graph.active.badge)}</span>` : ''}
      ${card ? `<div class="scene-card" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">
        <div class="sc-card-title">${escapeHtml(card.title)}</div>
        ${cardRows}
        ${card.footer ? `<div class="sc-card-foot">${escapeHtml(card.footer)}</div>` : ''}
      </div>` : ''}
    </div>
    ${status}
    ${block.action ? `<div class="actionbar"><span class="ab-label">&gt; ${escapeHtml(block.action.label)}</span><span class="ab-right">${escapeHtml(block.action.right || '')}</span></div>` : ''}
    <script type="application/json" class="scene-data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
  </section>`;
}

function barWidth(value, max) {
  const ratio = Math.max(0, Math.min(1, Number(value) / (Number(max) || 1)));
  return Math.max(2, Math.round(ratio * 100));
}

function renderPanelBody(kind, data, ctx) {
  switch (kind) {
    case 'repo': {
      const [owner, repo] = String(data.name || '').split('/');
      return `<div class="p-repo">${owner ? `<span class="p-owner">${escapeHtml(owner)} /</span>` : ''}<span class="p-repo-name">${escapeHtml(repo || data.name || '')}</span></div>
        ${data.stars ? `<div class="p-stars">★ ${escapeHtml(data.stars)}</div>` : ''}
        ${data.by ? `<div class="p-by">${escapeHtml(data.by)}</div>` : ''}
        ${data.note ? `<p class="p-note">${escapeHtml(data.note)}</p>` : ''}`;
    }
    case 'bars': {
      const max = Math.max(...(data.rows || []).map(row => Number(row.max) || Number(row.value) || 0));
      return `<div class="p-bars">${(data.rows || []).map(row => `<div class="p-bar${row.active ? ' is-active' : ''}">
        <span class="p-bar-label">${escapeHtml(row.label)}</span>
        <span class="p-bar-track"><i style="width:${barWidth(row.value, max)}%"></i></span>
        <span class="p-bar-value">${escapeHtml(String(row.display ?? formatNumber(Number(row.value))))}</span>
      </div>`).join('')}</div>`;
    }
    case 'list': {
      return `<div class="p-list-title">${escapeHtml(data.title || '')}</div>
        <dl class="p-rows">${(data.rows || []).map(row => `<dt>${escapeHtml(row.k)}</dt><dd>${escapeHtml(row.v)}</dd>`).join('')}</dl>
        ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    }
    case 'radar': {
      const labels = data.labels || ['A', 'B', 'C', 'D', 'E'];
      return `<div class="p-radar">
        ${radarSvg(data.value, data.max || 100, ctx.palette, { size: 132, labels })}
        <div class="p-radar-meta">
          <span>${escapeHtml(data.sub || 'TOTAL')}</span><b>${escapeHtml(String(data.value ?? ''))}</b>
          ${data.subvalue ? `<span>${escapeHtml(data.subvalueLabel || 'REPO')}</span><b>${escapeHtml(String(data.subvalue))}</b>` : ''}
        </div>
      </div>
      ${data.found ? `<div class="p-foot">${escapeHtml(data.found)}</div>` : ''}`;
    }
    case 'tree':
      return `<div class="p-tree-root">${escapeHtml(data.root || '')}</div>
        <ul class="p-tree">${(data.items || []).map(item => `<li class="${item.active ? 'is-active' : ''}"><span class="t-name">${escapeHtml(item.name)}</span>${item.tag ? `<span class="t-tag">${escapeHtml(item.tag)}</span>` : ''}</li>`).join('')}</ul>
        ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    case 'log':
      return `<ol class="p-log">${(data.lines || []).map(line => `<li><span class="l-n">${escapeHtml(String(line.n ?? ''))}</span><span class="l-verb">${escapeHtml(line.verb || '')}</span><span class="l-text">${escapeHtml(line.text || '')}</span></li>`).join('')}</ol>`;
    case 'heat': {
      const cols = data.cols || [];
      const rows = data.rows || [];
      const cells = data.cells || [];
      return `<div class="p-heat" style="--heat-cols:${cols.length}">
        <div class="h-row h-head">${['', ...cols].map(cell => `<span>${escapeHtml(cell)}</span>`).join('')}</div>
        ${rows.map((row, r) => `<div class="h-row"><span class="h-label">${escapeHtml(row)}</span>${cols.map((_, c) => `<span class="h-cell${cells[r]?.[c] ? ' is-on' : ''}"></span>`).join('')}</div>`).join('')}
      </div>
      ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    }
    case 'big':
      return `<div class="p-big">${escapeHtml(String(data.value ?? ''))}</div>${data.note ? `<div class="p-foot">${escapeHtml(data.note)}</div>` : ''}`;
    case 'spark':
      return `<div class="p-spark">${sparklineSvg(data.values || [], ctx.palette, { width: 300, height: 58, tone: data.tone || 'accent' })}</div>
        <div class="p-legend">${(data.legend || []).map((item, i) => `<span class="p-legend-item tone-${i}">${escapeHtml(item)}</span>`).join('')}</div>
        ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    case 'code':
      return `${data.file ? `<div class="p-code-head"><span>${escapeHtml(data.file)}</span><span class="p-code-tag">${escapeHtml(data.tag || '')}</span></div>` : ''}
        <pre class="p-code">${(data.lines || []).map(line => escapeHtml(line)).join('\n')}</pre>`;
    case 'hist':
      return `<div class="p-hist">${(data.values || []).map((value, i) => `<i style="height:${Math.max(6, Math.min(100, Number(value)))}%;${i === (data.activeIndex ?? -1) ? 'opacity:1' : ''}"></i>`).join('')}</div>
        <div class="p-hist-meta">${data.rate ? `<b>${escapeHtml(data.rate)}</b>` : ''}${data.note ? `<span>${escapeHtml(data.note)}</span>` : ''}</div>
        ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    case 'metrics':
      return `<div class="p-metrics">${(data.groups || []).map(group => `<div class="p-metric"><span>${escapeHtml(group.label)}</span><b>${escapeHtml(String(group.value ?? ''))}</b>${group.note ? `<em>${escapeHtml(group.note)}</em>` : ''}</div>`).join('')}</div>`;
    case 'diff':
      return `${data.head ? `<div class="p-diff-head">${escapeHtml(data.head)}</div>` : ''}
        <pre class="p-diff">${(data.lines || []).map(line => `<span class="d-${line.sign === '+' ? 'add' : line.sign === '-' ? 'del' : 'ctx'}">${escapeHtml(line.sign || ' ')} ${escapeHtml(line.text)}</span>`).join('\n')}</pre>
        ${data.footer ? `<div class="p-foot">${escapeHtml(data.footer)}</div>` : ''}`;
    default:
      return '';
  }
}

function renderPanels(block, ctx) {
  const columns = Math.max(1, Math.min(6, block.columns || 4));
  const items = block.items.map((panel, index) => {
    const tag = panel.tag ? `<span class="panel-tag">${escapeHtml(panel.tag)}</span>` : '';
    return `<article class="panel panel-${panel.kind}"${panel.span ? ` style="grid-column: span ${Math.min(columns, panel.span)}"` : ''}>
      <header class="panel-head"><span class="panel-index">${escapeHtml(panel.index || String(index + 1).padStart(2, '0'))}</span><span class="panel-title">${escapeHtml(panel.title || '')}</span>${tag}</header>
      <div class="panel-body">${renderPanelBody(panel.kind, panel.data || {}, ctx)}</div>
    </article>`;
  }).join('');
  return `<section class="panel-grid" style="--cols:${columns}">${items}</section>`;
}

export function renderBlock(block, ctx) {
  switch (block.type) {
    case 'prose': {
      const lead = !ctx.flags.leadUsed && wordCount(block.markdown) > 40;
      if (lead) ctx.flags.leadUsed = true;
      return `<p class="prose${lead ? ' lead' : ''}">${renderInline(block.markdown)}</p>`;
    }
    case 'heading': {
      const level = block.level === 3 ? 3 : 2;
      if (level === 2) {
        ctx.counters.section += 1;
        ctx.counters.sub = 0;
      } else {
        if (!ctx.counters.section) ctx.counters.section = 1;
        ctx.counters.sub += 1;
      }
      const number = level === 2
        ? `${ctx.counters.section}`
        : `${ctx.counters.section}.${ctx.counters.sub}`;
      const subtitle = block.subtitle ? `<p class="sec-subtitle">${renderInline(block.subtitle)}</p>` : '';
      return `<h${level} class="${level === 2 ? 'sec-head' : 'sub-head'}" id="sec-${number.replace('.', '-')}">
        <span class="sec-num">${number}</span> <span class="sec-title">${renderInline(block.title)}</span>
      </h${level}>${subtitle}`;
    }
    case 'figure': return renderFigure(block, ctx);
    case 'table': return renderTable(block, ctx);
    case 'algorithm': return renderAlgorithm(block, ctx);
    case 'callout': return renderCallout(block);
    case 'stats': return renderStats(block);
    case 'list': return renderList(block);
    case 'quote': return renderQuote(block);
    case 'code': return renderCode(block);
    case 'image': return renderImage(block, ctx);
    case 'footnotes': return renderFootnotes(block);
    case 'ticker': return `<div class="ticker">${escapeHtml(block.text)}</div>`;
    case 'graphScene': return renderGraphScene(block, ctx);
    case 'panels': return renderPanels(block, ctx);
    default: return '';
  }
}

export function renderBlocks(blocks, ctx) {
  return blocks.map(block => renderBlock(block, ctx)).join('\n');
}

export function documentStats(model, html) {
  const words = model.blocks.reduce((sum, block) => {
    if (block.type === 'prose') return sum + wordCount(block.markdown);
    if (block.type === 'list') return sum + block.items.join(' ').split(/\s+/).length;
    if (block.type === 'table') return sum + block.rows.flat().join(' ').split(/\s+/).length;
    if (block.type === 'quote') return sum + wordCount(block.body);
    return sum;
  }, 0);
  return {
    words,
    bytes: Buffer.byteLength(html, 'utf8'),
    sections: model.blocks.filter(block => block.type === 'heading' && (block.level || 2) === 2).length,
    figures: model.blocks.filter(block => block.type === 'figure' || block.type === 'image').length,
    tables: model.blocks.filter(block => block.type === 'table').length,
    panels: model.blocks.filter(block => block.type === 'panels').reduce((sum, block) => sum + block.items.length, 0)
  };
}
