// Timeline cues: one clock, every frame a pure function of t.
// The live page plays the cues once (or loops); video export calls window.__ld.seek(t) per frame.

const DEFAULT_DUR = 1.2;
const STAGE_ONLY_SECONDS = 6;

export function timelineDuration(model) {
  const timeline = model.timeline;
  if (!timeline) return STAGE_ONLY_SECONDS;
  if (timeline.duration) return timeline.duration;
  const end = Math.max(0, ...timeline.cues.map(cue => cue.at + (cue.dur || DEFAULT_DUR)));
  return Math.round((end + 1.5) * 1000) / 1000;
}

function payload(model) {
  const cues = (model.timeline?.cues || [])
    .map(cue => ({ at: cue.at, dur: cue.dur || DEFAULT_DUR, do: cue.do, target: cue.target, ...(cue.zoom ? { zoom: cue.zoom } : {}) }))
    .sort((a, b) => a.at - b.at);
  return { duration: timelineDuration(model), loop: !!model.timeline?.loop, cues };
}

const PROPS = [['r', 1], ['f', 0], ['dim', 0], ['hl', 0], ['ha', 0], ['hr', 0]];

const CSS = `
${PROPS.map(([name, initial]) => `@property --ld-${name}{syntax:'<number>';inherits:false;initial-value:${initial}}`).join('\n')}
.ld-mark{--ld-hlc:color-mix(in srgb,var(--ld-accent) calc(var(--ld-ha)*42%),transparent);background-image:linear-gradient(var(--ld-hlc),var(--ld-hlc));background-repeat:no-repeat;background-size:calc(var(--ld-hl)*100%) 100%;text-decoration-line:underline;text-decoration-color:color-mix(in srgb,var(--ld-accent) calc(var(--ld-hr)*75%),transparent);text-decoration-thickness:1.5px;text-underline-offset:.24em;border-radius:2px}
.ld-t:not(svg *):not(.ld-mark){opacity:calc(var(--ld-r)*(1 - var(--ld-dim)*.55 + var(--ld-f)*.55));translate:0 calc((1 - var(--ld-r))*16px);box-shadow:0 0 0 calc(var(--ld-f)*1.5px) color-mix(in srgb,var(--ld-accent) calc(var(--ld-f)*100%),transparent),0 0 calc(var(--ld-f)*34px) calc(var(--ld-f)*2px) color-mix(in srgb,var(--ld-accent) calc(var(--ld-f)*32%),transparent),inset 0 0 0 9999px color-mix(in srgb,var(--ld-accent) calc(var(--ld-ha)*9%),transparent)}
svg .ld-t{filter:opacity(calc(var(--ld-r)*(1 - var(--ld-dim)*.62 + var(--ld-f)*.62))) drop-shadow(0 0 calc(var(--ld-f)*9px) color-mix(in srgb,var(--ld-accent) calc(var(--ld-f)*100%),transparent));translate:0 calc((1 - var(--ld-r))*10px)}
.ld-count{font-variant-numeric:tabular-nums}
.ld-typing::after{content:"";display:inline-block;width:.5em;height:1.05em;margin-left:2px;vertical-align:-.14em;background:var(--ld-accent)}
.scene-label.is-matched{color:var(--ld-accent)}
html.ld-stage,html.ld-stage body{overflow:hidden!important}
html.ld-stage ::-webkit-scrollbar{display:none}
.ld-cam{transform-origin:0 0}
@media print{.ld-t{opacity:1!important;filter:none!important;translate:none!important;box-shadow:none!important}.ld-mark{background:none!important}.ld-cam{transform:none!important}}`;

const RUNTIME = `
(function(){
  var dataEl = document.getElementById('ld-timeline');
  if (!dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var root = document.documentElement;
  var stage = root.classList.contains('ld-stage');
  var duration = data.duration;
  var PROPS = ${JSON.stringify(PROPS.map(([name]) => name))};
  function clamp(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x){ x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, p){ return a + (b - a) * p; }
  function resolve(target){
    if (target === 'page') return null;
    if (target.indexOf('mark:') === 0) return document.querySelector('[data-mark="' + target.slice(5) + '"]');
    var parts = target.split('/');
    var block = document.querySelector('[data-cue="' + parts[0] + '"]');
    if (!block || parts.length < 2) return block;
    var list = block.querySelectorAll('[data-part]');
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('data-part') === parts[1]) return list[i];
    return null;
  }
  function textNodes(el){
    var out = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node;
    while ((node = walker.nextNode())) out.push({ node: node, text: node.nodeValue });
    return out;
  }
  function siblingsOf(el){
    var block = el.closest('[data-cue]');
    return block ? block.querySelectorAll('[data-part]') : [];
  }

  var items = [], cams = [], scenes = [], managed = [];
  function manage(el){ if (!el.__ld) { el.__ld = {}; managed.push(el); el.classList.add('ld-t'); } }
  data.cues.forEach(function(cue){
    var el = resolve(cue.target);
    if (cue.do === 'camera') { cams.push({ cue: cue, el: el }); return; }
    if (!el) return;
    if (cue.do === 'activate') {
      var scene = el.closest('.scene');
      if (!scene) return;
      if (scenes.indexOf(scene) < 0) {
        scenes.push(scene);
        scene.__ldMoves = [];
        scene.__ldParts = ['.scene-crosshair', '.scene-active-label', '.scene-badge', '.scene-card'].map(function(sel){ return scene.querySelector(sel); });
        var cross = scene.__ldParts[0];
        scene.__ldHome = cross ? { x: parseFloat(cross.style.left), y: parseFloat(cross.style.top) } : { x: 50, y: 50 };
        scene.__ldText = scene.__ldParts[1] ? scene.__ldParts[1].textContent : '';
      }
      scene.__ldMoves.push({ cue: cue, el: el });
      return;
    }
    manage(el);
    if (el.hasAttribute('data-part')) Array.prototype.forEach.call(siblingsOf(el), manage);
    if (cue.do === 'reveal') { el.classList.add('ld-rv'); el.__ldAt = el.__ldAt == null ? cue.at : Math.min(el.__ldAt, cue.at); }
    // Panels count and type their body only, so the panel number and title stay put.
    var body = el.querySelector('.panel-body') || el;
    if (cue.do === 'count') { el.classList.add('ld-count'); el.__ldText = el.__ldText || textNodes(body); }
    if (cue.do === 'type') el.__ldText = el.__ldText || textNodes(body);
    items.push({ cue: cue, el: el });
  });

  var cam = null;
  if (stage) {
    cam = document.createElement('div');
    cam.className = 'ld-cam';
    while (document.body.firstChild) cam.appendChild(document.body.firstChild);
    document.body.appendChild(cam);
  }

  function put(el, name, value){ if (!(el.__ld[name] >= value)) el.__ld[name] = value; }
  function countText(src, p){
    return src.replace(/\\d[\\d,]*(?:\\.\\d+)?/g, function(m){
      var dec = (m.split('.')[1] || '').length;
      var v = parseFloat(m.replace(/,/g, '')) * p;
      return m.indexOf(',') >= 0
        ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : v.toFixed(dec);
    });
  }

  function applyCues(t){
    var i, el;
    for (i = 0; i < managed.length; i++) managed[i].__ld = {};
    for (i = 0; i < items.length; i++) {
      var cue = items[i].cue, at = cue.at, dur = cue.dur;
      el = items[i].el;
      var p = clamp((t - at) / dur);
      if (cue.do === 'highlight') {
        put(el, 'hl', ease((t - at) / Math.min(.9, dur * .6)));
        put(el, 'ha', t < at ? 0 : clamp((at + dur - t) / .45));
        put(el, 'hr', clamp((t - (at + dur - .45)) / .45));
      } else if (cue.do === 'focus') {
        var env = Math.min(clamp((t - at) / .35), clamp((at + dur - t) / .45));
        put(el, 'f', env);
        if (el.hasAttribute('data-part')) Array.prototype.forEach.call(siblingsOf(el), function(part){ put(part, 'dim', env); });
      } else if (cue.do === 'reveal') {
        put(el, 'r', ease((t - at) / Math.min(dur, .9)));
      } else if (cue.do === 'count') {
        put(el, 'count', ease(p));
      } else if (cue.do === 'type') {
        put(el, 'type', p);
      }
    }
    for (i = 0; i < managed.length; i++) {
      el = managed[i];
      var state = el.__ld;
      for (var k = 0; k < PROPS.length; k++) {
        var name = PROPS[k];
        if (state[name] == null) el.style.removeProperty('--ld-' + name);
        else el.style.setProperty('--ld-' + name, state[name].toFixed(4));
      }
      if (state.count != null) el.__ldText.forEach(function(n){ n.node.nodeValue = countText(n.text, state.count); });
      if (state.type != null) {
        var left = Math.round(state.type * el.__ldText.reduce(function(sum, n){ return sum + n.text.length; }, 0));
        el.__ldText.forEach(function(n){ n.node.nodeValue = n.text.slice(0, Math.max(0, left)); left -= n.text.length; });
      }
      el.classList.toggle('ld-typing', state.type != null && state.type > 0 && state.type < 1);
    }
    scenes.forEach(function(scene){ moveScene(scene, t); });
    if (cam) moveCamera(t);
  }

  function moveScene(scene, t){
    var pos = { x: scene.__ldHome.x, y: scene.__ldHome.y }, text = scene.__ldText, away = 0, current = null;
    scene.__ldMoves.forEach(function(move){
      if (t < move.cue.at) return;
      var p = ease((t - move.cue.at) / move.cue.dur);
      var to = { x: parseFloat(move.el.style.left), y: parseFloat(move.el.style.top) };
      pos = { x: lerp(pos.x, to.x, p), y: lerp(pos.y, to.y, p) };
      if (p >= .5) text = move.el.getAttribute('data-part');
      away = Math.max(away, p);
      current = move.el;
    });
    scene.__ldMoves.forEach(function(move){ move.el.classList.toggle('is-matched', move.el === current); });
    var parts = scene.__ldParts;
    for (var i = 0; i < 3; i++) if (parts[i]) { parts[i].style.left = pos.x.toFixed(3) + '%'; parts[i].style.top = pos.y.toFixed(3) + '%'; }
    if (parts[1]) parts[1].classList.toggle('to-left', pos.x > 55);
    if (parts[2]) parts[2].classList.toggle('to-left', pos.x > 55);
    if (parts[1]) parts[1].textContent = text;
    if (parts[3]) parts[3].style.opacity = String(1 - away);
    scene.__ldActive = pos;
  }

  function rectOf(el){
    var r = el.getBoundingClientRect(), c = cam.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  }
  function moveCamera(t){
    cam.style.transform = 'none';
    var W = window.innerWidth, H = window.innerHeight, pageW = cam.scrollWidth, pageH = cam.scrollHeight;
    var view = { z: 1, x: 0, y: 0 };
    cams.forEach(function(item){
      if (t < item.cue.at) return;
      var goal = { z: 1, x: 0, y: 0 };
      if (item.el) {
        var r = rectOf(item.el);
        var z = item.cue.zoom || Math.min(W * .86 / r.w, H * .78 / r.h);
        z = Math.max(1, Math.min(3, z));
        goal = { z: z, x: W / 2 - (r.x + r.w / 2) * z, y: H / 2 - (r.y + r.h / 2) * z };
        goal.x = Math.min(0, Math.max(W - pageW * z, goal.x));
        goal.y = Math.min(0, Math.max(H - pageH * z, goal.y));
      }
      var p = ease((t - item.cue.at) / item.cue.dur);
      view = { z: lerp(view.z, goal.z, p), x: lerp(view.x, goal.x, p), y: lerp(view.y, goal.y, p) };
    });
    cam.style.transform = 'translate(' + view.x.toFixed(2) + 'px,' + view.y.toFixed(2) + 'px) scale(' + view.z.toFixed(4) + ')';
  }

  // Ambient motion (theme canvases, CSS figure motion) runs on the same clock.
  function applyAmbient(t){
    var hooks = window.__ldHooks || [];
    for (var i = 0; i < hooks.length; i++) hooks[i](t * 1000);
    if (!document.getAnimations) return;
    var list = document.getAnimations();
    for (var j = 0; j < list.length; j++) {
      var target = list[j].effect && list[j].effect.target;
      var owner = target && target.closest ? target.closest('.ld-rv') : null;
      var offset = owner && owner.__ldAt != null ? owner.__ldAt : 0;
      list[j].pause();
      list[j].currentTime = Math.max(0, t - offset) * 1000;
    }
  }

  function seek(t){ applyCues(t); applyAmbient(t); }
  window.__ld = { duration: duration, seek: seek };
  window.addEventListener('beforeprint', function(){ seek(duration); });

  if (window.__ldCapture) { seek(0); return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { seek(duration); return; }
  var start = null;
  function frame(now){
    if (start === null) start = now;
    var t = (now - start) / 1000;
    applyCues(data.loop ? t % duration : Math.min(t, duration));
    applyAmbient(data.loop ? t % duration : t);
    if (data.loop || t < duration || (window.__ldHooks || []).length) requestAnimationFrame(frame);
  }
  seek(0);
  requestAnimationFrame(frame);
})();
`;

/** Markup appended before </body> when a model has a timeline or renders as a video stage. */
export function timelineAssets(model) {
  const json = JSON.stringify(payload(model)).replace(/</g, '\\u003c');
  return `<style>${CSS}</style>
<script type="application/json" id="ld-timeline">${json}</script>
<script>${RUNTIME}</script>
`;
}
