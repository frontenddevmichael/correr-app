"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";

/** Explicit line breaks: the rag is part of the composition, not the browser's. */
const LINES = [
  ["A", "private", "ledger"],
  ["for", "the", "things"],
  ["you", "said", "you’d", "do."],
];

const TOTAL = LINES.reduce((count, line) => count + line.length, 0);

/**
 * The page's one slow moment: a line of light type that fills in as it comes
 * into view. Words are readable at rest (16% is still text), so a stalled
 * scroll never leaves a blank section.
 */
export function Statement() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start 0.9", "end 0.6"],
  });

  let index = 0;

  return (
    <section
      ref={section}
      data-shot="statement"
      aria-label="A private ledger for the things you said you’d do."
      className="relative flex min-h-[70svh] items-center overflow-hidden border-y border-line py-[clamp(80px,12vh,140px)]"
    >
      <span
        aria-hidden="true"
        className="dots pointer-events-none absolute right-[6%] top-16 hidden h-[92px] w-[120px] lg:block"
      />

      <div className="shell">
        <p className="t-statement max-w-[18ch] text-ink" aria-hidden="true">
          {LINES.map((line, lineIndex) => (
            <span key={lineIndex} className="block">
              {line.map((word) => {
                const at = index++;
                return (
                  <Word
                    key={`${word}-${at}`}
                    progress={scrollYProgress}
                    index={at}
                    total={TOTAL}
                    reduced={Boolean(reduced)}
                  >
                    {word}
                  </Word>
                );
              })}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

function Word({
  children,
  progress,
  index,
  total,
  reduced,
}: {
  children: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
  reduced: boolean;
}) {
  const start = (index / total) * 0.72;
  const end = start + 0.28;
  const opacity = useTransform(progress, [start, end], [0.18, 1]);

  if (reduced) {
    return <span className="mr-[0.24em] inline-block">{children}</span>;
  }

  return (
    <motion.span style={{ opacity }} className="mr-[0.24em] inline-block">
      {children}
    </motion.span>
  );
}
