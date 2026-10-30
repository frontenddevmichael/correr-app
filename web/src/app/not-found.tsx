import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/Mark";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col">
      <div className="shell flex flex-1 flex-col justify-center py-[clamp(72px,14vh,160px)]">
        <Link href="/" aria-label="Correr, home" className="inline-flex w-fit">
          <Mark className="h-7 w-7 text-ink" />
        </Link>

        <p className="num t-micro mt-12 text-muted">404</p>
        <h1 className="t-display-l mt-4 max-w-[18ch]">This page never made the list.</h1>
        <p className="t-lead mt-6 max-w-[42ch] text-secondary">
          The address is wrong, or the page has moved. The waitlist is still
          where it was.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex h-[52px] w-fit items-center rounded-full bg-ink px-7 text-[15px] font-medium text-canvas transition-colors duration-200 hover:bg-ink-soft"
        >
          Back to Correr
        </Link>
      </div>

      <div className="shell border-t border-line py-8">
        <p className="t-micro num text-muted">© 2026</p>
      </div>
    </main>
  );
}
