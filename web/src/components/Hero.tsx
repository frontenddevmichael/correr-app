import { Mark } from "@/components/Mark";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * The opening: three lines of light display type centred on white, the mark
 * inline in the last line (after the reference), then the form. No imagery —
 * the screens arrive in the next section, and the white space is the point.
 *
 * Everything rises with CSS, so the hero paints on the first frame.
 */
export function Hero() {
  return (
    <section
      id="top"
      data-shot="hero"
      className="relative overflow-hidden pb-[clamp(64px,10vh,120px)] pt-[clamp(44px,7vh,96px)]"
    >
      <DotCluster className="left-[6%] top-28 hidden lg:block" />
      <DotCluster className="right-[6%] top-[42%] hidden lg:block" />

      <div className="shell">
        <div className="mx-auto max-w-[960px] text-center">
          <h1 className="t-display-xl text-ink">
            <span className="rise block">One vision.</span>
            <span className="rise rise-1 block">One promise a day.</span>
            <span className="rise rise-2 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted">
              <span>All in</span>
              <MarkChip />
              <span className="font-medium text-ink">Correr.</span>
            </span>
          </h1>

          

          <div className="rise rise-4 mt-10 sm:mt-12">
            <WaitlistForm id="waitlist" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** The brand mark on its own tile, dropped into the last line of the headline. */
function MarkChip() {
  return (
    <span className="inline-grid h-[0.86em] w-[0.86em] shrink-0 place-items-center rounded-[0.26em] bg-ink align-middle">
      <Mark className="h-[56%] w-[56%] text-canvas" />
    </span>
  );
}

function DotCluster({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`dots pointer-events-none absolute h-[104px] w-[132px] opacity-90 ${className}`}
    />
  );
}
