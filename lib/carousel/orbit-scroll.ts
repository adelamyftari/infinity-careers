/**
 * The scroll-driven half of the job orbit: how the whole ring moves through
 * space as the page scrolls past it, toward the editorial headline below.
 *
 * Two layers per card, never writing the same transform:
 *
 *   slot (outer)  perspective · scroll pose       ← this module, from scroll
 *   ring (inner)  the card's place on the orbit   ← orbit.ts, from drag/keys
 *
 * The outer layer is solved so outer · inner equals one consistent pose in
 * a single 3D scene: the ring keeps its centre, tilts about its X axis (the
 * far cards rise behind, the near ones drop in front, so the whole orbit
 * shows), spins on its own axis, shrinks a little, then travels back into
 * depth and fades out, behind the editorial statement rising in front of it. Every card is a point on that one rigid ring, so they
 * move as one installation and nothing is placed at random.
 *
 * Everything here is a pure function of a normalised progress (0 → 1): it
 * runs forward and backward identically, and at 0 the outer layer is the
 * identity, so the carousel is exactly as it was.
 */

import type { CardPlacement, OrbitLayout } from "./orbit";

const RAD = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 before `a`, 1 after `b`, smooth in between. */
const ramp = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export type OrbitScrollProfile = {
  /** Whole sequence, in viewport heights of scrolling. */
  distance: number;
  /** Tilt of the ring about its X axis at full reveal (deg; negative lifts the far side). */
  tilt: number;
  /** Share of the ring's tilt each card leans by. */
  cardTilt: number;
  /** Ring radius at full reveal, as a share of the carousel's. */
  radius: number;
  /** Card scale at full reveal, on top of perspective. */
  scale: number;
  /** How far the ring turns on its own axis over the sequence (deg). */
  spin: number;
  /** Gentle rise of the ring as it recedes (viewport heights). */
  rise: number;
  /** Depth the ring travels back into (px). */
  recede: number;
};

/** Desktop: the full installation. Tablet and phone: shallower, shorter. */
export const ORBIT_SCROLL = {
  desktop: { distance: 1.7, tilt: -36, cardTilt: 0.5, radius: 0.68, scale: 0.8, spin: 240, rise: 0.05, recede: 1700 },
  tablet: { distance: 1.55, tilt: -28, cardTilt: 0.45, radius: 0.68, scale: 0.8, spin: 185, rise: 0.06, recede: 1300 },
  phone: { distance: 1.15, tilt: -40, cardTilt: 0.4, radius: 0.26, scale: 0.56, spin: 130, rise: 0.03, recede: 900 },
} satisfies Record<string, OrbitScrollProfile>;

/**
 * One choreography, as shares of the scroll distance (pinned for all of it):
 *   0 – 0.2      the carousel opens into the full 3D ring, rear cards included; the headline is below the screen
 *   0.2 – 0.4    the complete ring turns and starts to rise; the headline climbs past the fold (at 0.3), only its top showing
 *   0.4 – 0.65   the main transition: the headline rises in front of the still-turning ring
 *   0.65 – 0.85  the ring goes deeper and fades to nothing; the headline lands (at 0.8); the description appears
 *   0.85 – 1     stable: only the statement, in its final position
 */
export const HIDDEN_AT = 0.85;
/** The statement rises as one block: starts moving, reaches the bottom of the screen, lands. */
export const HEADLINE = { from: 0.2, atFold: 0.3, to: 0.8 };
/** The description fades up across this span, moving with the block. */
export const DESCRIPTION = { from: 0.68, to: 0.85 };

/**
 * How far below its final place the statement starts (px), so that rising
 * steadily it crosses the bottom of the screen exactly at HEADLINE.atFold.
 * `finalTop` is the heading's final distance from the top of the screen.
 */
export function headlineStart(viewportHeight: number, finalTop: number) {
  const remaining = 1 - (HEADLINE.atFold - HEADLINE.from) / (HEADLINE.to - HEADLINE.from);
  return (viewportHeight - finalTop) / remaining;
}

/** Below this progress the carousel is still the carousel: drag, hover and buttons work. */
export const INTERACTIVE_UNTIL = 0.08;

export type OrbitScene = {
  /** 0 → 1: from the carousel's arc to the whole ring, cards turning to face the viewer. */
  reveal: number;
  tilt: number;
  cardTilt: number;
  radius: number;
  scale: number;
  spin: number;
  /** Ring centre offset (px). */
  y: number;
  z: number;
  /** Overall opacity of the installation: 0 from HIDDEN_AT. */
  opacity: number;
  /** Least wash toward the page every card has, while the statement is in front of it. */
  wash: number;
};

/** The fade completes here, a beat before HIDDEN_AT, so the orbit is surely gone by then. */
const FADE_END = HIDDEN_AT - 0.02;

/**
 * The ring's pose at `progress`: phases overlap so the motion never stalls.
 *
 * `aim` (px): how far the ring's centre travels, vertically, to end up behind
 * the statement's final position (measured: it depends on the layout). 0
 * without one.
 */
export function orbitScene(progress: number, profile: OrbitScrollProfile, viewportHeight: number, aim = 0): OrbitScene {
  const p = clamp(progress, 0, 1);
  const tilt = profile.tilt * ramp(p, 0.02, 0.22);
  return {
    // The carousel opens into the whole orbit early: recognisable by about 0.2.
    reveal: ramp(p, 0.03, 0.2),
    tilt,
    cardTilt: tilt * profile.cardTilt,
    radius: lerp(1, profile.radius, ramp(p, 0.03, 0.2)),
    scale: lerp(1, profile.scale, ramp(p, 0.03, 0.22)),
    // Turning from the first pixel of scroll, a touch faster as it goes.
    spin: profile.spin * p ** 1.1,
    // Upward as it recedes, ending behind where the statement lands.
    y: -viewportHeight * profile.rise * ramp(p, 0.4, HIDDEN_AT) + aim * ramp(p, 0.6, HIDDEN_AT),
    // Back into depth, mostly after the headline has crossed it, so the cards
    // stay large while it does; perspective shrinks them naturally.
    z: -profile.recede * ramp(p, 0.5, HIDDEN_AT),
    // Barely thins while the headline crosses it, then fades out completely.
    opacity: 1 - 0.25 * ramp(p, 0.35, 0.65) - 0.75 * ramp(p, 0.65, FADE_END),
    wash: 0.4 * ramp(p, 0.4, 0.65),
  };
}

/** Opacity of the carousel's own controls (counter, arrows, floor). */
export const orbitUiOpacity = (progress: number) => 1 - ramp(progress, 0, 0.1);

export type ScenePlacement = {
  /** The outer (slot) transform, after the shared perspective. */
  transform: string;
  opacity: number;
  /** Wash toward the page background, with depth. */
  veil: number;
  zIndex: number;
};

/**
 * Card `offset` steps from the front, whose inner layer is `rest` (lowered by
 * `introY` while the carousel enters), placed in `scene`.
 *
 * Wanted:  T(F) · Rx(cardTilt) · Ry(turn) · S(scale)
 * Inner:   T(rest.x, introY, rest.z) · Ry(rest.rotateY) · S(rest.scale)
 * So the outer layer is T(F) · Rx · Ry(turn − rest.rotateY) · S(scale / rest.scale) · T(−inner position).
 */
export function placeInScene(layout: OrbitLayout, count: number, offset: number, rest: CardPlacement, introY: number, scene: OrbitScene): ScenePlacement {
  // Where the scroll spin has carried the card round the ring.
  const shifted = offset + (scene.spin / 360) * count;
  const wrapped = ((((shifted + count / 2) % count) + count) % count) - count / 2;
  const moved = layout.place(wrapped);
  const angle = (wrapped * 360) / Math.max(count, 1);

  // Ring-centred coordinates (the carousel's front card sits radiusZ in front of the centre).
  const rz = layout.radiusZ;
  const ringX = moved.x * scene.radius;
  const ringZ = (moved.z + rz) * scene.radius;

  // Tilt the ring about the X axis through its centre, then move the centre.
  const sin = Math.sin(scene.tilt * RAD);
  const cos = Math.cos(scene.tilt * RAD);
  const x = ringX;
  const y = scene.y + introY - ringZ * sin;
  const z = scene.z - rz + ringZ * cos;

  // As the orbit opens, cards turn from the ring's tangent to face the viewer.
  const turn = moved.rotateY * (1 - scene.reveal);
  const scale = (scene.scale * moved.scale) / rest.scale;

  // Depth round the whole ring: 0 at the front, 1 at the back.
  const back = (1 - Math.cos(angle * RAD)) / 2;
  // Cards from the back of the ring only appear once they have turned well
  // past edge-on, so no thin slivers or mirrored faces ever show.
  const opacity = lerp(moved.opacity, 1 - 0.5 * back, ramp(scene.reveal, 0.5, 0.9)) * scene.opacity;
  const veil = Math.max(scene.wash, lerp(moved.fade, 0.45 * back, scene.reveal));

  const f = (n: number) => n.toFixed(2);
  return {
    transform: `translate3d(${f(x)}px, ${f(y)}px, ${f(z)}px) rotateX(${scene.cardTilt.toFixed(3)}deg) rotateY(${(turn - rest.rotateY).toFixed(3)}deg) scale(${scale.toFixed(4)}) translate3d(${f(-rest.x)}px, ${f(-introY)}px, ${f(-rest.z)}px)`,
    opacity,
    veil,
    zIndex: Math.round(10_000 + z),
  };
}
