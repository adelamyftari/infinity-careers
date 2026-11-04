import Link from "next/link";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { MenuButton } from "./MenuButton";

/**
 * Minimal site header: logo left, menu right, aligned to the page gutter.
 * `data-intro` marks what the intro hands over to: the logo the 3D logo
 * lands on, and the content that fades in around it.
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="flex h-24 items-center justify-between px-(--gutter)">
        <Link href="/" aria-label="Infinity Careers, home" className="group flex items-center gap-4">
          <InfinityMark data-intro="logo" className="size-10" />
          <span data-intro="reveal" className="flex items-center gap-4">
            <span className="text-[13px] font-semibold tracking-[0.24em] text-foreground">INFINITY</span>
            <span aria-hidden="true" className="h-4 w-px bg-foreground/20 transition-transform duration-500 ease-premium group-hover:rotate-12" />
            <span className="font-serif text-lg italic leading-none text-foreground/70 transition-colors duration-500 group-hover:text-foreground">
              Careers
            </span>
          </span>
        </Link>

        <div data-intro="reveal" className="flex items-center">
          <MenuButton />
        </div>
      </div>
    </header>
  );
}
