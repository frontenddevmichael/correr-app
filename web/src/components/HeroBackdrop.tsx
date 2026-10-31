"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's atmosphere: a soft studio glow, two slowly turning hairline
 * rings, drifting dust and dot clusters, all behind the type.
 *
 * Motion is CSS-only for the loops so the hero is alive on the first frame.
 * Pointer parallax is layered on top (a few pixels, eased) and is switched
 * off for touch, coarse pointers and `prefers-reduced-motion`.
 */
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.055;
      currentY += (targetY - currentY) * 0.055;
      node.style.setProperty("--px", currentX.toFixed(4));
      node.style.setProperty("--py", currentY.toFixed(4));

      if (
        Math.abs(targetX - currentX) > 0.001 ||
        Math.abs(targetY - currentY) > 0.001
      ) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="hero-backdrop pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="hero-grid" />
      <span className="hero-glow" />

      <span className="hero-ring plx-1" />
      <span className="hero-ring hero-ring-2 plx-2" />

      <span className="dots hero-dots plx-1 left-[5%] top-[16%] hidden h-[120px] w-[150px] lg:block" />
      <span className="dots hero-dots plx-2 right-[4%] top-[38%] hidden h-[104px] w-[132px] lg:block" />
      <span className="dots hero-dots plx-1 bottom-[22%] left-[12%] hidden h-[72px] w-[90px] xl:block" />

      <span className="hero-speck plx-3 left-[14%] top-[30%] hidden md:block" />
      <span className="hero-speck hero-speck-2 plx-2 right-[17%] top-[22%] hidden md:block" />
      <span className="hero-speck hero-speck-3 plx-3 right-[26%] bottom-[16%] hidden lg:block" />
      <span className="hero-speck hero-speck-2 plx-1 left-[26%] bottom-[26%] hidden lg:block" />

      <span className="hero-rule left-[max(20px,calc((100%-1240px)/2+20px))] hidden xl:block" />
      <span className="hero-rule right-[max(20px,calc((100%-1240px)/2+20px))] hidden xl:block" />
    </div>
  );
}
