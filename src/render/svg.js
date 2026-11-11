import { escapeHtml } from './html.js';

const round = value => Math.round(value * 100) / 100;

function hashKey(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function wrapLabel(text, maxChars, maxLines = 4) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line.length) { line = word; continue; }
    if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
    else { lines.push(line); line = word; }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : [''];
}

function anchor(node, px, py) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const sx = dx ? node.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy ? node.h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

// Icons sit in a 13-unit band at the top of the node's text block, so they never touch the label.
function iconMarkup(node, palette, top) {
  const at = `transform="translate(${round(node.x + node.w / 2)} ${round(top)})"`;
  const stroke = palette.accent;
  switch (node.icon) {
    case 'file':
      return `<g class="d-icon" ${at} fill="none" stroke="${stroke}" stroke-width="1.2"><path d="M -6 0 h 8 l 4 4 v 9 h -12 z"/><path d="M 2 0 v 4 h 4"/></g>`;
    case 'clock':
      return `<g class="d-icon" ${at} fill="none" stroke="${stroke}" stroke-width="1.2"><circle cx="0" cy="6.5" r="6.3"/><path d="M 0 3 v 3.5 l 2.6 1.8"/></g>`;
    case 'star':
      return `<path class="d-icon" ${at} d="M 0 0 l 2 4.6 5 .6 -3.7 3.4 1 4.9 -4.3 -2.4 -4.3 2.4 1 -4.9 -3.7 -3.4 5 -.6 z" fill="${stroke}" stroke="none"/>`;
    case 'badge':
      return `<g class="d-icon" ${at} fill="none" stroke="${stroke}" stroke-width="1.1"><rect x="-9" y="1" width="18" height="11" rx="1.5"/><path d="M -5 6.5 h 10"/></g>`;
    default:
      return '';
  }
}

export function diagramSvg(spec, palette, { figure = 'outline', motion = 'none' } = {}) {
  const W = spec.width || 1000;
  const H = spec.height || 520;
  const nodes = (spec.nodes || []).map(node => ({ w: 150, h: 56, kind: 'box', icon: 'none', ...node }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const uid = hashKey(JSON.stringify(spec));
  const parts = [];

  parts.push(`<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<defs>
    <marker id="ar-${uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${palette.ink}"/></marker>
    <marker id="ar-a-${uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${palette.accent}"/></marker>
  </defs>`);

  // Cluster outlines sit behind everything.
  const groups = [];
  for (const group of spec.groups || []) {
    const members = group.nodes.map(id => byId.get(id)).filter(Boolean);
    if (!members.length) continue;
    const x = Math.min(...members.map(n => n.x)) - 14;
    const y = Math.min(...members.map(n => n.y)) - 30;
    const x2 = Math.max(...members.map(n => n.x + n.w)) + 14;
    const y2 = Math.max(...members.map(n => n.y + n.h)) + 14;
    const labelY = y - 9 < 14 ? y + 13 : y - 9;
    groups.push(`<g class="d-group">
      <rect x="${round(x)}" y="${round(y)}" width="${round(x2 - x)}" height="${round(y2 - y)}" fill="${group.style === 'shade' ? palette.surface : 'none'}" stroke="${palette.muted}" stroke-opacity="0.55" stroke-dasharray="4 5"/>
      <text x="${round(x + 2)}" y="${round(labelY)}" fill="${palette.muted}" font-size="10.5" letter-spacing="0.06em">${escapeHtml(group.label)}</text>
    </g>`);
  }
  parts.push(`<g class="d-groups">${groups.join('')}</g>`);

  // Edges, trimmed to node boundaries; labels render above nodes.
  const edges = [];
  const edgeLabels = [];
  for (const edge of spec.edges || []) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
    const start = anchor(from, toCenter.x, toCenter.y);
    const end = anchor(to, fromCenter.x, fromCenter.y);
    const accent = edge.style === 'arrow' && (from.kind === 'accent' || to.kind === 'accent');
    const stroke = accent ? palette.accent : palette.ink;
    const marker = accent ? `ar-a-${uid}` : `ar-${uid}`;
    const dash = edge.style === 'dashed' ? ' stroke-dasharray="5 4"' : '';
    let d;
    let labelPoint;
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    const gap = Math.abs(end.x - start.x);
    if (edge.route === 'elbow' || (edge.style === 'dashed' && Math.abs(toCenter.y - fromCenter.y) > 40)) {
      const midX = round((start.x + end.x) / 2);
      d = `M ${round(start.x)} ${round(start.y)} H ${midX} V ${round(end.y)} H ${round(end.x)}`;
      labelPoint = { x: midX + 8, y: (start.y + end.y) / 2 + 4, anchor: 'start' }; // beside the vertical run, not across it
    } else {
      d = `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`;
      labelPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, anchor: 'middle' };
      if (horizontal && gap < 170) {
        labelPoint.y = Math.min(start.y, end.y) - 12;
      } else if (horizontal) {
        labelPoint.y -= 7;
      } else {
        labelPoint = { x: (start.x + end.x) / 2 + 9, y: (start.y + end.y) / 2 + 3, anchor: 'start' };
      }
    }
    const markerEnd = edge.style === 'line' ? '' : ` marker-end="url(#${marker})"`;
    const animLine = motion !== 'none' && edge.style !== 'dashed' ? ' class="ld-line" pathLength="1"' : '';
    edges.push(`<path${animLine} d="${d}" fill="none" stroke="${stroke}" stroke-width="1.1"${dash}${markerEnd}/>`);
    if (edge.label) {
      edgeLabels.push(`<text x="${round(labelPoint.x)}" y="${round(labelPoint.y)}" text-anchor="${labelPoint.anchor}" font-size="10.5" fill="${palette.ink}" stroke="${palette.bg}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${escapeHtml(edge.label)}</text>`);
    }
  }
  parts.push(`<g class="d-edges">${edges.join('')}</g>`);

  // Nodes.
  const nodeMarkup = [];
  let nodeIndex = 0;
  for (const node of nodes) {
    const minimal = figure === 'minimal';
    const solid = figure === 'solid';
    const fill = node.kind === 'accent' ? (minimal ? 'none' : palette.accentSoft)
      : node.kind === 'plain' ? 'none'
      : node.kind === 'dashed' ? 'none'
      : minimal ? 'none'
      : solid ? palette.box
      : palette.surface;
    const stroke = node.kind === 'accent' ? palette.accent : (minimal ? palette.hair : palette.ink);
    const strokeWidth = node.kind === 'accent' ? 1.5 : minimal ? 0.8 : solid ? 1.3 : 1;
    const dash = node.kind === 'dashed' ? ' stroke-dasharray="5 4"' : '';
    const opacity = node.kind === 'dashed' ? ' stroke-opacity="0.75"' : '';
    const iconSpace = node.icon && node.icon !== 'none' ? 18 : 0;
    const lines = wrapLabel(node.label, Math.max(8, Math.floor((node.w - 16) / 6.5)), 3);
    const lineHeight = 15;
    const blockHeight = lines.length * lineHeight + (node.sub ? 13 : 0) + iconSpace;
    const blockTop = node.y + (node.h - blockHeight) / 2;
    let textY = blockTop + lineHeight - 4 + iconSpace;

    nodeMarkup.push(`<g class="d-node d-node-${node.kind}" data-part="${escapeHtml(node.id)}" style="--i:${nodeIndex++}">`);
    if (node.kind === 'stack') {
      nodeMarkup.push(`<rect x="${node.x + 5}" y="${node.y + 5}" width="${node.w}" height="${node.h}" rx="2" fill="${palette.surface}" stroke="${palette.muted}" stroke-opacity="0.5"/>`);
    }
    nodeMarkup.push(`<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}${opacity}/>`);
    nodeMarkup.push(iconMarkup(node, palette, blockTop));
    for (const line of lines) {
      nodeMarkup.push(`<text x="${round(node.x + node.w / 2)}" y="${round(textY)}" text-anchor="middle" font-size="13" fill="${palette.ink}" font-weight="${node.kind === 'accent' ? 600 : 400}">${escapeHtml(line)}</text>`);
      textY += lineHeight;
    }
    if (node.sub) {
      nodeMarkup.push(`<text x="${round(node.x + node.w / 2)}" y="${round(textY + 2)}" text-anchor="middle" font-size="10.5" fill="${palette.muted}" letter-spacing="0.03em">${escapeHtml(node.sub)}</text>`);
    }
    nodeMarkup.push('</g>');
  }
  parts.push(`<g class="d-nodes">${nodeMarkup.join('')}</g>`);
  if (edgeLabels.length) parts.push(`<g class="d-edge-labels" style="--i:${nodes.length}">${edgeLabels.join('')}</g>`);

  if (spec.notes?.length) {
    const notes = spec.notes.map((note, i) =>
      `<text x="24" y="${round(H - 14 - (spec.notes.length - 1 - i) * 15)}" font-size="10.5" fill="${palette.muted}">${escapeHtml(note)}</text>`
    );
    parts.push(`<g class="d-notes">${notes.join('')}</g>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

function niceTicks(min, max, target = 5) {
  const span = max - min || 1;
  const rawStep = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidates = [1, 2, 2.5, 5, 10].map(m => m * magnitude);
  const step = candidates.find(c => c >= rawStep) || candidates[candidates.length - 1];
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(round(value));
  return ticks;
}

function seriesPoints(series) {
  if (Array.isArray(series.points)) return series.points.map(point => ({ x: point.x, y: point.y, label: point.label }));
  return (series.values || []).map((value, i) => ({ x: i + 1, y: value, label: series.labels?.[i] }));
}

export function chartSvg(spec, palette, { figure = 'outline', motion = 'none' } = {}) {
  const W = spec.width || 1000;
  const H = spec.height || 420;
  const showGrid = figure !== 'minimal';
  const margin = { l: 74, r: 28, t: 26, b: 56 };
  const plotW = W - margin.l - margin.r;
  const plotH = H - margin.t - margin.b;
  const series = (spec.series || []).map(item => ({ kind: 'line', tone: 'accent', ...item }));
  const all = series.flatMap(seriesPoints);
  if (!all.length) return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"></svg>`;

  const barMode = spec.kind === 'bar' || series.every(item => item.kind === 'bar');
  const xValues = all.map(point => point.x);
  const yValues = all.map(point => point.y);
  const categories = (spec.kind === 'bar' || series.some(item => item.kind === 'bar'))
    ? series.find(item => Array.isArray(item.labels) && item.labels.length)?.labels
    : null;
  const categoryCount = categories?.length || Math.max(...series.map(item => seriesPoints(item).length));

  let xMin = Math.min(...xValues);
  let xMax = Math.max(...xValues);
  if (barMode) { xMin = 0.5; xMax = categoryCount + 0.5; }
  if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }
  let yMin = spec.yMin !== undefined ? spec.yMin : Math.min(0, ...yValues);
  let yMax = spec.yMax !== undefined ? spec.yMax : Math.max(...yValues);
  if (yMin === yMax) yMax = yMin + 1;

  const xTicks = spec.xTicks || (barMode
    ? Array.from({ length: categoryCount }, (_, i) => i + 1)
    : niceTicks(xMin, xMax, 6).filter(t => t >= xMin && t <= xMax));
  const yTicks = (spec.yTicks || niceTicks(yMin, yMax, 5)).filter(t => t >= yMin && t <= yMax);
  const sx = value => margin.l + ((value - xMin) / (xMax - xMin)) * plotW;
  const sy = value => margin.t + plotH - ((value - yMin) / (yMax - yMin)) * plotH;
  const parts = [];

  parts.push(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg">`);

  for (const tick of yTicks) {
    const y = round(sy(tick));
    if (showGrid) parts.push(`<line x1="${margin.l}" y1="${y}" x2="${W - margin.r}" y2="${y}" stroke="${palette.hair}" stroke-width="1"/>`);
    parts.push(`<text x="${margin.l - 10}" y="${y + 3.5}" text-anchor="end" font-size="10.5" fill="${palette.muted}">${escapeHtml(formatNumber(tick))}</text>`);
  }
  for (const tick of xTicks) {
    const x = round(sx(tick));
    parts.push(`<line x1="${x}" y1="${margin.t + plotH}" x2="${x}" y2="${margin.t + plotH + 5}" stroke="${palette.ink}" stroke-width="1"/>`);
    const label = categories && categories[Math.round(tick) - 1] !== undefined ? categories[Math.round(tick) - 1] : formatNumber(tick);
    parts.push(`<text x="${x}" y="${margin.t + plotH + 20}" text-anchor="middle" font-size="10.5" fill="${palette.muted}">${escapeHtml(label)}</text>`);
  }

  parts.push(`<line x1="${margin.l}" y1="${margin.t + plotH}" x2="${W - margin.r}" y2="${margin.t + plotH}" stroke="${palette.ink}" stroke-width="1.1"/>`);
  parts.push(`<line x1="${margin.l}" y1="${margin.t}" x2="${margin.l}" y2="${margin.t + plotH}" stroke="${palette.ink}" stroke-width="1.1"/>`);

  const slot = plotW / Math.max(1, categoryCount);
  const barWidth = Math.max(4, Math.min(64, (slot * 0.55) / series.length));

  const legend = [];
  let markIndex = 0;
  series.forEach((item, seriesIndex) => {
    const tone = palette[item.tone] || palette.accent;
    const points = seriesPoints(item).sort((a, b) => a.x - b.x);
    if (!points.length) return;

    if (item.kind === 'bar' || spec.kind === 'bar') {
      points.forEach(point => {
        const x = sx(point.x) - (series.length * barWidth) / 2 + seriesIndex * barWidth;
        const y = sy(Math.max(yMin, point.y));
        const height = Math.max(1, margin.t + plotH - y);
        parts.push(`<rect class="ch-bar" style="--i:${markIndex++}" x="${round(x)}" y="${round(y)}" width="${round(barWidth - 1.5)}" height="${round(height)}" fill="${tone}" fill-opacity="0.9"/>`);
      });
    } else if (item.kind === 'step' || spec.kind === 'steps') {
      let d = `M ${round(sx(points[0].x))} ${round(sy(points[0].y))}`;
      for (let i = 1; i < points.length; i++) {
        d += ` H ${round(sx(points[i].x))} V ${round(sy(points[i].y))}`;
      }
      parts.push(`<path${motion !== 'none' ? ' class="ld-line" pathLength="1"' : ''} d="${d}" fill="none" stroke="${tone}" stroke-width="1.6"/>`);
      points.forEach(point => parts.push(`<circle class="ch-point" style="--i:${markIndex++}" cx="${round(sx(point.x))}" cy="${round(sy(point.y))}" r="2.6" fill="${tone}"/>`));
    } else if (item.kind === 'dot' || spec.kind === 'scatter') {
      points.forEach(point => parts.push(`<circle class="ch-point" style="--i:${markIndex++}" cx="${round(sx(point.x))}" cy="${round(sy(point.y))}" r="3.2" fill="${tone}"/>`));
    } else {
      const path = points.map((point, i) => `${i ? 'L' : 'M'} ${round(sx(point.x))} ${round(sy(point.y))}`).join(' ');
      parts.push(`<path${motion !== 'none' ? ' class="ld-line" pathLength="1"' : ''} d="${path}" fill="none" stroke="${tone}" stroke-width="1.5"/>`);
      points.forEach(point => parts.push(`<circle class="ch-point" style="--i:${markIndex++}" cx="${round(sx(point.x))}" cy="${round(sy(point.y))}" r="3.4" fill="${tone}" stroke="${palette.bg}" stroke-width="0.8"/>`));
    }

    legend.push(`<g class="ch-legend" style="--i:${markIndex++}"><rect x="0" y="-6" width="10" height="7" fill="${tone}"/><text x="15" y="0" font-size="10.5" fill="${palette.ink}">${escapeHtml(item.name)}</text></g>`);
  });

  for (const note of spec.annotations || []) {
    const x = round(sx(note.x));
    const y = round(sy(note.y));
    parts.push(`<text x="${x}" y="${y - 12}" text-anchor="${x > W - 240 ? 'end' : 'start'}" font-size="10.5" fill="${palette.muted}" stroke="${palette.bg}" stroke-width="3.5" paint-order="stroke">${escapeHtml(note.text)}</text>`);
    parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 8}" stroke="${palette.muted}" stroke-width="0.8"/>`);
  }

  if (spec.xLabel) {
    parts.push(`<text x="${margin.l + plotW / 2}" y="${H - 14}" text-anchor="middle" font-size="10.5" fill="${palette.muted}" letter-spacing="0.04em">${escapeHtml(spec.xLabel)}</text>`);
  }
  if (spec.yLabel) {
    parts.push(`<text transform="translate(18 ${margin.t + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="10.5" fill="${palette.muted}" letter-spacing="0.04em">${escapeHtml(spec.yLabel)}</text>`);
  }

  if (spec.legend !== false && legend.length) {
    const width = Math.max(...series.map(item => item.name.length)) * 6 + 24;
    const startX = W - margin.r - width;
    legend.forEach((markup, i) => {
      parts.push(`<g transform="translate(${round(startX)} ${margin.t + 4 + i * 17})">${markup.replace('x="0"', 'x="0"')}</g>`);
    });
  }

  parts.push('</svg>');
  return parts.join('');
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${round(value / 1_000)}k`;
  if (Number.isInteger(value)) return String(value);
  return String(round(value));
}

export function sparklineSvg(values, palette, { width = 260, height = 54, tone = 'accent' } = {}) {
  const points = values.map(Number).filter(Number.isFinite);
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((value, i) => `${i ? 'L' : 'M'} ${round(i * step)} ${round(height - 4 - ((value - min) / span) * (height - 8))}`).join(' ');
  const color = palette[tone] || palette.accent;
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="trend">
    <path d="${area}" fill="${color}" fill-opacity="0.12"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="1.6"/>
  </svg>`;
}

export function radarSvg(value, max, palette, { size = 120, labels = [] } = {}) {
  const c = size / 2;
  const r = size / 2 - 6;
  const rings = [0.35, 0.7, 1];
  const pct = Math.max(0, Math.min(1, (Number(value) || 0) / (max || 1)));
  const parts = [`<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="radar">`];
  rings.forEach(ring => parts.push(`<circle cx="${c}" cy="${c}" r="${round(r * ring)}" fill="none" stroke="${palette.hair}" stroke-width="1"/>`));
  parts.push(`<path d="M ${c} ${c - r} L ${c + r * 0.82} ${c + r * 0.57} L ${c - r * 0.82} ${c + r * 0.57} Z" fill="none" stroke="${palette.hair}" stroke-width="1"/>`);
  parts.push(`<path d="M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c + r * Math.sin(pct * Math.PI * 2)} ${c - r * Math.cos(pct * Math.PI * 2)}" fill="none" stroke="${palette.accent}" stroke-width="1.4" stroke-opacity="0.8"/>`);
  const dots = labels.map((label, i) => {
    const angle = (i / Math.max(1, labels.length)) * Math.PI * 2 - Math.PI / 2;
    const spread = 0.35 + ((i * 37) % 60) / 100;
    const x = c + Math.cos(angle) * r * spread;
    const y = c + Math.sin(angle) * r * spread;
    return `<circle cx="${round(x)}" cy="${round(y)}" r="1.8" fill="${palette.accent}" fill-opacity="0.85"/>`;
  });
  parts.push(dots.join(''));
  parts.push(`<circle cx="${c}" cy="${c}" r="2" fill="${palette.accent}"/>`);
  parts.push(`<text x="${c}" y="${c + 4}" text-anchor="middle" font-size="14" fill="${palette.ink}">${escapeHtml(String(value ?? ''))}</text>`);
  parts.push('</svg>');
  return parts.join('');
}
