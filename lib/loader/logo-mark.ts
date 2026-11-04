/** Grid size of the Infinity monogram: every edge lies on a whole cell. */
export const LOGO_GRID = 7;
export const LOGO_BRAND_COLOR = "#fbae25";

export type LogoPieceId = "upper" | "lower" | "cubeTop" | "cubeBottom";

// Outlines in grid cells (column right, row down), traced from the official
// flat logo, which samples exactly as:
//   #.#####
//   ..#...#
//   #.#.#.#
//   #.#.#.#
//   #.#.#.#
//   #...#..
//   #####.#
// Shared by the 3D pieces and the flat header mark, so both are the same logo.
export const LOGO_OUTLINES: Record<LogoPieceId, [col: number, row: number][]> = {
  // Inverted U (top right).
  upper: [[2, 0], [7, 0], [7, 5], [6, 5], [6, 1], [3, 1], [3, 5], [2, 5]],
  // U (bottom left).
  lower: [[0, 2], [1, 2], [1, 6], [4, 6], [4, 2], [5, 2], [5, 7], [0, 7]],
  // Detached squares.
  cubeTop: [[0, 0], [1, 0], [1, 1], [0, 1]],
  cubeBottom: [[6, 6], [7, 6], [7, 7], [6, 7]],
};
