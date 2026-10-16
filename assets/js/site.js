(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // ---------- mobile menu
  var top = document.querySelector('.top'), menuBtn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  function setMenu(open) {
    top.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  var desk = window.matchMedia('(min-width: 900px)');
  function onDesk() { if (desk.matches) setMenu(false); }
  if (desk.addEventListener) desk.addEventListener('change', onDesk); else if (desk.addListener) desk.addListener(onDesk);

  // ---------- reading progress and the current section in the nav
  var bar = document.querySelector('.progress span');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]:not(.btn)'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0) + ')';
    var cur = -1, line = window.innerHeight * 0.35;
    targets.forEach(function (el, i) { if (el && el.getBoundingClientRect().top < line) cur = i; });
    if (cur >= 0 && targets[cur].getBoundingClientRect().bottom < line) cur = -1;
    links.forEach(function (a, i) { a.classList.toggle('is-current', i === cur); });
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();

  // ---------- copy email
  var copyBtn = document.getElementById('copy-email'), email = document.getElementById('email');
  if (copyBtn && email) copyBtn.addEventListener('click', function () {
    function selectIt() { var r = document.createRange(); r.selectNodeContents(email); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = 'Selected'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email.textContent).then(function () { copyBtn.textContent = 'Copied'; }, selectIt);
    else selectIt();
  });

  // ---------- updates sign-up
  // Paste a form service URL here (for example a Formspree form) to start collecting sign-ups.
  var SIGNUP_ENDPOINT = '';
  var form = document.getElementById('signup');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input'), status = form.querySelector('.status'), button = form.querySelector('button');
    if (!input.value || !input.checkValidity()) { status.textContent = 'Please enter a valid email address.'; input.focus(); return; }
    if (!SIGNUP_ENDPOINT) { status.textContent = 'Sign-ups open soon. Until then, please email us using the address below.'; return; }
    button.disabled = true; status.textContent = 'Sending…';
    fetch(SIGNUP_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); status.textContent = 'Thanks. You are on the list.'; input.value = ''; })
      .catch(function () { status.textContent = 'That did not go through. Please try again or email us.'; })
      .then(function () { button.disabled = false; });
  });

  // ---------- central vision getting worse over scroll
  // Stages follow the National Eye Institute: early AMD has no symptoms, intermediate can bring mild central blur,
  // late AMD makes straight lines look wavy and a blurry area near the center grows or becomes blank spots.
  (function vision() {
    var section = document.querySelector('.prog');
    if (!section) return;
    var canvas = section.querySelector('canvas'), frame = canvas.parentNode, chip = section.querySelector('.prog-chip');
    var pbar = section.querySelector('.prog-bar span'), items = Array.prototype.slice.call(section.querySelectorAll('[data-stage]'));
    var NAMES = items.map(function (li) { return li.querySelector('b').textContent; });
    var STARTS = [0, 0.2, 0.42, 0.64];
    var ctx = canvas.getContext('2d'), img = new Image();
    var W = 0, H = 0, DPR = 1, scene, half, halfCtx, halfData = null, warped, warpedCtx, warpImg, layer, layerCtx, blurC, blurCtx, tiny, tinyCtx;
    var face = { x: 0, y: 0 }, ready = false, raf = 0, drawnP = -1, stage = -1;
    var probe = document.createElement('canvas').getContext('2d');
    probe.filter = 'blur(2px)';
    var hasFilter = probe.filter === 'blur(2px)';

    function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }

    function paintScene(c, w, h) {
      // warm backdrop, a window of straight lines, then the portrait
      var g = c.getContext('2d');
      g.save(); g.translate(w / 2, h); g.scale(1.2, 1);
      var grad = g.createRadialGradient(0, 0, 0, 0, 0, h);
      grad.addColorStop(0, '#F0A868'); grad.addColorStop(0.55, '#D9763E'); grad.addColorStop(1, '#A9481F');
      g.fillStyle = grad; g.fillRect(-w, -h, 2 * w, 2 * h); g.restore();
      var x0 = w * 0.07, x1 = w * 0.93, y0 = h * 0.05, y1 = h * 0.64, lw = Math.max(2, w * 0.009);
      g.fillStyle = 'rgba(255, 238, 218, 0.2)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = 'rgba(21, 12, 10, 0.42)'; g.lineWidth = lw; g.lineCap = 'butt';
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      g.beginPath();
      [0.36, 0.64].forEach(function (f) { g.moveTo(w * f, y0); g.lineTo(w * f, y1); });
      [0.2, 0.34, 0.48].forEach(function (f) { g.moveTo(x0, h * f); g.lineTo(x1, h * f); });
      g.stroke();
      g.fillStyle = 'rgba(21, 12, 10, 0.3)'; g.fillRect(x0 - w * 0.02, y1, x1 - x0 + w * 0.04, lw * 2.2);
      var pw = w * 0.857, ph = pw * img.naturalHeight / img.naturalWidth;
      g.drawImage(img, 0, h * 0.06, pw, ph);
      face.x = pw * 0.617; face.y = h * 0.06 + ph * 0.265;
    }

    function resize() {
      var r = frame.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
      if (!ready || w < 2 || (w === W && h === H)) return;
      W = w; H = h; canvas.width = W; canvas.height = H;
      scene = mk(W, H); paintScene(scene, W, H);
      var hw = Math.ceil(W / 2), hh = Math.ceil(H / 2);
      half = mk(hw, hh); halfCtx = half.getContext('2d'); halfCtx.drawImage(scene, 0, 0, hw, hh);
      try { halfData = halfCtx.getImageData(0, 0, hw, hh); } catch (e) { halfData = null; }
      warped = mk(hw, hh); warpedCtx = warped.getContext('2d'); warpedCtx.drawImage(half, 0, 0);
      warpImg = halfData ? warpedCtx.createImageData(hw, hh) : null;
      if (warpImg) warpImg.data.set(halfData.data);
      layer = mk(W, H); layerCtx = layer.getContext('2d');
      blurC = mk(hw, hh); blurCtx = blurC.getContext('2d');
      tiny = mk(hw, hh); tinyCtx = tiny.getContext('2d');
      drawnP = -1; draw(true);
    }

    // sinusoidal displacement around the fixation point, at half resolution
    function warp(amount) {
      // pixels outside the disc are never written, so the copy of the sharp scene made in resize() stays valid
      var w = half.width, h = half.height, src = halfData.data, out = warpImg.data;
      var cx = face.x / 2, cy = face.y / 2, R = w * 0.4, A = amount * w * 0.022, k = 6.2832 / (w * 0.13);
      var xa = Math.max(0, Math.floor(cx - R)), xb = Math.min(w - 2, Math.ceil(cx + R));
      var ya = Math.max(0, Math.floor(cy - R)), yb = Math.min(h - 2, Math.ceil(cy + R));
      for (var y = ya; y <= yb; y++) {
        for (var x = xa; x <= xb; x++) {
          var dx = (x - cx) / R, dy = (y - cy) / R, d = Math.sqrt(dx * dx + dy * dy);
          if (d >= 1) continue;
          var f = 1 - smooth(0.45, 1, d), a = A * f;
          var sx = clamp(x + a * Math.sin(y * k + 0.7), 0, w - 1.001), sy = clamp(y + a * Math.sin(x * k * 0.85 + 1.9), 0, h - 1.001);
          var ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, i00 = (iy * w + ix) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4, o = (y * w + x) * 4;
          for (var c = 0; c < 4; c++) {
            out[o + c] = (src[i00 + c] * (1 - fx) + src[i10 + c] * fx) * (1 - fy) + (src[i01 + c] * (1 - fx) + src[i11 + c] * fx) * fy;
          }
        }
      }
      warpedCtx.putImageData(warpImg, 0, 0, xa, ya, xb - xa + 1, yb - ya + 1);
    }

    function region(r) {
      var x0 = Math.max(0, Math.floor(face.x - r)), y0 = Math.max(0, Math.floor(face.y - r));
      return { x: x0, y: y0, w: Math.min(W, Math.ceil(face.x + r)) - x0, h: Math.min(H, Math.ceil(face.y + r)) - y0 };
    }

    function masked(source, radiusIn, radiusOut) {
      // draw half-resolution `source` at frame scale, kept only inside a soft disc around the fixation point
      var b = region(radiusOut), sx = source.width / W, sy = source.height / H;
      if (b.w < 1 || b.h < 1) return;
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.clearRect(b.x, b.y, b.w, b.h);
      layerCtx.imageSmoothingEnabled = true; layerCtx.imageSmoothingQuality = 'low';
      layerCtx.drawImage(source, b.x * sx, b.y * sy, b.w * sx, b.h * sy, b.x, b.y, b.w, b.h);
      layerCtx.globalCompositeOperation = 'destination-in';
      var m = layerCtx.createRadialGradient(face.x, face.y, radiusIn, face.x, face.y, radiusOut);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      layerCtx.fillStyle = m; layerCtx.fillRect(b.x, b.y, b.w, b.h);
      layerCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(layer, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
    }

    function blob(x, y, r, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(38, 24, 18,' + a + ')'); g.addColorStop(0.55, 'rgba(38, 24, 18,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(38, 24, 18, 0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }

    function progress() {
      var r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    }

    function draw(force) {
      raf = 0;
      var p = progress();
      var s = 0; for (var i = 1; i < STARTS.length; i++) if (p >= STARTS[i]) s = i;
      if (s !== stage) {
        stage = s;
        items.forEach(function (li, j) { li.classList.toggle('is-active', j === s); });
        if (chip) chip.textContent = NAMES[s];
      }
      if (pbar) pbar.style.transform = 'scaleX(' + p + ')';
      if (!ready || !W || (!force && Math.abs(p - drawnP) < 0.0015)) return;
      var blur = 0.45 * smooth(0.42, 0.58, p) + 0.55 * smooth(0.74, 0.94, p);
      var wv = smooth(0.64, 0.78, p), spot = smooth(0.8, 0.97, p);
      var plain = blur < 0.001 && wv < 0.001 && spot < 0.001;
      if (!force && plain && drawnP >= 0 && drawnP < STARTS[2]) return;  // healthy and early stages look identical
      drawnP = p;
      var t0 = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.drawImage(scene, 0, 0);
      var source = half;
      if (wv > 0.001 && halfData) { warp(wv); source = warped; masked(warped, W * 0.34, W * 0.42); }
      if (blur > 0.001) {
        var rIn = W * (0.06 + 0.12 * blur), rOut = W * (0.2 + 0.2 * blur);
        if (hasFilter) {
          var bpx = blur * W * 0.012, hb = region(rOut), m = Math.ceil(bpx * 2.5);
          var bx = Math.max(0, Math.floor(hb.x / 2) - m), by = Math.max(0, Math.floor(hb.y / 2) - m);
          var bw = Math.min(blurC.width - bx, Math.ceil(hb.w / 2) + 2 * m), bh = Math.min(blurC.height - by, Math.ceil(hb.h / 2) + 2 * m);
          blurCtx.clearRect(bx, by, bw, bh);
          blurCtx.filter = 'blur(' + bpx.toFixed(2) + 'px)';
          blurCtx.drawImage(source, bx, by, bw, bh, bx, by, bw, bh);
          blurCtx.filter = 'none';
        } else {
          blurCtx.clearRect(0, 0, blurC.width, blurC.height);
          var tw = Math.max(1, Math.round(blurC.width / (1 + blur * 7))), th = Math.max(1, Math.round(blurC.height / (1 + blur * 7)));
          tinyCtx.clearRect(0, 0, tiny.width, tiny.height);
          tinyCtx.drawImage(source, 0, 0, tw, th);
          blurCtx.imageSmoothingEnabled = true; blurCtx.imageSmoothingQuality = 'high';
          blurCtx.drawImage(tiny, 0, 0, tw, th, 0, 0, blurC.width, blurC.height);
        }
        masked(blurC, rIn, rOut);
        // contrast falls in the damaged area: a faint haze
        var hz = ctx.createRadialGradient(face.x, face.y, 0, face.x, face.y, rOut);
        hz.addColorStop(0, 'rgba(150, 110, 90,' + 0.22 * blur + ')'); hz.addColorStop(1, 'rgba(150, 110, 90, 0)');
        ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
      }
      if (spot > 0.001) {
        var u = W * (0.07 + 0.11 * spot);
        blob(face.x, face.y, u, 0.88 * spot);
        blob(face.x - W * 0.07 * spot, face.y + W * 0.04, u * 0.7, 0.7 * spot);
        blob(face.x + W * 0.06 * spot, face.y - W * 0.05, u * 0.6, 0.6 * spot);
      }
      window.__progMs = performance.now() - t0;
    }

    function queueDraw() { if (!raf) raf = requestAnimationFrame(function () { draw(false); }); }
    window.addEventListener('scroll', queueDraw, { passive: true });
    window.addEventListener('resize', function () { requestAnimationFrame(resize); });
    img.onload = function () { ready = true; resize(); };
    img.src = frame.querySelector('img').getAttribute('src');
    draw(false);
  })();
})();
