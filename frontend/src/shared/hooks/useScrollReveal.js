import { useEffect } from 'react';

const SELECTOR = '[data-reveal]';

export default function useScrollReveal(routeKey) {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const nodes = () => Array.from(document.querySelectorAll(SELECTOR));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes().forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    document.documentElement.classList.add('reveal-ready');

    const observed = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -36px 0px',
      },
    );

    const observe = (element) => {
      if (!(element instanceof Element) || observed.has(element)) return;
      observed.add(element);
      observer.observe(element);
    };

    nodes().forEach(observe);

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) observe(node);
          node.querySelectorAll?.(SELECTOR).forEach(observe);
        });
      });
    });

    const root = document.querySelector('.site-main');
    if (root) mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      document.documentElement.classList.remove('reveal-ready');
    };
  }, [routeKey]);
}
