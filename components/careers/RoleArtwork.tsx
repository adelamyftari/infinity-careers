import Image from "next/image";
import type { ReactNode } from "react";
import { CATEGORIES, type Job } from "@/lib/careers/jobs";

/**
 * Line drawings on a 240×200 grid, one per category: the placeholder visual
 * until real photography exists.
 */
const MOTIFS: Record<Job["category"], ReactNode> = {
  // A gaming chip.
  casino: (
    <>
      <circle cx="120" cy="100" r="70" />
      <circle cx="120" cy="100" r="54" />
      <circle cx="120" cy="100" r="30" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="120" y1="30" x2="120" y2="46" transform={`rotate(${i * 30} 120 100)`} />
      ))}
      <path d="M120 84 132 100 120 116 108 100Z" />
    </>
  ),
  // A facade of arched windows.
  hotel: (
    <>
      <path d="M58 200V36h124v164" />
      {Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => {
          const x = 72 + col * 26;
          const y = 52 + row * 34;
          return <path key={`${row}-${col}`} d={`M${x} ${y + 24}v-14a6 6 0 0 1 12 0v14`} />;
        }),
      )}
      <path d="M104 200v-22a16 16 0 0 1 32 0v22" />
    </>
  ),
  // A plate under a cloche.
  restaurant: (
    <>
      <ellipse cx="120" cy="138" rx="86" ry="22" />
      <ellipse cx="120" cy="138" rx="60" ry="14" />
      <path d="M68 128a52 52 0 0 1 104 0" />
      <circle cx="120" cy="70" r="5" />
      <path d="M28 96v58m-6-58v22a6 6 0 0 0 12 0V96m178 0c-9 8-9 28 0 34v24" />
    </>
  ),
  // Ripples beneath stacked stones.
  spa: (
    <>
      {[34, 58, 82, 106].map((rx, i) => (
        <ellipse key={rx} cx="120" cy="150" rx={rx} ry={8 + i * 7} />
      ))}
      <ellipse cx="120" cy="132" rx="30" ry="10" />
      <ellipse cx="120" cy="110" rx="22" ry="9" />
      <ellipse cx="120" cy="92" rx="14" ry="7" />
    </>
  ),
  // A coupe, a highball and a bottle.
  bar: (
    <>
      <path d="M50 70h56c0 22-12 36-28 36s-28-14-28-36Zm28 36v50m-18 0h36" />
      <path d="M126 82h34v74h-34z" />
      <path d="M131 112h24" />
      <path d="M184 156V96c0-10 8-14 8-26V44h10v26c0 12 8 16 8 26v60z" />
    </>
  ),
  // Nested arches, an open door.
  hospitality: (
    <>
      <path d="M50 200V110a70 70 0 0 1 140 0v90" />
      <path d="M74 200v-88a46 46 0 0 1 92 0v88" />
      <path d="M98 200v-84a22 22 0 0 1 44 0v84" />
      <circle cx="134" cy="160" r="3" />
    </>
  ),
};

type RoleArtworkProps = {
  job: Job;
  sizes: string;
  className?: string;
};

export function RoleArtwork({ job, sizes, className = "" }: RoleArtworkProps) {
  const accent = CATEGORIES[job.category].accent;

  if (job.image) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={job.image} alt="" fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: `color-mix(in oklab, ${accent} 13%, #f3f0e9)`,
        backgroundImage: `radial-gradient(color-mix(in oklab, ${accent} 28%, transparent) 0.8px, transparent 0.8px), radial-gradient(120% 90% at 30% 0%, rgb(255 255 255 / 0.65), transparent 60%)`,
        backgroundSize: "9px 9px, 100% 100%",
      }}
    >
      <svg
        viewBox="0 0 240 200"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-x-[8%] bottom-0 top-[14%] size-auto h-[86%] w-[84%] transition-transform duration-[1400ms] ease-premium group-hover:-translate-y-[3%] group-hover:scale-[1.05]"
        fill="none"
        stroke={accent}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MOTIFS[job.category]}
      </svg>
    </div>
  );
}
