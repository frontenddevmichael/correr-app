import { PhoneFrame } from "@/components/PhoneFrame";
import { BEATS } from "@/lib/beats";

/**
 * Three screens, three cards, each phone cropped by the card's bottom edge —
 * the reference's app section. Screens are real captures of the running app.
 */
const CARDS = [BEATS[0], BEATS[1], BEATS[3]];

export function Features() {
  return (
    <section
      id="app"
      data-shot="app"
      aria-labelledby="app-heading"
      className="scroll-mt-20 py-[clamp(64px,10vh,128px)]"
    >
      <div className="shell">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="t-micro uppercase tracking-[0.16em] text-muted">The app</p>
          <h2
            id="app-heading"
            className="t-display-l mt-4 text-ink"
          >
            Know what you&apos;re
            <br className="hidden sm:block" /> running toward.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-secondary">
            Vision, promises and progress in one place. Everything you need for
            the day ahead, and nothing competing for it.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:mt-14 md:grid-cols-3 md:gap-5">
          {CARDS.map((beat) => (
            <article
              key={beat.n}
              className="card flex flex-col overflow-hidden px-6 pt-7"
            >
              <h3 className="t-card-title text-ink">{beat.label}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-secondary">
                {beat.caption}
              </p>

              <div className="relative mt-7 h-[240px] overflow-hidden sm:h-[280px] md:h-[300px]">
                <div className="mx-auto w-[78%]">
                  <PhoneFrame beat={beat} sizes="(min-width: 768px) 260px, 260px" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
