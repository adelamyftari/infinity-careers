/**
 * Geometry of the orbital carousel, in one place.
 *
 * Every card sits at an equal angle round one elliptical orbit on the
 * horizontal plane through the cards' centreline:
 *
 *   θ = offset · step                    step = 360° / count
 *   x = radiusX · sin θ
 *   z = radiusZ · (cos θ − 1)            (0 at the front, negative behind)
 *
 * where `offset` is the card's distance from the front in steps, taken from
 * one continuous rotation value. Each card turns toward the ellipse's
 * tangent by a share (`yaw`) of the full angle, so side cards still curve
 * away but never collapse into thin strips, and shrinks a little with depth
 * on top of the perspective. The orbit reads as one spatial ring: the front
 * card closest and largest, the cards beside it curving away, the ones
 * further round smaller, fainter and partly behind them.
 *
 * radiusX is solved in projected screen space so the front card's
 * neighbours sit exactly `gap` clear of it at rest.
 *
 * Depth is shown two ways, both smooth functions of the angle round the
 * orbit. `opacity` falls from 1 at the front, steeply toward the back and to
 * 0 before a card could turn edge-on, so cards never pop in or out. `fade`
 * also washes a card toward the page background, so depth reads clearly
 * while nearer cards stay opaque enough not to show the card behind them.
 */

const RAD = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type OrbitOptions = {
  /** Rendered card width (px). */
  cardWidth: number;
  /** Camera distance (px). */
  perspective: number;
  /** Projected gap between the front card and its neighbours at rest (px). */
  gap: number;
  /** radiusZ as a share of radiusX: how deep the orbit is. */
  depth: number;
  /** How much smaller a card is at the very back, on top of perspective (0–1). */
  shrink: number;
  /** Share of the ellipse's tangent angle each card turns by (0–1). */
  yaw: number;
  /** Number of cards on the orbit. */
  count: number;
};

export type CardPlacement = {
  /** Horizontal position of the card's centre (px from the stage centre). */
  x: number;
  /** Depth of the card's centre (px; negative is away from the viewer). */
  z: number;
  /** Turn about the card's vertical axis (deg), toward the ellipse's tangent. */
  rotateY: number;
  scale: number;
  /** 0 → 1: how far the card is washed toward the background with depth. */
  fade: number;
  /** 1 at the front, falling smoothly round the orbit to 0 before edge-on. */
  opacity: number;
  /** Paint order: nearer cards over deeper ones. */
  zIndex: number;
};

export type OrbitLayout = {
  radiusX: number;
  radiusZ: number;
  /** Projected pixels per step at the front: dragging this far moves one card. */
  stride: number;
  /** Where a card `offset` steps from the front sits (any real offset within ±count/2). */
  place: (offset: number) => CardPlacement;
};

/** Wash toward the background: reaches FADE_MAX at θ = FADE_SPAN, shaped by FADE_CURVE. */
const FADE_SPAN = 105;
const FADE_CURVE = 1.4;
const FADE_MAX = 0.6;
/** Opacity lost by θ = OPACITY_SPAN (quadratic, so the front stays crisp). */
const OPACITY_DROP = 0.6;
const OPACITY_SPAN = 80;
/** Cards leave the arc between these angles round the orbit (deg). */
const LEAVE_FROM = 68;
const LEAVE_AT = 88;
/** The angle at which the neighbours' gap is set, for orbits with few cards. */
const MAX_NEIGHBOUR_ANGLE = 60;

export function createOrbitLayout({ cardWidth: w, perspective: p, gap, depth, shrink, yaw, count }: OrbitOptions): OrbitLayout {
  const step = count > 0 ? 360 / count : 360;

  function pose(radiusX: number, angle: number) {
    const a = angle * RAD;
    const radiusZ = radiusX * depth;
    return {
      x: radiusX * Math.sin(a),
      z: radiusZ * (Math.cos(a) - 1),
      // Toward the ellipse's tangent, (radiusX·cos θ, −radiusZ·sin θ), by `yaw`.
      turn: yaw * Math.atan2(radiusZ * Math.sin(a), radiusX * Math.cos(a)),
      scale: 1 - shrink * ((1 - Math.cos(a)) / 2),
    };
  }

  /** Projected near edge of a card at `angle` > 0 (px from the stage centre). */
  function nearEdge(radiusX: number, angle: number) {
    const { x, z, turn, scale } = pose(radiusX, angle);
    // CSS rotateY(φ) maps (u, 0, 0) to (u·cos φ, 0, −u·sin φ).
    const u = (-w / 2) * scale;
    return ((x + u * Math.cos(turn)) * p) / (p - (z - u * Math.sin(turn)));
  }

  // The radius that sets the neighbours `gap` clear of the front card.
  const neighbourAngle = Math.min(step, MAX_NEIGHBOUR_ANGLE);
  let radiusX = 0;
  if (count >= 2) {
    let lo = w / 2;
    let hi = 50_000;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (nearEdge(mid, neighbourAngle) < w / 2 + gap) lo = mid;
      else hi = mid;
    }
    radiusX = hi;
  }

  function place(offset: number): CardPlacement {
    const angle = offset * step;
    const { x, z, turn, scale } = pose(radiusX, angle);
    const distance = Math.abs(angle);
    const depthOpacity = 1 - OPACITY_DROP * Math.min(1, (distance / OPACITY_SPAN) ** 2);
    const leaving = clamp((LEAVE_AT - distance) / (LEAVE_AT - LEAVE_FROM), 0, 1);
    return {
      x,
      z,
      rotateY: turn / RAD,
      scale,
      fade: FADE_MAX * clamp((distance / FADE_SPAN) ** FADE_CURVE, 0, 1),
      opacity: depthOpacity * leaving,
      zIndex: Math.round(10_000 + z),
    };
  }

  // At the front a card moves radiusX·step(rad) px per step.
  const stride = count >= 2 ? radiusX * step * RAD : w + gap;

  return { radiusX, radiusZ: radiusX * depth, stride, place };
}
