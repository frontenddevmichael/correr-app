import { Bento } from "@/components/Bento";
import { Faq } from "@/components/Faq";
import { Features } from "@/components/Features";
import { FinalCta } from "@/components/FinalCta";
import { Hero } from "@/components/Hero";
import { Statement } from "@/components/Statement";
import { SITE } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  publisher: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.svg`,
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, author-controlled object — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Features />
      <Statement />
      <Bento />
      <Faq />
      <FinalCta />
    </>
  );
}
