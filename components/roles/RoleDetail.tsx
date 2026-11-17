"use client";

import Image from "next/image";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { DEPARTMENT_OVERVIEW, departmentName, propertyLabel, roleWhere, type RoleEntry } from "@/lib/careers/roles";
import { CAREER_GROUP_LABEL } from "@/lib/careers/taxonomy";
import { Modal, ModalCloseButton } from "./Modal";

const GROUP_TEAMS: Record<RoleEntry["careerGroup"], string> = {
  casino: "casino teams",
  restaurant: "restaurant team at Grand Panevino",
  hotel: "hotel team",
  administration: "headquarters teams",
};

/**
 * A role's details, in a drawer over the list: the facts, the overview and
 * the action. An opening shows HR's own copy; a career role with no opening
 * shows its department's general overview and says plainly that it is not a
 * vacancy. Nothing here is a requirement HR has not written.
 */
export function RoleDetail({ entry, onClose, onApply }: { entry: RoleEntry; onClose: () => void; onApply: (entry: RoleEntry) => void }) {
  const where = roleWhere(entry);
  const vacancy = entry.kind === "vacancy";
  const facts: [string, string][] = [
    ["Property", where.property],
    ["Location", where.location],
    ["Department", departmentName(entry)],
    ["Career group", CAREER_GROUP_LABEL[entry.careerGroup]],
    // No position level or employment type: they are not set officially for each position.
  ];
  // A position offered at several properties names each of them.
  if (vacancy && entry.propertyIds.length > 1) facts[0] = ["Properties", entry.propertyIds.map(propertyLabel).join(", ")];

  return (
    <Modal variant="drawer" labelledBy="role-detail-title" describedBy="role-detail-kind" onClose={onClose}>
      <div className="flex items-center justify-between gap-4 border-b border-neutral/10 px-5 py-4 md:px-8">
        <p className="text-label font-medium tracking-[0.18em] text-accent">
          {vacancy ? "OPEN POSITION" : "CAREER ROLE"} <span className="text-neutral/40">/</span> {CAREER_GROUP_LABEL[entry.careerGroup].toUpperCase()}
        </p>
        <ModalCloseButton label="Close role details" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div data-modal-reveal className="relative mx-5 mt-5 aspect-[16/9] overflow-hidden rounded-[16px] bg-petrol md:mx-8 md:mt-6">
          {entry.image ? (
            <Image src={entry.image} alt="" fill sizes="(min-width: 768px) 42rem, 100vw" className="object-cover" style={entry.imagePosition ? { objectPosition: entry.imagePosition } : undefined} />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle,rgb(247_247_242/0.07)_1px,transparent_1px)] bg-size-[18px_18px]">
              <InfinityMark className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 fill-petrol-soft" />
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-6 md:px-8">
          <h2 id="role-detail-title" data-modal-reveal className="text-[clamp(2rem,1.4rem+2vw,3rem)] font-bold leading-[0.95] tracking-[-0.03em] text-balance">
            {entry.title}
          </h2>
          <p id="role-detail-kind" data-modal-reveal className="mt-3 flex items-center gap-2 text-small text-neutral/75">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${vacancy ? "bg-accent" : "bg-neutral/40"}`} />
            {vacancy ? "A current opening: applications are open." : "A role Infinity hires for. There is no open position right now: you can register your interest."}
          </p>

          <dl data-modal-reveal className="mt-6 grid grid-cols-2 gap-x-6 border-t border-neutral/10">
            {facts.map(([term, detail]) => (
              <div key={term} className="border-b border-neutral/10 py-3.5">
                <dt className="text-label text-neutral/55">{term}</dt>
                <dd className="mt-1 text-body font-medium text-neutral">{detail}</dd>
              </div>
            ))}
          </dl>

          <section data-modal-reveal aria-labelledby="role-overview" className="mt-7">
            <h3 id="role-overview" className="text-label font-medium tracking-[0.18em] text-neutral/60">
              OVERVIEW
            </h3>
            {vacancy ? (
              <>
                <p className="mt-3 text-lead text-neutral/90">{entry.summary}</p>
                {entry.description && <p className="mt-3 text-body text-neutral/75">{entry.description}</p>}
                <p className="mt-4 text-small text-neutral/55">The full responsibilities and requirements are published by HR with the listing.</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-lead text-neutral/90">
                  {entry.title} is one of the roles Infinity&apos;s {GROUP_TEAMS[entry.careerGroup]} hire for. {DEPARTMENT_OVERVIEW[entry.departmentId]}
                </p>
                <p className="mt-3 text-body text-neutral/70">
                  Registering your interest is not an application for a current vacancy. Our recruitment team keeps it on file and may contact you when a matching position opens.
                </p>
              </>
            )}
          </section>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral/10 bg-petrol/60 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="text-small text-neutral/65">
          {where.property} · {where.location}
        </p>
        <button
          type="button"
          onClick={() => onApply(entry)}
          className="group/cta inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-accent px-6 text-small font-semibold tracking-[0.06em] text-petrol transition-colors duration-300 hover:bg-neutral"
        >
          {vacancy ? "APPLY NOW" : "EXPRESS INTEREST"}
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5">
            <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Modal>
  );
}
