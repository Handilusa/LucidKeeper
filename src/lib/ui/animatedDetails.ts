import type React from 'react';

export function animateDetailsToggle(
  e: React.MouseEvent<HTMLElement>,
  onStateChange?: (open: boolean) => void
) {
  const summary = e.currentTarget;
  const details = summary.closest('details');
  if (!details) return;

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (onStateChange) {
      setTimeout(() => onStateChange(details.open), 0);
    }
    return;
  }

  // Prevent instantaneous native toggle so we can control entrance and exit
  e.preventDefault();

  if (details.dataset.animating === 'true') {
    return;
  }

  if (details.open) {
    // === EXIT ANIMATION (Cierre suave / cuando salgan) ===
    details.dataset.animating = 'true';
    const startHeight = details.offsetHeight;
    const endHeight = summary.offsetHeight;

    const body = details.querySelector<HTMLElement>('.funding-body, .risk-body, div:not(summary)');

    const animTiming: KeyframeAnimationOptions = {
      duration: 240,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'forwards',
    };

    const containerAnim = details.animate(
      [
        { height: `${startHeight}px` },
        { height: `${endHeight}px` },
      ],
      animTiming
    );

    const bodyAnim = body
      ? body.animate(
          [
            { opacity: '1', transform: 'translateY(0)' },
            { opacity: '0', transform: 'translateY(-8px)' },
          ],
          { duration: 190, easing: 'ease-in', fill: 'forwards' }
        )
      : null;

    containerAnim.onfinish = () => {
      details.open = false;
      details.dataset.animating = 'false';
      containerAnim.cancel();
      bodyAnim?.cancel();
      onStateChange?.(false);
    };
  } else {
    // === ENTRANCE ANIMATION (Apertura suave / cuando entren) ===
    details.open = true;
    details.dataset.animating = 'true';
    onStateChange?.(true);

    const startHeight = summary.offsetHeight;
    const endHeight = details.offsetHeight;

    const body = details.querySelector<HTMLElement>('.funding-body, .risk-body, div:not(summary)');

    const animTiming: KeyframeAnimationOptions = {
      duration: 280,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    };

    const containerAnim = details.animate(
      [
        { height: `${startHeight}px` },
        { height: `${endHeight}px` },
      ],
      animTiming
    );

    const bodyAnim = body
      ? body.animate(
          [
            { opacity: '0', transform: 'translateY(-10px)' },
            { opacity: '1', transform: 'translateY(0)' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
        )
      : null;

    containerAnim.onfinish = () => {
      details.dataset.animating = 'false';
      containerAnim.cancel();
      bodyAnim?.cancel();
    };
  }
}
