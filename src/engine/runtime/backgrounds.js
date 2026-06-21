/* PortHub Engine — scroll-reactive backgrounds. Each reads the DesignSpec
   (theme colors + background.intensity/speed/parallax) and subscribes to
   PH.scroll for reactivity. Honors prefers-reduced-motion (static frame). */
(function () {
  "use strict";
  var PH = (window.PH = window.PH || {});
  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function canvas() {
    var c = document.getElementById("ph-bg");
    if (!c) return null;
    var ctx = c.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener("resize", resize);
    return { ctx: ctx, w: function () { return innerWidth; }, h: function () { return innerHeight; }, resize: resize };
  }
  function loop(fn) { if (REDUCE) { fn(0); return; } (function run(t) { fn(t || 0); requestAnimationFrame(run); })(0); }
  function injectStyle(css) { var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }

  PH.backgrounds = {
    none: function () {},

    matrix: function (spec) {
      var cv = canvas(); if (!cv) return;
      var fs = 15, cols = Math.ceil(innerWidth / fs), drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -50;
      var chars = "01<>/{}[]$#&*=+ｱｲｳｴｵﾊﾋﾌﾍ".split("");
      var speed = 0.4 + spec.background.speed * 0.9, dens = 0.04 + spec.background.intensity * 0.06;
      loop(function () {
        var ctx = cv.ctx, w = cv.w(), h = cv.h(), p = PH.scroll.progress;
        ctx.fillStyle = "rgba(0,0,0," + (0.06 + p * 0.04) + ")"; ctx.fillRect(0, 0, w, h);
        ctx.font = fs + "px " + (PH.font ? "monospace" : "monospace");
        for (var i = 0; i < drops.length; i++) {
          var ch = chars[(Math.random() * chars.length) | 0];
          var col = Math.random() < 0.06 ? spec.theme.accent2 : spec.theme.accent;
          ctx.fillStyle = PH.rgba(col, 0.55 + dens);
          ctx.fillText(ch, i * fs, drops[i] * fs);
          if (drops[i] * fs > h && Math.random() > 0.975) drops[i] = 0;
          drops[i] += speed * (1 + p * 0.8);
        }
      });
    },

    starfield: function (spec) {
      var cv = canvas(); if (!cv) return;
      var N = Math.round(120 + spec.background.intensity * 220), stars = [];
      for (var i = 0; i < N; i++) stars.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: Math.random() * 1 + 0.2 });
      var sp = 0.15 + spec.background.speed * 0.5, par = spec.background.parallax;
      loop(function () {
        var ctx = cv.ctx, w = cv.w(), h = cv.h();
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.y += sp * s.z + PH.scroll.vel * 0.05 * s.z * par;
          if (s.y > h) s.y = 0; if (s.y < 0) s.y = h;
          ctx.globalAlpha = 0.3 + s.z * 0.6;
          ctx.fillStyle = i % 11 === 0 ? spec.theme.accent : spec.theme.fg;
          var r = s.z * 1.6; ctx.fillRect(s.x, s.y, r, r);
        }
        ctx.globalAlpha = 1;
      });
    },

    dotgrid: function (spec) {
      var cv = canvas(); if (!cv) return;
      var gap = 34;
      loop(function (t) {
        var ctx = cv.ctx, w = cv.w(), h = cv.h(), p = PH.scroll.progress;
        ctx.clearRect(0, 0, w, h);
        var off = (p * 120 * spec.background.parallax) % gap;
        for (var x = 0; x < w + gap; x += gap) {
          for (var y = -gap; y < h + gap; y += gap) {
            var d = Math.sin((x + y) * 0.01 + t * 0.0006 * (1 + spec.background.speed)) * 0.5 + 0.5;
            ctx.fillStyle = PH.rgba(spec.theme.accent, 0.06 + d * 0.16 * (0.4 + spec.background.intensity));
            var r = 1 + d * 1.6; ctx.beginPath(); ctx.arc(x, y + off, r, 0, 6.283); ctx.fill();
          }
        }
      });
    },

    aurora: function (spec) {
      var a = document.getElementById("ph-aurora"); if (!a) return;
      a.style.display = "block";
      a.style.background =
        "radial-gradient(40% 40% at 20% 20%," + PH.rgba(spec.theme.accent, 0.5) + ",transparent 70%)," +
        "radial-gradient(45% 45% at 80% 30%," + PH.rgba(spec.theme.accent2, 0.45) + ",transparent 70%)," +
        "radial-gradient(55% 55% at 50% 95%," + PH.rgba(spec.theme.glow, 0.4) + ",transparent 70%)";
      injectStyle("@keyframes ph-aur{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.25) translate(4%,-3%)}}");
      if (!REDUCE) a.style.animation = "ph-aur " + (14 - spec.background.speed * 6) + "s ease-in-out infinite alternate";
      PH.onScroll(function (s) {
        a.style.filter = "blur(60px) hue-rotate(" + s.progress * 50 + "deg)";
      });
    },

    particles: function (spec) {
      var cv = canvas(); if (!cv) return;
      var N = Math.round(40 + spec.background.intensity * 60), ps = [];
      for (var i = 0; i < N; i++) ps.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
      var sp = 0.5 + spec.background.speed;
      loop(function () {
        var ctx = cv.ctx, w = cv.w(), h = cv.h();
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          p.x += p.vx * sp; p.y += p.vy * sp + PH.scroll.vel * 0.02 * spec.background.parallax;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          for (var j = i + 1; j < ps.length; j++) {
            var q = ps[j], dx = p.x - q.x, dy = p.y - q.y, dist = dx * dx + dy * dy;
            if (dist < 12000) { ctx.strokeStyle = PH.rgba(spec.theme.accent, (1 - dist / 12000) * 0.18); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
          }
          ctx.fillStyle = PH.rgba(spec.theme.accent, 0.6); ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.283); ctx.fill();
        }
      });
    },

    waves: function (spec) {
      var cv = canvas(); if (!cv) return;
      var layers = 3, sp = 0.0006 + spec.background.speed * 0.0014;
      loop(function (t) {
        var ctx = cv.ctx, w = cv.w(), h = cv.h(), p = PH.scroll.progress;
        ctx.clearRect(0, 0, w, h);
        for (var L = 0; L < layers; L++) {
          var amp = (24 + L * 18) * (0.6 + spec.background.intensity) * (1 + p * 0.6);
          var base = h - 40 - L * 60 + p * 80 * spec.background.parallax;
          ctx.beginPath(); ctx.moveTo(0, h);
          for (var x = 0; x <= w; x += 8) {
            var y = base + Math.sin(x * 0.012 + t * sp + L) * amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.closePath();
          var col = L % 2 ? spec.theme.accent2 : spec.theme.accent;
          ctx.fillStyle = PH.rgba(col, 0.06 + L * 0.03); ctx.fill();
        }
      });
    },
  };
})();
