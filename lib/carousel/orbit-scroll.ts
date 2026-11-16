/**
 * The scroll-driven half of the job orbit: as the page scrolls past it, the
 * whole ring turns, then collapses into one layered stack of cards, which holds
 * while the next section slides over it.
 *
 * Two layers per card, never writing the same transform:
 *
 *   slot (outer)  perspective · scroll pose       ← this module, from scroll
 *   ring (inner)  the card's place on the orbit   ← orbit.ts, from drag/keys
 *
 * The outer layer is solved so outer · inner equals one consistent pose in
 * a single 3D scene: the ring keeps its centre, tilts about its X axis (the
 * far cards rise behind, the near ones drop in front, so the whole orbit
 * shows), and spins on its own axis, in the direction the carousel turns by
 * itself. Then each card blends from its place on the still-turning ring to its
 * place in the stack, so it comes in on a curve, and there is never a reset.
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
  /** The rotation, from the pin to the final pose, in viewport heights of scrolling. */
  distance: number;
  /** Tilt of the ring about its X axis at full reveal (deg; negative lifts the far side). */
  tilt: number;
  /** Share of the ring's tilt each card leans by. */
  cardTilt: number;
  /** Ring radius at full reveal, as a share of the carousel's. */
  radius: number;
  /** Card scale at full reveal, on top of perspective. */
  scale: number;
  /** How far the ring turns on its own axis over the sequence (deg): well short of a full turn. */
  spin: number;
  /** Gentle rise of the ring as it turns (viewport heights). */
  rise: number;
  /** The front card's scale in the finished stack. */
  stackScale: number;
};

/** The ScrollTrigger id of the pinned scene, for anything that needs to scroll back to it. */
export const ROLES_SCENE = "roles-scene";

/** Desktop: the full installation. Tablet and phone: shallower, shorter. */
export const ORBIT_SCROLL = {
  desktop: { distance: 1.15, tilt: -36, cardTilt: 0.5, radius: 0.68, scale: 0.8, spin: 120, rise: 0.05, stackScale: 0.85 },
  tablet: { distance: 1.1, tilt: -28, cardTilt: 0.45, radius: 0.68, scale: 0.8, spin: 120, rise: 0.06, stackScale: 0.85 },
  phone: { distance: 0.75, tilt: -40, cardTilt: 0.4, radius: 0.26, scale: 0.56, spin: 90, rise: 0.03, stackScale: 0.72 },
} satisfies Record<string, OrbitScrollProfile>;

/**
 * The two stages of `progress`: orbitalRotation up to here, then magneticCollapse
 * to 1, where the stack is finished and holds.
 */
export const ROTATION_END = 0.48;
/** The ring slows into its final angle by here. */
const SPIN_END = 0.8;
/** The share of the collapse by which the front cards arrive later than the rear ones. */
const COLLAPSE_STAGGER = 0.22;
/** The stack, per place away from the front card: at most FAN_DEPTH places either way. */
const FAN_DEPTH = 3;
const FAN_STEP = 0.05; // of the card's width
const FAN_RISE = 7; // px
const FAN_TURN = 1.3; // deg
const FAN_BACK = 24; // px of depth
const FAN_SHRINK = 0.015;

/**
 * The carousel opens into the whole ring over this much of the page's first
 * scroll (viewport heights), starting at the very top of the page: the front
 * cards are on screen there, so the rest of the orbit must not wait for the
 * section to reach the centre of the screen and pin.
 */
export const OPENING = 0.25;
/** How far along its spin the ring is once open: it turns from the first pixel of scroll. */
const SPIN_LEAD = 0.15;

/** Below this progress the carousel is still the carousel: drag, hover and buttons work. */
export const INTERACTIVE_UNTIL = 0.12;

export type OrbitScene = {
  /** 0 → 1: from the carousel's arc to the whole ring, cards turning to face the viewer. */
  reveal: number;
  tilt: number;
  cardTilt: number;
  radius: number;
  scale: number;
  spin: number;
  /** The angle it comes to rest at: where each card's place in the stack is decided. */
  finalSpin: number;
  /** Ring centre offset (px). */
  y: number;
  stackScale: number;
  progress: number;
};

/**
 * The ring's pose at `progress` through its sequence, `opening` (0 → 1) through
 * the first scroll. At 1 the stack holds: nothing here ever hides it. What ends
 * the orbit is the next section passing in front of it.
 */
export function orbitScene(progress: number, opening: number, profile: OrbitScrollProfile, viewportHeight: number): OrbitScene {
  const p = clamp(progress, 0, 1);
  // The rotation can't outrun the opening, however fast the page is scrolled:
  // by the end of it the ring is open, so the stack that follows holds perfectly still.
  const opened = Math.max(clamp(opening, 0, 1), Math.min(1, p / ROTATION_END));
  const open = ramp(opened, 0, 1);
  const tilt = profile.tilt * open;
  return {
    reveal: open,
    tilt,
    cardTilt: tilt * profile.cardTilt,
    radius: lerp(1, profile.radius, open),
    scale: lerp(1, profile.scale, open),
    // Turning from the first pixel of scroll, only ever one way, slowing as it collapses.
    spin: profile.spin * (1 - (1 - Math.min(1, p / SPIN_END)) ** 2 + SPIN_LEAD * opened),
    finalSpin: profile.spin * (1 + SPIN_LEAD),
    // Settling a little upward.
    y: -viewportHeight * profile.rise * ramp(p, 0, ROTATION_END),
    stackScale: profile.stackScale,
    progress: p,
  };
}

/**
 * "EVERY ROLE HAS A PLACE": the message at the heart of the orbit, on the same
 * clock as the ring (progress 0 → 1), in four phases:
 *
 *   orbitalOpen  0    → ENTER    the ring opens; the hero is still behind its centre. Hidden.
 *   textEnter    ENTER → HOLD    fades in (the only fade), line by line, 0.88 → 1.
 *   textHold     HOLD → DESCEND  fully opaque, centred, growing gently to 1.08, while the
 *                                ring turns round it. The rear cards set off at ROTATION_END
 *                                but stay behind it until about DESCEND.
 *   textDescend  DESCEND → GONE  as the cards converge it slides straight down, fully opaque,
 *                                behind the near cards (they are nearer than the ring's
 *                                centre, where it sits) and out through the foot of the
 *                                pinned screen: `exit` px, measured from the layout.
 *   orbitalComplete GONE → 1     below the screen; the stack finishes as before.
 *
 * Pure, so it runs backward exactly as forward.
 */
const HEADLINE_ENTER = 0.18;
const HEADLINE_HOLD = 0.35;
const HEADLINE_DESCEND = 0.58;
const HEADLINE_GONE = 0.83;

export type OrbitHeadline = {
  opacity: number;
  scale: number;
  /** Vertical movement (px): the entrance's small rise, then the descent. */
  y: number;
  /** 0 → 1: each line's masked reveal. */
  lines: [number, number];
  /** Wholly below the screen: nothing left to paint. */
  out: boolean;
};

export function orbitHeadline(progress: number, exit: number): OrbitHeadline {
  const p = clamp(progress, 0, 1);
  const enter = ramp(p, HEADLINE_ENTER, HEADLINE_HOLD);
  const hold = clamp((p - HEADLINE_HOLD) / (HEADLINE_DESCEND - HEADLINE_HOLD), 0, 1);
  // Sets off gently, then travels at a steady pace with the scroll: no snap at either end.
  const d = clamp((p - HEADLINE_DESCEND) / (HEADLINE_GONE - HEADLINE_DESCEND), 0, 1);
  const descend = d < 0.35 ? (d * d) / 0.7 : d - 0.175;
  const span = HEADLINE_HOLD - HEADLINE_ENTER;
  return {
    opacity: enter,
    scale: 0.88 + 0.12 * enter + 0.08 * hold,
    y: 25 * (1 - enter) + exit * (descend / 0.825),
    lines: [ramp(p, HEADLINE_ENTER, HEADLINE_ENTER + span * 0.7), ramp(p, HEADLINE_ENTER + span * 0.3, HEADLINE_HOLD)],
    out: d >= 1,
  };
}

/** Opacity of the carousel's own controls (counter, arrows, floor): they belong to the plain carousel, so they leave as the ring opens over them. */
export const orbitUiOpacity = (progress: number, opening: number) => (1 - ramp(opening, 0, 0.4)) * (1 - ramp(progress, 0, 0.1));

export type ScenePlacement = {
  /** The outer (slot) transform, after the shared perspective. */
  transform: string;
  opacity: number;
  /** Wash toward the page background, with depth. */
  veil: number;
  zIndex: number;
  /** 0 → 1: from its place on the ring to its place in the stack. */
  collapse: number;
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
  // Where the scroll spin has carried the card round the ring: the way the
  // carousel turns by itself, so scrolling never seems to reverse it.
  const round = (steps: number) => ((((steps + count / 2) % count) + count) % count) - count / 2;
  const wrapped = round(offset - (scene.spin / 360) * count);
  const moved = layout.place(wrapped);
  const angle = (wrapped * 360) / Math.max(count, 1);

  // Ring-centred coordinates (the carousel's front card sits radiusZ in front of the centre).
  const rz = layout.radiusZ;
  const ringX = moved.x * scene.radius;
  const ringZ = (moved.z + rz) * scene.radius;

  // Tilt the ring about the X axis through its centre, then move the centre.
  const sin = Math.sin(scene.tilt * RAD);
  const cos = Math.cos(scene.tilt * RAD);
  const onRingY = scene.y + introY - ringZ * sin;
  const onRingZ = ringZ * cos - rz;

  // Its place in the stack, from where the ring comes to rest: the card then
  // nearest the front is the front, dead centre, the others fan out behind it.
  const settled = round(offset - Math.round((scene.finalSpin / 360) * count));
  const depth = Math.abs(settled);
  const fan = clamp(settled, -FAN_DEPTH, FAN_DEPTH);
  const away = Math.abs(fan);
  // How far along the collapse this card is: the rear ones are drawn in first.
  const span = 1 - ROTATION_END;
  const delay = (1 - depth / Math.max(count / 2, 1)) * COLLAPSE_STAGGER;
  const collapse = ramp(scene.progress, ROTATION_END + delay * span, ROTATION_END + (delay + 1 - COLLAPSE_STAGGER) * span);

  const x = lerp(ringX, fan * FAN_STEP * layout.cardWidth * scene.stackScale, collapse);
  const y = lerp(onRingY, introY - away * FAN_RISE, collapse);
  const z = lerp(onRingZ, -away * FAN_BACK, collapse);

  // As the orbit opens, cards turn from the ring's tangent to face the viewer.
  const turn = moved.rotateY * (1 - ramp(scene.reveal, 0, 0.3));
  const scale = lerp(scene.scale * moved.scale, scene.stackScale * (1 - away * FAN_SHRINK), collapse) / rest.scale;

  // Depth round the whole ring: 0 at the front, 1 at the back.
  const back = (1 - Math.cos(angle * RAD)) / 2;
  // Cards from the back of the ring only appear once they have turned well
  // past edge-on, so no thin slivers or mirrored faces ever show.
  const onRingOpacity = lerp(moved.opacity, 1 - 0.5 * back, ramp(scene.reveal, 0.12, 0.5));
  const onRingVeil = lerp(moved.fade, 0.45 * back, scene.reveal);
  // In the stack they are solid: a real deck, with only a touch of depth.
  const opacity = lerp(onRingOpacity, 1, ramp(collapse, 0, 0.5));
  const veil = lerp(onRingVeil, away * 0.05, collapse);

  const f = (n: number) => n.toFixed(2);
  return {
    transform: `translate3d(${f(x)}px, ${f(y)}px, ${f(z)}px) rotateX(${lerp(scene.cardTilt, 0, collapse).toFixed(3)}deg) rotateZ(${(fan * FAN_TURN * collapse).toFixed(3)}deg) rotateY(${(turn - rest.rotateY).toFixed(3)}deg) scale(${scale.toFixed(4)}) translate3d(${f(-rest.x)}px, ${f(-introY)}px, ${f(-rest.z)}px)`,
    opacity,
    veil,
    zIndex: Math.round(10_000 + lerp(onRingZ, -depth * FAN_BACK, collapse)),
    collapse,
  };
}
