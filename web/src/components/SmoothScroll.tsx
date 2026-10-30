"use client";

import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

/**
 * Lenis smooth scrolling. Disabled entirely under `prefers-reduced-motion`,
 * and anchor links are handed to Lenis so the waitlist CTA eases in.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      anchors: true,
    });

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    // Dev-only handle so screenshot tooling can jump to a scroll position
    // without fighting the smoothing loop.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
