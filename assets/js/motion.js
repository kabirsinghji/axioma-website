// Axioma Therapeutics site motion. No dependencies.
// - Header turns solid once you scroll past the top.
// - Hero and footer: a live field of drifting peptide beads with depth of field.
// - "Our approach": a pinned scene where a peptide chain folds and settles onto a flat
//   protein surface as you scroll.
// - Sections fade up as they enter view; the AMD figures count up.
// Anyone with "reduce motion" turned on gets the static site.
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');

  // ---------- header state (runs for everyone) ----------
  function headerState() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  headerState();
  window.addEventListener('scroll', headerState, { passive: true });

  if (!root.classList.contains('motion')) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var small = window.matchMedia('(max-width: 760px)').matches;

  // ---------- helpers ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function picker(weighted, rand) {
    var total = 0, i;
    for (i = 0; i < weighted.length; i++) total += weighted[i][1];
    return function () {
      var r = rand() * total;
      for (i = 0; i < weighted.length; i++) { r -= weighted[i][1]; if (r <= 0) return weighted[i][0]; }
      return weighted[0][0];
    };
  }

  var DARK = [['#1E3A52', 40], ['#3DB5BF', 26], ['#DCE6EA', 22], ['#0E7C86', 8], ['#E3A72F', 4]];
  var LIGHT = [['#F4F7F8', 62], ['#C9E6E8', 16], ['#0E7C86', 10], ['#1C3550', 8], ['#E3A72F', 4]];

  // ---------- shaded, pre-blurred bead sprites ----------
  var BASE_R = 30;
  var BLUR = [0, 1.6, 3.6, 6.5, 10.5];
  var canFilter = (function () {
    try { var c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; }
    catch (e) { return false; }
  })();
  var sprites = {};
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(c, to, t) {
    return 'rgb(' + Math.round(lerp(c[0], to[0], t)) + ',' + Math.round(lerp(c[1], to[1], t)) + ',' + Math.round(lerp(c[2], to[2], t)) + ')';
  }
  function sprite(color, level) {
    var key = color + level;
    if (sprites[key]) return sprites[key];
    var blur = canFilter ? BLUR[level] : 0;
    var pad = Math.ceil(blur * 2.4) + 2;
    var size = (BASE_R + pad) * 2;
    var c = size / 2, r = BASE_R, base = rgb(color);
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    if (blur) g.filter = 'blur(' + blur + 'px)';
    var shade = g.createRadialGradient(c - r * 0.38, c - r * 0.42, r * 0.05, c, c, r);
    shade.addColorStop(0, mix(base, [255, 255, 255], 0.55));
    shade.addColorStop(0.5, mix(base, [255, 255, 255], 0.06));
    shade.addColorStop(1, mix(base, [0, 0, 0], 0.4));
    g.fillStyle = shade;
    g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
    var spec = g.createRadialGradient(c - r * 0.4, c - r * 0.45, 0, c - r * 0.4, c - r * 0.45, r * 0.34);
    spec.addColorStop(0, 'rgba(255,255,255,0.7)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = spec;
    g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
    sprites[key] = { img: cv, size: size };
    return sprites[key];
  }
  function bead(ctx, x, y, radius, color, defocus, alpha) {
    var level = clamp(Math.round(defocus * (BLUR.length - 1)), 0, BLUR.length - 1);
    var s = sprite(color, level);
    var w = s.size * radius / BASE_R;
    ctx.globalAlpha = canFilter ? alpha : alpha * (1 - defocus * 0.5);
    ctx.drawImage(s.img, x - w / 2, y - w / 2, w, w);
  }

  // ---------- canvas sizing + a frame loop that sleeps when off screen ----------
  function sizer(canvas) {
    var box = { w: 1, h: 1 };
    function fit() {
      var r = canvas.getBoundingClientRect();
      box.w = Math.max(1, r.width); box.h = Math.max(1, r.height);
      var w = Math.round(box.w * DPR), h = Math.round(box.h * DPR);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    fit();
    window.addEventListener('resize', fit);
    return box;
  }
  function animate(canvas, draw) {
    var visible = false, raf = 0, t0 = performance.now();
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', kick);
    return kick;
  }

  // ---------- hero + footer bead fields ----------
  var pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function beadField(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var box = sizer(canvas);
    var rand = rng(opts.seed);
    var pick = picker(DARK, rand);
    var count = small ? opts.count[0] : opts.count[1];
    var beads = [];
    for (var i = 0; i < count; i++) {
      beads.push({
        x: rand(), y: rand(), z: rand(), r: lerp(0.7, 1.25, rand()), c: pick(),
        vx: (rand() - 0.5) * 0.012, vy: -0.004 - rand() * 0.01, ph: rand() * 6.283
      });
    }
    var chain = [];
    if (opts.chain) for (i = 0; i < (small ? 26 : 38); i++) chain.push(pick());

    var kick = animate(canvas, function (t) {
      var W = box.w, H = box.h, unit = Math.min(Math.max(W, H) / 60, 30);
      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      pointer.sy += (pointer.y - pointer.sy) * 0.05;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0B1724';
      ctx.fillRect(0, 0, W, H);
      var items = [];
      beads.forEach(function (b) {
        var x = ((b.x + b.vx * t + 0.015 * Math.sin(t * 0.4 + b.ph)) % 1 + 1) % 1;
        var y = ((b.y + b.vy * t) % 1 + 1) % 1;
        var near = 1 - b.z;
        items.push({
          x: -60 + x * (W + 120) - pointer.sx * 50 * near,
          y: -60 + y * (H + 120) - pointer.sy * 34 * near,
          r: unit * b.r * lerp(0.45, 1.6, near), c: b.c, z: b.z,
          d: Math.abs(b.z - 0.42) * 1.6, a: lerp(0.55, 1, near)
        });
      });
      chain.forEach(function (c, k) {
        var u = k / (chain.length - 1);
        var th = u * Math.PI * 2 * 2.6 + t * 0.55;
        var ax = small ? lerp(0.15, 1.05, u) : lerp(0.52, 1.06, u);
        var ay = lerp(1.08, -0.08, u);
        var depth = 0.36 + 0.1 * Math.sin(th);
        var near = 1 - depth;
        items.push({
          x: ax * W + Math.cos(th) * unit * 3.4 - pointer.sx * 40 * near,
          y: ay * H + Math.cos(th) * unit * 1.6 - pointer.sy * 28 * near,
          r: unit * 0.95 * lerp(0.6, 1.4, near), c: c, z: depth,
          d: Math.abs(depth - 0.36) * 1.2, a: 1
        });
      });
      items.sort(function (a, b) { return b.z - a.z; });
      items.forEach(function (p) { bead(ctx, p.x, p.y, p.r, p.c, clamp(p.d, 0, 1), p.a); });
      ctx.globalAlpha = 1;
      if (!canvas.classList.contains('is-live')) canvas.classList.add('is-live');
    });
    kick();
  }

  // ---------- "Our approach": peptide chain that folds onto a flat surface as you scroll ----------
  function approachScene(section) {
    var canvas = section.querySelector('.scrolly-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var box = sizer(canvas);
    var rand = rng(11);
    var pick = picker(LIGHT, rand);
    var N = 34, chain = [];
    for (var i = 0; i < N; i++) chain.push(pick());
    var surface = [];
    for (var gx = -9; gx <= 9; gx++) {
      for (var gz = -6; gz <= 6; gz++) {
        surface.push({ x: gx * 0.16 + (gz % 2 ? 0.08 : 0), z: gz * 0.14, c: rand() < 0.08 ? '#C9E6E8' : '#DCE5E8' });
      }
    }
    var progress = 0, shown = 0;

    function measure() {
      var r = section.getBoundingClientRect();
      var span = Math.max(1, r.height - window.innerHeight);
      progress = clamp(-r.top / span, 0, 1);
      kick();
    }

    function chainPoint(u, p, t) {
      var th = u * Math.PI * 2 * 4.2;
      var ax = lerp(-1.35, 1.35, u), ay = -0.5 + 0.2 * Math.sin(u * 7 + t * 0.6), az = 0.28 * Math.cos(u * 5 + t * 0.45);
      var bx = lerp(-0.85, 0.85, u), by = -0.2 + 0.2 * Math.cos(th), bz = 0.2 * Math.sin(th);
      var cx = bx * 0.95, cy = 0.3 + 0.13 * Math.cos(th), cz = bz;
      if (p < 0.5) {
        var e = ease(p / 0.5);
        return [lerp(ax, bx, e), lerp(ay, by, e), lerp(az, bz, e)];
      }
      var f = ease((p - 0.5) / 0.5);
      return [lerp(bx, cx, f), lerp(by, cy, f), lerp(bz, cz, f)];
    }

    var kick = animate(canvas, function (t) {
      shown += (progress - shown) * 0.08;
      var W = box.w, H = box.h;
      var S = Math.min(W * (small ? 0.62 : 0.4), H * 0.62);
      var cxs = W * (small ? 0.5 : 0.66), cys = H * (small ? 0.42 : 0.5);
      var ang = -0.65 + shown * 1.2 + 0.06 * Math.sin(t * 0.3);
      var tilt = 0.35;
      var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
      function project(x, y, z) {
        var x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
        var y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        var persp = 3.2 / (3.2 + z2);
        return { x: cxs + x1 * S * persp, y: cys + y2 * S * persp, s: persp, z: z2 };
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#E9EFF1';
      ctx.fillRect(0, 0, W, H);
      var items = [];
      var surfaceY = 0.48;
      surface.forEach(function (b) {
        var q = project(b.x, surfaceY, b.z);
        items.push({ x: q.x, y: q.y, r: 0.062 * S * q.s, c: b.c, z: q.z, d: Math.abs(q.z) * 0.9, a: 0.95 });
      });
      for (var k = 0; k < N; k++) {
        var pt = chainPoint(k / (N - 1), shown, t);
        var q = project(pt[0], pt[1], pt[2]);
        items.push({ x: q.x, y: q.y, r: 0.085 * S * q.s, c: chain[k], z: q.z - 0.001, d: Math.abs(q.z) * 0.7, a: 1 });
      }
      items.sort(function (a, b) { return b.z - a.z; });
      items.forEach(function (p) { bead(ctx, p.x, p.y, p.r, p.c, clamp(p.d, 0, 1), p.a); });
      ctx.globalAlpha = 1;
      if (!canvas.classList.contains('is-live')) canvas.classList.add('is-live');
    });

    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();

    // the three step cards fade in as each reaches the middle of the screen
    var steps = section.querySelectorAll('[data-step]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-in'); });
    }, { rootMargin: '0px 0px -30% 0px', threshold: 0.2 });
    Array.prototype.forEach.call(steps, function (s) { io.observe(s); });
  }

  // ---------- reveal on scroll + count-up ----------
  function reveals() {
    var items = document.querySelectorAll('[data-reveal]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }
  function countUp() {
    var els = document.querySelectorAll('[data-count]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute('data-count')), t0 = performance.now();
        (function step(now) {
          var p = clamp((now - t0) / 1400, 0, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  if (!('IntersectionObserver' in window)) {
    root.classList.remove('motion');
    return;
  }
  Array.prototype.forEach.call(document.querySelectorAll('.bead-canvas'), function (cv) {
    var hero = cv.getAttribute('data-field') === 'hero';
    beadField(cv, { seed: hero ? 7 : 19, count: hero ? [38, 78] : [26, 54], chain: hero });
  });
  var scrolly = document.querySelector('.scrolly');
  if (scrolly) approachScene(scrolly);
  reveals();
  countUp();
})();
