(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  document.body.appendChild(status);

  // Copy buttons: say so for screen readers, and fall back to selecting the text when the clipboard is blocked.
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      var label = button.textContent;
      var done = function () {
        button.textContent = 'Copied';
        status.textContent = 'Copied to clipboard';
        setTimeout(function () { button.textContent = label; status.textContent = ''; }, 1600);
      };
      var fail = function () {
        var code = button.parentNode.querySelector('code');
        if (code && window.getSelection) {
          var range = document.createRange();
          range.selectNodeContents(code);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        status.textContent = 'Copy is blocked here. The command is selected; press Control C to copy it.';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    });
  });

  var stage = document.querySelector('[data-stage]');
  if (!stage) return;
  var frames = {};
  stage.querySelectorAll('iframe[data-skin]').forEach(function (frame) { frames[frame.getAttribute('data-skin')] = frame; });
  var steps = Array.prototype.slice.call(document.querySelectorAll('[data-steps] .step'));
  var radios = stage.querySelectorAll('input[name="skin"]');
  var caption = stage.querySelector('[data-caption] span');
  var openLink = stage.querySelector('[data-open]');
  var pauseButton = stage.querySelector('[data-pause]');
  var replayButton = stage.querySelector('[data-replay]');
  var skin = root.getAttribute('data-theme') || 'paper-dark';
  var held = false;
  var current = -1;
  var tween = 0;

  // Only a same-origin frame that exposes the live clock can be scrubbed; anything else keeps playing by itself.
  function clock() {
    try {
      var frame = frames[skin];
      var ld = frame && frame.contentWindow && frame.contentWindow.__ld;
      return ld && typeof ld.pause === 'function' ? ld : null;
    } catch (error) { return null; }
  }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function glide(ld, to) {
    cancelAnimationFrame(tween);
    var from = ld.time();
    var start = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - start) / 700);
      ld.seek(from + (to - from) * ease(p));
      if (p < 1) tween = requestAnimationFrame(tick);
    })(start);
  }
  function showBlock(id) {
    try {
      var frame = frames[skin];
      var doc = frame.contentDocument;
      var el = doc && doc.querySelector('[data-cue="' + id + '"]');
      if (!el) return;
      var win = frame.contentWindow;
      win.scrollTo({ top: Math.max(0, win.scrollY + el.getBoundingClientRect().top - 24), behavior: reduce ? 'auto' : 'smooth' });
    } catch (error) { /* cross-origin: nothing to scroll */ }
  }
  function label() {
    pauseButton.textContent = held ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-pressed', held ? 'true' : 'false');
  }
  function follow(index) {
    var ld = clock();
    if (!ld || held || reduce) return;
    if (index < 0) { ld.replay(); return; }
    ld.pause();
    glide(ld, parseFloat(steps[index].getAttribute('data-at')));
    showBlock(steps[index].getAttribute('data-scroll'));
  }
  function setStep(index) {
    if (index === current) return;
    current = index;
    steps.forEach(function (step, i) { step.classList.toggle('is-active', i === index); });
    if (caption) caption.textContent = index >= 0 ? steps[index].querySelector('.say').textContent : '';
    follow(index);
  }

  var queued = false;
  function readingLine() {
    if (window.matchMedia('(max-width: 60rem)').matches) {
      var bottom = stage.getBoundingClientRect().bottom;
      return bottom + (window.innerHeight - bottom) * 0.35;
    }
    return window.innerHeight * 0.5;
  }
  function update() {
    queued = false;
    var line = readingLine();
    var index = -1;
    steps.forEach(function (step, i) {
      var box = step.getBoundingClientRect();
      if (box.top <= line) index = box.bottom > line || i === steps.length - 1 ? i : index;
    });
    setStep(index);
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);

  function whenReady(frame, run) {
    var tries = 0;
    (function poll() {
      if (clock()) { run(); return; }
      if (++tries < 60) setTimeout(poll, 50);
    })();
  }
  function load(name) {
    var frame = frames[name];
    if (frame && !frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
  }
  function setSkin(name) {
    if (!frames[name]) return;
    skin = name;
    root.setAttribute('data-theme', name);
    if (openLink) openLink.setAttribute('href', 'demo/' + name + '.html');
    Object.keys(frames).forEach(function (key) { frames[key].hidden = key !== name; });
    load(name);
    whenReady(frames[name], function () {
      var ld = clock();
      if (held) { ld.pause(); return; }
      if (current >= 0 && !reduce) {
        ld.pause();
        ld.seek(parseFloat(steps[current].getAttribute('data-at')));
        showBlock(steps[current].getAttribute('data-scroll'));
      }
    });
  }
  radios.forEach(function (radio) { radio.addEventListener('change', function () { if (radio.checked) setSkin(radio.value); }); });

  // The other two themes load after the first paint or on first touch of the switcher, so the first screen stays light.
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    Object.keys(frames).forEach(load);
  }
  var switcher = stage.querySelector('[data-skins]');
  ['pointerover', 'focusin', 'touchstart'].forEach(function (type) { switcher.addEventListener(type, warm, { once: true, passive: true }); });
  window.addEventListener('load', function () { setTimeout(warm, 3500); });

  pauseButton.addEventListener('click', function () {
    var ld = clock();
    if (!ld) return;
    held = !held;
    if (held) { cancelAnimationFrame(tween); ld.pause(); }
    else if (current >= 0) glide(ld, parseFloat(steps[current].getAttribute('data-at')));
    else ld.play();
    label();
  });
  replayButton.addEventListener('click', function () {
    var ld = clock();
    if (!ld) return;
    cancelAnimationFrame(tween);
    held = false;
    ld.replay();
    label();
  });
  // The idea runs to the end: the closing line gets the same wash when it comes into view.
  var closing = document.querySelector('.close h2');
  if (closing && window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { closing.classList.toggle('is-active', entry.isIntersecting); });
    }, { threshold: 0.9 }).observe(closing);
  } else if (closing) closing.classList.add('is-active');
  label();
  update();
})();
