"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Trail } from "@react-three/drei";
import gsap from "gsap";
import {
  CanvasTexture,
  Euler,
  MeshBasicMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
  type Object3D,
} from "three";
import { ASSEMBLY, at, CHOREOGRAPHY, FLIGHT, HOLD, SNAP, type PieceMotion } from "@/lib/loader/choreography";
import { createLogoPiece, LOGO_PIECE_IDS } from "@/lib/loader/logo-geometry";
import { LOGO_GRID, type LogoPieceId } from "@/lib/loader/logo-mark";
import { createLedUniforms, createLuminousGold } from "@/lib/loader/luminous-gold";

/** The DOM the intro hands over to, owned by the loading screen. */
export type IntroTargets = {
  /** The header logo the 3D logo lands on and becomes. */
  logo: RefObject<Element | null>;
  /** Header content that fades in as the logo travels. */
  reveal: RefObject<Element[]>;
  /** The charcoal layer behind the 3D logo. */
  backdrop: RefObject<HTMLElement | null>;
  /** The canvas wrapper, faded out at the hand-over. */
  canvas: RefObject<HTMLElement | null>;
};

type Props = {
  targets: IntroTargets;
  /** Called once the WebGL context exists; the timeline starts with it. */
  onReady: () => void;
  /** As the charcoal starts clearing: the page can begin its entrance. */
  onReveal: () => void;
  /** Once the header logo has taken over. */
  onFinish: () => void;
};

const FOV = 30;
/** Just below the logo's lowest edge (-3.5) plus room to float. */
const FLOOR_Y = -4.5;

/** Animated state of one piece, written by GSAP and read every frame. */
type PieceState = { path: number; settle: number; rx: number; ry: number; rz: number };

/**
 * The Infinity monogram assembling from four independent pieces: they turn a
 * full 360° along curved paths and lock into the exact logo, an LED light
 * runs across its edges, then it travels into the header and becomes the
 * header logo. The canvas is transparent so the page shows around it.
 */
export function InfinityLogoScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: FOV, position: [0, 0, 20] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Neutral keeps the brand yellow from shifting toward orange.
        gl.toneMapping = NeutralToneMapping;
        props.onReady();
      }}
    >
      <ambientLight intensity={0.45} color="#fff4e0" />
      <directionalLight position={[5, 8, 9]} intensity={2.8} color="#fff3e0" />
      <directionalLight position={[-8, 1, 6]} intensity={0.4} />
      {/* Golden rim from behind, separating the edges from the background. */}
      <directionalLight position={[-3, 5, -10]} intensity={2} color="#ffcf7a" />

      {/* Warm studio reflections from soft panels, rendered locally (no HDR download). */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fff1d6" position={[0, 6, 4]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#ffd79a" position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 10, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[7, 0, -2]} rotation-y={-Math.PI / 2} scale={[6, 10, 1]} />
      </Environment>

      <Assembly {...props} />
    </Canvas>
  );
}

/** Camera framing, written by GSAP and read every frame: 0 = intro, 1 = header. */
type Rig = { flight: number; x: number; y: number; size: number };

function Assembly({ targets, onReveal, onFinish }: Props) {
  // LED trails follow the flight of the pieces, then switch off as they settle.
  const [trails, setTrails] = useState(true);

  const scene = useMemo(() => {
    const led = createLedUniforms();
    const float = { value: 1 };
    const pieces = LOGO_PIECE_IDS.map((id) => {
      const pulse = { value: 0 };
      const motion = CHOREOGRAPHY[id];
      const state: PieceState = {
        path: 0,
        settle: 0,
        rx: motion.rotation[0],
        ry: motion.rotation[1],
        rz: motion.rotation[2],
      };
      return { id, motion, state, pulse, ...createLogoPiece(id), material: createLuminousGold(led, pulse) };
    });
    const rig: Rig = { flight: 0, x: 0, y: 0, size: 0 };
    return {
      led,
      float,
      pieces,
      rig,
      floorShadow: createFloorShadow(),
    };
  }, []);

  useEffect(
    () => () => {
      for (const piece of scene.pieces) {
        piece.geometry.dispose();
        piece.material.dispose();
      }
      scene.floorShadow.map?.dispose();
      scene.floorShadow.dispose();
    },
    [scene],
  );

  // The whole intro, from first frame to the header hand-over, lives on one
  // GSAP timeline, created once and killed on unmount.
  useLayoutEffect(() => {
    const { led, float, pieces, rig, floorShadow } = scene;
    const tl = gsap.timeline({ onComplete: onFinish });

    for (const { motion, state, pulse } of pieces) {
      const [tx, ty, tz] = motion.turns;
      // Moving from the first frame, along a curve, each at its own pace.
      tl.to(state, { path: 1, duration: at(motion.travel[1] - motion.travel[0]), ease: "power2.out" }, at(motion.travel[0]));
      // The full 360° turn: fast out of the gate, resolving front-facing.
      tl.to(state, { rx: tx, ry: ty, rz: tz, duration: at(motion.resolve), ease: "power2.out" }, 0);
      // Magnetic snap: the depth layers collapse onto the logo plane.
      const snapEnd = at(motion.snap + SNAP);
      tl.to(state, { settle: 1, duration: at(SNAP), ease: "power3.inOut" }, at(motion.snap));
      // A brief LED flash as the piece connects.
      tl.to(pulse, { value: 1, duration: 0.05, ease: "power2.out" }, snapEnd - 0.03);
      tl.to(pulse, { value: 0, duration: 0.25, ease: "power2.out" }, snapEnd + 0.02);
    }

    tl.to(float, { value: 0, duration: at(75 - 30), ease: "power2.inOut" }, at(30));
    tl.call(() => setTrails(false), [], at(82));

    // Complete: the edges light up, one LED sweep crosses the logo.
    tl.to(led.glow, { value: 1, duration: 0.25, ease: "power2.out" }, at(90));
    tl.fromTo(led.sweep, { value: -5 }, { value: 5, duration: 0.4, ease: "power1.inOut" }, ASSEMBLY - 0.1);
    tl.fromTo(led.sparkle, { value: 1 }, { value: 0, duration: 0.4, ease: "power2.in" }, ASSEMBLY - 0.1);

    // After a short hold the logo travels into the header: the camera
    // re-frames until the logo's front face covers the header logo's box,
    // while the charcoal clears and the header content fades in.
    const fly = ASSEMBLY + HOLD;
    const logo = targets.logo.current;
    if (logo) {
      tl.call(
        () => {
          const box = logo.getBoundingClientRect();
          gsap.set(rig, { x: box.left + box.width / 2, y: box.top + box.height / 2, size: box.height });
        },
        [],
        fly,
      );
      tl.to(rig, { flight: 1, duration: FLIGHT, ease: "power3.inOut" }, fly);
    }
    tl.to(floorShadow, { opacity: 0, duration: FLIGHT * 0.4, ease: "power2.out" }, fly);
    tl.to(targets.backdrop.current, { autoAlpha: 0, duration: FLIGHT * 0.8, ease: "power2.inOut" }, fly + FLIGHT * 0.1);
    tl.call(onReveal, [], fly + FLIGHT * 0.1);
    tl.to(targets.reveal.current, { autoAlpha: 1, y: 0, duration: FLIGHT * 0.6, stagger: 0.04, ease: "power2.out" }, fly + FLIGHT * 0.4);
    // The hand-over: the header logo appears exactly under the 3D one, then the canvas goes.
    tl.to(logo, { autoAlpha: 1, duration: 0.1, ease: "none" }, fly + FLIGHT - 0.1);
    tl.to(targets.canvas.current, { autoAlpha: 0, duration: 0.1, ease: "none" }, fly + FLIGHT - 0.02);

    return () => {
      tl.kill();
    };
  }, [scene, targets, onReveal, onFinish]);

  return (
    <group>
      <CameraRig rig={scene.rig} />
      {scene.pieces.map((piece) => (
        <Piece key={piece.id} piece={piece} float={scene.float} trail={trails} />
      ))}
      {/* A soft shadow on the floor under the logo. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y + 0.01, 0]} scale={[11, 3.5, 1]} material={scene.floorShadow}>
        <planeGeometry />
      </mesh>
    </group>
  );
}

/** A soft radial shadow painted onto the floor (no extra render pass). */
function createFloorShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.45, "rgba(0, 0, 0, 0.4)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return new MeshBasicMaterial({ map, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
}

type PieceProps = {
  piece: {
    id: LogoPieceId;
    motion: PieceMotion;
    state: PieceState;
    home: Vector3;
    geometry: BufferGeometry;
    material: Material;
  };
  float: { value: number };
  trail: boolean;
};

const corner = new Vector3();
const euler = new Euler();

function Piece({ piece, float, trail }: PieceProps) {
  const { motion, state, home } = piece;
  const group = useRef<Group>(null);
  const anchor = useRef<Object3D>(null!);

  // Where the piece and its trail anchor are at the start, so the trail starts there.
  const initial = useMemo(() => {
    const position = new Vector3(...motion.start);
    const rotation = new Euler(...motion.rotation);
    const trailAnchor = new Vector3(...motion.trailAnchor).applyEuler(rotation).add(position);
    return { position, rotation, trailAnchor };
  }, [motion]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { path: u, settle } = state;
    const iu = 1 - u;
    // Quadratic Bézier: start → via → final X/Y in the piece's own depth layer.
    const bezier = (a: number, b: number, c: number) => iu * iu * a + 2 * iu * u * b + u * u * c;
    const t = performance.now() / 1000;
    const f = float.value;
    g.position.set(
      bezier(motion.start[0], motion.via[0], home.x) + 0.08 * f * Math.sin(t * 0.9 + motion.float),
      bezier(motion.start[1], motion.via[1], home.y) + 0.14 * f * Math.sin(t * 1.3 + motion.float),
      bezier(motion.start[2], motion.via[2], motion.layer) * (1 - settle),
    );
    g.rotation.set(state.rx, state.ry, state.rz);

    corner.set(...motion.trailAnchor).applyEuler(euler.copy(g.rotation)).add(g.position);
    anchor.current.position.copy(corner);
  });

  return (
    <>
      <group ref={group} position={initial.position} rotation={initial.rotation}>
        <mesh geometry={piece.geometry} material={piece.material} />
      </group>
      <object3D ref={anchor} position={initial.trailAnchor} />
      {trail && (
        <Trail target={anchor} width={0.35} length={5} decay={1} color="#ffc65a" attenuation={(w) => w * w} />
      )}
    </>
  );
}

const ELEVATION = 0.07;
/** The logo's front face, which is what lands on the header logo. */
const FRONT = 0.5;
/**
 * Size of the whole intro scene relative to its original framing. The camera
 * stands back by 1 / LOGO_SCALE, so every piece, path, trail and shadow
 * shrinks together; the landing in the header is sized separately (by the
 * header logo) and is unaffected.
 */
const LOGO_SCALE = 0.7;

/**
 * Lens shift (px) that puts the assembled logo's projected bounding box (all
 * eight corners, front and back faces) exactly at the centre of the canvas,
 * which fills the viewport. It cancels the slight perspective offset of the
 * camera's downward tilt.
 */
function centreShift(distance: number, width: number, height: number) {
  const camera = new PerspectiveCamera(FOV, width / height, 0.1, 1000);
  camera.position.set(0, ELEVATION * distance, distance);
  camera.rotation.set(-Math.atan(ELEVATION), 0, 0);
  camera.updateMatrixWorld();
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  const half = LOGO_GRID / 2;
  for (const x of [-half, half])
    for (const y of [-half, half])
      for (const z of [-FRONT, FRONT]) {
        const p = new Vector3(x, y, z).project(camera);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
  return { x: ((minX + maxX) / 4) * width, y: (-(minY + maxY) / 4) * height };
}

/**
 * Responsive framing and the flight to the header. During the intro the
 * logo is ~26% of the viewport tall (LOGO_SCALE of the original ~37%) and
 * exactly centred in it on every screen (a lens shift, so the camera still
 * looks straight at it); the pieces assemble around that centre. In flight the tilt resolves, the
 * camera backs off until the front face is exactly the header logo's height,
 * and the lens shift moves it onto the header logo's centre: it lands
 * front-facing, pixel-aligned.
 */
function CameraRig({ rig }: { rig: Rig }) {
  const { width, height } = useThree((s) => s.size);

  const wide = width >= 768;
  const aspect = width / Math.max(1, height);
  const tan = Math.tan((FOV * Math.PI) / 360);
  const halfWidth = wide ? LOGO_GRID / (2 * 0.23) : 8.8;
  const distance = Math.max(halfWidth / (tan * aspect), (wide ? 7 : 7.5) / tan) / LOGO_SCALE;
  const centre = useMemo(() => centreShift(distance, width, height), [distance, width, height]);

  useFrame(({ camera }) => {
    const cam = camera as PerspectiveCamera;
    const f = rig.flight;
    const framed = 1 - f;
    const startGap = distance - FRONT;
    const endGap = rig.size > 0 ? (LOGO_GRID * height) / (2 * tan * rig.size) : startGap;
    // Log-interpolated, so the logo shrinks at a steady rate.
    const gap = startGap * Math.pow(endGap / startGap, f);
    cam.position.set(0, ELEVATION * distance * framed, FRONT + gap);
    cam.rotation.set(-Math.atan(ELEVATION) * framed, 0, 0);
    cam.setViewOffset(
      width,
      height,
      centre.x + (width / 2 - rig.x - centre.x) * f,
      centre.y + (height / 2 - rig.y - centre.y) * f,
      width,
      height,
    );
    cam.updateProjectionMatrix();
  });

  return null;
}
