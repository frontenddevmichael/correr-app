const QUESTIONS = [
  {
    q: "What is Correr?",
    a: "An accountability app for the life you actually want. One vision, a roadmap built around it, one promise a day — and a record that you kept it.",
  },
  {
    q: "When can I try it?",
    a: "It is in private build now. The waitlist gets the first invitations, in order, and we email once when yours is ready. No drip campaigns.",
  },
  {
    q: "Is joining the waitlist free?",
    a: "Yes. No card, no account, no trial. One email address is the whole ask, and you can withdraw it at any time.",
  },
  {
    q: "Do I have to check in every day?",
    a: "No. Missing a day is not failing — it is data. Checking in after a gap earns the same XP as a clean run, because the point is to come back.",
  },
  {
    q: "Who sees my progress?",
    a: "Nobody, unless you invite them. A partner or a circle sees only the rows you switch on; your coach conversations are never part of the set.",
  },
  {
    q: "What happens to my data?",
    a: "Only your email is stored, and only to send the launch note. No analytics, no pixels, no third-party trackers on this site.",
  },
];

/**
 * Native disclosure elements: keyboard accessible, work without JavaScript,
 * and open one at a time because they share a `name`.
 */
export function Faq() {
  return (
    <section
      id="faq"
      data-shot="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 py-[clamp(64px,10vh,128px)]"
    >
      <div className="shell">
        <h2 id="faq-heading" className="t-display-l text-center text-ink">
          A few good questions.
        </h2>

        <div className="mx-auto mt-12 max-w-[720px]">
          {QUESTIONS.map((item) => (
            <details key={item.q} name="faq" className="group border-b border-line first:border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15.5px] font-medium text-ink transition-colors duration-200 hover:text-secondary [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-secondary transition-transform duration-300 group-open:rotate-45 group-open:border-ink group-open:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1.5v9M1.5 6h9"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[62ch] pb-6 pr-10 text-[14.5px] leading-[1.65] text-secondary">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
