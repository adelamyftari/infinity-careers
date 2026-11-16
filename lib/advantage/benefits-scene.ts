/**
 * The Infinity Advantage in 3D: one horizontally travelling typographic scene.
 * Three benefits stand side by side along X, each a two-line editorial block of
 * ivory type with a very slight depth; the camera tracks from left to right
 * between them as the page scrolls down. The official Infinity mark travels
 * along the Golden Infinity Flow, a stream of fine filaments trailing behind it,
 * passing behind letters, in front of them and through real openings (the bay
 * of an L, the counter of an O) with true depth occlusion. At each benefit it
 * comes to rest inside an opening while the description is read.
 *
 * After the third benefit the journey along X is over. Released (`drop`, a
 * short timed animation the page starts with one scroll), the filaments
 * dissolve into the mark, it eases forward out of the O of DEVELOPMENT and
 * falls straight down, growing smaller as it goes away from the camera, which
 * dives down with it into a full-screen space of small Infinity marks
 * suspended at many depths; it comes to rest among them at their size, its
 * landing sending a soft wave out through them, and from then on it is one of
 * them, drifting and answering the pointer like the rest (./field.ts).
 *
 * Everything is a pure function of the pose it is given, so it runs backward
 * exactly as forward. Geometry is built on resize only; scrolling moves things
 * and changes uniforms. Plain Three.js, one canvas, rendered on demand.
 *
 *   the words  ./type3d.ts      editorial type from the site's display face
 *   the flow   ./flow.ts        the golden filaments
 *   the mark   ./logo-rig.ts    the official logo and its rig
 *   the field  ./field.ts       the space of small marks it comes to rest in
 *
 * Units: 1 = the height of the screen at the depth of the type.
 */
import {
  AmbientLight,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { createFlow } from "./flow";
import { createField, type FieldMover, type FieldPointer } from "./field";
import { createLogoRig } from "./logo-rig";
import { buildWord, CAP_HEIGHT, TYPE_DEPTH, type Opening, type Word } from "./type3d";

const FOV = 32;
/** Camera distance at which 1 unit fills the screen's height. */
const DISTANCE = 1 / (2 * Math.tan(((FOV / 2) * Math.PI) / 180));

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
/** A tracking shot's ease: no jolt as it starts or stops (zero acceleration at both ends). */
const tracking = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * The way in, within the enter phase (0 → 1), one directed sequence: the heading leaves first,
 * the whole frame turns from warm white to petrol as it goes, and only then does the camera
 * track on to the first benefit, which arrives in a petrol world (no split screen, no seam).
 */
export const ENTERING = {
  /** The heading moving out and fading. */
  heading: [0, 0.32],
  /** The full-screen change of world, warm white to petrol, the dots fading with it. */
  world: [0.12, 0.55],
  /** The camera's track from the heading to the first benefit. */
  camera: [0.2, 1],
} as const;
/** Progress through one of those windows, eased at both ends. */
export const entering = (enter: number, [from, to]: readonly [number, number]) => smooth(clamp((enter - from) / (to - from), 0, 1));

/**
 * The drop: one timed animation whose course is real kinematics on screen, so it has weight at
 * any size and runs back exactly (it is a pure function of its own clock). Gravity G, in screen
 * heights per second² (about 2,340 px/s² on a 900px-tall screen). The camera dives to the final
 * frame (in DIVE seconds) as "JOIN OUR TEAM." comes up (from JOIN); the mark leaves the O, falls,
 * accelerating, onto the top of the button (in FALL seconds; a small hop as it leaves, where the
 * button lies close beneath), strikes it, rebounds with RESTITUTION of its speed, is pushed out past
 * the button's end (DRIFT_OUT), falls again, accelerating, beside it into the collection and lands
 * hard; then it settles (SETTLE).
 */
const G = 2.6;
const RESTITUTION = 0.32;
const FALL = { wide: 0.62, tall: 0.58 };
const DIVE = 0.5;
const JOIN = 0.18;
const SETTLE = 0.6;
const DRIFT_OUT = 0.14;
/** The drop's timeline, in seconds, and its moments as fractions of its progress (0 → 1). */
export type DropTimeline = { seconds: number; join: number; impact: number; land: number; side: number };
/** The call to action the mark strikes, in CSS pixels of the canvas. */
export type Target = { left: number; top: number; width: number; height: number };

/**
 * The three compositions: a secondary line over a dominant one, left-aligned on
 * the same grid, in Inter Tight Medium. `small` is the secondary line's
 * size relative to the dominant, about 0.7, set from the words' real widths in
 * that face: COMPETITIVE and PERFORMANCE end exactly where SALARIES and BONUSES
 * end (one flush block); TRAINING & keeps the same proportion as COMPETITIVE.
 * `rest` is the kind of opening in the dominant word the mark comes to rest in.
 */
type Composition = { words: [string, string]; small: number; rest: Opening["kind"] };
const COMPOSITIONS: Composition[] = [
  { words: ["COMPETITIVE", "SALARIES"], small: 0.7, rest: "bay" },
  { words: ["PERFORMANCE", "BONUSES"], small: 0.635, rest: "counter" },
  { words: ["TRAINING &", "DEVELOPMENT"], small: 0.7, rest: "counter" },
];
/** Space between the two lines, in em of the dominant line: close, so the two read as one headline. */
const LEADING = 0.13;
/**
 * Share of the space between the page's margins a composition's widest line takes: well short
 * of the full measure, so the type stays monumental but controlled, with air on both sides
 * (about 61% of the viewport at 1648px). A phone keeps more of its narrow measure.
 */
const MEASURE = { wide: 0.72, tall: 0.84 };
/** The tallest a composition may stand, in screen heights (so a short, wide screen is not overfilled). */
const MAX_BLOCK = { wide: 0.32, tall: 0.26 };
/**
 * On a wide screen the compositions sit a little in from the left margin: this share of the
 * room the widest one leaves between the margins, the same for all three (one left edge).
 */
const OFFSET = 0.32;
/** The secondary line sits a little behind the dominant one: a quiet parallax as the camera tracks. */
const SMALL_Z = -0.03;
/** How far the camera drifts while a benefit is read: almost still. */
const DRIFT = 0.012;
/**
 * The headline's entrance, character by character (in em of each line, and seconds): each rises
 * from a little below and behind its place as it comes into view, the next a beat after.
 */
const REVEAL = { stagger: 0.035, duration: 0.65, rise: 0.24, depth: 0.18 };
/** How far the camera has come toward a benefit when its letters begin (and back, below which they reset). */
const REVEAL_FROM = 0.3;
/**
 * The letter each benefit's mark passes through (the L of SALARIES, the first O of BONUSES, the O
 * of DEVELOPMENT), set in Infinity Yellow while the rest of the headline is white; as the mark comes
 * near it, it grows a little (scale) and comes a touch forward (lift, em), in proportion to how near
 * the mark is (from `near` to `far` letter heights), eased (`ease` s).
 */
const ACCENT = { scale: 0.1, lift: 0.05, near: 0.45, far: 1.7, ease: 0.14 };
/**
 * Once the mark is clear of that letter (out of it by half the letter's height and most of its own
 * size; for DEVELOPMENT, once it has come to rest in the O), the whole headline turns Infinity
 * Yellow, all its letters together, in about 0.2 s (`ease` is the time constant); below that point
 * on the way back, it is white again. Read from the journey, never latched.
 */
const ACTIVATION = { clear: 0.5, mark: 0.6, rested: 0.03, ease: 0.065 };
/**
 * The cursor over the headlines: each letter near it grows (`scale`), comes forward (`lift`, em)
 * and turns warm white, by its projected distance from the cursor (within `radius` CSS px, its share
 * `reach` of the canvas width, held between the two), measured from a little inside the letter (`body`, of
 * its projected height, so a big letter answers from its edge and its neighbours softly), easing in
 * and out (`ease` s). Mouse and pen only.
 */
const HOVER = { scale: 0.14, lift: 0.06, radius: [90, 140], reach: 0.1, body: 0.35, ease: 0.12 };
const YELLOW = new Color("#e9ae00");
const WARM_WHITE = new Color("#f7f7f2");
const REVEAL_RESET = 0.05;

/**
 * Monotone cubic interpolation (Fritsch–Carlson) through (x, y) keys with increasing x and
 * non-decreasing y: smooth (C1), never overshooting, never pausing between keys whose values
 * differ. `endSlope` is the slope at the last key (0: it comes to rest there).
 */
function monotone(xs: number[], ys: number[], endSlope: number) {
  const n = xs.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? endSlope : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export type BenefitsPose = {
  /** The heading's moment: the first filament drawn across beneath it, 0 → 1. */
  intro: number;
  /** Arriving at the first benefit: the camera tracks in from the heading, 0 → 1. */
  enter: number;
  /** Per benefit: the camera settling on it, 0 → 1 (the mark's own course is `journey`). */
  weave: number[];
  /**
   * The mark's journey through the three benefits, one continuous measure, 0 → 1, from the first
   * benefit's arrival to the end of the last one's reading: see `setRhythm`.
   */
  journey: number;
  /** Per benefit after the first: on from the one before, 0 → 1 (the first is `enter`). */
  travel: number[];
  /** After the last: the release and the fall into the collection, 0 → 1 (timed, not scrolled). */
  drop: number;
  /** Seconds, for the collection's own slow drift. */
  ambient: number;
  /** Seconds since the mark landed, or −1. */
  since: number;
  /** The pointer over the scene (the field answers it once the mark has landed), or null. */
  pointer: FieldPointer | null;
  /** A mouse or pen over the scene, in CSS pixels of the viewport (the headlines answer it), or null. */
  cursor?: { x: number; y: number } | null;
};

/** A benefit's reading frame, in CSS pixels of the canvas: where its type stands at the hold. */
export type Frame = { left: number; top: number; right: number; bottom: number };
export type BenefitsLayout = {
  tall: boolean;
  /** The drop's timeline (the page plays it, and times the final call and the button's strike by it). */
  drop: DropTimeline;
  frames: Frame[];
};

type Line = { x0: number; x1: number; y0: number; y1: number; z: number; word: Word; scale: number };

export function createBenefitsScene(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 30);
  // Soft, mostly frontal light: the faces read as clean ivory, the thin sides a shade darker.
  scene.add(new HemisphereLight(0xffffff, 0x9aa3a6, 1.3));
  scene.add(new AmbientLight(0xffffff, 0.95));
  const key = new DirectionalLight(0xfffaf0, 1.3);
  const rim = new DirectionalLight(0xffd27a, 0.35);
  scene.add(key, key.target, rim, rim.target);
  /** The mark's own warm light on the letters it passes. */
  const glow = new PointLight(0xffc04a, 0, 0.5, 2);
  scene.add(glow);

  // The words of each composition, numbered character by character across both lines (the
  // secondary line first), and their materials, which bring the characters in one after another.
  const words = COMPOSITIONS.map((c) => {
    const small = buildWord(c.words[0], 6);
    return [small, buildWord(c.words[1], 6, small.chars)];
  });
  /** Per composition: seconds since its letters began to come in (below 0, not yet). */
  const reveals = COMPOSITIONS.map(() => ({ value: -1 }));
  /** Per composition: the highlighted letter (its place in the composition), and how near the mark is to it (0 → 1). */
  const accents = COMPOSITIONS.map((comp, k) => {
    const want = comp.rest === "bay" ? "L" : "O";
    const glyph = words[k][1].glyphs.find((g) => g.char === want);
    return { glyph, index: { value: glyph ? glyph.index : -1 }, hit: { value: 0 } };
  });
  const noAccent = { value: -1 };
  const noHit = { value: 0 };
  /** The most characters in one composition: the size of each one's per-letter hover array. */
  const charsIn = words.map(([a, b]) => a.chars + b.chars);
  const charCount = Math.max(...charsIn);
  /** Per composition: how far its headline has turned yellow (0 white with one yellow letter → 1 all yellow). */
  const active = COMPOSITIONS.map(() => ({ value: 0 }));
  /** Per composition, per character (by `aChar`): how near the cursor is, eased (0 → 1). */
  const hovers = COMPOSITIONS.map(() => ({ value: new Float32Array(charCount) }));
  const materials: MeshStandardMaterial[] = [];
  const revealing = (color: string, roughness: number, time: { value: number }, shade: number, k: number, accent: { index: { value: number }; hit: { value: number } } | null) => {
    const material = new MeshStandardMaterial({ color, roughness, metalness: 0, transparent: true });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRevealTime = time;
      shader.uniforms.uAccent = accent ? accent.index : noAccent;
      shader.uniforms.uHit = accent ? accent.hit : noHit;
      shader.uniforms.uYellow = { value: YELLOW };
      shader.uniforms.uWhite = { value: WARM_WHITE };
      shader.uniforms.uShade = { value: shade };
      shader.uniforms.uActive = active[k];
      shader.uniforms.uHover = hovers[k];
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float aChar;
attribute vec2 aCenter;
uniform float uRevealTime;
uniform float uAccent;
uniform float uHit;
uniform float uHover[${charCount}];
varying float vReveal;
varying float vMine;
varying float vHover;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
float mine = 1.0 - step(0.5, abs(aChar - uAccent));
vMine = mine;
float hover = uHover[int(aChar + 0.5)];
vHover = hover;
// Each letter on its own, about its centre: the mark's nearness (its letter) or the cursor's, whichever is more.
float grow = 1.0 + max(mine * uHit * ${ACCENT.scale.toFixed(3)}, hover * ${HOVER.scale.toFixed(3)});
transformed.xy = aCenter + (transformed.xy - aCenter) * grow;
transformed.z += max(mine * uHit * ${ACCENT.lift.toFixed(3)}, hover * ${HOVER.lift.toFixed(3)});
float revealAt = clamp((uRevealTime - aChar * ${REVEAL.stagger.toFixed(3)}) / ${REVEAL.duration.toFixed(3)}, 0.0, 1.0);
float revealed = 1.0 - pow(1.0 - revealAt, 3.0);
vReveal = revealed;
transformed.y -= (1.0 - revealed) * ${REVEAL.rise.toFixed(3)};
transformed.z -= (1.0 - revealed) * ${REVEAL.depth.toFixed(3)};`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
uniform vec3 uYellow;
uniform vec3 uWhite;
uniform float uShade;
uniform float uActive;
varying float vReveal;
varying float vMine;
varying float vHover;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
// The resting colour: white with its one yellow letter, or all yellow once the mark is through;
// the cursor turns a letter warm white over it, for as long as it is near.
vec3 resting = mix(diffuseColor.rgb, uYellow * uShade, max(vMine, uActive));
diffuseColor.rgb = mix(resting, uWhite * uShade, vHover);
diffuseColor.a *= vReveal;`);
    };
    material.customProgramCacheKey = () => "type-reveal-headline";
    materials.push(material);
    return material;
  };
  const groups = COMPOSITIONS.map((_, k) => {
    const group = new Group();
    const time = reveals[k];
    words[k].forEach((word, l) =>
      group.add(
        new Mesh(
          word.geometry,
          l === 0
            ? [revealing("#e4e1d8", 0.8, time, 1, k, null), revealing("#b5b1a4", 0.72, time, 0.74, k, null)]
            : [revealing("#f7f7f2", 0.78, time, 1, k, accents[k]), revealing("#c9c4b4", 0.7, time, 0.74, k, accents[k])],
        ),
      ),
    );
    scene.add(group);
    return group;
  });
  /** Per composition: when its letters began to come in (seconds, on the pose's clock), or −1. */
  const revealedAt = COMPOSITIONS.map(() => -1);
  /** How long a composition's letters take to come in, all of them, in seconds. */
  const revealSpan = (k: number) => REVEAL.duration + (words[k][0].chars + words[k][1].chars - 1) * REVEAL.stagger;
  /** The journey's rhythm (fractions of `journey`): where each benefit's reading begins and ends. */
  let rhythm = { arrive: [0, 0.36, 0.72], leave: [0.28, 0.64, 1] };

  const logo = createLogoRig();
  scene.add(logo.root);
  const flow = createFlow();
  const field = createField(logo.pieces);
  const heap = new Group();
  scene.add(heap);

  // The layout, rebuilt on resize.
  let width = 1;
  let height = 1;
  let tall = false;
  let centres: number[] = [];
  let startX = 0;
  /** The mark's size at each benefit: it must truly fit the opening it rests in there. */
  let sizes = [0.07, 0.07, 0.07];
  /** The fall: from where the mark rests in the last benefit to its landing, and the final frame. */
  let fall = {
    from: new Vector3(),
    size: 0.06,
    landing: new Vector3(),
    landingSize: 0.015,
    lookY: -1,
    camX: 0,
    /** The course on screen, in CSS pixels: where it starts, strikes and lands (and the small
     * correction onto the collection's own landing point); its speeds and times. */
    sx: 0,
    sy: 0,
    cx: 0,
    cy: 0,
    ex: 0,
    ey: 0,
    vy0: 0,
    vUp: 0,
    drift: 0,
    g: 1,
    fallTime: 0.6,
    afterTime: 0.6,
    strikes: false,
    /** Its size as it strikes (about two thirds of the button's height), and the side it bounces off to. */
    impactSize: 0.04,
    side: 1,
  };
  let timeline: DropTimeline = { seconds: 1.8, join: 0.1, impact: 0.34, land: 0.67, side: 1 };
  let curve = new CatmullRomCurve3([new Vector3(), new Vector3(1, 0, 0)]);
  /** Arc-length fractions of the stations along the flow. */
  /** Where each highlighted letter's centre stands (world), and its height. */
  const accentAt = COMPOSITIONS.map(() => new Vector3());
  const accentHeight = COMPOSITIONS.map(() => 0.1);
  /** Per composition, by `aChar`: where each character's centre stands (world). */
  const charAt = COMPOSITIONS.map(() => Array.from({ length: charCount }, () => new Vector3()));
  /** Per composition: the journey point (0 → 1) from which its headline is all yellow. */
  const activateAt = COMPOSITIONS.map(() => 2);
  let accentTime = -1;
  let stations = { start: 0, pre: 0, entry: [0, 0, 0], rest: [0, 0, 0], exit: [0, 0] };
  /** The mark's place along the flow through the journey (rebuilt with the layout and the rhythm). */
  let course = (journey: number) => journey;

  const look = new Vector3();
  /** The camera's offset to the left of what it looks at (the type's thin sides show). */
  const eyeOffset = () => (tall ? 0.01 : 0.035);
  /** The camera at a moment: tracking at `camX`, looking at height `lookY`, `travelling` a little back. */
  const placeCamera = (camX: number, lookY: number, travelling: number) => {
    look.set(camX, lookY, 0);
    camera.position.set(camX - eyeOffset(), lookY + 0.02, DISTANCE + 0.06 * travelling);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };

  const layout = (margin: number, cta: Target | null, descHeight: number): BenefitsLayout => {
    const aspect = width / height;
    tall = width < 768 || width < height * 0.9;
    // Close enough that the next composition is already in sight as the camera leaves one.
    const spacing = aspect * 1.0 + 0.08;
    centres = COMPOSITIONS.map((_, k) => k * spacing);
    startX = centres[0] - spacing * 0.9;
    // The grid, shared by all three: each composition sized from its words' real widths to a share
    // of the measure between the margins (or to the height it may take); one left edge, a little in
    // from the margin on a wide screen; one baseline for the dominant lines, so every description
    // stands at the same height beneath; the tallest block centred above the middle (high enough
    // that the description, at the lower right, balances the frame).
    const full = (width - 2 * margin) / height;
    const measure = full * (tall ? MEASURE.tall : MEASURE.wide);
    const maxBlock = tall ? MAX_BLOCK.tall : MAX_BLOCK.wide;
    const middle = tall ? 0.05 : 0.08;
    const sized = COMPOSITIONS.map((comp, k) => {
      const [smallWord, bigWord] = words[k];
      const widest = Math.max(bigWord.width, smallWord.width * comp.small);
      const em = Math.min(measure / widest, maxBlock / (CAP_HEIGHT * (1 + comp.small) + LEADING));
      return { em, width: widest * em, block: em * (CAP_HEIGHT * (1 + comp.small) + LEADING) };
    });
    // A short screen (a phone on its side): the type, the gap and the description must all stand
    // between the section bar (at max(6.5rem, 13vh)) and the bottom edge. Where they would not, the
    // type takes the room there is and stands just under the bar; elsewhere nothing changes.
    const barBottom = (Math.max(104, height * 0.13) + 36) / height;
    const below = (Math.min(48, Math.max(28, height * 0.045)) + descHeight + 20) / height;
    const room = 1 - barBottom - below;
    const tallestBlock = Math.max(...sized.map((c) => c.block));
    const squeeze = !tall && tallestBlock > room ? Math.max(0.45, room / tallestBlock) : 1;
    if (squeeze < 1)
      sized.forEach((c) => {
        c.em *= squeeze;
        c.width *= squeeze;
        c.block *= squeeze;
      });
    const widest = Math.max(...sized.map((c) => c.width));
    const left = -aspect / 2 + margin / height + DRIFT + (tall ? 0 : (full - widest) * OFFSET);
    const base = squeeze < 1 ? 0.5 - barBottom - Math.max(...sized.map((c) => c.block)) : middle - Math.max(...sized.map((c) => c.block)) / 2;

    const lines: Line[][] = COMPOSITIONS.map((comp, k) => {
      const [smallWord, bigWord] = words[k];
      const { em } = sized[k];
      const placed = [
        { word: smallWord, scale: em * comp.small, y0: base + em * (CAP_HEIGHT + LEADING), z: SMALL_Z },
        { word: bigWord, scale: em, y0: base, z: 0 },
      ];
      return placed.map(({ word, scale, y0, z }, l) => {
        const mesh = groups[k].children[l] as Mesh;
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(left, y0, z);
        return { x0: left, x1: left + word.width * scale, y0, y1: y0 + CAP_HEIGHT * scale, z, word, scale };
      });
    });
    groups.forEach((group, k) => {
      group.position.set(centres[k], 0, 0);
      group.updateMatrixWorld(true);
    });
    lines.forEach((pair, k) =>
      pair.forEach((line) =>
        line.word.glyphs.forEach((g) => charAt[k][g.index].set(line.x0 + g.x * line.scale, line.y0 + g.y * line.scale, line.z).applyMatrix4(groups[k].matrixWorld)),
      ),
    );
    lines.forEach(([, big], k) => {
      const glyph = accents[k].glyph;
      if (glyph) accentAt[k].set(big.x0 + glyph.x * big.scale, big.y0 + glyph.y * big.scale, 0).applyMatrix4(groups[k].matrixWorld);
      accentHeight[k] = CAP_HEIGHT * big.scale;
    });

    // Where the mark rests in each dominant word: the bay of the L in SALARIES, the O of BONUSES and of DEVELOPMENT.
    const openingOf = (line: Line, o: Opening) => ({ x: line.x0 + o.x * line.scale, y: line.y0 + o.y * line.scale, size: Math.min(o.width, o.height) * line.scale });
    const rests = lines.map(([, big], k) => {
      const o = big.word.openings.find((opening) => opening.kind === COMPOSITIONS[k].rest);
      return o ? openingOf(big, o) : undefined;
    });
    // Where an opening is too small for the mark to pass (a phone, a narrow screen), it rests just below the word instead.
    // The mark fills most of the opening; the smallest that still
    // reads is about 21px on a 1024 × 768 screen.
    const fill = (k: number) => (k === 0 ? 0.72 : 0.68);
    const fits = rests.map((r, k) => !tall && !!r && r.size * fill(k) >= 0.027);
    sizes = rests.map((r, k) => (fits[k] && r ? Math.min(0.1, r.size * fill(k)) : tall ? 0.05 : 0.065));

    // The flow's course: control points, each with the band's half-width there.
    const points: Vector3[] = [];
    const widths: number[] = [];
    let size = sizes[0];
    const normal = () => size * 0.26;
    const narrow = () => size * 0.12;
    const add = (p: Vector3, w = normal()) => {
      points.push(p);
      widths.push(w);
      return points.length - 1;
    };
    const local = (k: number, x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(groups[k].matrixWorld);

    const entries: number[] = [];
    const restIndex: number[] = [];
    const exits: number[] = [];
    // The description beside each composition (lower right, its right edge on the page's margin,
    // just below the shared baseline): the mark passes outside its right edge, never over its text.
    const descRight = Math.min(DRIFT + (width / 2 - margin) / height + 0.06, DRIFT + aspect / 2 - 0.05);
    const descTop = base - Math.min(48, Math.max(28, height * 0.045)) / height;
    const descBeside = descTop - (descHeight / height) * 0.4;
    // Beneath the heading: the first filament, drawn across from the left edge.
    const start = add(new Vector3(startX - aspect * 0.5 - 0.15, -0.3, 0), size * 0.2);
    const pre = add(new Vector3(startX + aspect * 0.18, tall ? -0.33 : -0.29, 0.02), size * 0.26);
    lines.forEach(([small, big], k) => {
      size = sizes[k];
      const half = (TYPE_DEPTH * big.scale) / 2;
      const clear = size * 0.55 + 0.02;
      const behind = -(half + clear);
      const behindSmall = SMALL_Z - (TYPE_DEPTH * small.scale) / 2 - clear;
      const front = half + clear;
      const mid0 = (small.y0 + small.y1) / 2;
      const mid1 = (big.y0 + big.y1) / 2;
      const w0 = small.x1 - small.x0;
      const w1 = big.x1 - big.x0;
      const r = fits[k] ? rests[k] : undefined;
      // The approach: through the open space before the block, to behind the secondary line.
      const from = points[points.length - 1];
      const to = local(k, small.x0 - 0.24, mid0, behindSmall);
      add(new Vector3(lerp(from.x, to.x, 0.55), k === 0 ? -0.12 : lerp(from.y, to.y, 0.5) + 0.06, (from.z + to.z) / 2), size * 0.3);
      entries.push(add(to));
      // Behind the secondary line, never past the opening it is heading for: one easy descent into it.
      add(local(k, Math.min(small.x0 + w0 * 0.36, (r ? r.x : big.x1) - 0.2), mid0 + 0.01, behindSmall));
      if (!r) {
        // A phone: behind the dominant word, down past its baseline, and to rest in front, just below it;
        // leaving up in front of the word's end and away.
        add(local(k, big.x0 + w1 * 0.55, mid1, behind));
        add(local(k, big.x0 + w1 * 0.68, big.y0 - size * 0.7, 0), narrow());
        restIndex.push(add(local(k, big.x0 + w1 * 0.8, big.y0 - size * 0.85, front), narrow()));
        add(local(k, big.x1 + 0.08, mid1, front * 0.8));
        exits.push(add(local(k, big.x1 + 0.2, mid0, behind)));
        return;
      }
      if (k === 0) {
        // Competitive salaries: behind COMPETITIVE, down behind SALARIES, through the bay of its L
        // (never stopping there); then on in front across ARIES to the final S, out past its foot,
        // down beside the description's right edge, and on to the next benefit.
        add(local(k, r.x - 0.08, (mid0 + r.y) / 2, behind));
        add(local(k, r.x, r.y, behind * 0.5), narrow());
        restIndex.push(add(local(k, r.x, r.y, 0), narrow()));
        add(local(k, r.x, r.y, front * 0.6), narrow());
        add(local(k, r.x + 0.13, r.y - 0.02, front));
        add(local(k, big.x0 + w1 * 0.86, mid1 - 0.01, front));
        add(local(k, big.x1 + 0.04, big.y0 + 0.02, front * 0.8));
        // Right first, above the description's top edge, then down outside its right edge: never over its text.
        add(local(k, descRight, big.y0 + 0.005, front * 0.65));
        exits.push(add(local(k, descRight + 0.01, descBeside, front * 0.5)));
      } else if (k === 1) {
        // Performance bonuses: behind PERFORMANCE, down behind BONUSES and out through the O (never
        // stopping in its counter); then forward across NUSES, out past the final S, down beside the
        // description's right edge, and on to the last benefit.
        add(local(k, r.x - 0.08, (mid0 + r.y) / 2, behind));
        add(local(k, r.x, r.y, behind * 0.5), narrow());
        restIndex.push(add(local(k, r.x, r.y, 0), narrow()));
        add(local(k, r.x, r.y, front * 0.6), narrow());
        add(local(k, r.x + 0.13, r.y - 0.02, front));
        add(local(k, big.x0 + w1 * 0.8, mid1 - 0.02, front));
        add(local(k, big.x1 + 0.04, big.y0 + 0.02, front * 0.8));
        // Right first, above the description's top edge, then down outside its right edge: never over its text.
        add(local(k, descRight, big.y0 + 0.005, front * 0.65));
        exits.push(add(local(k, descRight + 0.01, descBeside, front * 0.5)));
      } else {
        // Training & development: behind TRAINING &, down behind DEVEL and out through the O,
        // resting in its counter; then forward and away in front of PMENT, beyond the T.
        add(local(k, r.x - 0.08, (mid0 + r.y) / 2, behind));
        add(local(k, r.x, r.y, behind * 0.5), narrow());
        restIndex.push(add(local(k, r.x, r.y, 0), narrow()));
        add(local(k, r.x, r.y, front * 0.6), narrow());
        add(local(k, r.x + 0.12, r.y - 0.02, front));
        add(local(k, big.x0 + w1 * 0.82, mid1 - 0.02, front));
        add(local(k, big.x1 + 0.1, mid1 + 0.02, front * 0.6));
      }
    });

    curve = new CatmullRomCurve3(points, false, "centripetal");
    curve.arcLengthDivisions = 4000;
    const lengths = curve.getLengths(curve.arcLengthDivisions);
    const total = lengths[lengths.length - 1];
    const at = (index: number) => lengths[Math.round((index / (points.length - 1)) * curve.arcLengthDivisions)] / total;
    stations = { start: at(start), pre: at(pre), entry: entries.map(at), rest: restIndex.map(at), exit: exits.map(at) };
    buildCourse();
    flow.build(scene, curve, widths, { strands: tall ? 5 : 7, samples: tall ? 1600 : 3000, gather: 0.45 });

    // The ending: the mark falls from where it rests in the last benefit (the O of DEVELOPMENT),
    // the camera diving down with it, far enough that none of the final space can be seen while the
    // benefits are read. Its course is set on screen, from the button's real box: it strikes the
    // top of the button a little off centre, bounces up and off past its far end, and falls beside
    // it into the collection (never through it). Without the button, it falls straight down.
    const lastBenefit = COMPOSITIONS.length - 1;
    const restPoint = curve.getPointAt(stations.rest[lastBenefit]);
    const camX = centres[lastBenefit] + DRIFT;
    placeCamera(camX, 0, 0);
    const startNdc = restPoint.clone().project(camera);
    const lookY = -2.6;
    placeCamera(camX, lookY, 0);
    const hit = cta && cta.width > 0 && cta.height > 0 ? cta : null;
    // At the depth it strikes (the focal plane), one scene unit is one screen height.
    const impactSize = Math.min(sizes[lastBenefit], hit ? (hit.height * 0.62) / height : sizes[lastBenefit]);
    const half = (impactSize * height) / 2;
    const g = G * height;
    const sx = ((startNdc.x + 1) / 2) * width;
    const sy = ((1 - startNdc.y) / 2) * height;
    const landY = ((1 - (tall ? -0.62 : -0.66)) / 2) * height;
    const centreX = hit ? hit.left + hit.width / 2 : sx;
    // It bounces on the way it was already going (toward the button's far end from where it fell).
    const side = hit && sx > centreX + 1 ? -1 : 1;
    const edge = hit ? centreX + (side * hit.width) / 2 : sx;
    const inside = (x: number) => Math.min(width - half - 8, Math.max(half + 8, x));
    let cx = sx;
    let cy = landY;
    let vy0 = 0;
    let vUp = 0;
    let drift = 0;
    let fallTime: number;
    let afterTime = 0;
    let landX = sx;
    if (hit) {
      // Onto the top of the button: from rest in the O to the strike in FALL seconds under gravity
      // (the speed it leaves with follows; upward, a small hop, when the button lies close beneath).
      fallTime = tall ? FALL.tall : FALL.wide;
      cy = hit.top - half;
      vy0 = (cy - sy - 0.5 * g * fallTime * fallTime) / fallTime;
      vUp = -RESTITUTION * (vy0 + g * fallTime);
      afterTime = (-vUp + Math.sqrt(vUp * vUp + 2 * g * (landY - cy))) / g;
      // Out past the button's end: x = cx + drift·(1 − e^(−t/DRIFT_OUT)), clear of the end by the
      // time it is back down at the button's top; struck nearer the end if the far side is short of room.
      const back = (-2 * vUp) / g;
      const k = 1 - Math.exp(-back / DRIFT_OUT);
      const clear = edge + side * (half + 6);
      const far = inside(edge + side * (half * 3 + width * 0.04));
      cx = centreX + side * hit.width * 0.3;
      const nearest = (clear - k * far) / (1 - k);
      cx = side > 0 ? Math.max(cx, nearest) : Math.min(cx, nearest);
      cx = side > 0 ? Math.min(cx, edge - half * 0.6) : Math.max(cx, edge + half * 0.6);
      drift = far - cx;
      landX = cx + drift * (1 - Math.exp(-afterTime / DRIFT_OUT));
    } else {
      // No button: straight down into the collection, from rest.
      fallTime = Math.sqrt((2 * Math.max(1, landY - sy)) / g);
    }
    const across = (landX / width) * 2 - 1;
    const wide = width >= 1024;
    const landed = field.build(heap, {
      camera,
      width,
      height,
      count: wide ? 1500 : width >= 640 ? 850 : 440,
      compact: tall,
      // The collection rests beneath TEAM, from about two thirds of the way down to the foot.
      top: tall ? -0.3 : -0.34,
      // The headline and the button (the final call stands there, a little above the middle).
      quiet: tall ? { x: 0, y: 0.18, rx: 1.0, ry: 0.4 } : { x: 0, y: 0.16, rx: 0.58, ry: 0.4 },
      landing: { x: across, y: tall ? -0.62 : -0.66, z: -0.2 },
      landingSize: wide ? 11 : 9,
    });
    const landedOnScreen = landed.landing.clone().project(camera);
    fall = {
      from: restPoint,
      size: sizes[lastBenefit],
      landing: landed.landing,
      landingSize: landed.size,
      lookY,
      camX,
      sx,
      sy,
      cx,
      cy,
      ex: ((landedOnScreen.x + 1) / 2) * width - landX,
      ey: ((1 - landedOnScreen.y) / 2) * height - landY,
      vy0,
      vUp,
      drift,
      g,
      fallTime,
      afterTime,
      strikes: !!hit,
      impactSize,
      side,
    };
    const seconds = fallTime + afterTime + SETTLE;
    timeline = { seconds, join: JOIN / seconds, impact: fallTime / seconds, land: (fallTime + afterTime) / seconds, side };
    wasLanded = false;

    // Each benefit's reading frame on screen, seen from the camera where it holds.
    const corner = new Vector3();
    const toScreen = (v: Vector3) => {
      v.project(camera);
      return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height];
    };
    const frames = lines.map((pair, k) => {
      placeCamera(centres[k] + DRIFT, 0, 0);
      const xs: number[] = [];
      const ys: number[] = [];
      pair.forEach((line) => {
        for (const [x, y] of [
          [line.x0, line.y0],
          [line.x1, line.y1],
        ]) {
          const [sx, sy] = toScreen(corner.set(x, y, line.z).applyMatrix4(groups[k].matrixWorld));
          xs.push(sx);
          ys.push(sy);
        }
      });
      if (!fits[k]) {
        // On a phone the mark rests below the type: the frame includes it.
        const p = curve.getPointAt(stations.rest[k]);
        ys.push(toScreen(corner.set(p.x, p.y - sizes[k] * 0.6, p.z))[1]);
      }
      return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
    });
    return { tall, frames, drop: timeline };
  };

  /**
   * The mark's course through the journey: through each benefit's entry, its letter opening and
   * its exit (past the description), one continuous curve with no stop anywhere; it slows only
   * into the O of DEVELOPMENT, where it comes to rest for the drop.
   */
  const buildCourse = () => {
    const xs: number[] = [];
    const ys: number[] = [];
    const last = COMPOSITIONS.length - 1;
    for (let k = 0; k <= last; k++) {
      const { arrive, leave } = rhythm;
      xs.push(arrive[k]);
      ys.push(stations.entry[k]);
      if (k < last && stations.exit[k] !== undefined) {
        xs.push(lerp(arrive[k], leave[k], 0.5));
        ys.push(stations.rest[k]);
        xs.push(leave[k]);
        ys.push(stations.exit[k]);
      } else {
        xs.push(lerp(arrive[k], leave[k], 0.7));
        ys.push(stations.rest[k]);
      }
    }
    course = monotone(xs, ys, 0);
    findActivations();
  };
  /**
   * Where along the journey each headline turns yellow: for the first two, the first point after
   * the mark's passage through its letter at which it is clear of the letter; for the last, where
   * it has come to rest in the O of DEVELOPMENT (the drop follows from there).
   */
  const probe = new Vector3();
  const restAt = new Vector3();
  const findActivations = () => {
    const last = COMPOSITIONS.length - 1;
    const steps = 480;
    const at = (j: number, out: Vector3) => curve.getPointAt(clamp(course(j), 0, 1), out);
    for (let k = 0; k <= last; k++) {
      const { arrive, leave } = rhythm;
      const h = accentHeight[k];
      if (k < last) {
        const from = lerp(arrive[k], leave[k], 0.5);
        const clear = h * ACTIVATION.clear + sizes[k] * ACTIVATION.mark;
        activateAt[k] = leave[k];
        for (let i = 0; i <= steps; i++) {
          const j = lerp(from, leave[k], i / steps);
          if (at(j, probe).distanceTo(accentAt[k]) > clear) {
            activateAt[k] = j;
            break;
          }
        }
      } else {
        const rested = lerp(arrive[k], leave[k], 0.7);
        at(rested, restAt);
        activateAt[k] = rested;
        for (let i = 0; i <= steps; i++) {
          const j = lerp(arrive[k], rested, i / steps);
          if (at(j, probe).distanceTo(restAt) < h * ACTIVATION.rested) {
            activateAt[k] = j;
            break;
          }
        }
      }
    }
  };
  const position = new Vector3();
  const ray = new Vector3();
  /** The point at depth `z` seen at (nx, ny) on screen, from the camera as it stands. */
  const atDepth = (nx: number, ny: number, z: number, out: Vector3) => {
    ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position);
    return out.copy(camera.position).addScaledVector(ray, (z - camera.position.z) / ray.z);
  };
  const tangent = new Vector3();
  const target = new Vector3();
  let wasLanded = false;
  let fieldAwake = false;
  // The falling mark as it moves through the field (it pushes the marks it passes).
  const mover: FieldMover = { position: new Vector3(), velocity: new Vector3() };
  const lastTarget = new Vector3();
  let lastTime = -1;
  const settled = new Vector3();
  const turned = new Vector3();
  // The camera's slight parallax with the pointer, once the mark has landed (smoothed).
  const parallax = { x: 0, y: 0 };

  const render = (pose: BenefitsPose) => {
    const count = centres.length;
    // Where the mark is along the flow, and where the camera is along X: each phase takes
    // over from the one before (they never overlap), so this is exact in both directions.
    let s = lerp(stations.start, stations.pre, smooth(clamp(pose.intro, 0, 1)));
    const enter = clamp(pose.enter, 0, 1);
    // Into the first benefit at speed (easing in, not out): the journey's course takes it on from there.
    if (enter > 0) s = lerp(stations.pre, stations.entry[0], enter * enter * (2 - enter));
    const track = clamp((enter - ENTERING.camera[0]) / (ENTERING.camera[1] - ENTERING.camera[0]), 0, 1);
    let camX = lerp(startX, centres[0], tracking(track));
    let travelling = Math.sin(Math.PI * track);
    for (let k = 0; k < count; k++) {
      if (k > 0) {
        const tr = clamp(pose.travel[k] ?? 0, 0, 1);
        if (tr > 0) {
          camX = lerp(centres[k - 1] + DRIFT, centres[k], tracking(tr));
          travelling = Math.sin(Math.PI * tr);
        }
      }
      const w = clamp(pose.weave[k] ?? 0, 0, 1);
      if (w > 0) camX = centres[k] + DRIFT * smooth(w);
    }
    if (pose.journey > 0) s = course(pose.journey);

    // Each benefit's letters come in, one after another, as the camera comes toward it (once; they
    // are put back, unseen, only once the camera has gone back well away from it).
    for (let k = 0; k < count; k++) {
      const toward = k === 0 ? track : Math.max(clamp(pose.travel[k] ?? 0, 0, 1), (pose.weave[k] ?? 0) > 0 ? 1 : 0);
      if (toward >= REVEAL_FROM && revealedAt[k] < 0) revealedAt[k] = pose.ambient;
      else if (toward < REVEAL_RESET && revealedAt[k] >= 0) revealedAt[k] = -1;
      reveals[k].value = revealedAt[k] < 0 ? -1 : pose.ambient - revealedAt[k];
    }
    let flowSize = sizes[0];
    for (let k = 1; k < count; k++) flowSize = lerp(flowSize, sizes[k], smooth(clamp(pose.travel[k] ?? 0, 0, 1)));
    curve.getPointAt(s, position);
    curve.getTangentAt(s, tangent);

    // The release: the filaments close up into the mark and dissolve; it stands on its own.
    const d = clamp(pose.drop, 0, 1);
    const release = smooth(clamp((d * timeline.seconds) / 0.4, 0, 1));
    const shown = pose.intro > 0 || enter > 0;
    // Its gold deepens over the warm white, and lightens as the world turns petrol.
    flow.reveal(shown ? s : 0, release * s, 1 - release, 1 - entering(enter, ENTERING.world));

    // The mark: it appears at the head of the flow as the camera begins to track, and leads the
    // filaments, turning gently with the curve.
    const appear = smooth(clamp(enter / 0.3, 0, 1));
    const heading = Math.atan2(tangent.z, Math.abs(tangent.x) + 1e-6);
    let yaw = clamp(heading * 0.2, -0.22, 0.22);
    let roll = clamp(-tangent.y * 0.35, -0.25, 0.25);
    let size = flowSize;
    let lookY = 0;
    let squash = 0;
    target.copy(position);
    if (d > 0) {
      const t = d * timeline.seconds;
      // The camera dives first, arriving in the final frame before the strike.
      lookY = fall.lookY * tracking(t / DIVE);
      camX = fall.camX;
      travelling = 0;
      placeCamera(camX, lookY, 0);
      // The course, on screen, in pixels: falling under gravity (at a steady speed across) onto the
      // top of the button; struck, back up with a third of its speed and pushed out past its end;
      // falling again under gravity beside it into the collection, shrinking to its neighbours'
      // size, and landing at full speed.
      const { from, landing, fallTime, afterTime, g } = fall;
      let x: number;
      let y: number;
      let z: number;
      let progress: number;
      if (t < fallTime || !fall.strikes) {
        const tt = Math.min(t, fallTime);
        const u = tt / fallTime;
        x = lerp(fall.sx, fall.cx, u) + (fall.strikes ? 0 : fall.ex * u);
        y = fall.sy + fall.vy0 * tt + 0.5 * g * tt * tt + (fall.strikes ? 0 : fall.ey * u);
        z = lerp(from.z, fall.strikes ? 0 : landing.z, smooth(u));
        size = lerp(fall.size, fall.strikes ? fall.impactSize : fall.landingSize, smooth(u));
        progress = fall.strikes ? 0 : u;
      } else {
        const tt = Math.min(t - fallTime, afterTime);
        const u = afterTime > 0 ? tt / afterTime : 1;
        x = fall.cx + fall.drift * (1 - Math.exp(-tt / DRIFT_OUT)) + fall.ex * smooth(u);
        y = fall.cy + fall.vUp * tt + 0.5 * g * tt * tt + fall.ey * smooth(u);
        z = lerp(0, landing.z, smooth(u));
        size = lerp(fall.impactSize, fall.landingSize, smooth(u));
        progress = smooth(u);
      }
      atDepth((x / width) * 2 - 1, 1 - (y / height) * 2, z, target);
      const landT = fallTime + afterTime;
      const settle = clamp((t - landT) / SETTLE, 0, 1);
      target.y += fall.landingSize * 0.25 * Math.sin(Math.PI * settle) * (1 - settle);
      // Struck: a quick compression, and a turn away that dies out as it falls; landing, a harder one.
      const struck = fall.strikes && t >= fallTime ? t - fallTime : -1;
      const kick = struck >= 0 ? Math.exp(-struck / 0.3) : 0;
      yaw = lerp(yaw, 0.1, progress) + 0.15 * fall.side * kick;
      roll = lerp(roll, 0.16, progress) - 0.6 * fall.side * kick;
      const strike = struck >= 0 && struck < 0.07 ? Math.sin((Math.PI * struck) / 0.07) : 0;
      squash = Math.max(0.7 * strike, 0.9 * Math.sin(Math.PI * settle) * (1 - 0.5 * settle));
      // Landed, it is one of the field's marks: from where it lands, it moves as they do.
      if (pose.since >= 0) {
        const join = smooth(clamp(pose.since / 0.35, 0, 1));
        target.lerp(field.heroPosition(settled), join);
        field.heroTurn(pose.ambient, turned);
        yaw = lerp(yaw, 0.1 + turned.y, join);
        roll = lerp(roll, 0.16 + turned.z, join);
      }
    }
    logo.root.position.copy(target);
    logo.size(size * Math.max(0.001, appear));
    logo.root.visible = enter > 0;
    logo.turn(yaw, roll, pose.since >= 0 ? turned.x * smooth(clamp(pose.since / 0.35, 0, 1)) : 0);
    logo.land(squash);
    glow.position.copy(target);
    glow.distance = size * 2.5;
    glow.intensity = 0.0012 * appear * (1 - release);
    // The falling mark's own velocity (for its wake through the field, and the landing).
    const dt = lastTime < 0 ? 0 : Math.min(0.05, Math.max(0, pose.ambient - lastTime));
    lastTime = pose.ambient;
    if (dt > 0) mover.velocity.copy(target).sub(lastTarget).divideScalar(dt);
    lastTarget.copy(target);
    mover.position.copy(target);

    // Once landed, the camera answers the pointer with the slightest parallax (its framing stays).
    const landedNow = pose.since >= 0;
    const lean = landedNow ? smooth(clamp(pose.since / 1.2, 0, 1)) : 0;
    const p = pose.pointer;
    const ease = dt > 0 ? 1 - Math.exp(-dt * 2.5) : 0;
    parallax.x += ((p && landedNow ? p.x : 0) - parallax.x) * ease;
    parallax.y += ((p && landedNow ? p.y : 0) - parallax.y) * ease;
    placeCamera(camX, lookY, travelling);
    if (lean > 0) {
      camera.position.x += parallax.x * 0.03 * lean;
      camera.position.y += parallax.y * 0.02 * lean;
      camera.lookAt(look);
      camera.updateMatrixWorld();
    }

    // The field: drawn only once the drop has begun (it lies far below the benefits); the falling
    // mark pushes through it, its landing sends a wave out, then the pointer moves it.
    field.show(d > 0.02);
    if (landedNow && !wasLanded) field.land(target, mover.velocity, pose.ambient, camera);
    wasLanded = landedNow;
    if (d > 0.02) {
      const falling = d > 0.03 && d < timeline.land;
      field.update(pose.ambient, camera, pose.pointer, pose.since > 0.5, falling ? mover : null, landedNow);
      fieldAwake = true;
    } else if (fieldAwake) {
      field.reset();
      fieldAwake = false;
    }

    key.position.set(camX - 1.2, 1.4, 3);
    key.target.position.set(camX, 0, 0);
    rim.position.set(camX + 1.6, 0.8, -1.5);
    rim.target.position.set(camX, 0, 0);
    // The headlines, in one pass, each value eased toward what the scroll and the cursor say now:
    // the highlighted letter grows as the mark nears it; the headline is yellow once the mark is
    // through; letters near the cursor grow and turn warm white.
    const accentDt = accentTime < 0 ? 0 : Math.min(0.1, Math.max(0, pose.ambient - accentTime));
    accentTime = pose.ambient;
    const toward = (now: number, goal: number, tau: number) => now + (goal - now) * (accentDt > 0 ? 1 - Math.exp(-accentDt / tau) : 1);
    let settling = false;
    const cursor = pose.cursor && d <= 0 ? pose.cursor : null;
    const box = cursor ? canvas.getBoundingClientRect() : null;
    const radius = clamp(width * HOVER.reach, HOVER.radius[0], HOVER.radius[1]);
    for (let k = 0; k < count; k++) {
      const h = accentHeight[k];
      const near = enter > 0 && logo.root.visible ? 1 - smooth(clamp((target.distanceTo(accentAt[k]) - h * ACCENT.near) / (h * (ACCENT.far - ACCENT.near)), 0, 1)) : 0;
      const hit = accents[k].hit;
      hit.value = toward(hit.value, near, ACCENT.ease);
      if (Math.abs(near - hit.value) > 0.002) settling = true;

      const goal = pose.journey > 0 && pose.journey >= activateAt[k] ? 1 : 0;
      active[k].value = toward(active[k].value, goal, ACTIVATION.ease);
      if (Math.abs(goal - active[k].value) > 0.002) settling = true;

      // Only a headline that is on screen and has come in answers the cursor.
      const onScreen = box !== null && cursor !== null && Math.abs(centres[k] - camX) < width / height && reveals[k].value > revealSpan(k) * 0.5;
      const hover = hovers[k].value;
      // The letters' height on screen, for how far inside each one the cursor counts as on it.
      let body = 0;
      if (onScreen && box) {
        probe.copy(accentAt[k]).project(camera);
        const y0 = probe.y;
        probe.copy(accentAt[k]).setY(accentAt[k].y + h).project(camera);
        body = (Math.abs(probe.y - y0) / 2) * box.height * HOVER.body;
      }
      for (let i = 0; i < charCount; i++) {
        let goalHover = 0;
        if (onScreen && box && cursor && i < charsIn[k]) {
          probe.copy(charAt[k][i]).project(camera);
          const sx = box.left + ((probe.x + 1) / 2) * box.width;
          const sy = box.top + ((1 - probe.y) / 2) * box.height;
          const near01 = 1 - clamp(Math.max(0, Math.hypot(sx - cursor.x, sy - cursor.y) - body) / radius, 0, 1);
          goalHover = near01 * near01 * (3 - 2 * near01);
        }
        hover[i] = toward(hover[i], goalHover, HOVER.ease);
        if (Math.abs(goalHover - hover[i]) > 0.002) settling = true;
        else hover[i] = goalHover;
      }
    }
    renderer.render(scene, camera);
    return {
      /** Per composition: its horizontal offset on screen from where it is read, in CSS pixels. */
      offsets: centres.map((c) => (c + DRIFT - camX) * height),
      /** Per composition: when its letters began to come in (seconds, the pose's clock), or −1. */
      revealedAt: revealedAt.slice(),
      /** Whether any letters are still coming in (the page keeps drawing frames until they are). */
      revealing: settling || revealedAt.some((at, k) => at >= 0 && pose.ambient - at < revealSpan(k)),
    };
  };

  return {
    /**
     * Lays everything out for a canvas of this size (CSS pixels), the type set
     * between margins of `margin` pixels; returns the layout the page aligns to.
     */
    resize(w: number, h: number, margin: number, cta: Target | null, descHeight = 120): BenefitsLayout {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      return layout(margin, cta, descHeight);
    },
    /**
     * The journey's rhythm, as fractions of `journey`: where each benefit's reading begins
     * (`arrive`) and ends (`leave`). The mark passes its letter opening at the middle of each.
     */
    setRhythm(arrive: number[], leave: number[]) {
      rhythm = { arrive, leave };
      buildCourse();
    },
    render,
    dispose() {
      flow.dispose();
      logo.dispose();
      field.dispose();
      words.flat().forEach((word) => word.geometry.dispose());
      materials.forEach((m) => m.dispose());
      scene.clear();
      renderer.dispose();
    },
  };
}

export type BenefitsScene = ReturnType<typeof createBenefitsScene>;
