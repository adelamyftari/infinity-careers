import { ExtrudeGeometry, Shape, ShapeUtils, Vector2, Vector3 } from "three";
import { LOGO_GRID, LOGO_OUTLINES, type LogoPieceId } from "./logo-mark";

export const LOGO_PIECE_IDS = Object.keys(LOGO_OUTLINES) as LogoPieceId[];

const HALF = LOGO_GRID / 2;
const BEVEL = 0.05;
const DEPTH = 1 - 2 * BEVEL;

/**
 * Moves every edge of an axis-aligned polygon inwards by `distance`, so the
 * bevel grows back out to the exact logo outline.
 */
function inset(points: Vector2[], distance: number) {
  const n = points.length;
  const normals = points.map((p, i) => {
    const next = points[(i + 1) % n];
    // Counter-clockwise winding: the interior is to the left of each edge.
    return new Vector2(-(next.y - p.y), next.x - p.x).normalize();
  });
  return points.map((p, i) =>
    p.clone().addScaledVector(normals[(i + n - 1) % n].clone().add(normals[i]), distance),
  );
}

/**
 * One piece of the monogram, extruded one cell deep (the detached squares are
 * cubes) and centred on its own origin so it can turn in place. `home` is its
 * exact position in the assembled logo, which is centred on the origin and
 * faces +Z with no rotation.
 */
export function createLogoPiece(id: LogoPieceId) {
  let points = LOGO_OUTLINES[id].map(([col, row]) => new Vector2(col - HALF, HALF - row));
  if (ShapeUtils.isClockWise(points)) points = points.reverse();

  const min = points.reduce((a, p) => a.min(p), points[0].clone());
  const max = points.reduce((a, p) => a.max(p), points[0].clone());
  const center = min.add(max).multiplyScalar(0.5);

  const geometry = new ExtrudeGeometry(new Shape(inset(points, BEVEL)), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
  });
  geometry.translate(-center.x, -center.y, -DEPTH / 2);

  return { geometry, home: new Vector3(center.x, center.y, 0) };
}
