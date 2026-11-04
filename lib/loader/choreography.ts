import type { LogoPieceId } from "./logo-mark";

type Vec3 = [number, number, number];

/** Seconds for the pieces to assemble into the logo. */
export const ASSEMBLY = 1.05;
/** Seconds the finished logo holds before it travels. */
export const HOLD = 0.18;
/** Seconds for the logo to travel into the header. */
export const FLIGHT = 0.45;

/** Timeline seconds for a point in the assembly, as a percentage of it. */
export const at = (percent: number) => (percent / 100) * ASSEMBLY;

/** Share of the assembly (in %) each depth snap lasts; every snap ends before 100%. */
export const SNAP = 8;

const TURN = Math.PI * 2;

export type PieceMotion = {
  /** Position at 0%. */
  start: Vec3;
  /** Control point that bends the travel into a curve. */
  via: Vec3;
  /**
   * Depth held while travelling and turning. Each piece keeps its own layer
   * (upper in front, lower behind, cubes nearest the camera) so nothing can
   * clip; layers only close once every piece faces front at its final X/Y,
   * where the outlines no longer overlap.
   */
  layer: number;
  /** Rotation at 0%. */
  rotation: Vec3;
  /** Final rotation: whole turns, so the piece ends exactly front-facing. */
  turns: Vec3;
  /** Points in the assembly (%): travel window, rotation resolved, depth snap. */
  travel: [number, number];
  resolve: number;
  snap: number;
  /** Local point the LED trail follows (an outer corner on the big pieces). */
  trailAnchor: Vec3;
  /** Phase offset for the floating motion. */
  float: number;
};

export const CHOREOGRAPHY: Record<LogoPieceId, PieceMotion> = {
  upper: {
    start: [2.6, 2.4, 1.55],
    via: [4.5, 3.0, 1.55],
    layer: 1.55,
    rotation: [0.28, -0.3, 0.45],
    turns: [0, 0, -TURN],
    travel: [0, 55],
    resolve: 80,
    snap: 88,
    trailAnchor: [2.5, 2.5, 0],
    float: 0,
  },
  lower: {
    start: [-2.4, -2.0, -2.8],
    via: [-5.0, -1.2, -3.2],
    layer: -2.8,
    rotation: [-0.12, 0.55, -0.3],
    turns: [0, TURN, 0],
    travel: [3, 60],
    resolve: 83,
    snap: 89,
    trailAnchor: [-2.5, -2.5, 0],
    float: 2.1,
  },
  cubeTop: {
    start: [1.6, 3.0, 3.9],
    via: [-1.2, 3.0, 4.3],
    layer: 3.9,
    rotation: [0.6, 0.9, 0.2],
    turns: [TURN, TURN, 0],
    travel: [0, 52],
    resolve: 84,
    snap: 90,
    trailAnchor: [0, 0, 0],
    float: 4.2,
  },
  cubeBottom: {
    start: [-2.6, -2.9, 3.9],
    via: [0.6, -3.1, 4.3],
    layer: 3.9,
    rotation: [-0.5, 0.4, -0.3],
    turns: [-TURN, TURN, 0],
    travel: [5, 58],
    resolve: 85,
    snap: 91,
    trailAnchor: [0, 0, 0],
    float: 1.3,
  },
};
