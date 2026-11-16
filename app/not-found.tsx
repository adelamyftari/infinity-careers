import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/home/SiteHeader";
import { button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found · Infinity Careers" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col justify-center px-(--gutter) py-32">
        <h1 className="text-page font-medium">
          This page has <em className="font-accent text-[1.08em] font-normal italic tracking-[-0.02em]">moved on</em>
          <span className="text-accent">.</span>
        </h1>
        <Link
          href="/roles"
          className={`${button.primary} mt-8 w-fit`}
        >
          See all open roles
        </Link>
      </main>
    </>
  );
}
