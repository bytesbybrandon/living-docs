import { validateDoc } from '../model/validate.js';
import { createContext, renderBlocks, documentStats } from './blocks.js';
import { THEMES as THEME_INFO } from '../model/schema.js';
import { resolveStyle } from './style.js';
import { timelineAssets } from './timeline.js';
import * as paperLight from './themes/paper-light.js';
import * as paperDark from './themes/paper-dark.js';
import * as hud from './themes/hud.js';
import { VARIANTS } from './themes/variants.js';

export const THEMES = {
  'paper-light': paperLight,
  'paper-dark': paperDark,
  hud,
  ...VARIANTS
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
export function renderDoc(model, { theme, baseDir, accent, stage = false } = {}) {
  const chosen = theme || model?.theme || 'paper-light';
  const themeModule = THEMES[chosen];
  if (!themeModule) {
    throw new RenderError(`Unknown theme "${chosen}". Available: ${Object.keys(THEMES).join(', ')}`);
  }

  const base = THEME_INFO[chosen]?.base || chosen;
  const validation = validateDoc(model, { defaultTheme: chosen });
  if (!validation.ok) {
    return { ok: false, theme: chosen, errors: validation.errors, warnings: [] };
  }

  const styled = resolveStyle(base, themeModule.palette, model.meta.style || {}, accent || model.meta.accent);
  const palette = styled.palette;
  const ctx = createContext({ theme: base, palette, baseDir, model });
  ctx.style = styled;
  const blocksHtml = renderBlocks(model.blocks, ctx);
  let html = themeModule.document({ model, ctx, palette, blocksHtml, style: styled });
  if (base !== chosen) html = html.replace(`class="theme-${base} `, () => `class="theme-${base} theme-${chosen} `);
  // Timeline runtime only ships when cues exist or a video stage is rendered, so static docs keep their bytes.
  if (model.timeline || stage) {
    html = html
      .replace('<html lang="en">', `<html lang="en" class="ld-timed${stage ? ' ld-stage' : ''}">`)
      .replace('</body>', () => `${timelineAssets(model)}</body>`);
  }
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
