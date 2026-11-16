import Link from "next/link";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { MenuButton } from "./MenuButton";
import { ScrollAwareHeader } from "./ScrollAwareHeader";

/**
 * Minimal site header: logo left, menu right, aligned to the page gutter.
 * `data-intro` marks what the intro hands over to: the logo the 3D logo
 * lands on, and the content that fades in around it.
 */
export function SiteHeader() {
  return (
    <ScrollAwareHeader>
      <div className="flex h-20 items-center justify-between px-(--gutter)">
        <Link href="/" aria-label="Infinity Careers, home" className="relative z-10 flex items-center gap-3">
          <InfinityMark data-intro="logo" className="size-10" />
          <span data-intro="reveal" className="flex flex-col gap-[3px] text-small/none font-semibold tracking-[0.2em] text-primary transition-colors duration-[250ms] in-data-[tone=dark]:text-neutral">
            <span>INFINITY</span>
            <span>CAREERS</span>
          </span>
        </Link>

        {/* The menu button; the full-screen menu it opens floods out from it. */}
        <div data-intro="reveal" className="relative flex items-center">
          <MenuButton />
        </div>
      </div>
    </ScrollAwareHeader>
  );
}
