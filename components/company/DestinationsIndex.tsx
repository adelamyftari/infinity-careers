"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/editorial/Editorial";
import { PROPERTIES, PROPERTY_CATEGORY_LABEL, propertyHref } from "@/lib/properties/properties";

/**
 * The seven public properties, from the site's own property data, in its order, each linking to
 * its place on /properties (the headquarters is not one of them). On a wide screen the list leads
 * a large photograph that follows the row under the pointer or the keyboard; on a narrow one, each
 * row carries its own small photograph.
 */
export function DestinationsIndex() {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
      <ol data-group className="border-t border-line lg:col-span-6">
        {PROPERTIES.map((property, i) => (
          <li key={property.id} data-reveal className="border-b border-line">
            <Link
              href={propertyHref(property)}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group/arrow flex items-center gap-4 py-4 outline-none transition-colors duration-300 focus-visible:bg-primary/[0.04] md:gap-6 md:py-5"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-[6px] bg-primary lg:hidden">
                {property.gallery[0] && <Image src={property.gallery[0].src} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <span className="w-8 shrink-0 text-small font-medium tabular-nums text-muted max-lg:hidden">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[clamp(1.25rem,0.95rem+1vw,2rem)] font-medium leading-tight tracking-[-0.02em] transition-colors duration-300 ${i === active ? "lg:text-primary" : "lg:text-primary/45"} group-hover/arrow:text-primary`}>
                  {property.name}
                </span>
                <span className="mt-1 block text-small text-muted">
                  {property.city} <span aria-hidden="true" className="px-1 text-primary/30">·</span> {PROPERTY_CATEGORY_LABEL[property.category]}
                </span>
              </span>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${i === active ? "lg:border-primary lg:bg-primary lg:text-neutral" : "border-primary/20 text-primary"} group-hover/arrow:border-accent group-hover/arrow:bg-accent group-hover/arrow:text-primary`}>
                <ArrowUpRight />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* The photograph of the row in focus, the others waiting beneath it. */}
      <div aria-hidden="true" className="relative hidden aspect-[4/5] overflow-hidden rounded-[6px] bg-primary lg:sticky lg:top-28 lg:col-span-6 lg:block">
        <div data-mask className="absolute inset-0">
          {PROPERTIES.map((property, i) =>
            property.gallery[0] ? (
              <Image
                key={property.id}
                src={property.gallery[0].src}
                alt=""
                fill
                sizes="(min-width: 1024px) 46vw, 1px"
                className={`object-cover transition-[opacity,scale] duration-700 ease-premium ${i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}
              />
            ) : null,
          )}
        </div>
        <p className="absolute bottom-5 left-5 rounded-[6px] bg-petrol/80 px-3 py-1.5 text-label font-medium tracking-[0.14em] text-neutral backdrop-blur-sm">
          {PROPERTIES[active].name.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
