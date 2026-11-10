// Per-source style tokens. Everything resolves to a curated, validated set so the
// page stays coherent, deterministic, and printable. No arbitrary CSS is accepted.

export const PRESET_SEEDS = {
  ember: '#c2612f',
  ocean: '#2f6f8f',
  moss: '#4f6b47',
  graphite: '#5a6068',
  ink: '#3b4a5c',
  plum: '#7a4a6e'
};

const PAPER_TYPES = new Set(['classic', 'editorial', 'technical']);
const CONSOLE_TYPES = new Set(['mono', 'hybrid', 'terminal']);
const DENSITIES = new Set(['compact', 'normal', 'roomy']);
const FIGURES = new Set(['outline', 'solid', 'minimal']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseHex(value) {
  const text = String(value || '').trim();
  const match = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

export function toHex({ r, g, b }) {
  const part = value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mix(a, b, weight) {
  const first = parseHex(a) || { r: 0, g: 0, b: 0 };
  const second = parseHex(b) || { r: 255, g: 255, b: 255 };
  const t = clamp(weight, 0, 1);
  return toHex({
    r: first.r + (second.r - first.r) * t,
    g: first.g + (second.g - first.g) * t,
    b: first.b + (second.b - first.b) * t
  });
}

function relativeLuminance({ r, g, b }) {
  const channel = value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 1;
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
    else if (max === green) hue = ((blue - red) / delta + 2) / 6;
    else hue = ((red - green) / delta + 4) / 6;
  }
  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }
  const hue = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue(p, q, h + 1 / 3) * 255,
    g: hue(p, q, h) * 255,
    b: hue(p, q, h - 1 / 3) * 255
  };
}

/** Push a color's lightness until it clears the target contrast against a background. */
export function ensureContrast(color, background, target = 4.4) {
  const rgb = parseHex(color);
  const bg = parseHex(background);
  if (!rgb || !bg) return color;
  if (contrastRatio(color, background) >= target) return color;
  const hsl = rgbToHsl(rgb);
  const darken = relativeLuminance(bg) > 0.4;
  let best = color;
  let bestRatio = contrastRatio(color, background);
  for (let step = 1; step <= 26; step++) {
    const lightness = clamp(hsl.l + (darken ? -1 : 1) * step * 0.03, 0.04, 0.96);
    const candidate = toHex(hslToRgb({ ...hsl, l: lightness }));
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) { best = candidate; bestRatio = ratio; }
    if (ratio >= target) return candidate;
  }
  return best;
}

/**
 * Resolve style tokens into a palette plus body classes.
 * @param {string} theme
 * @param {object} basePalette theme default palette
 * @param {object} style raw `meta.style`
 * @param {string} [accentOverride] legacy `meta.accent`
 */
export function resolveStyle(theme, basePalette, style = {}, accentOverride) {
  const palette = { ...basePalette };
  const isConsole = theme === 'hud';
  const seed = style.seed || (style.palette && style.palette !== 'default' ? PRESET_SEEDS[style.palette] : null);
  let derivedFromSeed = false;

  if (seed && parseHex(seed)) {
    const accent = ensureContrast(seed, basePalette.bg, isConsole ? 4.6 : 4.2);
    palette.accent = accent;
    palette.accentSoft = mix(basePalette.bg, accent, isConsole ? 0.2 : 0.12);
    palette.box = mix(basePalette.surface, accent, isConsole ? 0.08 : 0.05);
    palette.boxStroke = mix(basePalette.hair, accent, isConsole ? 0.55 : 0.35);
    derivedFromSeed = true;
  }

  if (accentOverride) {
    const hex = parseHex(accentOverride);
    if (hex) {
      palette.accent = ensureContrast(accentOverride, basePalette.bg, isConsole ? 4.6 : 4.2);
      palette.accentSoft = mix(basePalette.bg, palette.accent, isConsole ? 0.2 : 0.12);
      palette.boxStroke = mix(basePalette.hair, palette.accent, isConsole ? 0.55 : 0.35);
      derivedFromSeed = true;
    } else {
      palette.accent = accentOverride;
    }
  }

  if (!derivedFromSeed) {
    palette.accent = basePalette.accent;
  }

  let type = style.type || (isConsole ? 'mono' : 'classic');
  if (isConsole && !CONSOLE_TYPES.has(type)) type = 'mono';
  if (!isConsole && !PAPER_TYPES.has(type)) type = 'classic';

  const density = DENSITIES.has(style.density) ? style.density : 'normal';
  const figure = FIGURES.has(style.figure) ? style.figure : 'outline';
  const layout = !isConsole && style.layout === 'single' ? 'single' : 'columns';

  return {
    palette,
    type,
    density,
    figure,
    layout,
    className: `density-${density} type-${type} fig-${figure} layout-${layout}`
  };
}

const palettes = palette => `:root{
  --ld-bg:${palette.bg};
  --ld-surface:${palette.surface};
  --ld-ink:${palette.ink};
  --ld-muted:${palette.muted};
  --ld-hair:${palette.hair};
  --ld-rule:${palette.rule};
  --ld-accent:${palette.accent};
  --ld-accent-soft:${palette.accentSoft};
  --ld-box:${palette.box};
  --ld-box-stroke:${palette.boxStroke};
}`;

const PAPER_OVERRIDES = `
body{background:var(--ld-bg);color:var(--ld-ink)}
.sheet{background:var(--ld-bg);border-color:var(--ld-hair)}
.doc-title,.doc-subtitle,.doc-author,.doc-date,.columns,.prose,.abstract,.sec-title,.quote p,.p-list-title,.p-big,.stat-value{color:var(--ld-ink)}
.doc-affil,.margin-stamp,figcaption,.tbl figcaption,.code-lang,.stat-label,.stat-note,.quote cite,.doc-foot,.stats-caption,.p-foot,.p-by,.p-owner,.p-log .l-n,.p-heat .h-head span,.p-heat .h-label,.fb-meta,.fb-label,.fb-card-foot,.p-radar-meta,.p-legend{color:var(--ld-muted)}
.abstract,.doc-foot,.footnotes,.stat,.panel,.tbl thead th,.tbl tbody tr:last-child td,.p-tree li,.p-rows dt,.algo-head,.code-block pre,.fb-tabs{border-color:var(--ld-rule)}
h2.sec-head,h3.sub-head{border-color:var(--ld-rule)}
.fig-num,.tbl-num,.algo-num,.callout-title,.p-stars,.p-log .l-verb{color:var(--ld-accent)}
.callout{border-color:var(--ld-accent);background:var(--ld-accent-soft)}
.callout-note{border-color:var(--ld-muted);background:var(--ld-surface)}
.callout-warn{border-color:var(--ld-accent);background:var(--ld-accent-soft)}
.algo{border-color:var(--ld-box-stroke);background:var(--ld-box)}
.algo-line.is-highlight{background:var(--ld-accent-soft)}
.code-block pre{background:var(--ld-box);border-color:var(--ld-hair);color:var(--ld-ink)}
.quote{border-color:var(--ld-accent)}
table thead th{color:var(--ld-ink)}
tbody td{color:var(--ld-ink)}
.p-bar-track{background:var(--ld-hair)}
.p-bar-track i,.p-heat .h-cell.is-on,.p-hist i{background:var(--ld-ink)}
.p-bar.is-active .p-bar-track i,.p-hist i:nth-last-child(-n+3),.p-tree li.is-active{border-color:var(--ld-accent);background:var(--ld-accent)}
.p-tree li.is-active{background:var(--ld-accent-soft)}
.p-heat .h-cell{background:var(--ld-hair)}
.p-code,.p-diff{color:var(--ld-ink)}
.scene-fallback,.fb-card{background:var(--ld-surface);border-color:var(--ld-hair)}
.fb-command{background:var(--ld-box);color:var(--ld-ink)}
.fb-tab.is-active{color:var(--ld-accent)}
a{color:var(--ld-accent)}
`;

const CONSOLE_OVERRIDES = `
body{background:#020409}
.hud{border-color:var(--ld-hair)}
.brand,.p-repo-name,.p-list-title,.p-big,.stat-value,.sc-card-title,.sc-text,.ab-label,.prose,.doc-list,.quote p,.fb-title,.p-code,.p-diff,.p-metric b,.p-bar-value,.p-radar-meta b,.p-hist-meta b,.p-tree li{color:var(--ld-ink)}
.meta-row,.tabs,.panel-head,.panel-tag,.p-foot,.stat-label,.hud-foot,.scene-top,.scene-status,.p-log .l-n,.p-heat .h-head span,.p-heat .h-label,.p-by,.p-owner,.p-note,.p-legend,.quote cite,.code-lang,.footnotes,.ticker,.p-metrics span,.p-metric em,.fb-meta,.fb-label,.fb-rows dt,.fb-card-foot,.p-tree .t-tag,.p-bar-label{color:var(--ld-muted)}
.panel{background:var(--ld-surface)}
.panel-grid{background:var(--ld-hair);border-color:var(--ld-hair)}
.scene{background:var(--ld-bg);border-color:var(--ld-hair)}
.panel-index,.panel-title,.sec-num,.p-stars,.sc-card-foot,.sc-seq,.callout-title,.fig-num,.tbl-num,.algo-num,.p-log .l-verb,.scene-label,.sc-row b{color:var(--ld-accent)}
.p-bar-track{background:var(--ld-box)}
.p-bar-track i,.p-bar.is-active .p-bar-track i,.p-hist i:nth-last-child(-n+3),.p-heat .h-cell.is-on{background:var(--ld-accent)}
.p-heat .h-cell{background:var(--ld-box)}
.sec-head,.hud-foot,.scene-status,.scene-top,.panel-grid,.stats,.code-block pre,.algo,.fig,.callout,.tbl thead th,.tbl tbody td,.scene{border-color:var(--ld-hair)}
.stats{background:var(--ld-hair)}
.stat{background:var(--ld-surface)}
.callout{background:var(--ld-accent-soft);border-left-color:var(--ld-accent)}
.tabs .tab.is-active{border-color:var(--ld-accent)}
.cmdline{background:var(--ld-box);border-color:var(--ld-hair);color:var(--ld-muted)}
.fb-card,.scene-fallback{background:var(--ld-surface);border-color:var(--ld-hair)}
a{color:var(--ld-accent)}
`;

const DENSITY = {
  'paper-light': {
    compact: `.sheet{padding:44px 56px 30px}.columns{font-size:12.9px;line-height:1.5}.abstract{font-size:12.7px}.fig{margin:11px 0}.algo-body{font-size:9.6px}`,
    normal: '',
    roomy: `.sheet{padding:60px 70px 38px}.columns{font-size:14.6px;line-height:1.68}.abstract{font-size:14px}.fig{margin:18px 0}`
  },
  'paper-dark': {
    compact: `.sheet{padding:20px 40px 22px}.columns{font-size:13.4px;line-height:1.54}.masthead{margin:24px auto 18px}.fig{margin:12px 0}`,
    normal: '',
    roomy: `.sheet{padding:28px 52px 30px}.columns{font-size:15.2px;line-height:1.7}.masthead{margin:42px auto 28px}.fig{margin:20px 0}`
  },
  hud: {
    compact: `.panel{padding:9px 11px 11px;min-height:142px}.prose{font-size:12.6px;line-height:1.6}.p-big{font-size:34px}.scene-stage{min-height:280px}`,
    normal: '',
    roomy: `.panel{padding:14px 15px 16px;min-height:180px}.prose{font-size:14.4px;line-height:1.78}.p-big{font-size:44px}.scene-stage{min-height:340px}`
  }
};

const TYPE = {
  'paper-light': {
    classic: '',
    editorial: `:root{--serif:"Charter","Bitstream Charter","Sitka Text",Cambria,Georgia,serif}.doc-title{letter-spacing:-.006em}`,
    technical: `body{font-family:var(--sans)}.doc-title,.doc-subtitle,.columns,.prose,.abstract,.quote p,.sec-title{font-family:var(--sans)}.doc-title{letter-spacing:-.021em}.columns{text-align:left;hyphens:none}`
  },
  'paper-dark': {
    classic: '',
    editorial: `:root{--serif:"Charter","Bitstream Charter","Sitka Text",Cambria,Georgia,serif}.doc-title{letter-spacing:-.008em}`,
    technical: `body{font-family:var(--sans)}.doc-title,.doc-subtitle,.columns,.prose,.abstract,.quote p,.sec-title{font-family:var(--sans)}.doc-title{letter-spacing:-.024em}.columns{text-align:left;hyphens:none}`
  },
  hud: {
    mono: '',
    hybrid: `body{font-family:var(--sans)}.panel-head,.meta-row,.tabs,.cmdline,.hud-foot,.p-foot,.stat-label,.p-log,.p-code,.p-diff,.algo-body,.ticker,.scene-status,.scene-label,.p-bar-value{font-family:var(--mono)}`,
    terminal: `body{letter-spacing:-.008em}.prose{font-family:var(--mono)}.sec-head{letter-spacing:.16em}`
  }
};

export function styleCss(theme, palette, resolved) {
  const overrides = theme === 'hud' ? CONSOLE_OVERRIDES : PAPER_OVERRIDES;
  const density = DENSITY[theme]?.[resolved.density] || '';
  const type = TYPE[theme]?.[resolved.type] || '';
  const layout = resolved.layout === 'single'
    ? '.columns{column-count:1;max-width:880px;margin-left:auto;margin-right:auto}.span-page{column-span:none}.footnotes{column-count:1}'
    : '';
  return `${palettes(palette)}${overrides}${density}${type}${layout}`;
}
