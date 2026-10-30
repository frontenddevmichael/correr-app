"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Mark } from "@/components/Mark";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/#app", label: "The app" },
  { href: "/#accountability", label: "Accountability" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * One quiet bar: mark and wordmark on the left, three anchors beside it, the
 * theme switch and the waitlist on the right. It gains a hairline and a frosted
 * backing only once the page moves.
 */
export function Header() {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        lifted
          ? "border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75"
          : "border-transparent bg-canvas"
      }`}
    >
      <div className="shell flex h-[64px] items-center justify-between gap-6 md:h-[76px]">
        <div className="flex min-w-0 items-center gap-8 lg:gap-14">
          <Link
            href="/#top"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Correr, back to top"
          >
            <Mark className="h-[22px] w-[22px] text-ink" />
            <span className="font-display text-[15px] font-medium tracking-[0.22em] text-ink">
              CORRER
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Site">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] text-secondary transition-colors duration-200 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/#waitlist"
            className="btn btn-primary h-11 px-5 text-[14px]"
          >
            Join the waitlist
          </Link>
        </div>
      </div>
    </header>
  );
}
