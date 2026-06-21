/* PortHub Engine — hero gimmicks (the bespoke "flourish" per vibe). */
(function () {
  "use strict";
  var PH = (window.PH = window.PH || {});
  function injectStyle(css) { var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }

  PH.gimmicks = {
    none: function () {},

    typewriter: function () {
      var el = document.getElementById("ph-gimmick"); if (!el) return;
      injectStyle("@keyframes ph-blink{50%{opacity:0}}");
      var cmds = ["$ ./deploy --prod", "$ git push origin main", "$ npm run build && ship", "$ ls -la ~/work"];
      var i = 0, j = 0, del = false;
      var cursor = '<span style="display:inline-block;width:8px;height:1em;background:var(--accent);vertical-align:-2px;margin-left:2px;animation:ph-blink 1s steps(1) infinite"></span>';
      function render(text) { el.innerHTML = PH.esc(text) + cursor; }
      function tick() {
        var c = cmds[i % cmds.length];
        render(c.slice(0, j));
        if (!del) { j++; if (j > c.length) { del = true; return setTimeout(tick, 1500); } }
        else { j--; if (j <= 0) { del = false; i++; return setTimeout(tick, 350); } }
        setTimeout(tick, del ? 28 : 55);
      }
      tick();
    },

    glitch: function () {
      var h = document.querySelector(".ph-display"); if (!h) return;
      h.setAttribute("data-text", h.textContent);
      h.classList.add("ph-glitch");
      injectStyle(".ph-glitch{position:relative}.ph-glitch::before,.ph-glitch::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;pointer-events:none}.ph-glitch::before{color:var(--accent);animation:ph-g1 2.6s infinite linear alternate}.ph-glitch::after{color:var(--accent2);animation:ph-g2 3.3s infinite linear alternate}@keyframes ph-g1{0%{clip-path:inset(0 0 82% 0);transform:translateX(-2px)}50%{clip-path:inset(48% 0 22% 0);transform:translateX(2px)}100%{clip-path:inset(20% 0 60% 0);transform:translateX(-1px)}}@keyframes ph-g2{0%{clip-path:inset(70% 0 8% 0);transform:translateX(2px)}50%{clip-path:inset(12% 0 70% 0);transform:translateX(-2px)}100%{clip-path:inset(40% 0 32% 0);transform:translateX(1px)}}");
    },

    tilt3d: function () {
      document.querySelectorAll(".ph-card").forEach(function (c) {
        c.addEventListener("mousemove", function (e) {
          var r = c.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          c.style.transform = "perspective(700px) rotateY(" + x * 7 + "deg) rotateX(" + -y * 7 + "deg) translateY(-3px)";
        });
        c.addEventListener("mouseleave", function () { c.style.transform = ""; });
      });
    },

    magnetic: function () {
      document.querySelectorAll(".ph-btn").forEach(function (b) {
        b.addEventListener("mousemove", function (e) {
          var r = b.getBoundingClientRect();
          b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.3 + "px," + (e.clientY - r.top - r.height / 2) * 0.3 + "px)";
        });
        b.addEventListener("mouseleave", function () { b.style.transform = ""; });
      });
    },

    cursorTrail: function () {
      if (window.matchMedia && window.matchMedia("(pointer:coarse)").matches) return;
      var dots = [];
      for (var i = 0; i < 14; i++) {
        var d = document.createElement("div");
        d.style.cssText = "position:fixed;z-index:60;width:8px;height:8px;border-radius:50%;background:var(--accent);pointer-events:none;opacity:0";
        document.body.appendChild(d); dots.push({ el: d, x: 0, y: 0 });
      }
      var mx = 0, my = 0, active = false;
      window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; active = true; });
      (function loop() {
        var x = mx, y = my;
        for (var k = 0; k < dots.length; k++) {
          var p = dots[k];
          p.x += (x - p.x) * 0.3; p.y += (y - p.y) * 0.3; x = p.x; y = p.y;
          p.el.style.left = p.x + "px"; p.el.style.top = p.y + "px";
          p.el.style.opacity = active ? (1 - k / dots.length) * 0.6 : 0;
        }
        requestAnimationFrame(loop);
      })();
    },
  };
})();
