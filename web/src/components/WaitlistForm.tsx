"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { EMAIL_ERROR, isEmail, sanitizeEmail } from "@/lib/validation";
import { joinWaitlist } from "@/lib/waitlist";

type State = "idle" | "busy" | "done" | "error";

/**
 * The page's only form: one pill holding the field and the button, with the
 * consequence spelled out underneath.
 *
 * The swap from form to confirmation is a plain conditional render — no exit
 * animation to wait on — so the success state can never be held back by a
 * transition that fails to finish.
 */
export function WaitlistForm({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Filled only by bots that ignore off-screen fields; humans never see it.
  const [trap, setTrap] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "busy") return;

    if (trap) {
      setState("done");
      return;
    }

    const clean = sanitizeEmail(email).trim().toLowerCase();

    if (!isEmail(clean)) {
      setState("error");
      setMessage(EMAIL_ERROR);
      inputRef.current?.focus();
      return;
    }

    setState("busy");
    setMessage(null);

    try {
      await joinWaitlist(clean);
      setState("done");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong. Try again.",
      );
      inputRef.current?.focus();
    }
  };

  return (
    <div id={id} className="mx-auto w-full max-w-[520px] scroll-mt-28 text-left">
      {state === "done" ? (
        <div
          role="status"
          className="rise flex items-center justify-center gap-3 rounded-[18px] bg-sunken px-6 py-5 text-center"
        >
          <CheckGlyph className="mt-px h-4 w-4 shrink-0 text-ink" />
          <div>
            <p className="text-[15px] font-medium text-ink">You&apos;re on the list.</p>
            <p className="t-caption mt-0.5 text-muted">
              One email, when Correr is ready. Nothing else.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={state === "busy"}>
          <label htmlFor={fieldId} className="sr-only">
            Email address
          </label>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden"
          >
            <label htmlFor={`${fieldId}-company`}>Company</label>
            <input
              id={`${fieldId}-company`}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(event) => setTrap(event.target.value)}
            />
          </div>

          <div
            className={`flex flex-col gap-2 rounded-[20px] bg-sunken p-1.5 transition-shadow duration-200 sm:flex-row sm:items-center sm:rounded-full sm:pl-6 ${
              state === "error"
                ? "ring-1 ring-ink/25"
                : "focus-within:ring-1 focus-within:ring-ink/15"
            }`}
          >
            <input
              ref={inputRef}
              id={fieldId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
              placeholder="Your email address"
              value={email}
              onChange={(event) => {
                setEmail(sanitizeEmail(event.target.value));
                if (state === "error") {
                  setState("idle");
                  setMessage(null);
                }
              }}
              aria-invalid={state === "error"}
              aria-describedby={`${hintId}${state === "error" ? ` ${errorId}` : ""}`}
              className="h-[52px] min-w-0 flex-1 bg-transparent px-4 text-[15.5px] text-ink placeholder:text-muted focus:outline-none sm:px-0"
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="btn btn-primary h-[52px] shrink-0 px-6 text-[14.5px] disabled:cursor-progress disabled:opacity-80"
            >
              {state === "busy" ? (
                <>
                  <Spinner />
                  Joining…
                </>
              ) : (
                <>
                  Join the waitlist
                  <ArrowGlyph />
                </>
              )}
            </button>
          </div>

          <p id={hintId} className="mt-4 text-center text-[12.5px] leading-relaxed text-muted">
            One launch email, then nothing. Withdraw at any time.{" "}
            <Link
              href="/privacy"
              className="text-secondary underline underline-offset-2 hover:text-ink"
            >
              Privacy policy
            </Link>
          </p>

          {state === "error" && message ? (
            <p
              id={errorId}
              role="alert"
              className="mt-3 text-center text-[13px] font-medium text-ink"
            >
              {message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

function ArrowGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h9.5M9 4.5 12.5 8 9 11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6.2 10.3 8.9 13l4.9-5.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d="M8 1.8a6.2 6.2 0 0 1 6.2 6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
