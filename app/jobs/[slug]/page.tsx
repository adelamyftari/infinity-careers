import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleArtwork } from "@/components/careers/RoleArtwork";
import { SiteHeader } from "@/components/home/SiteHeader";
import { CATEGORIES, getJob, openJobs } from "@/lib/careers/jobs";
import { getCareersProperty } from "@/lib/careers/properties";
import { CAREER_GROUP_LABEL, getDepartment } from "@/lib/careers/taxonomy";

/** What a fact HR has not set yet reads as. */
const UNSET = "To be confirmed";

export function generateStaticParams() {
  return openJobs().map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({ params }: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const job = getJob((await params).slug);
  return { title: job ? `${job.title} · Infinity Careers` : "Role not found · Infinity Careers" };
}

/** A role: its title across the page, the photograph beside the facts that matter. */
export default async function JobPage({ params }: PageProps<"/jobs/[slug]">) {
  const job = getJob((await params).slug);
  if (!job || job.status !== "published") notFound();
  const category = CATEGORIES[job.category];

  const facts = [
    ["Property", job.propertyId ? getCareersProperty(job.propertyId).name : UNSET],
    ["Location", job.location ?? UNSET],
    ["Department", getDepartment(job.departmentId).name],
    ["Career group", CAREER_GROUP_LABEL[job.careerGroup]],
    ["Experience", job.experienceLevel ?? UNSET],
    ["Employment type", job.employmentTypes.length ? job.employmentTypes.join(", ") : UNSET],
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-(--gutter) pb-[clamp(4rem,8vw,7rem)] pt-28">
        <Link href="/roles" className="inline-block py-1 text-small text-muted underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline">
          <span aria-hidden="true">←</span> All open roles
        </Link>

        <header className="mt-[clamp(2rem,5vw,4rem)]">
          <p className="flex items-center gap-2 text-small font-medium text-muted">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: category.accent }} />
            {category.label}
          </p>
          <h1 className="mt-4 max-w-[14ch] text-balance text-page font-medium">{job.title}</h1>
        </header>

        <div className="mt-[clamp(2rem,5vw,4.5rem)] grid gap-x-[clamp(2rem,6vw,6rem)] gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-lead">{job.summary}</p>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 border-t border-line">
              {facts.map(([term, detail]) => (
                <div key={term} className="border-b border-line py-4">
                  <dt className="text-small text-muted">{term}</dt>
                  <dd className="mt-1 text-body font-medium">{detail}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <p className="flex items-center gap-2.5 text-body font-semibold">
                <span aria-hidden="true" className="size-2 bg-accent" />
                Applications open soon
              </p>
              <p className="mt-1.5 max-w-[42ch] text-body text-muted">The full role description and application form are on their way.</p>
            </div>
          </div>

          <RoleArtwork
            job={job}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="aspect-[4/3] rounded-surface lg:col-span-7 lg:aspect-auto lg:min-h-[34rem]"
          />
        </div>
      </main>
    </>
  );
}
