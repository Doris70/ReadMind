'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('main > header, main > section'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-revealed'));
      return;
    }

    targets.forEach((target, index) => {
      target.classList.add('reveal-on-scroll');
      target.style.setProperty('--reveal-delay', `${Math.min(index * 55, 220)}ms`);
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return null;
}
