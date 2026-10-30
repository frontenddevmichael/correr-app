import type { Metadata } from "next";

import { LegalArticle } from "@/components/LegalArticle";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What the Correr waitlist stores: your email address, when you joined and which page you used. No accounts, no analytics, no ad trackers.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalArticle
      label="Privacy"
      title="Your email, and nothing else."
      updated="29 October 2026"
      intro="This page covers the waitlist site. It is deliberately short, because the site does very little."
    >
      <h2>What we collect</h2>
      <p>
        When you submit the form we store the email address you typed, the time
        of the request, and the surface it came from (the waitlist page). That
        is the whole record.
      </p>
      <p>
        We do not create an account, do not set a login, and do not ask for a
        name, a phone number or a password.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>No analytics service, heatmaps or session recording.</li>
        <li>No advertising or cross-site trackers, and no third-party pixels.</li>
        <li>
          No cookies. Your light or dark choice is kept in your browser&apos;s
          local storage under <code>correr.web.theme</code> and is never sent to
          us.
        </li>
        <li>No IP address is stored alongside your address.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        One reason: to email you when Correr is ready to run. It is not added to
        a newsletter, not used for advertising, and not sold or rented to
        anyone.
      </p>

      <h2>Where it lives</h2>
      <p>
        Addresses are stored in a managed database operated by Convex
        (convex.dev), which processes the data on our behalf. Access is limited
        to the people building Correr.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until the waitlist is closed and invitations have gone out, then for at
        most twelve months. If you ask us to remove your address before that, we
        delete it.
      </p>

      <h2>Removing your address</h2>
      <p>
        Email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> from the
        address you signed up with, or tell us the address, and we will delete
        it. We aim to action requests within seven days and always within
        thirty.
      </p>

      <h2>Who this is for</h2>
      <p>
        The waitlist is not directed at children under 16, and we do not
        knowingly store their addresses. If one reaches us, tell us and we will
        remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes we will update the date at the top of the page.
        Material changes will be stated in the email that announces the
        product, not buried here.
      </p>
    </LegalArticle>
  );
}
