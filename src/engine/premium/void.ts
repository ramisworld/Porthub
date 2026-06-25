/**
 * Deep-space void — a real 3D star field with hyperdrive on scroll.
 *
 * Each star carries (x, y, z) where z is depth (0 = at camera, 1 = far). Each
 * frame we project to screen with a perspective divide, advance z toward the
 * camera, and recycle past-camera stars to the far plane. The per-frame z step
 * scales with the visitor's scroll position + velocity, so:
 *
 *   - idle       → near-zero drift, just a gentle twinkle (the void breathes)
 *   - scrolling  → warp factor ramps up, stars streak outward from screen
 *                   centre, getting brighter + bigger as they approach
 *   - scrolled-down → permanent low-warp "cruise"; the field never goes dead
 *
 * Plus a layered CSS atmosphere baked into the wrap (top-right phosphor halo,
 * bottom-left cyan haze, soft top-down gradient) so the background reads as
 * actual space, not a flat rectangle.
 *
 * Performance: ~520 stars, single rAF loop, projection math is one divide per
 * star. Pauses on hidden tab. Respects `prefers-reduced-motion` (paints once).
 */
export function mountVoid(): void {
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wrap = document.createElement("div");
  wrap.id = "ph-void";
  wrap.style.cssText =
    "position:fixed;inset:0;z-index:0;pointer-events:none;" +
    "background:" +
    "radial-gradient(48% 38% at 86% 12%, rgba(54,212,134,.10), transparent 70%)," +
    "radial-gradient(54% 42% at 8% 92%, rgba(110,200,220,.07), transparent 72%)," +
    "radial-gradient(120% 80% at 50% -10%, rgba(20,40,34,.30), transparent 64%)," +
    "linear-gradient(180deg,#020505 0%,#010303 60%,#000202 100%);";
  const cvs = document.createElement("canvas");
  cvs.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;";
  wrap.appendChild(cvs);
  document.body.appendChild(wrap);

  const ctx = cvs.getContext("2d", { alpha: true });
  if (!ctx) return;

  type Star = {
    // normalised camera-space position. x,y in roughly [-1.4, 1.4], z in (0, 1].
    x: number;
    y: number;
    z: number;
    // previous screen position (for streak from prev→now)
    px: number;
    py: number;
    // color + twinkle params
    c: string;
    p: number;
    s: number;
  };

  let stars: Star[] = [];
  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let dpr = 1;
  // Focal length — controls how dramatic the perspective is. Bigger = flatter,
  // smaller = more "tunnel". 0.95 reads cinematic, not cartoonish.
  const FOCAL = 0.95;

  // Project a star to screen (returns null if behind camera).
  const project = (st: Star): { x: number; y: number; scale: number } => {
    const k = FOCAL / Math.max(0.0001, st.z);
    return {
      x: cx + st.x * k * cx,
      y: cy + st.y * k * cx,
      scale: k,
    };
  };

  const colorOf = () => {
    const r = Math.random();
    return r > 0.985
      ? "#7df0b3" // rare phosphor green
      : r > 0.955
        ? "#a9e6db" // rare cool cyan
        : r > 0.85
          ? "#f4f8f0" // crisp white
          : "#dbe6df"; // warm dim white (the bulk)
  };

  const seedStar = (st: Star, far = true) => {
    // Distribute across a square camera plane wider than the screen so corners
    // never go empty. Bias z toward 1 so most stars start far away (the cruise
    // pool); a small fraction start mid-range so the field reads populated.
    st.x = (Math.random() - 0.5) * 2.4;
    st.y = (Math.random() - 0.5) * 2.4;
    st.z = far ? 0.6 + Math.random() * 0.4 : 0.18 + Math.random() * 0.82;
    st.c = colorOf();
    st.p = Math.random() * Math.PI * 2;
    st.s = 0.4 + Math.random() * 1.6;
    st.px = -1;
    st.py = -1;
  };

  const seed = (W: number, H: number) => {
    stars = [];
    // ~520 stars — heavy enough to feel like space, light enough to draw fast.
    const N = Math.min(620, Math.floor((W * H) / dpr / dpr / 3400));
    for (let i = 0; i < N; i++) {
      const st: Star = {
        x: 0,
        y: 0,
        z: 1,
        px: -1,
        py: -1,
        c: "#fff",
        p: 0,
        s: 1,
      };
      seedStar(st, false);
      stars.push(st);
    }
  };

  const resize = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = cvs.width = Math.floor(window.innerWidth * dpr);
    h = cvs.height = Math.floor(window.innerHeight * dpr);
    cx = w / 2;
    cy = h / 2;
    seed(w, h);
  };
  resize();

  // ---- scroll signal ----
  // Both progress (0..1, monotone with scroll position) and velocity (px/frame)
  // feed the warp factor. Progress = the cruise speed; velocity = the burst.
  let scrollProgress = 0;
  let scrollVel = 0;
  let warp = 0; // smoothed final warp factor [0..1+]
  const PH = (
    window as unknown as {
      PH?: {
        onScroll?: (
          fn: (s: { vel: number; progress: number }) => void,
        ) => void;
      };
    }
  ).PH;
  if (PH && typeof PH.onScroll === "function") {
    PH.onScroll((s) => {
      scrollProgress = s.progress;
      // Capture velocity bursts — clamp so a wheel-flick doesn't go nuclear.
      const v = Math.min(60, Math.abs(s.vel));
      scrollVel = Math.max(scrollVel * 0.4, v);
    });
  }

  let raf = 0;
  let last = performance.now();
  const draw = (now: number) => {
    raf = 0;
    const dt = Math.min(80, now - last) / 1000;
    last = now;

    // Bleed velocity each frame so the burst is a transient.
    scrollVel *= 0.86;

    // Target warp factor:
    //   - 0.02 base idle creep (always alive — never dead-black)
    //   - + scrollProgress * 0.55 (cruise speed grows as you go down)
    //   - + scrollVel burst (instant kick when the wheel spins)
    const target = 0.02 + scrollProgress * 0.55 + scrollVel * 0.018;
    warp += (target - warp) * 0.12;

    // Clear to fully transparent so the wrap's CSS gradient atmosphere
    // (top-right phosphor halo, bottom-left cyan haze) shows through under
    // the stars. Streaks are drawn explicitly per star — no fade-trail.
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    const t = now / 1000;
    const dzPerSec = 0.045 + warp * 0.95; // light-speed at warp≈1

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0, len = stars.length; i < len; i++) {
      const st = stars[i]!;

      // Advance through space toward the camera.
      st.z -= dzPerSec * dt;
      if (st.z <= 0.02) {
        seedStar(st, true);
        continue;
      }

      const proj = project(st);

      // Twinkle is suppressed at high warp (the streak does the work).
      const twAmp = Math.max(0, 0.5 - warp * 0.6);
      const tw = 1 - twAmp + twAmp * Math.sin(t * st.s + st.p);

      // Size grows as the star approaches. Capped so close stars don't blob.
      const r = Math.min(4.2 * dpr, (0.32 + proj.scale * 0.7) * dpr);
      // Alpha grows with scale but stays subtle for the deep field.
      const aBase = Math.min(0.95, 0.16 + proj.scale * 0.42);
      const a = aBase * (0.7 + 0.3 * tw);

      // Streak — project the star's position at a slightly deeper z (where it
      // was N frames ago) and draw a line from there to the current head.
      // The streak length naturally grows with warp because dzPerSec scales
      // with it. This is the classic radial light-speed look.
      if (warp > 0.06) {
        const streakDz = Math.min(0.9, dzPerSec * 0.16 * (1 + warp * 1.8));
        const zPrev = Math.min(1.5, st.z + streakDz);
        const kPrev = FOCAL / zPrev;
        const sx = cx + st.x * kPrev * cx;
        const sy = cy + st.y * kPrev * cx;
        ctx.strokeStyle = st.c;
        ctx.globalAlpha = a * 0.7;
        ctx.lineWidth = Math.max(0.55, r * 0.6);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(proj.x, proj.y);
        ctx.stroke();
      }

      // The star head.
      ctx.globalAlpha = a;
      ctx.fillStyle = st.c;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.fill();

      st.px = proj.x;
      st.py = proj.y;

      // Recycle stars that have travelled off-screen at high warp.
      if (
        proj.x < -200 ||
        proj.x > w + 200 ||
        proj.y < -200 ||
        proj.y > h + 200
      ) {
        seedStar(st, true);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (!reduce) raf = requestAnimationFrame(draw);
  };

  if (reduce) {
    // Paint one calm frame at low warp; no animation loop.
    warp = 0.06;
    draw(performance.now());
  } else {
    raf = requestAnimationFrame(draw);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!reduce && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }
  });

  let rt: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(resize, 200);
  });
}
