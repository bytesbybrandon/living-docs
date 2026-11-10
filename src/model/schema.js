// Declarative document-model schema.
// One source of truth for validation, `schema` help output, and MCP tool hints.

const str = (desc, opts = {}) => ({ kind: 'string', desc, ...opts });
const num = (desc, opts = {}) => ({ kind: 'number', desc, ...opts });
const bool = (desc, opts = {}) => ({ kind: 'boolean', desc, ...opts });
const oneOf = (values, desc, opts = {}) => ({ kind: 'enum', values, desc, ...opts });
const any = (desc, opts = {}) => ({ kind: 'any', desc, ...opts });
const arr = (of, desc, opts = {}) => ({ kind: 'array', of, desc, ...opts });
const obj = (fields, desc, opts = {}) => ({ kind: 'object', fields, desc, ...opts });

const diagramNode = obj({
  id: str('unique node id, referenced by edges'),
  label: str('primary label'),
  sub: str('secondary label', { optional: true }),
  x: num('left edge, 0-1000 canvas units'),
  y: num('top edge, canvas units'),
  w: num('width, canvas units', { optional: true }),
  h: num('height, canvas units', { optional: true }),
  kind: oneOf(['box', 'accent', 'plain', 'dashed', 'stack'], 'visual treatment', { optional: true }),
  icon: oneOf(['file', 'clock', 'star', 'badge', 'none'], 'glyph drawn above the label', { optional: true })
}, 'boxed element');

const diagramEdge = obj({
  from: str('source node id'),
  to: str('target node id'),
  label: str('edge label', { optional: true }),
  style: oneOf(['arrow', 'line', 'dashed'], 'edge style', { optional: true }),
  route: oneOf(['straight', 'elbow'], 'path shape', { optional: true })
}, 'connector');

const diagramGroup = obj({
  label: str('group caption'),
  nodes: arr(str('node id'), 'members'),
  style: oneOf(['outline', 'shade'], 'group treatment', { optional: true })
}, 'cluster outline');

const diagramSpec = obj({
  width: num('viewBox width, default 1000', { optional: true }),
  height: num('viewBox height, default 520', { optional: true }),
  captionSide: oneOf(['below', 'none'], 'caption placement', { optional: true }),
  nodes: arr(diagramNode, 'boxes'),
  edges: arr(diagramEdge, 'connectors', { optional: true }),
  groups: arr(diagramGroup, 'cluster outlines', { optional: true }),
  notes: arr(str('small annotation'), 'free-floating notes', { optional: true })
}, 'diagram: boxes, arrows, labels; rendered as inline SVG', {
  check(value, path, err) {
    const ids = new Set();
    (value.nodes || []).forEach((node, i) => {
      if (typeof node?.id !== 'string' || !node.id) return;
      if (ids.has(node.id)) err(`${path}.nodes[${i}].id`, `duplicate node id "${node.id}"`);
      ids.add(node.id);
    });
    (value.edges || []).forEach((edge, i) => {
      for (const side of ['from', 'to']) {
        if (edge && typeof edge[side] === 'string' && !ids.has(edge[side])) {
          err(`${path}.edges[${i}].${side}`, `unknown node id "${edge[side]}"`);
        }
      }
    });
    (value.groups || []).forEach((group, i) => {
      (group?.nodes || []).forEach((id, j) => {
        if (!ids.has(id)) err(`${path}.groups[${i}].nodes[${j}]`, `unknown node id "${id}"`);
      });
    });
  }
});

const chartPoint = obj({
  x: num('x value'),
  y: num('y value'),
  label: str('optional point label', { optional: true })
}, 'data point');

const chartSeries = obj({
  name: str('legend label'),
  kind: oneOf(['line', 'dot', 'step', 'bar'], 'mark style', { optional: true }),
  tone: oneOf(['accent', 'ink', 'muted', 'kept', 'rejected'], 'palette slot', { optional: true }),
  points: arr(chartPoint, 'points', { optional: true }),
  values: arr(num('bar height'), 'values for bar marks', { optional: true }),
  labels: arr(str('bar label'), 'bar labels', { optional: true })
}, 'series', {
  check(value, path, err) {
    if (!value.points && !value.values) err(path, 'series needs `points` or `values`');
  }
});

const chartSpec = obj({
  kind: oneOf(['line', 'scatter', 'bar', 'steps'], 'chart family'),
  width: num('viewBox width, default 1000', { optional: true }),
  height: num('viewBox height, default 420', { optional: true }),
  xLabel: str('axis label', { optional: true }),
  yLabel: str('axis label', { optional: true }),
  xTicks: arr(num('tick value'), 'explicit x ticks', { optional: true }),
  yTicks: arr(num('tick value'), 'explicit y ticks', { optional: true }),
  yMax: num('upper bound (defaults to data max)', { optional: true }),
  yMin: num('lower bound (defaults to 0)', { optional: true }),
  series: arr(chartSeries, 'series'),
  annotations: arr(obj({
    text: str('annotation text'),
    x: num('x position'),
    y: num('y position')
  }, 'annotation'), 'text callouts', { optional: true }),
  legend: bool('draw legend, default true', { optional: true })
}, 'chart: line, scatter, bar, or step; rendered as inline SVG');

const panelKinds = ['repo', 'bars', 'list', 'radar', 'tree', 'log', 'heat', 'big', 'spark', 'code', 'hist', 'metrics', 'diff'];

const panel = obj({
  index: str('panel number, e.g. "01"'),
  title: str('panel heading'),
  tag: str('right-side tag', { optional: true }),
  kind: oneOf(panelKinds, 'panel body type'),
  data: any('payload for the chosen kind'),
  span: num('grid column span, default 1', { optional: true })
}, 'console panel', {
  check(value, path, err) {
    if (!panelKinds.includes(value?.kind)) return;
    const d = value.data;
    const need = (cond, msg) => { if (!cond) err(`${path}.data`, msg); };
    switch (value.kind) {
      case 'repo': need(d?.name, 'repo panel needs data.name'); break;
      case 'bars': need(Array.isArray(d?.rows) && d.rows.length, 'bars panel needs data.rows[]'); break;
      case 'list': need(Array.isArray(d?.rows) && d.rows.length, 'list panel needs data.rows[]'); break;
      case 'radar': need(d?.value != null, 'radar panel needs data.value'); break;
      case 'tree': need(Array.isArray(d?.items) && d.items.length, 'tree panel needs data.items[]'); break;
      case 'log': need(Array.isArray(d?.lines) && d.lines.length, 'log panel needs data.lines[]'); break;
      case 'heat': need(Array.isArray(d?.rows) && Array.isArray(d?.cols) && Array.isArray(d?.cells), 'heat panel needs data.rows, data.cols, data.cells'); break;
      case 'big': need(d?.value != null, 'big panel needs data.value'); break;
      case 'spark': need(Array.isArray(d?.values) && d.values.length > 1, 'spark panel needs data.values[]'); break;
      case 'code': need(Array.isArray(d?.lines), 'code panel needs data.lines[]'); break;
      case 'hist': need(Array.isArray(d?.values) && d.values.length, 'hist panel needs data.values[]'); break;
      case 'metrics': need(Array.isArray(d?.groups) && d.groups.length, 'metrics panel needs data.groups[]'); break;
      case 'diff': need(Array.isArray(d?.lines), 'diff panel needs data.lines[]'); break;
      default: break;
    }
  }
});

export const BLOCKS = {
  prose: {
    summary: 'Body text. Inline markdown: **bold**, *italic*, `code`, [link](url), [[1]] footnote ref.',
    fields: { markdown: str('text, may contain inline markdown') }
  },
  heading: {
    summary: 'Numbered section heading. Numbers are assigned by the renderer.',
    fields: {
      title: str('section title'),
      level: num('2 for section, 3 for subsection', { optional: true }),
      subtitle: str('optional deck under the heading', { optional: true })
    }
  },
  figure: {
    summary: 'Captioned graphic: generated diagram or chart SVG. Auto-numbered.',
    fields: {
      caption: str('caption text, printed after "Fig. N."'),
      spec: oneOf(['diagram', 'chart'], 'which generator to use'),
      diagram: { ...diagramSpec, optional: true },
      chart: { ...chartSpec, optional: true },
      span: oneOf(['column', 'page'], 'column width or full page', { optional: true })
    },
    check(value, path, err) {
      if (value.spec === 'diagram' && !value.diagram) err(path, 'figure with spec "diagram" needs `diagram`');
      if (value.spec === 'chart' && !value.chart) err(path, 'figure with spec "chart" needs `chart`');
    }
  },
  table: {
    summary: 'Rule-based table with small-caps head. Auto-numbered and captioned.',
    fields: {
      caption: str('table caption', { optional: true }),
      columns: arr(obj({
        label: str('header'),
        align: oneOf(['left', 'center', 'right'], 'alignment', { optional: true })
      }, 'column'), 'columns'),
      rows: arr(arr(str('cell text'), 'row cells'), 'rows'),
      span: oneOf(['column', 'page'], 'column width or full page', { optional: true })
    },
    check(value, path, err) {
      const n = (value.columns || []).length;
      (value.rows || []).forEach((row, i) => {
        if (!Array.isArray(row)) err(`${path}.rows[${i}]`, 'row must be an array of cells');
        else if (n && row.length !== n) err(`${path}.rows[${i}]`, `expected ${n} cells, got ${row.length}`);
      });
    }
  },
  algorithm: {
    summary: 'Numbered pseudocode block with hangs and an optional highlighted line.',
    fields: {
      title: str('algorithm name'),
      caption: str('caption under the header', { optional: true }),
      lines: arr(obj({
        text: str('line body'),
        comment: str('inline comment after the line', { optional: true }),
        highlight: bool('tint this line', { optional: true })
      }, 'line'), 'pseudocode lines')
    }
  },
  callout: {
    summary: 'Highlighted aside: takeaway box in papers, alert strip in the console.',
    fields: {
      tone: oneOf(['takeaway', 'note', 'warn'], 'visual tone'),
      title: str('short label', { optional: true }),
      body: str('text, inline markdown allowed')
    }
  },
  stats: {
    summary: 'Row of headline numbers with labels.',
    fields: {
      caption: str('optional caption', { optional: true }),
      items: arr(obj({
        label: str('metric name'),
        value: str('headline value'),
        note: str('secondary note', { optional: true })
      }, 'metric'), 'metrics')
    }
  },
  list: {
    summary: 'Ordered or unordered list with tight vertical rhythm.',
    fields: {
      style: oneOf(['decimal', 'bullet', 'dash'], 'marker style', { optional: true }),
      items: arr(str('item text, inline markdown allowed'), 'items')
    }
  },
  quote: {
    summary: 'Set-off quotation with attribution.',
    fields: {
      body: str('quoted text'),
      cite: str('attribution', { optional: true })
    }
  },
  code: {
    summary: 'Monospaced block; captioned when a caption is given.',
    fields: {
      body: str('code text'),
      lang: str('language label', { optional: true }),
      caption: str('caption', { optional: true })
    }
  },
  image: {
    summary: 'Supplied raster or SVG image, inlined as a data URI so the page stays self-contained.',
    fields: {
      src: str('file path, relative to the model file'),
      alt: str('alternative text'),
      caption: str('caption', { optional: true }),
      span: oneOf(['column', 'page'], 'column width or full page', { optional: true })
    }
  },
  footnotes: {
    summary: 'Footnote list printed at the foot of the document; reference with [[n]] in prose.',
    fields: { items: arr(str('footnote text'), 'footnotes') }
  },
  ticker: {
    summary: 'One-line console status strip. Console theme only; other themes hide it.',
    fields: { text: str('monospaced status line') }
  },
  graphScene: {
    summary: 'Console hero: force-graph scene with labels, an active node card, tabs, prompt line.',
    fields: {
      title: str('product title'),
      meta: arr(str('meta chip'), 'meta chips under the title', { optional: true }),
      tabs: arr(obj({ label: str('tab label'), active: bool('selected', { optional: true }) }, 'tab'), 'tabs', { optional: true }),
      command: str('prompt line text', { optional: true }),
      graph: obj({
        counts: str('node and link counts line', { optional: true }),
        azimuth: str('orientation readout', { optional: true }),
        seed: num('layout seed, default 7', { optional: true }),
        nodeCount: num('rendered node count, default 220', { optional: true }),
        active: obj({
          id: str('active node id'),
          badge: str('badge next to the active label', { optional: true }),
          card: obj({
            title: str('card title'),
            rows: arr(obj({ k: str('key'), v: str('value') }, 'row'), 'rows', { optional: true }),
            footer: str('card footer', { optional: true })
          }, 'detail card')
        }, 'focused node'),
        labels: arr(str('scene label'), 'free labels', { optional: true })
      }, 'scene payload'),
      action: obj({ label: str('action label'), right: str('right-side attribution', { optional: true }) }, 'action strip', { optional: true }),
      status: obj({
        seq: str('sequence number'),
        kind: str('record kind'),
        text: str('record title'),
        tail: str('right-side context')
      }, 'status line', { optional: true })
    }
  },
  panels: {
    summary: 'Console panel grid. Other themes render the same data as annotated cards.',
    fields: {
      columns: num('grid columns, default 4', { optional: true }),
      items: arr(panel, 'panels')
    }
  }
};

export const STYLE = {
  palette: oneOf(['default', 'ember', 'ocean', 'moss', 'graphite', 'ink', 'plum'], 'curated accent family', { optional: true }),
  seed: str('hex color that derives the accent family, e.g. #2f6f8f', { optional: true }),
  type: oneOf(['classic', 'editorial', 'technical', 'mono', 'hybrid', 'terminal'], 'curated type pairing', { optional: true }),
  density: oneOf(['compact', 'normal', 'roomy'], 'vertical rhythm', { optional: true }),
  figure: oneOf(['outline', 'solid', 'minimal'], 'diagram and chart treatment', { optional: true })
};

export const META = {
  title: str('document title'),
  subtitle: str('deck line', { optional: true }),
  kicker: str('top-left running head', { optional: true }),
  runningHead: str('top-right running head', { optional: true }),
  author: str('author or byline', { optional: true }),
  affiliation: str('affiliation line', { optional: true }),
  date: str('date line', { optional: true }),
  stamps: arr(str('margin stamp line'), 'vertical margin stamp', { optional: true }),
  abstract: str('abstract paragraph', { optional: true }),
  indexTerms: arr(str('term'), 'index terms', { optional: true }),
  footer: str('footer note', { optional: true }),
  accent: str('accent color override, any CSS color', { optional: true }),
  style: obj(STYLE, 'per-source style tokens: palette, seed, type, density, figure', {
    optional: true,
    check(value, path, err) {
      if (value?.seed && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.seed)) {
        err(`${path}.seed`, 'must be a hex color like #2f6f8f');
      }
    }
  })
};

export const THEMES = {
  'paper-light': {
    summary: 'Academic paper: serif, two justified columns, drop caps, margin stamp, print rules.',
    best: 'research papers, source-code studies, technical reports'
  },
  'paper-dark': {
    summary: 'Reading notes: cream on carbon, orange accent, rules, algorithm boxes, takeaway strip.',
    best: 'paper summaries, essays, annotated readings'
  },
  hud: {
    summary: 'Telemetry console: monospaced 12-panel grid, cyan accents, graph hero, live clock.',
    best: 'repo audits, skill catalogs, system snapshots, run reports'
  }
};

export function blockFieldSummary(type) {
  const block = BLOCKS[type];
  if (!block) return null;
  return {
    type,
    summary: block.summary,
    fields: Object.entries(block.fields).map(([name, spec]) => ({
      name,
      kind: spec.kind,
      required: !spec.optional,
      desc: spec.desc,
      ...(spec.values ? { values: spec.values } : {}),
      ...(spec.of ? { of: spec.of.kind } : {})
    }))
  };
}
