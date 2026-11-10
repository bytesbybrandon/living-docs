import { validateDoc } from '../model/validate.js';
import { createContext, renderBlocks, documentStats } from './blocks.js';
import { THEMES as THEME_INFO } from '../model/schema.js';
import * as paperLight from './themes/paper-light.js';
import * as paperDark from './themes/paper-dark.js';
import * as hud from './themes/hud.js';

export const THEMES = {
  'paper-light': paperLight,
  'paper-dark': paperDark,
  hud
};

export class RenderError extends Error {
  constructor(message, { errors = [] } = {}) {
    super(message);
    this.name = 'RenderError';
    this.errors = errors;
  }
}

export function themeList() {
  return Object.entries(THEME_INFO).map(([name, info]) => ({
    name,
    summary: info.summary,
    best: info.best,
    blocks: THEMES[name].blocks || 'all'
  }));
}

/**
 * Render a document model to a complete, self-contained HTML string.
 * @returns {{ok: boolean, html?: string, stats?: object, warnings?: string[], errors?: object[], theme: string}}
 */
export function renderDoc(model, { theme, baseDir, accent } = {}) {
  const chosen = theme || model?.theme || 'paper-light';
  const themeModule = THEMES[chosen];
  if (!themeModule) {
    throw new RenderError(`Unknown theme "${chosen}". Available: ${Object.keys(THEMES).join(', ')}`);
  }

  const validation = validateDoc(model, { defaultTheme: chosen });
  if (!validation.ok) {
    return { ok: false, theme: chosen, errors: validation.errors, warnings: [] };
  }

  const palette = { ...themeModule.palette, ...(accent || model.meta.accent ? { accent: accent || model.meta.accent } : {}) };
  const ctx = createContext({ theme: chosen, palette, baseDir, model });
  const blocksHtml = renderBlocks(model.blocks, ctx);
  const html = themeModule.document({ model, ctx, palette, blocksHtml });
  const stats = documentStats(model, html);

  return {
    ok: true,
    theme: chosen,
    html,
    stats,
    warnings: ctx.warnings,
    errors: []
  };
}

export { documentStats };
