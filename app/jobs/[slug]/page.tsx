import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleArtwork } from "@/components/careers/RoleArtwork";
import { SiteHeader } from "@/components/home/SiteHeader";
import { CATEGORIES, getJob, JOBS } from "@/lib/careers/jobs";

export function generateStaticParams() {
  return JOBS.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({ params }: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const job = getJob((await params).slug);
  return { title: job ? `${job.title} · Infinity Careers` : "Role not found · Infinity Careers" };
}

/** Temporary role page, until the full job detail design exists. */
export default async function JobPage({ params }: PageProps<"/jobs/[slug]">) {
  const job = getJob((await params).slug);
  if (!job) notFound();
  const category = CATEGORIES[job.category];

  const facts = [
    ["Property", job.property],
    ["Location", job.location],
    ["Department", job.department],
    ["Career group", category.group],
    ["Experience", job.experience],
    ["Job type", job.type],
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-(--gutter) pb-24 pt-32">
        <Link
          href="/#roles"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span> All open roles
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: category.accent }} />
              {category.label}
            </span>
            <h1 className="mt-6 text-[clamp(2.75rem,6vw,6rem)] font-medium leading-[0.92] tracking-[-0.05em]">{job.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{job.summary}</p>

            <dl className="mt-12 grid grid-cols-2 border-t border-line sm:grid-cols-3">
              {facts.map(([term, detail]) => (
                <div key={term} className="border-b border-line py-5 pr-4">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{term}</dt>
                  <dd className="mt-1.5 font-medium">{detail}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 flex flex-wrap items-center gap-5">
              <span className="rounded-[18px] bg-gold px-7 py-4 text-[15px] font-semibold text-ink">Applications open soon</span>
              <p className="max-w-xs text-sm text-muted">The full role description and application form are on their way.</p>
            </div>
          </div>

          <RoleArtwork job={job} sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/5] rounded-[32px] lg:aspect-auto lg:min-h-[36rem]" />
        </div>
      </main>
    </>
  );
}
