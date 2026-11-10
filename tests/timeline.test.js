import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { renderDoc } from '../src/render/index.js';
import { validateDoc } from '../src/model/validate.js';
import { renderInline, plainText } from '../src/model/markdown.js';
import { draftCues } from '../src/ingest/cues.js';
import { timelineDuration } from '../src/render/timeline.js';
import { captureFrames, exportVideo } from '../src/export/video.js';

const base = () => ({
  schemaVersion: 1,
  theme: 'paper-dark',
  meta: { title: 'Timeline', abstract: 'Intro. [[mark:one|The loop writes the harness and keeps the best edit.]] Done.' },
  blocks: [
    { type: 'stats', id: 'nums', items: [{ label: 'edits', value: '1,280' }, { label: 'score', value: '4.25' }] },
    { type: 'prose', id: 'body', markdown: 'Typed text appears here.' },
    {
      type: 'figure', id: 'loop', caption: 'Loop', spec: 'diagram',
      diagram: { width: 400, height: 160, nodes: [{ id: 'a', label: 'A', x: 20, y: 40 }, { id: 'b', label: 'B', x: 230, y: 40 }], edges: [{ from: 'a', to: 'b' }] }
    }
  ],
  timeline: {
    cues: [
      { at: 0.5, dur: 2, do: 'highlight', target: 'mark:one' },
      { at: 0.5, dur: 1, do: 'count', target: 'nums' },
      { at: 1, dur: 1, do: 'type', target: 'body' },
      { at: 2, dur: 1.5, do: 'focus', target: 'loop/b' },
      { at: 3, dur: 1, do: 'camera', target: 'loop' },
      { at: 4, dur: 1, do: 'camera', target: 'page' }
    ]
  }
});

const errorsOf = model => validateDoc(model).errors.map(error => `${error.path}: ${error.message}`);

test('cue marks render as anchored spans and strip to plain text', () => {
  assert.equal(renderInline('a [[mark:m-1|**bold** <b>]] z'), 'a <span class="ld-mark" data-mark="m-1"><strong>bold</strong> &lt;b&gt;</span> z');
  assert.equal(plainText('a [[mark:m-1|kept text]] z'), 'a kept text z');
  assert.equal(renderInline('[[mark:Bad|x]]'), '[[mark:Bad|x]]');
});

test('a valid timeline passes and its duration follows the last cue', () => {
  assert.deepEqual(errorsOf(base()), []);
  assert.equal(timelineDuration(base()), 6.5);
});

test('rejects cues that point at nothing or misuse an action', () => {
  const model = base();
  model.blocks.push({ type: 'prose', id: 'body', markdown: 'dup' });
  model.blocks.push({ type: 'prose', id: 'Bad Id', markdown: 'x' });
  model.blocks.push({ type: 'prose', markdown: 'again [[mark:one|repeat sentence]]' });
  model.timeline.cues.push(
    { at: 0, do: 'focus', target: 'missing' },
    { at: 0, do: 'highlight', target: 'mark:nope' },
    { at: 0, do: 'focus', target: 'loop/zzz' },
    { at: 0, do: 'reveal', target: 'page' },
    { at: 0, do: 'focus', target: 'loop', zoom: 2 },
    { at: 0, do: 'activate', target: 'loop/a' },
    { at: -1, dur: 0, do: 'spin', target: 'loop' }
  );
  const errors = errorsOf(model).join('\n');
  assert.match(errors, /blocks\[3\]\.id: duplicate block id "body"/);
  assert.match(errors, /blocks\[4\]\.id: must match/);
  assert.match(errors, /duplicate mark id "one"/);
  assert.match(errors, /unknown block id "missing"/);
  assert.match(errors, /unknown mark "nope"/);
  assert.match(errors, /unknown part "zzz" in loop \(known: a, b\)/);
  assert.match(errors, /"page" is only a camera target/);
  assert.match(errors, /only camera cues take zoom/);
  assert.match(errors, /activate needs "<graphScene id>\/<label>"/);
  assert.match(errors, /timeline\.cues\[12\]\.do: must be one of/);
});

test('docs without a timeline ship no runtime and keep their bytes stable', () => {
  const model = base();
  delete model.timeline;
  const html = renderDoc(model).html;
  assert.doesNotMatch(html, /ld-timeline|__ld|ld-timed/);
  assert.match(html, /data-cue="loop"/);
  assert.equal(renderDoc(model).html, html);
});

test('a timeline inlines one runtime and renders deterministically', () => {
  const first = renderDoc(base()).html;
  assert.match(first, /<html lang="en" class="ld-timed">/);
  assert.equal((first.match(/id="ld-timeline"/g) || []).length, 1);
  assert.match(first, /@media print\{\.ld-t/);
  assert.doesNotMatch(first, /<script[^>]+src=/);
  assert.equal(renderDoc(base()).html, first);
  assert.match(renderDoc(base(), { stage: true }).html, /class="ld-timed ld-stage"/);
});

test('draftCues marks source sentences and builds a valid timeline', () => {
  const model = {
    schemaVersion: 1,
    theme: 'paper-dark',
    meta: { title: 'Doc', abstract: 'A harness is the program around a model and it is written by hand. The paper argues this is ending for good reasons. Short.' },
    blocks: [
      { type: 'heading', title: 'One' },
      { type: 'prose', markdown: 'The loop reads every failure and proposes eight edits to the file. Then it scores them.' },
      { type: 'stats', items: [{ label: 'n', value: '8' }] }
    ]
  };
  const drafted = draftCues(model);
  assert.deepEqual(errorsOf(drafted), []);
  assert.equal(drafted.timeline.cues.filter(cue => cue.do === 'highlight').length, 3);
  assert.match(drafted.meta.abstract, /^\[\[mark:s1\|A harness is the program/);
  assert.equal(drafted.blocks[1].id, 'lead-1');
  assert.deepEqual(drafted.timeline.cues.map(cue => cue.do), ['highlight', 'highlight', 'camera', 'highlight', 'count', 'camera']);
  assert.deepEqual(draftCues(model), drafted);
  assert.equal(model.timeline, undefined);
  assert.equal(draftCues(drafted), drafted);
});

const chromiumReady = await (async () => {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    await browser.close();
    return true;
  } catch {
    return false;
  }
})();
const ffmpegReady = !spawnSync(process.env.LIVING_DOCS_FFMPEG || 'ffmpeg', ['-version'], { stdio: 'ignore' }).error;

test('seek(t) is a pure function of t in the browser', { skip: !chromiumReady && 'playwright chromium not installed' }, async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent(renderDoc(base(), { stage: true }).html.replace('<head>', '<head><script>window.__ldCapture = true;</script>'));
    const probe = t => page.evaluate(at => {
      window.__ld.seek(at);
      const mark = document.querySelector('[data-mark="one"]');
      const part = document.querySelector('[data-cue="loop"] [data-part="b"]');
      return {
        hl: mark.style.getPropertyValue('--ld-hl'),
        stats: document.querySelector('[data-cue="nums"]').textContent.replace(/\s+/g, ' ').trim(),
        typed: [...(CSS.highlights.get('ld-untyped') || [])].map(range => range.toString()).join(''),
        focus: part.style.getPropertyValue('--ld-f'),
        cam: document.querySelector('.ld-cam').style.transform
      };
    }, t);
    const start = await probe(0);
    assert.equal(start.hl, '0.0000');
    assert.match(start.stats, /^0 edits 0\.00 score/);
    assert.equal(start.typed, 'Typed text appears here.');
    const mid = await probe(2.75);
    assert.equal(mid.focus, '1.0000');
    assert.match(mid.stats, /1,280 edits 4\.25 score/);
    assert.equal(mid.typed, '');
    const zoomed = await probe(4);
    assert.notEqual(zoomed.cam, start.cam);
    assert.deepEqual(await probe(2.75), mid);
    const end = await probe(6.5);
    assert.match(end.cam, /scale\(1\)/);
    assert.equal(end.focus, '0.0000');
  } finally {
    await browser.close();
  }
});

test('cues never move or zoom the page, so figures and text stay flat', { skip: !chromiumReady && 'playwright chromium not installed' }, async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent(renderDoc(base(), { stage: true }).html.replace('<head>', '<head><script>window.__ldCapture = true;</script>'));
    const layout = t => page.evaluate(at => {
      window.__ld.seek(at);
      const cam = document.querySelector('.ld-cam').getBoundingClientRect();
      return {
        scale: document.querySelector('.ld-cam').style.transform.match(/scale\(([\d.]+)\)/)[1],
        boxes: [...document.querySelectorAll('[data-cue], [data-part]')].map(el => {
          const r = el.getBoundingClientRect();
          return [r.left - cam.left, r.top - cam.top, r.width, r.height].map(n => Math.round(n));
        })
      };
    }, t);
    const settled = await layout(6.5);
    for (let t = 0; t <= 6.5; t += 0.25) {
      const frame = await layout(t);
      assert.equal(Number(frame.scale), 1, `scale at ${t}s`);
      assert.deepEqual(frame.boxes, settled.boxes, `layout at ${t}s`);
    }
  } finally {
    await browser.close();
  }
});

test('the live page holds a cue until its target scrolls into view', { skip: !chromiumReady && 'playwright chromium not installed' }, async () => {
  const model = base();
  model.blocks.splice(2, 0, ...Array.from({ length: 30 }, (_, i) => ({ type: 'prose', markdown: `Filler paragraph ${i} keeps the figure well below the fold on a phone.` })));
  model.timeline.cues = [{ at: 0.2, dur: 3, do: 'focus', target: 'loop/b' }];
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent(renderDoc(model).html);
    const focus = () => page.evaluate(() => Number(document.querySelector('[data-cue="loop"] [data-part="b"]').style.getPropertyValue('--ld-f') || 0));
    await page.waitForTimeout(900);
    assert.equal(await focus(), 0);
    await page.evaluate(() => document.querySelector('[data-cue="loop"]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(900);
    assert.ok(await focus() > 0.5);
  } finally {
    await browser.close();
  }
});

test('captured frames match across runs and follow fps x duration', { skip: !chromiumReady && 'playwright chromium not installed' }, async () => {
  const html = renderDoc(base(), { stage: true }).html;
  const run = async () => {
    const hashes = [];
    const result = await captureFrames({ html, width: 640, height: 900, fps: 4, duration: 2 }, buffer => {
      hashes.push(createHash('sha256').update(buffer).digest('hex'));
    });
    return { frames: result.frames, hashes };
  };
  const a = await run();
  const b = await run();
  assert.equal(a.frames, 8);
  assert.deepEqual(a.hashes, b.hashes);
  assert.notEqual(a.hashes[0], a.hashes[7]);
});

test('exports a gif through ffmpeg', { skip: (!chromiumReady || !ffmpegReady) && 'needs playwright chromium and ffmpeg' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-video-'));
  try {
    const model = base();
    model.timeline.duration = 1;
    const out = path.join(dir, 'doc.gif');
    const result = await exportVideo(model, { format: 'gif', size: '320x400', fps: 6, out, gifWidth: 160 });
    assert.equal(result.frames, 6);
    assert.equal(fs.readFileSync(out).subarray(0, 6).toString(), 'GIF89a');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
