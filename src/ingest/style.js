import { THEMES } from '../model/schema.js';
import { toHex, hslToRgb, parseHex } from '../render/style.js';

// Design a doc from its own source: pick a look from the shape of the content and
// derive an accent from the title. Deterministic, validated tokens only, always overridable.

const BASES = new Set(['paper-light', 'paper-dark']);

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

function words(blocks) {
  return blocks.reduce((sum, b) => sum + (typeof b.markdown === 'string' ? b.markdown.split(/\s+/).length : 0), 0);
}

/** Pick a theme from the content shape. */
export function chooseTheme(model) {
  const body = model.blocks.filter(b => b.type !== 'heading');
  const count = type => body.filter(b => b.type === type).length;
  const code = count('code');
  const tables = count('table');
  const dense = count('table') + count('list');
  if (code >= 3 || (body.length && code / body.length >= 0.15)) return 'blueprint';
  if (model.meta.abstract && (tables >= 1 || model.blocks.some(b => b.type === 'heading' && /^\d/.test(b.title)))) return 'paper-light';
  if (words(body) >= 1500 && tables === 0) return 'editorial';
  if (body.length >= 10 && dense / body.length >= 0.4) return 'paper-dark';
  if (body.length <= 14) return 'field-notes';
  return 'paper-dark';
}

/** Accent seed from the title: a stable hue at a tuned saturation and lightness. */
export function seedFromTitle(title, theme) {
  const hue = (hash(title) % 360) / 360;
  return toHex(hslToRgb({ h: hue, s: 0.5, l: theme === 'paper-dark' ? 0.62 : 0.38 }));
}

/**
 * Return { theme, style } for a drafted model.
 * `theme` and `seed` are explicit overrides; curated looks keep their own accent.
 */
export function draftDesign(model, { theme, seed } = {}) {
  if (theme && !THEMES[theme]) throw new Error(`unknown theme "${theme}"`);
  const chosen = theme || chooseTheme(model);
  const base = THEMES[chosen].base || chosen;
  const style = {};
  const accent = seed && parseHex(seed) ? seed : BASES.has(chosen) ? seedFromTitle(model.meta.title, chosen) : null;
  if (accent) style.seed = accent;
  const body = model.blocks.length;
  if (body <= 12) style.density = 'roomy';
  else if (body >= 80) style.density = 'compact';
  if (chosen === 'blueprint') style.type = 'technical';
  if (chosen === 'editorial') style.figure = 'minimal';
  return { theme: chosen, base, style };
}
