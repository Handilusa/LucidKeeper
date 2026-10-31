/**
 * SigilGSAP — Animated LucidKeeper brand mark
 *
 * Full GSAP-powered animation stack:
 * - Orchestrated reveal timeline on mount
 * - Variable-speed orbit rotation via gsap.ticker
 * - Organic levitation with rotational drift
 * - quickTo mouse-tracking for smooth 3D tilt
 * - Asymmetric glow pulse
 * - HUD text scramble entry
 * - Pauses on prefers-reduced-motion and hidden tab
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ─── tiny text-scramble helper ─────────────────────────────────────────── */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/';
function scramble(el: HTMLElement, finalText: string, duration = 0.6, delay = 0) {
  let frame = 0;
  const totalFrames = Math.round(duration * 60);
  const timeout = setTimeout(() => {
    const id = setInterval(() => {
      const progress = frame / totalFrames;
      const revealed = Math.floor(progress * finalText.length);
      el.textContent =
        finalText.slice(0, revealed) +
        [...finalText.slice(revealed)].map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
      if (frame >= totalFrames) {
        clearInterval(id);
        el.textContent = finalText;
      }
      frame++;
    }, 1000 / 60);
  }, delay * 1000);
  return () => clearTimeout(timeout);
}

/* ─── orbit angle state ──────────────────────────────────────────────────── */
let outerAngle = 0;
let innerAngle = 0;

export function SigilGSAP() {
  const rootRef     = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<HTMLDivElement>(null);
  const emblemRef   = useRef<HTMLDivElement>(null);
  const glowCoreRef = useRef<HTMLDivElement>(null);
  const glowPulse1  = useRef<HTMLDivElement>(null);
  const glowPulse2  = useRef<HTMLDivElement>(null);
  const outerOrbit  = useRef<SVGSVGElement>(null);
  const innerOrbit  = useRef<SVGSVGElement>(null);
  const hudRef      = useRef<HTMLDivElement>(null);
  const hudLine1    = useRef<HTMLSpanElement>(null);
  const hudLine2    = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root    = rootRef.current;
    const stage   = stageRef.current;
    const emblem  = emblemRef.current;
    const gCore   = glowCoreRef.current;
    const gPulse1 = glowPulse1.current;
    const gPulse2 = glowPulse2.current;
    const oOuter  = outerOrbit.current;
    const oInner  = innerOrbit.current;
    const hud     = hudRef.current;
    const line1   = hudLine1.current;
    const line2   = hudLine2.current;
    if (!root || !stage || !emblem || !gCore || !gPulse1 || !gPulse2 || !oOuter || !oInner || !hud || !line1 || !line2) return;

    gsap.set([oOuter, oInner, emblem, gPulse1, gPulse2, gCore, hud], { opacity: 0 });
    gsap.set(emblem, { scale: 0.82, y: 14 });
    gsap.set([oOuter, oInner], { scale: 0.88 });

    /* ── 1. Reveal timeline ───────────────────────────────────────────────── */
    const tl = gsap.timeline({ delay: 0.15 });

    tl.to(gCore, { opacity: 1, duration: 0.7, ease: 'power2.out' })
      .to(oOuter, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.4)' }, '-=0.4')
      .to(oInner, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)' }, '-=0.6')
      .to(emblem, { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'expo.out' }, '-=0.55')
      .to(gPulse1, { opacity: 1, duration: 0.5, ease: 'power1.out' }, '-=0.6')
      .to(gPulse2, { opacity: 1, duration: 0.5, ease: 'power1.out' }, '-=0.45')
      .to(hud, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');

    gsap.set(hud, { y: 8 });

    /* ── 2. Scramble HUD text after reveal ───────────────────────────────── */
    const cancel1 = scramble(line1, 'LUCIDKEEPER PROTOCOL // CORE ACTIVE', 0.55, 0.65);
    const cancel2 = scramble(line2, 'SOMNIA TOKYO · 50383 / VERIFIED ON-CHAIN', 0.45, 1.0);

    /* ── 3. Levitation — organic, not symmetric ──────────────────────────── */
    // Base gentle float
    const levTween = gsap.to(emblem, {
      y: -11,
      rotateX: 3.5,
      rotateY: -4,
      duration: 3.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    // Secondary micro-drift layered on top (different period → organic beat)
    const microDrift = gsap.to(emblem, {
      rotateZ: 1.2,
      duration: 5.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 0.9,
    });

    /* ── 4. Glow pulse — asymmetric timing ───────────────────────────────── */
    gsap.to(gPulse1, {
      scale: 1.55,
      opacity: 0,
      duration: 3.2,
      ease: 'power1.out',
      repeat: -1,
      delay: 0.3,
    });
    gsap.to(gPulse2, {
      scale: 1.35,
      opacity: 0,
      duration: 2.4,
      ease: 'power2.out',
      repeat: -1,
      delay: 1.7,  // offset so they don't pulse together
    });

    // Core breathes
    gsap.to(gCore, {
      opacity: 0.55,
      scale: 1.12,
      duration: 2.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    /* ── 5. Variable-speed orbit via gsap.ticker ─────────────────────────── */
    // Speed modulates with a cosine → accelerates & decelerates organically
    const tickFn = () => {
      const t = gsap.ticker.time;
      // outer: base 0.4°/frame + ±0.2° modulation
      outerAngle += 0.18 + Math.cos(t * 0.31) * 0.06;
      // inner: opposite direction, different period
      innerAngle -= 0.28 + Math.cos(t * 0.19) * 0.08;
      gsap.set(oOuter, { rotateZ: outerAngle });
      gsap.set(oInner, { rotateZ: innerAngle });
    };
    gsap.ticker.add(tickFn);

    /* ── 6. Mouse-tracking 3D tilt via quickTo ───────────────────────────── */
    const quickX = gsap.quickTo(emblem, 'rotateY', { duration: 0.55, ease: 'power2.out' });
    const quickY = gsap.quickTo(emblem, 'rotateX', { duration: 0.55, ease: 'power2.out' });

    const onMove = (e: PointerEvent) => {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const rx = ((e.clientY - cy) / rect.height) * -10;
      const ry = ((e.clientX - cx) / rect.width)  *  12;
      quickX(ry);
      quickY(rx);
    };
    const onLeave = () => {
      // Spring back to levitation base
      gsap.to(emblem, { rotateY: -4, rotateX: 3.5, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    /* ── 7. Pause when tab hidden ────────────────────────────────────────── */
    const onVis = () => {
      if (document.hidden) {
        gsap.ticker.remove(tickFn);
        levTween.pause();
        microDrift.pause();
      } else {
        gsap.ticker.add(tickFn);
        levTween.resume();
        microDrift.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      tl.kill();
      levTween.kill();
      microDrift.kill();
      gsap.ticker.remove(tickFn);
      cancel1();
      cancel2();
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="hero-brand-sigil" ref={rootRef} aria-hidden="true">
      <div className="sigil-stage" ref={stageRef}>
        {/* Glow layers */}
        <div className="sigil-glow-core" ref={glowCoreRef} />
        <div className="sigil-glow-pulse" ref={glowPulse1} />
        <div className="sigil-glow-pulse sigil-glow-pulse-2" ref={glowPulse2} />

        {/* Outer orbit ring */}
        <svg
          ref={outerOrbit}
          className="sigil-orbit sigil-orbit-outer"
          viewBox="0 0 320 320"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="1"   strokeDasharray="4 8"  opacity="0.28" />
          <circle cx="160" cy="160" r="115" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 6"  opacity="0.18" />
          {/* Orbit satellites */}
          <circle cx="300" cy="160" r="4.5" fill="#bc93f3" opacity="0.9" />
          <circle cx="20"  cy="160" r="2.5" fill="#771be8" opacity="0.7" />
          <circle cx="160" cy="20"  r="2"   fill="#9d5cf7" opacity="0.5" />
        </svg>

        {/* Inner elliptical orbit */}
        <svg
          ref={innerOrbit}
          className="sigil-orbit sigil-orbit-inner"
          viewBox="0 0 280 280"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sigil-grad-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#bc93f3" stopOpacity="0.85" />
              <stop offset="40%"  stopColor="#771be8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#9d5cf7" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <ellipse
            cx="140" cy="140" rx="125" ry="55"
            stroke="url(#sigil-grad-g)" strokeWidth="1.2"
            strokeDasharray="14 5 2 5"
            transform="rotate(-25 140 140)"
          />
          {/* Satellite on ellipse */}
          <circle cx="255" cy="100" r="4" fill="#bc93f3" opacity="0.95" />
          <circle cx="30"  cy="185" r="2.5" fill="#9d5cf7" opacity="0.6" />
        </svg>

        {/* Logo */}
        <div className="sigil-emblem-wrap" ref={emblemRef}>
          <img
            src="/assets/brand/lucidkeeper-neon.png"
            alt=""
            aria-hidden="true"
            className="sigil-emblem-img"
            width={230}
            height={187}
            fetchPriority="high"
          />
        </div>
      </div>

      {/* HUD status badge */}
      <div className="sigil-hud" ref={hudRef}>
        <div className="sigil-hud-status">
          <span className="sigil-status-dot" />
          <span ref={hudLine1} />
        </div>
        <div className="sigil-hud-telemetry">
          <span ref={hudLine2} />
        </div>
      </div>
    </div>
  );
}
