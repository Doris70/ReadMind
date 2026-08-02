'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const seenTargets = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -14% 0px', threshold: 0.08 });
    }

    const attachTargets = () => {
      const targets = Array.from(new Set(
        Array.from(document.querySelectorAll<HTMLElement>(
          'main > header, main > section, main > section > aside, main > section > .section-rule, main > section > [data-reveal]',
        )),
      ));

      targets.forEach((target, index) => {
        if (seenTargets.has(target)) return;
        seenTargets.add(target);
        target.classList.add('reveal-on-scroll');
        target.style.setProperty('--reveal-delay', `${Math.min(index * 90, 360)}ms`);
        if (observer) {
          observer.observe(target);
        } else {
          target.classList.add('is-revealed');
        }
      });
    };

    attachTargets();
    const mutationObserver = new MutationObserver(attachTargets);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, []);

  return null;
}
