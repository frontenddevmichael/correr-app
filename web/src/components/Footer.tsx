import Link from "next/link";

import { Mark } from "@/components/Mark";
import { SITE } from "@/lib/site";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#app", label: "The app" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * The close: a black band, the links, and the wordmark set so large it runs off
 * the bottom edge — the reference's ending, in the brand's own voice.
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0b0b0b] text-white/60">
      <div className="shell">
        <div className="flex flex-col gap-10 border-t border-white/10 pt-12 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Mark className="h-5 w-5 text-white/80" />
              <span className="font-display text-[12px] font-medium tracking-[0.22em] text-white/80">
                CORRER
              </span>
            </div>

            <nav aria-label="Footer" className="mt-6 flex flex-col items-start">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-10 items-center text-[14.5px] text-white/60 transition-colors duration-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col items-start gap-5 sm:items-end">
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="inline-flex h-11 items-center gap-2.5 rounded-full bg-white/[0.08] px-5 text-[13.5px] text-white/85 transition-colors duration-200 hover:bg-white/[0.14] hover:text-white"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect
                  x="1.6"
                  y="3.4"
                  width="12.8"
                  height="9.2"
                  rx="1.8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="m2.4 4.6 5.6 4 5.6-4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              Contact
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8h9.5M9 4.5 12.5 8 9 11.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            <p className="num text-[12.5px] text-white/40">© 2026 Correr</p>
          </div>
        </div>

        <div className="mt-16 overflow-hidden" aria-hidden="true">
          <span className="wordmark -mb-[0.16em] block whitespace-nowrap text-center text-[clamp(88px,25vw,330px)] text-white/[0.06]">
            Correr
          </span>
        </div>
      </div>
    </footer>
  );
}
