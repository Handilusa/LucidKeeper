import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import 'lenis/dist/lenis.css';

const preference = '(prefers-reduced-motion: reduce)';
const subscribe = (callback: () => void) => {
  const media = matchMedia(preference);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
export const useMotionPreference = () => useSyncExternalStore(subscribe, () => matchMedia(preference).matches, () => true);

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className} data-reveal>{children}</div>;
}

// The accessible value is always the verified final amount; only the visual reel moves.
export function ReceiptValue({ value }: { value: string }) {
  const match = /^(\d+) (.+)$/.exec(value);
  if (!match) return <>{value}</>;
  return <span aria-label={value} role="img">
    <span aria-hidden="true" className="receipt-counter">
      {[...match[1]].map((digit, index) => <span className="counter-slot" key={index}>
        <span data-counter-digit style={{ transform: `translateY(-${Number(digit) * 1.2}em)` }}>
          {Array.from({ length: 10 }, (_, number) => <span key={number}>{number}</span>)}
        </span>
      </span>)}
      <span> {match[2]}</span>
    </span>
  </span>;
}

export function useLandingMotion(disabled: boolean) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node || disabled) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];
    // Keep the readable page and its LCP independent from optional motion code.
    void import('motion/mini').then(async ({ animate }) => {
      if (disposed) return;
      const animations = new Set<ReturnType<typeof animate>>();
      const play = (element: Element, keyframes: Parameters<typeof animate>[1], duration = .5, delay = 0) => {
        const animation = animate(element, keyframes, { duration, delay, ease: [0.23, 1, 0.32, 1] });
        animations.add(animation);
        void animation.then(() => animations.delete(animation));
      };
      cleanups.push(() => { animations.forEach((a) => a.complete()); });
      node.dataset.motion = 'on';
      node.querySelectorAll('.hero-word').forEach((word, index) => {
        play(word, { opacity: [.2, 1], transform: ['translateY(20px)', 'translateY(0)'] }, .65, index * .045);
      });
      node.querySelectorAll('.hero-description, .hero-actions, .hero-footnote').forEach((element, index) => {
        play(element, { opacity: [.25, 1], transform: ['translateY(10px)', 'translateY(0)'] }, .5, .18 + index * .08);
      });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          play(element, { opacity: [.35, 1], transform: ['translateY(18px)', 'translateY(0)'] });
          if (element.matches('.lifecycle')) element.setAttribute('data-traced', 'true');
          if (element.matches('.proof-card')) element.querySelectorAll<HTMLElement>('[data-counter-digit]').forEach((digit, index) => {
            play(digit, { transform: ['translateY(0)', digit.style.transform] }, .7, index * .06);
          });
          observer.unobserve(element);
        });
      }, { threshold: .08 });
      node.querySelectorAll('[data-reveal], .lifecycle, .problem-grid article, .somnia-bento article, .proof-card, .roadmap-grid article').forEach((element) => observer.observe(element));
      cleanups.push(() => observer.disconnect());

      // Repeating workflow effects only run while their own graphic is in view.
      const flowObserver = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          target.setAttribute('data-flow-visible', String(isIntersecting));
        });
      }, { threshold: .12 });
      node.querySelectorAll('[data-flow]').forEach((element) => flowObserver.observe(element));
      cleanups.push(() => {
        flowObserver.disconnect();
        node.querySelectorAll('[data-flow-visible]').forEach((element) => element.removeAttribute('data-flow-visible'));
      });

      const ambientVisibility = () => { node.dataset.motion = document.hidden ? 'off' : 'on'; };
      document.addEventListener('visibilitychange', ambientVisibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', ambientVisibility));

      const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
      if (!finePointer.matches) return;
      const { default: Lenis } = await import('lenis');
      if (disposed) return;
      const lenis = new Lenis({ autoRaf: true, duration: .85, smoothWheel: true, syncTouch: false, prevent: (element) => !!element.closest('.comparison-scroll') });
      cleanups.push(() => lenis.destroy());
      const visibility = () => {
        node.dataset.motion = document.hidden ? 'off' : 'on';
        if (document.hidden) lenis.stop(); else lenis.start();
      };
      document.addEventListener('visibilitychange', visibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', visibility));
      node.querySelectorAll<HTMLElement>('.proof-card, .somnia-bento article, .problem-grid article').forEach((card) => {
        const light = document.createElement('span');
        light.className = 'card-light';
        light.setAttribute('aria-hidden', 'true');
        card.classList.add('spotlight-card');
        card.append(light);
        let rect = card.getBoundingClientRect(), frame = 0;
        const enter = () => { rect = card.getBoundingClientRect(); };
        const move = (event: PointerEvent) => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => { light.style.transform = `translate(${event.clientX - rect.left - 160}px, ${event.clientY - rect.top - 160}px)`; });
        };
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointermove', move);
        cleanups.push(() => { cancelAnimationFrame(frame); card.removeEventListener('pointerenter', enter); card.removeEventListener('pointermove', move); light.remove(); card.classList.remove('spotlight-card'); });
      });
      const product = node.querySelector<HTMLElement>('.product-window');
      const stage = node.querySelector<HTMLElement>('.product-stage');
      if (product && stage) {
        let frame = 0;
        const tilt = (event: PointerEvent) => {
          const rect = product.getBoundingClientRect();
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => { product.style.transform = `perspective(1800px) rotateX(${-(event.clientY - rect.top - rect.height / 2) / rect.height * 2}deg) rotateY(${(event.clientX - rect.left - rect.width / 2) / rect.width * 2}deg)`; });
        };
        const reset = () => { cancelAnimationFrame(frame); product.style.transform = ''; };
        const parallax = () => {
          const rect = stage.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < innerHeight) stage.style.transform = `translateY(${Math.max(-12, Math.min(12, (rect.top - innerHeight / 2) * .025))}px)`;
        };
        product.addEventListener('pointermove', tilt);
        product.addEventListener('pointerleave', reset);
        const offScroll = lenis.on('scroll', parallax);
        cleanups.push(() => { reset(); stage.style.transform = ''; product.removeEventListener('pointermove', tilt); product.removeEventListener('pointerleave', reset); offScroll(); });
      }
    }).catch(() => { /* Optional enhancement: readable content and native scrolling remain available. */ });
    return () => {
      disposed = true;
      cleanups.reverse().forEach((cleanup) => cleanup());
      delete node.dataset.motion;
      node.querySelectorAll('[data-traced]').forEach((element) => element.removeAttribute('data-traced'));
    };
  }, [disabled]);
  return root;
}
