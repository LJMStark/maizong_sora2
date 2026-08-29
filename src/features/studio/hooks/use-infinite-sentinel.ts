import { useEffect, useRef } from "react";

function closestScrollRoot(element: Element | null): Element | null {
  let current = element?.parentElement ?? null;

  while (current && current !== document.body) {
    const { overflowY } = getComputedStyle(current);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Observe a sentinel and call `onIntersect` when it enters the scrollport
 * plus `rootMargin`. Re-running when `enabled` or `observeKey` changes
 * makes IntersectionObserver fire again if the sentinel is still visible,
 * so the caller can keep filling until the sentinel leaves the prefetch zone.
 */
export function useInfiniteSentinel<T extends HTMLElement>({
  enabled,
  onIntersect,
  observeKey,
  rootMargin = "800px 0px",
}: {
  enabled: boolean;
  onIntersect: () => void;
  observeKey: string | number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onIntersectRef.current();
      },
      {
        root: closestScrollRoot(node),
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, observeKey, rootMargin]);

  return ref;
}
