import Link from "next/link";
import type { ReactNode } from "react";

import { SITE } from "@/lib/site";

/**
 * Long-form page: one measure, hairline rules, no cards. Legal copy is the
 * only place on the site where a paragraph may run past three lines.
 */
export function LegalArticle({
  label,
  title,
  updated,
  intro,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="shell pb-[clamp(72px,12vh,140px)] pt-[clamp(40px,8vh,96px)]">
      <Link
        href="/"
        className="t-micro text-muted underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
      >
        Back to Correr
      </Link>

      <p className="t-micro mt-12 text-muted">{label}</p>
      <h1 className="t-display-l mt-3 max-w-[20ch]">{title}</h1>
      <p className="t-lead mt-6 max-w-[52ch] text-secondary">{intro}</p>
      <p className="t-micro num mt-8 text-muted">Last updated {updated}</p>

      <div className="legal mt-16 max-w-[68ch]">{children}</div>

      <p className="t-caption mt-16 border-t border-line pt-6 text-secondary">
        Questions about any of this:{" "}
        <a
          href={`mailto:${SITE.contactEmail}`}
          className="text-ink underline underline-offset-4"
        >
          {SITE.contactEmail}
        </a>
        .
      </p>
    </article>
  );
}
