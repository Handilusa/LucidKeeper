/**
 * MultiStreamDiagram — Somnia MultiStream consensus visual
 *
 * Animated replica of the Somnia MultiStream architecture:
 * - 4 parallel Datachains (columns of blocks flowing upward)
 * - Cross-datachain Consensus Chain connecting block heads
 * - Validator nodes at bottom feeding each chain
 * - GSAP stagger for block entry + consensus pulse
 *
 * Illustrative conceptual diagram — not live network telemetry.
 */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CHAIN_COUNT = 4;
const BLOCKS_PER_CHAIN = 4;

const CHAIN_LABELS = ['Datachain 1', 'Datachain 2', 'Datachain 3', 'Datachain 4'];

export function MultiStreamDiagram() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const blocks   = root.querySelectorAll<HTMLElement>('.ms-block');
    const connLine = root.querySelector<HTMLElement>('.ms-consensus-line');
    const badge    = root.querySelector<HTMLElement>('.ms-consensus-badge');
    const validators = root.querySelectorAll<HTMLElement>('.ms-validator');
    const arrows   = root.querySelectorAll<HTMLElement>('.ms-arrow');

    // Initial hidden state
    gsap.set(blocks,     { opacity: 0, y: 14, scale: 0.88 });
    gsap.set(connLine,   { scaleX: 0, transformOrigin: 'left center', opacity: 0 });
    gsap.set(badge,      { opacity: 0, scale: 0.82 });
    gsap.set(validators, { opacity: 0, y: 8 });
    gsap.set(arrows,     { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // 1. Validators appear first
    tl.to(validators, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 })
    // 2. Arrows from validator up
      .to(arrows, { opacity: 1, duration: 0.3, stagger: 0.08 }, '-=0.2')
    // 3. Blocks enter bottom-to-top per chain, chains staggered
      .to(blocks, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.45,
        stagger: {
          each: 0.07,
          from: 'end',     // bottom block first inside each chain
          grid: [BLOCKS_PER_CHAIN, CHAIN_COUNT],
          axis: 'y',
        },
      }, '-=0.1')
    // 4. Consensus line draws across
      .to(connLine, { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, '-=0.1')
    // 5. Badge pops in
      .to(badge, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, '-=0.15');

    // Repeating pulse on top row blocks (the "heads" being agreed upon)
    const headBlocks = root.querySelectorAll<HTMLElement>('.ms-block-head');
    gsap.to(headBlocks, {
      boxShadow: '0 0 0 3px #e040fb55, 0 0 18px #e040fb55',
      duration: 0.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.18, yoyo: true },
    });

    // Pulse the consensus line
    gsap.to(connLine, {
      opacity: 0.5,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 1.5,
    });

    return () => { tl.kill(); gsap.killTweensOf([blocks, connLine, badge, validators, arrows, headBlocks]); };
  }, []);

  return (
    <div className="ms-diagram" ref={rootRef} aria-hidden="true">
      {/* Datachains */}
      <div className="ms-chains-row">
        {CHAIN_LABELS.map((label, ci) => (
          <div className="ms-chain" key={label}>
            <span className="ms-chain-label">{label}</span>
            <div className="ms-blocks-col">
              {Array.from({ length: BLOCKS_PER_CHAIN }, (_, bi) => (
                <div
                  key={bi}
                  className={`ms-block${bi === 0 ? ' ms-block-head' : ''}`}
                  style={{ '--chain-i': ci, '--block-i': bi } as React.CSSProperties}
                >
                  Block
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>

      {/* Consensus line sits between chains-row and the label */}
      <div className="ms-consensus-line" aria-hidden="true" />
      <div className="ms-consensus-label">Cross datachain consensus chain</div>

      {/* Arrows from validators up */}
      <div className="ms-arrows-row">
        {CHAIN_LABELS.map((_, i) => (
          <div className="ms-arrow" key={i}>↑</div>
        ))}
      </div>

      {/* Validators */}
      <div className="ms-validators-row">
        {CHAIN_LABELS.map((_, i) => (
          <div className="ms-validator" key={i}>
            <span className="ms-validator-dot" />
            validator
          </div>
        ))}
      </div>

      {/* Consensus output badge */}
      <div className="ms-consensus-badge">
        <span className="ms-badge-label">Global ordered stream</span>
        <span className="ms-badge-sub">→ Validators read consensus heads</span>
      </div>
    </div>
  );
}
