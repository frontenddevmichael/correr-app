"use client";

import Image from "next/image";
import { MockFrame } from "react-mockframe";
import { useLayoutEffect, useRef, useState } from "react";

import type { Beat } from "@/lib/beats";

/**
 * iPhone 18 Pro frame from `react-mockframe`, whose bezel, corner radii and
 * Dynamic Island are measured from Apple's product renders. The frame renders
 * at its true CSS size (350 × 674 screen) and is scaled with a transform, so
 * the hardware detail stays proportional at every breakpoint.
 *
 * Frame box = screen + padding (15.83 × 15.67) on each side. Keep
 * `--phone-ratio` in globals.css in step with FRAME_W / FRAME_H: it is the
 * factor used when a phone has to fit inside the viewport height.
 */
const SCREEN_W = 350;
const SCREEN_H = 674;
const FRAME_W = SCREEN_W + 15.83 * 2;
const FRAME_H = SCREEN_H + 15.67 * 2;

export function PhoneFrame({
  beat,
  className = "",
  priority = false,
  sizes = "(min-width: 1024px) 400px, 280px",
  float = false,
}: {
  beat: Beat;
  className?: string;
  priority?: boolean;
  sizes?: string;
  float?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;

    const measure = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) setScale(width / FRAME_W);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={`phone-box relative ${className}`}
      style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
    >
      {/* Absolutely positioned so the scaled device never contributes its
          unscaled 905px height to layout — the frame box is exactly the
          aspect-ratio of the visible phone. */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          transform: `scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <MockFrame
          device="iPhone 18 Pro"
          color="natural-titanium"
          width={SCREEN_W}
          height={SCREEN_H}
          className={`phone-device ${float ? "phone-float" : ""}`}
        >
          <div className="phone-ui">
            {/* The app captures have no native status bar, so the canvas is
                continued under a real one — exactly how the app looks on device. */}
            <div className="phone-status" aria-hidden="true">
              <IOSStatusBar />
            </div>

            <div className="phone-body">
              <Image
                src={beat.light}
                alt={beat.alt}
                fill
                sizes={sizes}
                priority={priority}
                className="object-contain object-top dark:hidden"
              />
              <Image
                src={beat.dark}
                alt=""
                aria-hidden="true"
                fill
                sizes={sizes}
                priority={priority}
                className="hidden object-contain object-top dark:block"
              />
            </div>

            <span className="phone-glare" aria-hidden="true" />
            <span className="phone-home-indicator" aria-hidden="true" />
          </div>
        </MockFrame>
      </div>
    </div>
  );
}

/** iOS 26 status bar: time, cellular, Wi-Fi, battery. */
function IOSStatusBar() {
  return (
    <>
      <span className="phone-time">9:41</span>
      <span className="phone-status-icons">
        {/* Cellular */}
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.6}
              y={9 - i * 3}
              width="3"
              height={3 + i * 3}
              rx="0.8"
              fill="currentColor"
            />
          ))}
        </svg>
        {/* Wi-Fi */}
        <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
          <path
            d="M8 11.2 5.6 8.7a3.5 3.5 0 0 1 4.8 0L8 11.2Z"
            fill="currentColor"
          />
          <path
            d="M3.6 6.7a6.4 6.4 0 0 1 8.8 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M1.2 4.2a9.9 9.9 0 0 1 13.6 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3.2"
            stroke="currentColor"
            strokeOpacity="0.38"
            fill="none"
          />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
          <path
            d="M23.2 4.2v3.6a2 2 0 0 0 0-3.6Z"
            fill="currentColor"
            fillOpacity="0.4"
          />
        </svg>
      </span>
    </>
  );
}
