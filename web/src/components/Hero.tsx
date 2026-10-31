import { HeroBackdrop } from "@/components/HeroBackdrop";
import { Mark } from "@/components/Mark";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * The opening: three lines of light display type centred on paper, the mark
 * inline in the last line, then the form. The atmosphere behind it lives in
 * HeroBackdrop — a glow, turning rings and drifting dust, all aria-hidden.
 *
 * Every entrance is CSS, so the hero paints complete on the first frame.
 */
export function Hero() {
  return (
    <section
      id="top"
      data-shot="hero"
      className="relative isolate overflow-hidden pb-[clamp(40px,6vh,72px)] pt-[clamp(40px,7vh,88px)]"
    >
      <HeroBackdrop />

      <div className="shell relative">
        <div className="mx-auto max-w-[960px] text-center">
          <p className="rise t-micro inline-flex items-center gap-2 rounded-full border border-line bg-canvas/70 px-3 py-1.5 uppercase tracking-[0.16em] text-muted backdrop-blur-sm">
            <span className="hero-pip" aria-hidden="true" />
            Early access
          </p>

          <h1 className="t-display-xl hero-title mt-7 text-ink">
            <span className="rise rise-1 block">One vision.</span>
            <span className="rise rise-2 block">One promise a day.</span>
            <span className="rise rise-3 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted">
              <span>All in</span>
              <MarkChip />
              <span className="font-medium text-ink">Correr.</span>
            </span>
          </h1>

          <p className="rise rise-4 mx-auto mt-7 max-w-[44ch] text-[16px] leading-[1.65] text-secondary sm:text-[17px]">
            Name the life you&apos;re running toward, keep one promise a day,
            and watch the proof of it build.
          </p>

          <div className="rise rise-5 mt-9 sm:mt-11">
            <WaitlistForm id="waitlist" />
          </div>
        </div>
      </div>

      <HeroTicker />
    </section>
  );
}

/** The brand mark on its own tile, dropped into the last line of the headline. */
function MarkChip() {
  return (
    <span className="mark-chip inline-grid h-[0.78em] w-[0.78em] shrink-0 place-items-center rounded-[0.24em] bg-ink align-middle">
      <Mark className="h-[62%] w-[62%] text-canvas" />
    </span>
  );
}

/**
 * A slow band of the app's promises closing the hero. Duplicated once for the
 * seamless loop; the copy is decorative repetition of text found below, so the
 * whole band is hidden from assistive tech.
 */
const TICKER = [
  "One promise a day",
  "A vision with a name",
  "Check in before midnight",
  "Proof, not streaks",
  "Circles that keep you honest",
  "Progress you can feel",
];

function HeroTicker() {
  return (
    <div aria-hidden="true" className="hero-ticker">
      <div className="hero-ticker-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="hero-ticker-group">
            {TICKER.map((item) => (
              <span key={item} className="hero-ticker-item">
                <span className="hero-ticker-dot" />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
