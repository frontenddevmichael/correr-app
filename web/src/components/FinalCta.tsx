import { WaitlistForm } from "@/components/WaitlistForm";

export function FinalCta() {
  return (
    <section
      id="early"
      data-shot="cta"
      className="scroll-mt-20 pb-[clamp(72px,11vh,140px)] pt-[clamp(24px,4vh,48px)]"
      aria-labelledby="cta-heading"
    >
      <div className="shell">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 id="cta-heading" className="t-display-l text-ink">
            Be early.
          </h2>
          <p className="mx-auto mt-5 max-w-[42ch] text-[16px] leading-relaxed text-secondary">
            Correr is in private build. Leave an email and you&apos;ll be in the
            first group to run.
          </p>
          <div className="mt-9">
            <WaitlistForm id="waitlist-bottom" />
          </div>
        </div>
      </div>
    </section>
  );
}
