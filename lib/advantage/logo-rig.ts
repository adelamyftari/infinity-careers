/**
 * The travelling Infinity mark: the official logo, built from the loader's own
 * pieces (so it is the same mark as everywhere on the site), in its own yellow.
 *
 * Its rig keeps each motion on its own node, so none overwrites another:
 *   root     its place in the scene
 *   turn     its turning while it travels (whole turns between arrivals)
 *   squash   its landing compression
 *   mark     the logo itself
 */
import { Group, Mesh, MeshStandardMaterial } from "three";
import { createLogoPiece, LOGO_PIECE_IDS } from "@/lib/loader/logo-geometry";
import { LOGO_BRAND_COLOR, LOGO_GRID } from "@/lib/loader/logo-mark";

export function createLogoRig() {
  const material = new MeshStandardMaterial({ color: LOGO_BRAND_COLOR, emissive: LOGO_BRAND_COLOR, emissiveIntensity: 0.22, roughness: 0.34, metalness: 0.18 });
  const pieces = LOGO_PIECE_IDS.map((id) => createLogoPiece(id));
  const mark = new Group();
  pieces.forEach(({ geometry, home }) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.copy(home);
    mark.add(mesh);
  });
  const squash = new Group();
  const turn = new Group();
  const root = new Group();
  squash.add(mark);
  turn.add(squash);
  root.add(turn);

  return {
    root,
    /** The pieces, for anything else that must be the same logo (the collection). */
    pieces,
    /** Its height in scene units. */
    size(height: number) {
      mark.scale.setScalar(height / LOGO_GRID);
    },
    /** Turning: about its vertical axis (`yaw`), a lean (`roll`), a tip toward the camera (`pitch`). */
    turn(yaw: number, roll: number, pitch: number) {
      turn.rotation.set(pitch, yaw, roll);
    },
    /** Landing compression, 0 → 1 → 0: wider and lower for a moment, no bounce. */
    land(amount: number) {
      squash.scale.set(1 + 0.05 * amount, 1 - 0.1 * amount, 1);
    },
    dispose() {
      pieces.forEach(({ geometry }) => geometry.dispose());
      material.dispose();
    },
  };
}
