import type { Metadata } from "next";

import { LegalArticle } from "@/components/LegalArticle";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for the Correr waitlist: what joining means, what we promise, and what we do not.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalArticle
      label="Terms"
      title="Joining a list, not buying a product."
      updated="29 October 2026"
      intro="Correr is in private build. The waitlist is free, and it is not a contract for a service that does not exist yet."
    >
      <h2>What joining means</h2>
      <p>
        Submitting your email puts you on the list of people we will tell when
        Correr opens. It does not create an account, reserve a place, guarantee
        access, or set a price.
      </p>

      <h2>What you agree to</h2>
      <ul>
        <li>The address you submit is yours, or one you are allowed to use.</li>
        <li>You will not submit other people&apos;s addresses or automated signups.</li>
        <li>You are old enough to consent to being contacted by email.</li>
      </ul>

      <h2>What we agree to</h2>
      <ul>
        <li>
          We will use your address only to tell you about Correr&apos;s
          availability, as described in the{" "}
          <a href="/privacy">privacy notice</a>.
        </li>
        <li>We will remove you from the list when you ask.</li>
        <li>We will not sell or rent the list.</li>
      </ul>

      <h2>No service yet</h2>
      <p>
        No product is being provided through this site. Nothing here is an offer,
        and features described on the page describe intent, not a commitment.
        The design, the name and the scope of Correr may change before release.
      </p>

      <h2>No warranty</h2>
      <p>
        The site is provided as it is. To the extent the law allows, we exclude
        implied warranties and are not liable for indirect or consequential loss
        arising from using this page. Nothing here limits rights you have under
        mandatory consumer law.
      </p>

      <h2>Ending it</h2>
      <p>
        You can leave the list at any time by emailing{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. We may
        close the list or remove entries that abuse it.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the operator&apos;s principal
        place of business, without regard to conflict-of-law rules.
      </p>
    </LegalArticle>
  );
}
