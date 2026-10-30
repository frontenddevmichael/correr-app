import type { Metadata } from "next";

import { Mark } from "@/components/Mark";
import { PhoneFrame } from "@/components/PhoneFrame";
import { BEATS } from "@/lib/beats";
import { SITE } from "@/lib/site";

/** Not a page for people — the source for `public/og.png`. */
export const metadata: Metadata = {
  title: "Social card",
  robots: { index: false, follow: false },
};

export default function OgPage() {
  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <div className="shell flex h-full items-center gap-10">
          <div className="w-[620px] shrink-0">
            <div className="flex items-center gap-3">
              <Mark className="h-7 w-7 text-ink" />
              <span className="font-display text-[13px] font-semibold tracking-[0.22em] text-ink">
                CORRER
              </span>
            </div>

            <h1 className="mt-10 font-display text-[74px] font-semibold leading-[0.94] tracking-[-0.035em] text-ink">
              Small promises,
              <br />
              <span className="font-normal text-muted">kept daily.</span>
            </h1>

            <p className="mt-7 max-w-[30ch] text-[19px] leading-[1.5] text-secondary">
              One vision. A roadmap around your life. One promise a day  and a
              record that you kept it.
            </p>

            <p className="num mt-10 text-[13px] font-medium text-muted">
              {new URL(SITE.url).host}
            </p>
          </div>

          <div className="absolute bottom-0 right-[92px] w-[330px] translate-y-[78px]">
            <PhoneFrame beat={BEATS[0]} sizes="330px" />
          </div>
        </div>
      </div>
    </div>
  );
}
