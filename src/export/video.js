// Video export: render the doc as a fixed stage, seek the timeline frame by frame in headless
// Chromium, and pipe PNG frames to ffmpeg. Playwright and ffmpeg are optional, found at run time.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { renderDoc, RenderError } from '../render/index.js';
import { timelineDuration } from '../render/timeline.js';

export const FORMATS = ['mp4', 'webm', 'gif'];

export class ExportError extends Error {
  constructor(message, { code, hint } = {}) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    this.hint = hint;
  }
}

export function parseSize(value = '1080x1350') {
  const match = /^(\d{2,4})x(\d{2,4})$/.exec(String(value));
  if (!match) throw new ExportError(`size must look like 1080x1350, got "${value}"`, { code: 'bad-size' });
  const [width, height] = [Number(match[1]), Number(match[2])];
  // yuv420p needs even dimensions.
  if (width % 2 || height % 2) throw new ExportError('size needs even width and height', { code: 'bad-size' });
  return { width, height };
}

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    throw new ExportError('video export needs the optional playwright package', {
      code: 'missing-playwright',
      hint: 'install playwright beside living-docs (npm i -D playwright, or npx -p @bytesbybrandon/living-docs -p playwright living-docs-axi ...), then npx playwright install chromium'
    });
  }
}

function ffmpegPath() {
  const bin = process.env.LIVING_DOCS_FFMPEG || 'ffmpeg';
  const probe = spawnSync(bin, ['-version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    throw new ExportError(`ffmpeg not found (${bin})`, {
      code: 'missing-ffmpeg',
      hint: 'install ffmpeg on PATH or set LIVING_DOCS_FFMPEG'
    });
  }
  return bin;
}

/**
 * Seek the stage frame by frame and hand each PNG to onFrame(buffer, index).
 * Frames are a pure function of t, so two runs on one machine match.
 */
export async function captureFrames({ html, width, height, scale = 1, fps = 30, duration, image = 'png' }, onFrame) {
  const chromium = await loadChromium();
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    throw new ExportError(`could not start Chromium: ${error.message.split('\n')[0]}`, {
      code: 'missing-browser',
      hint: 'npx playwright install chromium'
    });
  }
  try {
    const page = await browser.newPage({
      viewport: { width: Math.round(width / scale), height: Math.round(height / scale) },
      deviceScaleFactor: scale
    });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    // The flag must exist before the runtime script runs; setContent skips init scripts.
    await page.setContent(html.replace('<head>', '<head><script>window.__ldCapture = true;</script>'), { waitUntil: 'load' });
    if (!(await page.evaluate(() => window.__ld && window.__ldCapture))) throw new ExportError('stage runtime did not start in capture mode', { code: 'stage-error' });
    await page.evaluate(() => document.fonts.ready);
    if (pageErrors.length) throw new ExportError(`stage script failed: ${pageErrors[0]}`, { code: 'stage-error' });
    const total = Math.max(1, Math.round(duration * fps));
    for (let i = 0; i < total; i++) {
      await page.evaluate(t => window.__ld.seek(t), i / fps);
      await onFrame(await page.screenshot(image === 'jpeg' ? { type: 'jpeg', quality: 95 } : { type: 'png' }), i);
    }
    return { frames: total };
  } finally {
    await browser.close();
  }
}

function encoderArgs(format, { fps, gifWidth, gifFps }) {
  if (format === 'mp4') {
    return ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart'];
  }
  if (format === 'webm') {
    return ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', '33', '-b:v', '0', '-row-mt', '1'];
  }
  // One pass: build a palette from every frame, then dither against it.
  return ['-vf', `fps=${Math.min(gifFps, fps)},scale=${gifWidth}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`, '-loop', '0'];
}

/**
 * Render a model to mp4, webm, or gif.
 * @returns {Promise<{file: string, format: string, frames: number, duration: number, width: number, height: number, framesSha256: string, theme: string}>}
 */
export async function exportVideo(model, { theme, baseDir, format = 'mp4', size, fps = 30, scale = 1, out, gifWidth = 720, gifFps = 15 } = {}) {
  if (!FORMATS.includes(format)) throw new ExportError(`format must be one of: html, ${FORMATS.join(', ')}`, { code: 'bad-format' });
  const { width, height } = parseSize(size);
  const rendered = renderDoc(model, { theme, baseDir, stage: true });
  if (!rendered.ok) throw new RenderError('model invalid', { errors: rendered.errors });
  const bin = ffmpegPath();
  const duration = timelineDuration(model);
  const ffmpeg = spawn(bin, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...encoderArgs(format, { fps, gifWidth, gifFps }),
    '-fflags', '+bitexact', '-map_metadata', '-1',
    out
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  ffmpeg.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new ExportError(`ffmpeg failed: ${stderr.trim().split('\n').pop()}`, { code: 'ffmpeg-failed' }))));
  });
  const hash = createHash('sha256');
  let captured;
  try {
    // JPEG frames are ~4x faster to grab; GIF keeps lossless PNG so the palette is not built from artifacts.
    const image = format === 'gif' ? 'png' : 'jpeg';
    captured = await captureFrames({ html: rendered.html, width, height, scale, fps, duration, image }, buffer => {
      hash.update(buffer);
      if (ffmpeg.stdin.write(buffer)) return null;
      return new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    });
  } catch (error) {
    ffmpeg.stdin.end();
    await done.catch(() => {});
    throw error;
  }
  ffmpeg.stdin.end();
  await done;
  return { file: out, format, frames: captured.frames, duration, width, height, framesSha256: hash.digest('hex'), theme: rendered.theme };
}
