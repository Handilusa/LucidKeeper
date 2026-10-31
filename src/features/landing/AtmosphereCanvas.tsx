/**
 * AtmosphereCanvas — LucidKeeper landing background
 *
 * Organic Plasma × Quantum Ledger atmosphere.
 * Uses GSAP ticker for frame-perfect scheduling.
 *
 * Design principles:
 * - Perlin noise field drives node drift (no sine/cosine loops)
 * - Stochastic affinity graph for edges (not pure distance threshold)
 * - Lissajous orbits with irrational frequency ratios for plasma blobs (never repeats)
 * - RGBA colors throughout — no hex-manipulation hacks
 * - Pauses on prefers-reduced-motion and hidden tab
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal 2D Perlin noise  (no extra deps)
// ─────────────────────────────────────────────────────────────────────────────
function buildPerlin() {
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = [...p, ...p]; // double for wraparound

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp  = (t: number, a: number, b: number) => a + t * (b - a);
  const grad  = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  };

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    return lerp(v,
      lerp(u, grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    )),
      lerp(u, grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1)),
    );
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface QNode {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  mass: number;
  phase: number;
  alpha: number;
  targetAlpha: number;
  edges: number[];
  // rgb components so we can vary alpha without string-replacing
  rgb: [number, number, number];
}

interface PlasmaBlob {
  ox: number; oy: number;   // orbit origin
  cx: number; cy: number;   // current position
  ax: number; ay: number;   // amplitude
  fx: number; fy: number;   // frequency (irrational ratio)
  px: number; py: number;   // phase offset
  rw: number; rh: number;   // radii
  r: number; g: number; b: number;
  blur: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette (as rgb triples)
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE: [number, number, number][] = [
  [188, 147, 243],   // lilac
  [157,  92, 247],   // mid-violet
  [119,  27, 232],   // deep violet
  [210, 180, 255],   // pale lilac (rare accent)
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function AtmosphereCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // ── resize ───────────────────────────────────────────────────────────────
    let W = 0, H = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Perlin ───────────────────────────────────────────────────────────────
    const noise = buildPerlin();

    // ── nodes ────────────────────────────────────────────────────────────────
    const NODE_COUNT = 68;
    const nodes: QNode[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      // Spread across full width with slight right bias for sigil area
      const xBias = Math.random() < 0.45 ? 0.42 + Math.random() * 0.60 : Math.random() * 0.45;
      nodes.push({
        x: W * xBias,
        y: H * (0.04 + Math.random() * 0.90),
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.09,
        r:  1 + Math.random() * 2.0,
        mass: 0.55 + Math.random() * 0.9,
        phase: Math.random() * 120,
        alpha: 0,
        targetAlpha: 0.20 + Math.random() * 0.60,
        edges: [],
        rgb: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    }

    // Stochastic affinity graph — NOT pure distance
    const MAX_EDGE_DIST = W * 0.27;
    for (let i = 0; i < nodes.length; i++) {
      const degree = 1 + Math.floor(Math.random() * 3);
      const pool: number[] = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < MAX_EDGE_DIST * MAX_EDGE_DIST && Math.random() > 0.3) {
          pool.push(j);
        }
      }
      // Shuffle and take subset
      pool.sort(() => Math.random() - 0.5);
      nodes[i].edges = pool.slice(0, degree);
    }

    // ── plasma blobs ─────────────────────────────────────────────────────────
    // Irrational frequency ratios → Lissajous never closes → motion never repeats
    const blobs: PlasmaBlob[] = [
      // Right side — near sigil
      { ox: 0.72, oy: 0.08, cx: 0, cy: 0, ax: 0.07, ay: 0.06,  fx: 1.0,   fy: 1.618, px: 0,            py: Math.PI/2.3, rw: 620, rh: 500, r: 119, g:  27, b: 232, blur: 60 },
      { ox: 0.88, oy: 0.35, cx: 0, cy: 0, ax: 0.05, ay: 0.08,  fx: 2.414, fy: 1.0,   px: Math.PI/1.7,  py: 0,           rw: 500, rh: 380, r: 188, g: 147, b: 243, blur: 75 },
      // Centre
      { ox: 0.50, oy: 0.42, cx: 0, cy: 0, ax: 0.09, ay: 0.07,  fx: 1.0,   fy: 2.732, px: Math.PI,      py: Math.PI/3,   rw: 700, rh: 520, r:  85, g:  15, b: 165, blur: 90 },
      // Left side
      { ox: 0.15, oy: 0.20, cx: 0, cy: 0, ax: 0.08, ay: 0.07,  fx: 1.618, fy: 1.0,   px: Math.PI/3,    py: Math.PI/1.5, rw: 580, rh: 440, r: 119, g:  27, b: 232, blur: 80 },
      { ox: 0.05, oy: 0.60, cx: 0, cy: 0, ax: 0.06, ay: 0.09,  fx: 2.732, fy: 1.414, px: Math.PI*0.8,  py: Math.PI/4,   rw: 500, rh: 360, r: 157, g:  92, b: 247, blur: 85 },
      // Bottom sweep
      { ox: 0.40, oy: 0.85, cx: 0, cy: 0, ax: 0.10, ay: 0.05,  fx: 3.141, fy: 1.732, px: 0,            py: Math.PI*0.7, rw: 600, rh: 380, r: 188, g: 147, b: 243, blur: 70 },
    ];

    // ── loop state ────────────────────────────────────────────────────────────
    let t = 0;
    let active = true;
    const onVisibility = () => { active = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    const NOISE_SCALE = 0.0032;
    const NOISE_SPEED = 0.00026;
    const MAX_CONN_D  = W * 0.20;
    const MAX_CONN_D2 = MAX_CONN_D * MAX_CONN_D;

    // ── GSAP ticker ───────────────────────────────────────────────────────────
    const tick = gsap.ticker.add(() => {
      if (!active) return;
      t++;
      ctx.clearRect(0, 0, W, H);

      // ── 1. Plasma blobs ───────────────────────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const s = 0.00040;
      for (const b of blobs) {
        b.cx = b.ox * W + Math.sin(t * s * b.fx + b.px) * b.ax * W;
        b.cy = b.oy * H + Math.sin(t * s * b.fy + b.py) * b.ay * H;
        const R = Math.max(b.rw, b.rh) * 0.5;
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, R);
        g.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},0.38)`);
        g.addColorStop(0.45, `rgba(${b.r},${b.g},${b.b},0.18)`);
        g.addColorStop(1,    `rgba(${b.r},${b.g},${b.b},0)`);
        ctx.save();
        ctx.filter = `blur(${b.blur}px)`;
        ctx.beginPath();
        ctx.ellipse(b.cx, b.cy, b.rw * 0.5, b.rh * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // ── 2. Update nodes ───────────────────────────────────────────────────
      for (const node of nodes) {
        const nx = node.x * NOISE_SCALE + t * NOISE_SPEED + node.phase;
        const ny = node.y * NOISE_SCALE + t * NOISE_SPEED * 0.72 + node.phase * 1.31;
        const angle = noise(nx, ny) * Math.PI * 2;
        const force = 0.016 / node.mass;
        node.vx += Math.cos(angle) * force;
        node.vy += Math.sin(angle) * force;
        const damp = 0.972 - node.mass * 0.007;
        node.vx *= damp;
        node.vy *= damp;
        // Soft boundary push
        const m = 36;
        if (node.x < m)     node.vx += (m - node.x) * 0.004;
        if (node.x > W - m) node.vx -= (node.x - (W - m)) * 0.004;
        if (node.y < m)     node.vy += (m - node.y) * 0.004;
        if (node.y > H - m) node.vy -= (node.y - (H - m)) * 0.004;
        node.x += node.vx;
        node.y += node.vy;
        node.alpha += (node.targetAlpha - node.alpha) * 0.013;
      }

      // ── 3. Edges ─────────────────────────────────────────────────────────
      const drawn = new Set<string>();
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (const j of a.edges) {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (drawn.has(key)) continue;
          drawn.add(key);
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > MAX_CONN_D2) continue;
          const d   = Math.sqrt(d2);
          const prox = 1 - d / MAX_CONN_D;
          const ea  = prox * Math.min(a.alpha, b.alpha) * 0.48;
          if (ea < 0.006) continue;

          const eg = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          const [ar, ag, ab_] = a.rgb;
          const [br, bg, bb_] = b.rgb;
          eg.addColorStop(0,   `rgba(${ar},${ag},${ab_},${ea})`);
          eg.addColorStop(0.5, `rgba(${br},${bg},${bb_},${ea * 0.5})`);
          eg.addColorStop(1,   `rgba(${ar},${ag},${ab_},${ea})`);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = eg;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }

      // ── 4. Node dots ──────────────────────────────────────────────────────
      for (const node of nodes) {
        if (node.alpha < 0.006) continue;
        const [r, g, b] = node.rgb;
        // Soft glow halo
        const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 5.5);
        halo.addColorStop(0, `rgba(${r},${g},${b},${node.alpha * 0.55})`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${node.alpha})`;
        ctx.fill();
      }
    });

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
