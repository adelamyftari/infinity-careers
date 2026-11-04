import type { SVGProps } from "react";
import { LOGO_BRAND_COLOR, LOGO_GRID, LOGO_OUTLINES } from "@/lib/loader/logo-mark";

/** The flat Infinity monogram, drawn from the same grid as the 3D pieces. */
export function InfinityMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`} fill={LOGO_BRAND_COLOR} aria-hidden="true" {...props}>
      {Object.values(LOGO_OUTLINES).map((outline, i) => (
        <polygon key={i} points={outline.map((point) => point.join(",")).join(" ")} />
      ))}
    </svg>
  );
}
