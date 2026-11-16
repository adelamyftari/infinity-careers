/**
 * Editorial type with a very slight sculptural depth, for the benefits scene:
 * words built from the site's own display face, the properties title's family and
 * tracking, in a lighter weight than the section's bold heading (Inter Tight
 * Medium, -0.035em; SIL Open Font License: see ./type/InterTight-OFL.txt), subset to
 * capitals, "&" and the space, converted offline to the typeface format Three's
 * FontLoader reads (with the variable font's overlapping contours merged into
 * clean outlines and holes, so every letter triangulates exactly). The letter faces are what matter: the extrusion is thin and
 * the bevel a hairline, just enough to catch the light at the edges.
 *
 * Each word is one merged mesh with two material groups, the faces (0) and the
 * sides (1), built once at a size of 1 em and scaled to its place, so laying a
 * composition out again never rebuilds geometry. Every vertex carries its
 * character's place in the composition (`aChar`, counted from `firstChar`) and
 * its centre (`aCenter`, in em), so a shader can bring the letters in one after
 * another, and move one on its own; `glyphs` says where each one stands.
 *
 * It also reports, per word, the openings the Infinity mark can truly pass
 * through or rest in: the counter of each O and the open bay of each L (bounded
 * by its stem, its foot and the next letter only), in em units from the word's
 * left baseline.
 */
import { Box2, BufferAttribute, BufferGeometry, ExtrudeGeometry, Vector2, Vector3 } from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import fontData from "./type/inter-tight-500-caps.typeface.json";

const font = new FontLoader().parse(fontData);
const resolution = fontData.resolution;
/** Capital height, in em (Inter Tight: 1490 of 2048 units). */
export const CAP_HEIGHT = 1490 / 2048;
/** Extrusion depth, in em: a few pixels at the reading framing, never a block. */
export const TYPE_DEPTH = 0.05;
/** Tracking, in em: the properties title's (text-colossal). */
const TRACKING = -0.035;
const BEVEL = 0.0035;

export type Opening = { kind: "counter" | "bay"; x: number; y: number; width: number; height: number };
/** A character of a word: its letter, its place in the composition (`aChar`), its centre in em. */
export type Glyph = { char: string; index: number; x: number; y: number };
export type Word = { text: string; geometry: BufferGeometry; width: number; openings: Opening[]; chars: number; glyphs: Glyph[] };

/** One material group of a non-indexed geometry, as a geometry of its own. */
function groupOf(geometry: BufferGeometry, index: number) {
  const group = geometry.groups.find((g) => g.materialIndex === index);
  const part = new BufferGeometry();
  if (!group) return part;
  for (const name of ["position", "normal", "uv", "aChar", "aCenter"]) {
    const attribute = geometry.getAttribute(name);
    const size = attribute.itemSize;
    const array = (attribute.array as Float32Array).slice(group.start * size, (group.start + group.count) * size);
    part.setAttribute(name, new BufferAttribute(array, size));
  }
  return part;
}

export function buildWord(text: string, curveSegments: number, firstChar = 0): Word {
  const faces: BufferGeometry[] = [];
  const sides: BufferGeometry[] = [];
  const openings: Opening[] = [];
  let x = 0;
  let last = 0;
  let chars = 0;
  const glyphs: Glyph[] = [];
  for (const char of text) {
    const glyph = fontData.glyphs[char as keyof typeof fontData.glyphs];
    const advance = (glyph ? glyph.ha : resolution * 0.25) / resolution;
    if (char !== " ") {
      const shapes = font.generateShapes(char, 1);
      const geometry = new ExtrudeGeometry(shapes, {
        depth: TYPE_DEPTH - 2 * BEVEL,
        curveSegments,
        bevelEnabled: true,
        bevelThickness: BEVEL,
        bevelSize: BEVEL,
        bevelSegments: 1,
      });
      geometry.translate(x, 0, -(TYPE_DEPTH - 2 * BEVEL) / 2);
      const vertices = geometry.getAttribute("position").count;
      geometry.setAttribute("aChar", new BufferAttribute(new Float32Array(vertices).fill(firstChar + chars), 1));
      geometry.computeBoundingBox();
      const middle = geometry.boundingBox!.getCenter(new Vector3());
      const centre = new Float32Array(vertices * 2);
      for (let v = 0; v < vertices; v++) {
        centre[v * 2] = middle.x;
        centre[v * 2 + 1] = middle.y;
      }
      geometry.setAttribute("aCenter", new BufferAttribute(centre, 2));
      glyphs.push({ char, index: firstChar + chars, x: middle.x, y: middle.y });
      chars++;
      faces.push(groupOf(geometry, 0));
      sides.push(groupOf(geometry, 1));
      geometry.dispose();
      if (char === "O") {
        shapes.forEach((shape) =>
          shape.holes.forEach((hole) => {
            const box = new Box2().setFromPoints(hole.getPoints());
            const centre = box.getCenter(new Vector2());
            const size = box.getSize(new Vector2());
            openings.push({ kind: "counter", x: x + centre.x, y: centre.y, width: size.x - 2 * BEVEL, height: size.y - 2 * BEVEL });
          }),
        );
      }
      if (char === "L" && glyph) {
        // The bay right of the stem and above the foot (Inter Tight: stem to 345, foot to 193 units).
        const stem = 345 / resolution;
        const foot = 193 / resolution;
        const right = glyph.x_max / resolution;
        openings.push({ kind: "bay", x: x + (stem + right) / 2 + 0.03, y: (foot + CAP_HEIGHT) / 2, width: right - stem + 0.06, height: CAP_HEIGHT - foot });
      }
      last = x + (glyph ? glyph.x_max / resolution : advance);
    }
    x += advance + TRACKING;
  }
  const face = mergeGeometries(faces);
  const side = mergeGeometries(sides);
  const geometry = mergeGeometries([face, side], true);
  [...faces, ...sides, face, side].forEach((part) => part.dispose());
  geometry.computeBoundingBox();
  return { text, geometry, width: last, openings, chars, glyphs };
}
