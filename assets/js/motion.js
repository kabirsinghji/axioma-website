// Axioma Therapeutics site motion. No dependencies.
// The visuals follow the founders' computational design workflow. The molecule and every number drawn
// here are illustrative and generated in this file; they are not results and not a real target.
// - Hero: a designed cyclic peptide seated on a protein surface, turning slowly over a faint energy landscape.
// - "Our approach": a pinned scene whose four states follow the cards: the target surface, a sequence
//   search scored on energy, docking into a funnel of poses, then molecular dynamics and an alanine scan.
// - Footer: contour lines of a shifting energy landscape, with a search walking downhill.
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
  if (!('IntersectionObserver' in window)) { root.classList.remove('motion'); return; }

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
  var wideQuery = window.matchMedia('(min-width: 1024px)');

  // ---------- helpers ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rand) { return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(6.2832 * rand()); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function len(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function norm(a) { var l = len(a) || 1; return mul(a, 1 / l); }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function mono(ctx, size, weight) {
    ctx.font = (weight || 500) + ' ' + size + 'px ' + MONO;
    if ('letterSpacing' in ctx) ctx.letterSpacing = size < 14 ? '0.08em' : '0px';
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
      if (!canvas.classList.contains('is-live')) canvas.classList.add('is-live');
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', kick);
    return kick;
  }

  var pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  function followPointer() {
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
  }

  // =====================================================================================
  // The model: a small alpha/beta protein drawn as its C-alpha trace, and a cyclic 8-mer.
  // Built from ideal geometry in angstroms. Illustrative only.
  // =====================================================================================
  var FINAL = 'RWTKDFYE';          // the "designed" sequence
  var HOT = [1, 5];                // residues that carry binding in the alanine scan
  var AA = 'ACDEFGHIKLMNPQRSTVWY';

  var protein = (function () {
    var res = [];
    function put(list, kind) { list.forEach(function (p) { res.push({ p: p, ss: kind }); }); }
    function helix(n, x0, y0, z0, dir, ph) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var th = ph + i * 1.745;
        out.push([x0 + dir * i * 1.5, y0 + 2.3 * Math.cos(th), z0 + 2.3 * Math.sin(th)]);
      }
      return out;
    }
    function strand(n, x0, z0, dir, twist) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var x = x0 + dir * i * 3.3;
        out.push([x * Math.cos(twist), (i % 2 ? 0.85 : -0.85) + 0.012 * x * z0, z0 + x * Math.sin(twist)]);
      }
      return out;
    }
    function bez(a, b, c, d, t) {
      var u = 1 - t;
      return [0, 1, 2].map(function (k) { return u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]; });
    }
    function loop(a, da, b, db, bulge) {
      var out = norm(mul(add(a, b), 0.5));
      var p1 = add(add(a, mul(da, 4.5)), mul(out, bulge)), p2 = add(sub(b, mul(db, 4.5)), mul(out, bulge));
      var L = 0, prev = a, k;
      for (k = 1; k <= 24; k++) { var q = bez(a, p1, p2, b, k / 24); L += len(sub(q, prev)); prev = q; }
      var n = Math.max(1, Math.round(L / 3.8) - 1), pts = [];
      for (k = 1; k <= n; k++) pts.push(bez(a, p1, p2, b, k / (n + 1)));
      return pts;
    }
    var X = [1, 0, 0], NX = [-1, 0, 0];
    var hA = helix(14, -10, -10.5, -5, 1, 0);
    var s1 = strand(7, 9.9, -7.2, -1, 0.2), s2 = strand(7, -9.9, -2.4, 1, 0.07);
    var s3 = strand(7, 9.9, 2.4, -1, -0.07), s4 = strand(7, -9.9, 7.2, 1, -0.2);
    var hB = helix(14, 9.5, -10.5, 5, -1, 1.2);
    var last = function (l) { return l[l.length - 1]; };
    put(loop([-15, -3, -11], [0, -1, 0], hA[0], X, 1), 'L');
    put(hA, 'H');
    put(loop(last(hA), X, s1[0], NX, 4), 'L');
    put(s1, 'E');
    put(loop(last(s1), NX, s2[0], X, 1.2), 'L');
    put(s2, 'E');
    put(loop(last(s2), X, s3[0], NX, 1.2), 'L');
    put(s3, 'E');
    put(loop(last(s3), NX, s4[0], X, 1.2), 'L');
    put(s4, 'E');
    put(loop(last(s4), X, hB[0], NX, 4), 'L');
    put(hB, 'H');
    put(loop(last(hB), NX, [-15, -4, 11], [0, 1, 0], 1), 'L');

    // the binding surface: upward-facing strand residues near the middle of the sheet
    var patch = [];
    res.forEach(function (r, i) {
      r.patch = r.ss === 'E' && r.p[1] > 0 && Math.abs(r.p[0]) < 8 && Math.abs(r.p[2]) < 6;
      if (r.patch) patch.push(i);
    });
    var site = [0, 0, 0];
    patch.forEach(function (i) { site = add(site, res[i].p); });
    site = mul(site, 1 / patch.length);

    // center on the protein, then smooth the trace with a Catmull-Rom spline
    var c = [0, 0, 0];
    res.forEach(function (r) { c = add(c, r.p); });
    c = mul(c, 1 / res.length);
    c[1] -= 3;  // leave room above for the peptide
    res.forEach(function (r) { r.p = sub(r.p, c); });
    site = add(sub(site, c), [0, 5.6, 0]);

    var W = { H: 1.55, E: 1.4, L: 0.8 };
    var spline = [];
    for (var i = 0; i < res.length - 1; i++) {
      var p0 = res[Math.max(0, i - 1)].p, p1 = res[i].p, p2 = res[i + 1].p, p3 = res[Math.min(res.length - 1, i + 2)].p;
      for (var s = 0; s < 4; s++) {
        var t = s / 4, t2 = t * t, t3 = t2 * t;
        var pt = [0, 1, 2].map(function (k) {
          return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        });
        spline.push({ p: pt, w: lerp(W[res[i].ss], W[res[i + 1].ss], t), patch: res[i].patch && res[i + 1].patch ? 1 : (res[i].patch || res[i + 1].patch ? 0.5 : 0) });
      }
    }
    spline.push({ p: res[res.length - 1].p, w: W.L, patch: 0 });
    var patchCenter = sub(site, [0, 5.6, 0]);
    return { res: res, spline: spline, site: site, patchCenter: patchCenter };
  })();

  // cyclic 8-mer: backbone ring in the x-z plane, side chains on alternating faces (odd ones face the target, -y)
  var SC = { G: 0, A: 1, S: 2, C: 2, T: 3, V: 3, P: 3, D: 4, N: 4, I: 4, L: 4, M: 4, E: 5, Q: 5, K: 5, R: 6 };
  var POLAR = { S: 'O', T: 'O', D: 'O', E: 'O', Y: 'O', N: 'N', Q: 'N', K: 'N', R: 'N', C: 'S', M: 'S' };
  var pepCache = {};
  function buildPeptide(seq) {
    if (pepCache[seq]) return pepCache[seq];
    var atoms = [], bonds = [], ring = [];
    function at(p, el, r, sc, ca) { atoms.push({ p: p, el: el, r: r, sc: sc, ca: ca }); return atoms.length - 1; }
    function ringPt(phi, rad, y) { return [rad * Math.cos(phi), y, rad * Math.sin(phi)]; }
    for (var i = 0; i < 8; i++) {
      var phi = i * Math.PI / 4, pk = i % 2 ? 1 : -1;
      var ca = ringPt(phi, 4.3, pk * 0.5);
      var n = at(ringPt(phi - 0.27, 4.6, -pk * 0.2), 'N', i, false, ca);
      var a = at(ca, 'C', i, false, ca);
      var cc = at(ringPt(phi + 0.27, 4.6, pk * 0.2), 'C', i, false, ca);
      var o = at(ringPt(phi + 0.33, 5.85, -pk * 1.0), 'O', i, false, ca);
      bonds.push([n, a], [a, cc], [cc, o]);
      ring.push({ n: n, c: cc });

      // side chain
      var letter = seq[i], radial = [Math.cos(phi), 0, Math.sin(phi)], tang = [-Math.sin(phi), 0, Math.cos(phi)];
      var dir = norm(add(mul(radial, 0.5), [0, (i % 2 ? -0.86 : 0.86), 0]));
      var perp = norm(cross(dir, tang));
      var prev = a, j;
      if ('FYWH'.indexOf(letter) >= 0) {
        var cb = at(add(ca, mul(dir, 1.5)), 'C', i, true, ca);
        bonds.push([a, cb]);
        var m = letter === 'H' ? 5 : 6, rr = letter === 'H' ? 1.15 : 1.39;
        var center = add(ca, mul(dir, 1.5 + rr + 1.4)), idx = [];
        for (j = 0; j < m; j++) {
          var th = Math.PI + j * 2 * Math.PI / m;
          var el = letter === 'H' && (j === 1 || j === 3) ? 'N' : 'C';
          idx.push(at(add(center, add(mul(dir, Math.cos(th) * rr), mul(perp, Math.sin(th) * rr))), el, i, true, ca));
        }
        bonds.push([cb, idx[0]]);
        for (j = 0; j < m; j++) bonds.push([idx[j], idx[(j + 1) % m]]);
        if (letter === 'Y') { var oh = at(add(center, mul(dir, rr + 1.36)), 'O', i, true, ca); bonds.push([idx[3], oh]); }
        if (letter === 'W') {
          var e1 = at(add(center, add(mul(dir, -0.75), mul(perp, -2.55))), 'C', i, true, ca);
          var e2 = at(add(center, add(mul(dir, 0.75), mul(perp, -2.55))), 'N', i, true, ca);
          bonds.push([idx[1], e1], [e1, e2], [e2, idx[2]]);
        }
      } else {
        var count = SC[letter] || 0;
        for (j = 0; j < count; j++) {
          var p = add(ca, add(mul(dir, 1.45 * (j + 1)), mul(perp, j ? (j % 2 ? 0.6 : -0.6) : 0)));
          var cur = at(p, j === count - 1 && POLAR[letter] ? POLAR[letter] : 'C', i, true, ca);
          bonds.push([prev, cur]);
          prev = cur;
        }
      }
    }
    for (i = 0; i < 8; i++) bonds.push([ring[i].c, ring[(i + 1) % 8].n]);
    pepCache[seq] = { atoms: atoms, bonds: bonds };
    return pepCache[seq];
  }

  // place the peptide: d = 0 floating above the target, d = 1 bound in the site
  var FLOAT_OFFSET = [-6, 11, 4];
  function rotate(p, rx, ry, rz) {
    var x = p[0], y = p[1], z = p[2], c, s, t;
    c = Math.cos(rz); s = Math.sin(rz); t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(rx); s = Math.sin(rx); t = y * c - z * s; z = y * s + z * c; y = t;
    c = Math.cos(ry); s = Math.sin(ry); t = x * c + z * s; z = -x * s + z * c; x = t;
    return [x, y, z];
  }
  function placePeptide(pep, d, t, opts) {
    var e = ease(clamp(d, 0, 1));
    var site = protein.site, from = add(site, FLOAT_OFFSET);
    var pos = [lerp(from[0], site[0], e), lerp(from[1], site[1], e) + Math.sin(e * Math.PI) * 3, lerp(from[2], site[2], e)];
    var tumble = (1 - e) * t * 0.22;
    var rx = lerp(1.0, 0, e), ry = lerp(1.9, 0.3, e) + tumble, rz = lerp(-0.5, 0, e);
    var amp = opts.jitter || 0, grow = opts.grow;
    var wob = [Math.sin(t * 1.3) * amp * 0.8, Math.sin(t * 1.1 + 1) * amp * 0.6, Math.sin(t * 0.9 + 2) * amp * 0.8];
    return pep.atoms.map(function (a, i) {
      var p = a.p;
      if (a.sc && grow) p = add(a.ca, mul(sub(p, a.ca), grow[a.r]));
      p = rotate(p, rx, ry, rz);
      var j = amp ? [Math.sin(t * 3.1 + i * 1.7), Math.sin(t * 2.7 + i * 2.3), Math.sin(t * 3.7 + i * 0.9)] : [0, 0, 0];
      return add(add(add(pos, p), wob), mul(j, amp * 0.35));
    });
  }

  // contacts drawn as dashed lines once bound: polar peptide atoms to the nearest target C-alpha
  var contacts = (function () {
    var pep = buildPeptide(FINAL), placed = placePeptide(pep, 1, 0, {}), pairs = [];
    pep.atoms.forEach(function (a, i) {
      if (a.el === 'C') return;
      protein.res.forEach(function (r, k) {
        var dd = len(sub(placed[i], r.p));
        if (dd < 8.5) pairs.push([i, k, dd]);
      });
    });
    pairs.sort(function (a, b) { return a[2] - b[2]; });
    var usedA = {}, usedR = {}, out = [];
    pairs.forEach(function (p) {
      if (out.length >= 4 || usedA[p[0]] || usedR[p[1]]) return;
      usedA[p[0]] = usedR[p[1]] = 1;
      out.push(p);
    });
    return out;
  })();

  // ---------- drawing the model ----------
  var THEME = {
    dark: {
      tube: [[150, 212, 219], [34, 62, 86]], shine: [[232, 247, 248], [56, 90, 114]],
      patch: [[96, 214, 222], [32, 96, 108]],
      atom: { C: [227, 167, 47], N: [200, 228, 246], O: [236, 122, 98], S: [240, 214, 120] },
      bond: [184, 134, 44], contact: [240, 190, 92], fog: [11, 23, 36]
    },
    light: {
      tube: [[42, 72, 98], [186, 202, 212]], shine: [[132, 160, 180], [222, 230, 235]],
      patch: [[10, 140, 150], [120, 196, 202]],
      atom: { C: [227, 167, 47], N: [62, 108, 172], O: [212, 88, 66], S: [196, 158, 40] },
      bond: [168, 118, 28], contact: [14, 124, 134], fog: [233, 239, 241]
    }
  };
  var sprites = {};
  function sprite(c) {
    var key = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
    if (sprites[key]) return sprites[key];
    var R = 32, size = R * 2 + 4, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d'), m = size / 2;
    var sh = g.createRadialGradient(m - R * 0.36, m - R * 0.4, R * 0.05, m, m, R);
    sh.addColorStop(0, css(mix(c, [255, 255, 255], 0.62)));
    sh.addColorStop(0.45, css(c));
    sh.addColorStop(1, css(mix(c, [0, 0, 0], 0.42)));
    g.fillStyle = sh;
    g.beginPath(); g.arc(m, m, R, 0, 6.2832); g.fill();
    sprites[key] = { img: cv, k: size / R };
    return sprites[key];
  }

  function makeView(cx, cy, scale, yaw, pitch) {
    var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (p) {
      var x = p[0] * cyw + p[2] * syw, z = -p[0] * syw + p[2] * cyw;
      var y = p[1] * cp - z * sp, z2 = p[1] * sp + z * cp;
      var f = 150 / (150 + z2);
      return { x: cx + x * scale * f, y: cy - y * scale * f, z: z2, f: f };
    };
  }

  // o: { view, scale, theme, peptide: { atoms (world), pep, alpha, hot }, patch, contacts, labels }
  function drawModel(ctx, o) {
    var th = THEME[o.theme], view = o.view, S = o.scale, items = [], FOG = 22;
    function fogT(z) { return clamp((z + FOG) / (2 * FOG), 0, 1); }
    var sp = protein.spline, prev = view(sp[0].p), i;
    for (i = 1; i < sp.length; i++) {
      var cur = view(sp[i].p);
      items.push({ k: 0, a: prev, b: cur, z: (prev.z + cur.z) / 2, w: (sp[i - 1].w + sp[i].w) / 2, patch: sp[i - 1].patch });
      prev = cur;
    }
    var P = o.peptide, proj = [];
    if (P && P.alpha > 0.01) {
      proj = P.atoms.map(view);
      P.pep.bonds.forEach(function (bd) {
        var a = proj[bd[0]], b = proj[bd[1]];
        items.push({ k: 1, a: a, b: b, z: (a.z + b.z) / 2 + 0.3 });
      });
      P.pep.atoms.forEach(function (at, j) {
        var q = proj[j];
        var hot = P.hot > 0 && at.sc && HOT.indexOf(at.r) >= 0 ? P.hot : 0;
        items.push({ k: 2, a: q, z: q.z, el: at.el, hot: hot });
      });
    }
    items.sort(function (m, n) { return n.z - m.z; });

    ctx.lineCap = 'round';
    items.forEach(function (it) {
      var f = fogT(it.z);
      if (it.k === 0) {
        var w = Math.max(1, S * it.w * (it.a.f + it.b.f) / 2);
        var base = mix(th.tube[0], th.tube[1], f), shine = mix(th.shine[0], th.shine[1], f);
        var g = it.patch * (o.patch || 0);
        if (g) { base = mix(base, mix(th.patch[0], th.patch[1], f), g); shine = mix(shine, mix(th.patch[0], [255, 255, 255], 0.55), g * 0.8); }
        ctx.globalAlpha = o.alpha;
        ctx.strokeStyle = css(base); ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke();
        ctx.strokeStyle = css(shine, 0.85); ctx.lineWidth = w * 0.36;
        var ox = -w * 0.16, oy = -w * 0.2;
        ctx.beginPath(); ctx.moveTo(it.a.x + ox, it.a.y + oy); ctx.lineTo(it.b.x + ox, it.b.y + oy); ctx.stroke();
      } else if (it.k === 1) {
        ctx.globalAlpha = o.alpha * P.alpha;
        ctx.strokeStyle = css(mix(th.bond, th.fog, f * 0.5));
        ctx.lineWidth = Math.max(1, S * 0.3 * it.a.f);
        ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke();
      } else {
        var r = S * (it.el === 'C' ? 0.5 : 0.56) * it.a.f;
        ctx.globalAlpha = o.alpha * P.alpha;
        if (it.hot) {
          var glow = ctx.createRadialGradient(it.a.x, it.a.y, 0, it.a.x, it.a.y, r * 4);
          glow.addColorStop(0, css([240, 190, 92], 0.45 * it.hot));
          glow.addColorStop(1, css([227, 167, 47], 0));
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(it.a.x, it.a.y, r * 4, 0, 6.2832); ctx.fill();
        }
        var level = Math.round(f * 5) / 5;
        var s = sprite(mix(th.atom[it.el] || th.atom.C, th.fog, level * 0.45));
        var wd = r * s.k;
        ctx.drawImage(s.img, it.a.x - wd / 2, it.a.y - wd / 2, wd, wd);
      }
    });

    if (P && o.contacts > 0.01 && P.pep === buildPeptide(FINAL)) {
      ctx.globalAlpha = o.alpha * o.contacts;
      ctx.strokeStyle = css(th.contact, 0.9);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 4]);
      contacts.forEach(function (c) {
        var a = proj[c[0]], b = view(protein.res[c[1]].p);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================================
  // Energy landscape contours (marching squares over a sum of drifting Gaussian wells)
  // =====================================================================================
  function landscape(seed, n) {
    var r = rng(seed), wells = [];
    for (var i = 0; i < n; i++) {
      wells.push({ x: r(), y: r(), a: i < Math.ceil(n * 0.6) ? -lerp(0.7, 1.2, r()) : lerp(0.4, 0.8, r()), s: lerp(0.1, 0.22, r()), ph: r() * 6.28 });
    }
    return wells;
  }
  function wellsAt(wells, W, H, t) {
    var S = Math.max(W, H);
    return wells.map(function (w) {
      return { x: w.x * W + Math.sin(t * 0.06 + w.ph) * 0.07 * S, y: w.y * H + Math.cos(t * 0.045 + w.ph * 1.3) * 0.05 * S, a: w.a, s2: 2 * Math.pow(w.s * S, 2) };
    });
  }
  function fieldAt(ws, x, y) {
    var v = 0;
    for (var k = 0; k < ws.length; k++) { var dx = x - ws[k].x, dy = y - ws[k].y; v += ws[k].a * Math.exp(-(dx * dx + dy * dy) / ws[k].s2); }
    return v;
  }
  var CASES = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[0, 1], [2, 3]], [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], [[0, 3], [1, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  function contours(ctx, W, H, ws, o) {
    var c = o.cell, nx = Math.ceil(W / c) + 1, ny = Math.ceil(H / c) + 1, g = new Float32Array(nx * ny);
    var lo = 1e9, hi = -1e9, i, j;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var v = fieldAt(ws, i * c, j * c);
      g[j * nx + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    ctx.lineWidth = o.width || 1;
    for (var l = 1; l <= o.levels; l++) {
      var lv = lo + (hi - lo) * l / (o.levels + 1), deep = 1 - l / (o.levels + 1);
      ctx.strokeStyle = css(o.color, lerp(o.alpha[0], o.alpha[1], deep));
      ctx.beginPath();
      for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
        var v0 = g[j * nx + i], v1 = g[j * nx + i + 1], v2 = g[(j + 1) * nx + i + 1], v3 = g[(j + 1) * nx + i];
        var idx = (v0 > lv ? 8 : 0) | (v1 > lv ? 4 : 0) | (v2 > lv ? 2 : 0) | (v3 > lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var x0 = i * c, y0 = j * c, segs = CASES[idx];
        for (var s = 0; s < segs.length; s++) {
          for (var e = 0; e < 2; e++) {
            var ed = segs[s][e], px, py;
            if (ed === 0) { px = x0 + c * (lv - v0) / (v1 - v0); py = y0; }
            else if (ed === 1) { px = x0 + c; py = y0 + c * (lv - v1) / (v2 - v1); }
            else if (ed === 2) { px = x0 + c * (lv - v3) / (v2 - v3); py = y0 + c; }
            else { px = x0; py = y0 + c * (lv - v0) / (v3 - v0); }
            if (e === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();
    }
  }

  // =====================================================================================
  // Hero: the bound model, turning slowly, over a faint landscape
  // =====================================================================================
  function heroScene(canvas) {
    var ctx = canvas.getContext('2d'), box = sizer(canvas), wells = landscape(3, 7);
    var pep = buildPeptide(FINAL);
    var kick = animate(canvas, function (t) {
      followPointer();
      var W = box.w, H = box.h, wide = wideQuery.matches;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0B1724';
      ctx.fillRect(0, 0, W, H);
      contours(ctx, W, H, wellsAt(wells, W, H, t), { cell: 18, levels: 9, color: [61, 181, 191], alpha: [0.04, 0.12] });
      var R = wide ? Math.min(W * 0.21, H * 0.4) : Math.min(W * 0.5, H * 0.26);
      var cx = wide ? W - R * 1.12 : W * 0.78, cy = wide ? H * 0.52 : H * 0.2;
      var view = makeView(cx - pointer.sx * 24, cy - pointer.sy * 16, R / 19, 0.4 + t * 0.1 + pointer.sx * 0.35, -0.55 + pointer.sy * 0.2);
      drawModel(ctx, {
        view: view, scale: R / 19, theme: 'dark', alpha: wide ? 1 : 0.38, patch: 0.35, contacts: 0.75,
        peptide: { atoms: placePeptide(pep, 1, t, { jitter: 0.16 }), pep: pep, alpha: 1, hot: 0.35 + 0.25 * Math.sin(t * 1.4) }
      });
    });
    wideQuery.addEventListener && wideQuery.addEventListener('change', kick);
  }

  // =====================================================================================
  // Footer: contours with a search walking downhill, restarting when it settles
  // =====================================================================================
  function footerScene(canvas) {
    var ctx = canvas.getContext('2d'), box = sizer(canvas), wells = landscape(17, 8), rand = rng(23);
    var walker = null, trail = [], settled = 0;
    animate(canvas, function (t) {
      var W = box.w, H = box.h, ws = wellsAt(wells, W, H, t);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0B1724';
      ctx.fillRect(0, 0, W, H);
      contours(ctx, W, H, ws, { cell: 16, levels: 11, color: [61, 181, 191], alpha: [0.05, 0.2] });

      if (!walker) { walker = { x: lerp(0.1, 0.9, rand()) * W, y: lerp(0.15, 0.85, rand()) * H }; trail = []; settled = 0; }
      var h = 2, gx = (fieldAt(ws, walker.x + h, walker.y) - fieldAt(ws, walker.x - h, walker.y)) / (2 * h);
      var gy = (fieldAt(ws, walker.x, walker.y + h) - fieldAt(ws, walker.x, walker.y - h)) / (2 * h);
      var gl = Math.sqrt(gx * gx + gy * gy), step = Math.min(3.2, 2600 * gl);
      if (gl > 0) { walker.x -= gx / gl * step; walker.y -= gy / gl * step; }
      walker.x += gauss(rand) * 0.9; walker.y += gauss(rand) * 0.9;
      trail.push([walker.x, walker.y]);
      if (trail.length > 140) trail.shift();
      settled = step < 0.6 ? settled + 1 : 0;
      if (settled > 150 || walker.x < -20 || walker.x > W + 20 || walker.y < -20 || walker.y > H + 20) walker = null;

      ctx.lineWidth = 1.6;
      for (var k = 1; k < trail.length; k++) {
        ctx.strokeStyle = css([227, 167, 47], 0.55 * k / trail.length);
        ctx.beginPath(); ctx.moveTo(trail[k - 1][0], trail[k - 1][1]); ctx.lineTo(trail[k][0], trail[k][1]); ctx.stroke();
      }
      var last = trail[trail.length - 1];
      if (last) {
        ctx.fillStyle = css([227, 167, 47], 0.9);
        ctx.beginPath(); ctx.arc(last[0], last[1], 3.2, 0, 6.2832); ctx.fill();
      }
    });
  }

  // =====================================================================================
  // "Our approach": four states that follow the four cards
  // =====================================================================================
  var search = (function () {
    var r = rng(5), target = FINAL.split(''), seq = 'GSAGNGSQ'.split(''), w = [1.1, 2.6, 0.9, 1.0, 0.9, 2.4, 1.2, 0.8];
    function energy(s) { var e = 13; for (var i = 0; i < 8; i++) if (s[i] === target[i]) e -= w[i] * 1.0; return e; }
    var E = energy(seq), steps = [{ seq: seq.join(''), E: E, pos: -1, acc: true }];
    for (var it = 1; it < 96; it++) {
      var miss = [];
      for (var i = 0; i < 8; i++) if (seq[i] !== target[i]) miss.push(i);
      if (!miss.length) break;
      var pos = it > 64 ? miss[Math.floor(r() * miss.length)] : Math.floor(r() * 8);
      var next = seq.slice();
      next[pos] = it > 64 || r() < 0.22 + it / 260 ? target[pos] : AA[Math.floor(r() * 20)];
      var E2 = energy(next) + gauss(r) * 0.35, T = Math.max(0.05, 1.6 * (1 - it / 70));
      if (E2 < E || r() < Math.exp(-(E2 - E) / T)) { seq = next; E = E2; steps.push({ seq: seq.join(''), E: E, pos: pos, acc: true }); }
      else steps.push({ seq: seq.join(''), E: E, prop: E2, pos: pos, acc: false });
    }
    steps[steps.length - 1].E = energy(target) - 0.3;
    return steps;
  })();
  var Elo = Infinity, Ehi = -Infinity;
  search.forEach(function (s) { Elo = Math.min(Elo, s.E, s.prop === undefined ? Infinity : s.prop); Ehi = Math.max(Ehi, s.E, s.prop === undefined ? -Infinity : s.prop); });

  function funnelMean(r) { return -34 + 26 * (1 - Math.exp(-r / 2.6)); }
  var decoys = (function () {
    var r = rng(9), out = [];
    for (var i = 0; i < 900; i++) {
      var x = i < 40 ? lerp(0.4, 2.2, r()) : 0.5 + 11.4 * Math.pow(r(), 0.75);
      out.push([x, funnelMean(x) + gauss(r) * (1.1 + 0.32 * x) + (i < 40 ? -1.2 : 0)]);
    }
    return out;
  })();
  var mdTrace = (function () {
    var r = rng(13), out = [], n = 0;
    for (var i = 0; i <= 260; i++) {
      var tns = i / 260 * 100;
      n += -0.18 * n + gauss(r) * 0.11;
      out.push([tns, Math.max(0, 1.25 * (1 - Math.exp(-tns / 5)) + n)]);
    }
    return out;
  })();
  var DDG = [0.6, 3.1, 0.9, 1.2, 0.5, 2.7, 1.4, 0.7];

  function approachScene(section) {
    var stage = section.querySelector('.scrolly-stage');
    var canvas = section.querySelector('.scrolly-canvas');
    var caption = section.querySelector('.scrolly-caption');
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-step]'));
    if (!canvas || cards.length < 2) return;
    var ctx = canvas.getContext('2d'), box = sizer(canvas), LAST = cards.length - 1;

    // Below 1024px the step text sits in a caption under the scene instead of scrolling over it.
    var caps = cards.map(function (card) {
      var d = document.createElement('div');
      d.className = 'cap';
      d.innerHTML = card.innerHTML;
      if (caption) caption.appendChild(d);
      return d;
    });

    var s = -1, sv = -1, active = -1, lay = null;
    function measure() {
      var H = window.innerHeight, wide = wideQuery.matches, ref = H * 0.5;
      var c = cards.map(function (el) { var r = el.getBoundingClientRect(); return r.top + r.height / 2; });
      var v = LAST + (ref - c[LAST]) / (c[LAST] - c[LAST - 1]);
      if (ref <= c[0]) v = (ref - c[0]) / (c[1] - c[0]);
      else for (var k = 0; k < LAST; k++) if (ref < c[k + 1]) { v = k + (ref - c[k]) / (c[k + 1] - c[k]); break; }
      s = clamp(v, -1, LAST + 0.5);
      var a = clamp(Math.round(s), 0, LAST);
      if (a !== active) { caps.forEach(function (d, i) { d.classList.toggle('is-active', i === a); }); active = a; }

      var top = (header ? header.getBoundingClientRect().height : 64) + 18, W = box.w, Hh = box.h;
      if (wide) {
        var right = 0;
        cards.forEach(function (el) { right = Math.max(right, el.getBoundingClientRect().right); });
        lay = { wide: true, x0: right + 48, x1: W - 40, y0: top, y1: Hh - 32 };
      } else {
        var cr = caption ? caption.getBoundingClientRect() : { top: Hh * 0.7 }, sr = stage.getBoundingClientRect();
        lay = { wide: false, x0: 16, x1: W - 16, y0: top, y1: cr.top - sr.top - 14 };
      }
      kick();
    }

    var grow = [1, 1, 1, 1, 1, 1, 1, 1], changedAt = [-9, -9, -9, -9, -9, -9, -9, -9], lastSeq = search[0].seq, fit = null;

    var kick = animate(canvas, function (t) {
      followPointer();
      sv += (s - sv) * 0.1;
      if (Math.abs(s - sv) < 1e-4) sv = s;
      var W = box.w, H = box.h, L = lay;
      if (!L) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#E9EFF1';
      ctx.fillRect(0, 0, W, H);

      function local(k) { return smooth(k - 0.6, k - 0.05, sv); }
      function win(k) { return (k === 0 ? 1 : smooth(k - 0.62, k - 0.36, sv)) * (k === LAST ? 1 : 1 - smooth(k + 0.38, k + 0.64, sv)); }
      var u1 = local(1), u2 = local(2), u3 = local(3);
      var vis = [win(0), win(1), win(2), win(3)];
      var pw = ease(smooth(0.36, 0.64, sv));

      // regions: molecule above, data panel below
      var rw = L.x1 - L.x0, rh = L.y1 - L.y0;
      var ph = rh * (L.wide ? 0.42 : 0.46), gap = 16;
      var panel = { x: L.x0, y: L.y1 - ph, w: rw, h: ph };
      if (L.wide && rw > 660) { panel.w = 660; panel.x = L.x0 + (rw - 660) / 2; }
      var mh0 = rh, mh1 = rh - ph - gap;
      var mh = lerp(mh0, mh1, pw);
      var R = Math.min(rw, mh) / 2;
      var pepAlpha = smooth(0.3, 0.62, sv);

      // the peptide's sequence, side-chain growth on each mutation, and its pose
      var iter = Math.round(u1 * (search.length - 1)), step = search[iter], seq = step.seq;
      if (seq !== lastSeq) {
        for (var i = 0; i < 8; i++) if (seq[i] !== lastSeq[i]) changedAt[i] = t;
        lastSeq = seq;
      }
      for (i = 0; i < 8; i++) grow[i] = smooth(0, 0.45, t - changedAt[i]);
      var pep = buildPeptide(seq);
      var atoms = pepAlpha > 0.01 ? placePeptide(pep, u2, t, { jitter: 0.08 + u3 * 0.3, grow: grow }) : [];

      // frame the model (protein plus any visible peptide) inside its area, easing so it never jumps
      var yaw = 0.35 + sv * 0.12 + 0.4 * Math.sin(t * 0.12) + pointer.sx * 0.15, pitch = -0.5 - 0.06 * Math.sin(t * 0.25);
      var probe = makeView(0, 0, 1, yaw, pitch), bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      function grow2(q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
      protein.res.forEach(function (r) { grow2(probe(r.p)); });
      if (pepAlpha > 0.3) atoms.forEach(function (p) { grow2(probe(p)); });
      var want = Math.min(rw * 0.86 / (bx1 - bx0 + 3), mh * 0.86 / (by1 - by0 + 3));
      var target = { s: want, x: L.x0 + rw / 2 - (bx0 + bx1) / 2 * want, y: L.y0 + mh / 2 - (by0 + by1) / 2 * want };
      if (!fit) fit = target;
      else { fit = { s: lerp(fit.s, target.s, 0.06), x: lerp(fit.x, target.x, 0.06), y: lerp(fit.y, target.y, 0.06) }; }
      var scale = fit.s, view = makeView(fit.x, fit.y, scale, yaw, pitch);

      drawModel(ctx, {
        view: view, scale: scale, theme: 'light', alpha: 1,
        patch: lerp(0.45, 0.75 + 0.25 * Math.sin(t * 2.4), vis[0]),
        contacts: smooth(0.75, 1, u2) * 0.9,
        peptide: { atoms: atoms, pep: pep, alpha: pepAlpha, hot: u3 }
      });

      // labels on the model
      mono(ctx, 11);
      ctx.fillStyle = '#3E4C5A';
      if (vis[0] > 0.01) {
        var pc = view(protein.patchCenter);
        label(ctx, pc.x, pc.y, pc.x - R * 0.4, pc.y - R * 0.42, 'TARGET SURFACE', vis[0]);
      }
      if (vis[1] > 0.01 && atoms.length) {
        var pp = view(add(protein.site, FLOAT_OFFSET));
        label(ctx, pp.x - 5.5 * scale, pp.y, pp.x - R * 0.62, pp.y - R * 0.08, 'CANDIDATE', vis[1] * (1 - u2));
      }
      if (vis[3] > 0.01 && atoms.length) {
        var hp = view(hotCenter(pep, atoms));
        label(ctx, hp.x, hp.y, hp.x + R * 0.55, hp.y + R * 0.35, 'HOT SPOTS', vis[3] * u3);
      }

      // data panels
      if (vis[1] > 0.01) drawSearch(ctx, panel, vis[1], u1, iter, t);
      if (vis[2] > 0.01) drawFunnel(ctx, panel, vis[2], u2, t);
      if (vis[3] > 0.01) drawMD(ctx, panel, vis[3], u3, t);
      ctx.globalAlpha = 1;
    });

    function hotCenter(pep, atoms) {
      var c = [0, 0, 0], n = 0;
      pep.atoms.forEach(function (a, i) { if (a.sc && HOT.indexOf(a.r) >= 0) { c = add(c, atoms[i]); n++; } });
      return n ? mul(c, 1 / n) : protein.site;
    }

    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();

    // on wide screens the cards fade in as each reaches the middle of the screen
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-in'); });
    }, { rootMargin: '0px 0px -30% 0px', threshold: 0.2 });
    cards.forEach(function (c) { io.observe(c); });
  }

  function label(ctx, ax, ay, lx, ly, text, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(13,27,42,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = 'rgba(13,27,42,0.8)';
    ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, 6.2832); ctx.fill();
    ctx.textAlign = lx < ax ? 'right' : 'left';
    ctx.strokeStyle = 'rgba(233,239,241,0.92)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, lx + (lx < ax ? -6 : 6), ly + 4);
    ctx.fillStyle = '#3E4C5A';
    ctx.fillText(text, lx + (lx < ax ? -6 : 6), ly + 4);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  function panelFrame(ctx, b, title, alpha) {
    var lift = (1 - alpha) * 12;
    ctx.globalAlpha = alpha;
    roundRect(ctx, b.x, b.y + lift, b.w, b.h, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(13,27,42,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    mono(ctx, 11);
    ctx.fillStyle = '#0D1B2A';
    ctx.fillText(title, b.x + 18, b.y + lift + 27);
    ctx.fillStyle = '#7A8792';
    ctx.textAlign = 'right';
    ctx.fillText('ILLUSTRATIVE', b.x + b.w - 18, b.y + lift + 27);
    ctx.textAlign = 'left';
    return { x: b.x + 18, y: b.y + lift + 44, w: b.w - 36, h: b.h - 62 };
  }
  function axes(ctx, c, xLabel, yLabel) {
    ctx.strokeStyle = 'rgba(13,27,42,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y + c.h); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.stroke();
    mono(ctx, 10, 400);
    ctx.fillStyle = '#6B7883';
    ctx.fillText(yLabel, c.x + 6, c.y + 9);
    ctx.textAlign = 'right';
    ctx.fillText(xLabel, c.x + c.w, c.y + c.h - 6);
    ctx.textAlign = 'left';
  }

  function drawSearch(ctx, b, alpha, u, iter, t) {
    var c = panelFrame(ctx, b, 'SEQUENCE SEARCH', alpha), step = search[iter];
    var size = Math.min(40, (c.w - 7 * 6) / 8), gapx = 6, y = c.y;
    for (var i = 0; i < 8; i++) {
      var x = c.x + i * (size + gapx), ok = step.seq[i] === FINAL[i];
      roundRect(ctx, x, y, size, size, 6);
      ctx.fillStyle = ok ? 'rgba(14,124,134,0.14)' : 'rgba(13,27,42,0.04)';
      ctx.fill();
      ctx.lineWidth = i === step.pos ? 2 : 1;
      ctx.strokeStyle = i === step.pos ? (step.acc ? '#E3A72F' : 'rgba(13,27,42,0.35)') : 'rgba(13,27,42,0.12)';
      ctx.stroke();
      mono(ctx, Math.round(size * 0.48), 500);
      ctx.fillStyle = ok ? '#0E7C86' : '#3E4C5A';
      ctx.textAlign = 'center';
      ctx.fillText(step.seq[i], x + size / 2, y + size * 0.66);
      ctx.textAlign = 'left';
    }
    var ch = { x: c.x, y: y + size + 16, w: c.w, h: c.h - size - 16 };
    if (ch.h < 40) return;
    axes(ctx, ch, 'ITERATION', 'ENERGY');
    var N = search.length - 1;
    function X(k) { return ch.x + 4 + (ch.w - 8) * k / N; }
    function Y(e) { return ch.y + 14 + (ch.h - 22) * (Ehi - e) / (Ehi - Elo); }
    ctx.fillStyle = 'rgba(13,27,42,0.22)';
    for (var k = 1; k <= iter; k++) if (!search[k].acc) { ctx.beginPath(); ctx.arc(X(k), Y(search[k].prop), 1.6, 0, 6.2832); ctx.fill(); }
    ctx.strokeStyle = '#0E7C86';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (k = 0; k <= iter; k++) { if (k) ctx.lineTo(X(k), Y(search[k].E)); else ctx.moveTo(X(k), Y(search[k].E)); }
    ctx.stroke();
    ctx.fillStyle = '#E3A72F';
    ctx.beginPath(); ctx.arc(X(iter), Y(step.E), 4 + (u >= 1 ? Math.sin(t * 3) * 0.8 : 0), 0, 6.2832); ctx.fill();
  }

  function drawFunnel(ctx, b, alpha, u, t) {
    var c = panelFrame(ctx, b, 'DOCKING FUNNEL', alpha);
    axes(ctx, c, 'RMSD (Å)', 'SCORE');
    var lo = -40, hi = 2;
    function X(r) { return c.x + 4 + (c.w - 8) * r / 12; }
    function Y(e) { return c.y + 14 + (c.h - 22) * (hi - e) / (hi - lo); }
    var n = Math.round(lerp(80, decoys.length, u)), pr = c.w < 420 ? 1.5 : 1.9;
    for (var i = 0; i < n; i++) {
      var d = decoys[i], good = d[1] < -27;
      ctx.fillStyle = good ? 'rgba(14,124,134,0.75)' : 'rgba(14,124,134,0.28)';
      ctx.beginPath(); ctx.arc(X(d[0]), Y(clamp(d[1], lo, hi)), pr, 0, 6.2832); ctx.fill();
    }
    var rm = 0.6 + 10.2 * Math.pow(1 - ease(u), 1.2), em = funnelMean(rm) - 2.2;
    var mx = X(rm), my = Y(em);
    ctx.strokeStyle = 'rgba(227,167,47,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx, my, 9 + Math.sin(t * 3) * 1.5, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#E3A72F';
    ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, 6.2832); ctx.fill();
    mono(ctx, 10, 500);
    ctx.fillStyle = '#0D1B2A';
    ctx.fillText(u > 0.97 ? 'BEST POSE' : 'CURRENT POSE', mx + 14, my + 4);
  }

  function drawMD(ctx, b, alpha, u, t) {
    var c = panelFrame(ctx, b, 'DYNAMICS · ALANINE SCAN', alpha);
    var split = c.w * 0.56, a = { x: c.x, y: c.y, w: split - 14, h: c.h }, bars = { x: c.x + split + 8, y: c.y, w: c.w - split - 8, h: c.h };
    axes(ctx, a, '100 NS', 'RMSD (Å)');
    function X(tns) { return a.x + 4 + (a.w - 8) * tns / 100; }
    function Y(r) { return a.y + a.h - 4 - (a.h - 22) * r / 2.4; }
    var upto = Math.round(u * (mdTrace.length - 1));
    ctx.strokeStyle = '#0E7C86';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i <= upto; i++) { var p = mdTrace[i]; if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }
    ctx.stroke();
    if (upto > 0) { var q = mdTrace[upto]; ctx.fillStyle = '#E3A72F'; ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 3.5, 0, 6.2832); ctx.fill(); }

    axes(ctx, bars, '', 'ΔΔG');
    var bw = (bars.w - 8) / 8, base = bars.y + bars.h - 14;
    for (i = 0; i < 8; i++) {
      var g = smooth(i * 0.06, 0.55 + i * 0.06, u), hgt = (bars.h - 34) * DDG[i] / 3.4 * g, hot = HOT.indexOf(i) >= 0;
      ctx.fillStyle = hot ? '#E3A72F' : 'rgba(14,124,134,0.45)';
      roundRect(ctx, bars.x + 4 + i * bw + bw * 0.18, base - hgt, bw * 0.64, Math.max(0.01, hgt), 2);
      ctx.fill();
      mono(ctx, 10, hot ? 600 : 400);
      ctx.fillStyle = hot ? '#0D1B2A' : '#6B7883';
      ctx.textAlign = 'center';
      ctx.fillText(FINAL[i], bars.x + 4 + i * bw + bw / 2, bars.y + bars.h);
      ctx.textAlign = 'left';
    }
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

  Array.prototype.forEach.call(document.querySelectorAll('.scene-canvas'), function (cv) {
    if (cv.getAttribute('data-scene') === 'hero') heroScene(cv); else footerScene(cv);
  });
  var scrolly = document.querySelector('.scrolly');
  if (scrolly) approachScene(scrolly);
  reveals();
  countUp();
})();
