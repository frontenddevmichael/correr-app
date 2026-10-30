"use client";

import { useState } from "react";

type Choice = "on_track" | "struggling" | "blocked";

const CHOICES: { key: Choice; label: string }[] = [
  { key: "on_track", label: "On track" },
  { key: "struggling", label: "Struggling" },
  { key: "blocked", label: "Blocked" },
];

const SHARED = [
  { label: "Today's promises", value: true },
  { label: "Completion history", value: true },
  { label: "Streak and XP", value: true },
  { label: "Weekly review", value: true },
  { label: "AI conversations", value: false },
];

/**
 * The bento: one black tile for the daily check-in (the only interactive
 * moment on the page), then the sharing set, circles and the ledger as cards.
 */
export function Bento() {
  const [choice, setChoice] = useState<Choice | null>(null);

  return (
    <section
      id="accountability"
      data-shot="accountability"
      aria-labelledby="accountability-heading"
      className="scroll-mt-20 py-[clamp(64px,10vh,128px)]"
    >
      <div className="shell">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="t-micro uppercase tracking-[0.16em] text-muted">
            Accountability
          </p>
          <h2 id="accountability-heading" className="t-display-l mt-4 text-ink">
            Without an audience.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-secondary">
            Invite one partner, or join a circle. You decide what they see — and
            what they never see. Private by default, shared by choice.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:mt-14 md:gap-5 lg:grid-cols-12">
          {/* Check-in — the one interactive tile. */}
          <div className="rounded-[20px] bg-[#101010] p-7 text-[#f4f4f4] sm:p-9 lg:col-span-7">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Daily check-in
            </p>

            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.4vw,2.1rem)] font-light leading-[1.12] tracking-[-0.025em]">
              How are you showing up?
            </h3>

            <div
              className="mt-7 grid grid-cols-3 gap-2"
              role="group"
              aria-label="How are you showing up today?"
            >
              {CHOICES.map((item) => {
                const selected = choice === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setChoice(selected ? null : item.key)}
                    aria-pressed={selected}
                    className={`h-[64px] rounded-[14px] text-[13.5px] font-medium transition-colors duration-200 ${
                      selected
                        ? "bg-[#f4f4f4] text-[#101010]"
                        : "bg-white/[0.07] text-white/80 hover:bg-white/[0.12]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 min-h-[22px]" aria-live="polite">
              {choice ? (
                <p className="flex items-center gap-2 text-[13px] text-white/85">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 8.4 6.3 11.6 13 4.6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Logged. Tomorrow is a new ledger.
                </p>
              ) : (
                <p className="text-[13px] text-white/45">
                  Recovery earns the same 10 XP as completion.
                </p>
              )}
            </div>

            <p className="mt-8 max-w-[42ch] border-t border-white/10 pt-6 text-[15px] leading-[1.6] text-white/60">
              Missing isn&apos;t failing. Coming back is the skill.
            </p>
          </div>

          {/* What a partner sees. */}
          <div className="card p-7 sm:p-9 lg:col-span-5">
            <h3 className="t-card-title text-ink">A partner sees only what you choose.</h3>

            <dl className="mt-6">
              {SHARED.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-t border-line py-3.5 last:border-b"
                >
                  <dt className="text-[15px] text-secondary">{row.label}</dt>
                  <dd className="text-[13px] text-ink">
                    {row.value ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M3 8.4 6.3 11.6 13 4.6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="sr-only">Shared</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className="text-muted">
                          —
                        </span>
                        <span className="sr-only">Never shared</span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[12.5px] text-muted">
              Your coach conversation is never part of the sharing set.
            </p>
          </div>

          {/* Circles. */}
          <div className="card p-7 sm:p-9 lg:col-span-5">
            <h3 className="t-card-title text-ink">Circles are rooms, not feeds.</h3>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.6] text-secondary">
              Small groups, joined by code. Wins, check-ins and a weekly challenge
              — no algorithm deciding who gets seen.
            </p>
            <div className="mt-8 flex items-center gap-2">
              {["A", "B", "C"].map((letter) => (
                <span
                  key={letter}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-[12px] font-medium text-secondary"
                >
                  {letter}
                </span>
              ))}
              <span className="ml-1 text-[12.5px] text-muted">
                Four people, one room.
              </span>
            </div>
          </div>

          {/* Ledger. */}
          <div className="card flex flex-col justify-between p-7 sm:p-9 lg:col-span-7">
            <h3 className="t-card-title text-ink">Every rep leaves a mark.</h3>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: "12", unit: "days", label: "Current streak" },
                { value: "340", unit: "XP", label: "Earned" },
                { value: "7/7", unit: "days", label: "Active this week" },
              ].map((stat) => (
                <div key={stat.label} className="border-t border-line pt-4">
                  <dd className="num font-display text-[clamp(1.9rem,3vw,2.75rem)] font-light leading-none text-ink">
                    {stat.value}
                    <span className="ml-1.5 text-[12px] font-normal uppercase tracking-[0.12em] text-muted">
                      {stat.unit}
                    </span>
                  </dd>
                  <dt className="mt-2 text-[12.5px] text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
