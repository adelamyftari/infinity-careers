/**
 * The Infinity rise: the final scene's field of tiny official Infinity marks.
 *
 * At rest they are one dense, organic collection beneath TEAM, at many depths,
 * thickest toward the foot of the screen and thinning to an uneven top edge;
 * the upper half of the screen stays clear. The collection breathes a little.
 *
 * The pointer breaks it open. Every mark is a particle of its own (a resting
 * place, a position, a velocity, a turn and its own turning speed) held by a
 * spring with damping. Marks the pointer passes near are *excited*: their pull
 * home loosens, so they lift away, flow along with the movement and are drawn
 * after the pointer wherever it goes, up to the top corners of the screen;
 * a short-lived trail of the pointer's recent path keeps carrying a stream
 * behind it, so the flow does not stop when the cursor leaves the collection.
 * A circling pointer turns them in a soft swirl; a fast one reaches further.
 * Excitement fades over a few seconds, the springs tighten again, and the
 * collection gathers itself back, with inertia, never snapping.
 *
 * Close marks keep a little apart (a light repulsion over a spatial hash), and
 * marks that pass over the headline are dimmed so it stays readable. The
 * travelling mark pushes through the field as it falls, its landing sends a
 * soft wave out through it, and then it is one of them (the `hero` particle,
 * drawn by its own mesh).
 *
 * Integration is time-step aware (substeps, clamped steps), on the CPU; the
 * result goes to the GPU as two per-instance attributes, drawn in one call
 * from one shared copy of the official logo. The layout is seeded and framed
 * through the final camera.
 */
import {
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LOGO_BRAND_COLOR, LOGO_GRID } from "@/lib/loader/logo-mark";

type Piece = { geometry: BufferGeometry; home: Vector3 };

export type FieldOptions = {
  /** The camera as it stands for the final frame. */
  camera: PerspectiveCamera;
  /** The canvas's size in CSS pixels. */
  width: number;
  height: number;
  count: number;
  /** A phone or a narrow screen: smaller marks, gentler movement. */
  compact: boolean;
  /** The collection's top edge at rest, in normalised device coordinates (−1 is the foot of the screen). */
  top: number;
  /** The headline and the button (marks passing over them are dimmed), in normalised device coordinates. */
  quiet: { x: number; y: number; rx: number; ry: number };
  /** Where the travelling mark comes to rest, on screen (normalised device coordinates), and its depth. */
  landing: { x: number; y: number; z: number };
  /** Its size on screen once it is one of them, in pixels. */
  landingSize: number;
};

/** The pointer, in normalised device coordinates, and whether it is over the scene. */
export type FieldPointer = { x: number; y: number; on: boolean };
/** Something moving through the field that pushes it (the falling mark). */
export type FieldMover = { position: Vector3; velocity: Vector3 };

/** Warm ivory most, a little warmer and cooler ivory, Infinity Yellow as the accent. */
const IVORY = ["#f7f7f2", "#f7f7f2", "#f7f7f2", "#f7f7f2", "#efe9da", "#e4e6df"].map((c) => new Color(c));
const YELLOW = [new Color(LOGO_BRAND_COLOR), new Color("#e9ae00")];
const PETROL = new Color("#102f32");

// The motion (screen units: one = half the screen's height; seconds). Forces are scaled to each mark's depth.
const STEP = 1 / 90;
const MAX_DT = 1 / 20;
/** How near the pointer has to pass to stir a mark, and how much further a fast pointer reaches. */
const REACH = 0.26;
const REACH_FAST = 0.1;
/** Stirred marks: flow along with the pointer, lift, and are drawn after it. */
const FLOW = 5.5;
const LIFT = 1.6;
const FOLLOW = 10;
const FOLLOW_REACH = 0.7;
const SWIRL = 2.6;
const DEPTH_PUSH = 1.2;
/** The trail of the pointer's recent path: how long a point of it lasts, how far it reaches, how hard it carries. */
const TRAIL_LIFE = 0.9;
const TRAIL_REACH = 0.2;
const TRAIL_FLOW = 3.2;
/** How fast excitement builds and fades (per second): about three seconds to gather back. */
const EXCITE = 5;
/** The landing's strike (on screen, in half-heights): how far it reaches, how hard it throws out, and up. */
const IMPACT_REACH = 0.17;
const IMPACT_PUSH = 0.95;
const IMPACT_LIFT = 0.8;
const CALM = 0.55;
/** Close marks keep a little apart. */
const SPACING = 0.022;
const REPEL = 9;

const vertexShader = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aRot;
attribute float aSize;
attribute vec3 aColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec4 uQuiet;
varying vec3 vColor;
varying vec3 vNormal;
varying float vFog;
mat3 turn(vec3 a) {
  vec3 c = cos(a);
  vec3 s = sin(a);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, c.x, s.x, 0.0, -s.x, c.x);
  mat3 ry = mat3(c.y, 0.0, -s.y, 0.0, 1.0, 0.0, s.y, 0.0, c.y);
  mat3 rz = mat3(c.z, s.z, 0.0, -s.z, c.z, 0.0, 0.0, 0.0, 1.0);
  return rz * ry * rx;
}
void main() {
  mat3 r = turn(aRot);
  vec4 mv = modelViewMatrix * vec4(aPos + r * (position * aSize), 1.0);
  vNormal = normalize(normalMatrix * (r * normal));
  vColor = aColor;
  gl_Position = projectionMatrix * mv;
  // Further away: sinking into the petrol. Over the headline and the button: dimmed, so the text stays clear.
  vec2 ndc = gl_Position.xy / gl_Position.w;
  vec2 q = (ndc - uQuiet.xy) / uQuiet.zw;
  float over = 1.0 - smoothstep(0.6, 1.05, length(q));
  vFog = max(smoothstep(uFogNear, uFogFar, -mv.z), over * 0.62);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uFogColor;
varying vec3 vColor;
varying vec3 vNormal;
varying float vFog;
void main() {
  vec3 n = normalize(vNormal);
  // Matte, soft light, mostly from the front and a little above: faces in their own colour, thin sides darker.
  float light = 0.58 + 0.1 * (0.5 + 0.5 * n.y) + 0.34 * max(dot(n, normalize(vec3(-0.3, 0.5, 1.0))), 0.0);
  gl_FragColor = vec4(mix(vColor * light, uFogColor, vFog * 0.75), 1.0);
}
`;

type Mark = {
  rest: Vector3;
  phase: Vector3;
  rate: Vector3;
  breath: number;
  stiffness: number;
  damping: number;
  spin: Vector3;
  spinRate: Vector3;
  size: number;
  /** Scene units per screen unit (half the screen's height) at its resting depth. */
  scale: number;
  /** Its own response: how readily it lifts, how closely it follows. */
  share: number;
  p: Vector3;
  v: Vector3;
  a: Vector3;
  w: Vector3;
  excite: number;
  /** Where it is on screen this frame (normalised device coordinates). */
  sx: number;
  sy: number;
};

type TrailPoint = { x: number; y: number; vx: number; vy: number; time: number };

export function createField(pieces: Piece[]) {
  // One merged copy of the official mark, one unit high, its thickness slimmed to a hint of depth.
  const parts = pieces.map(({ geometry, home }) => {
    const g = geometry.clone();
    g.translate(home.x, home.y, home.z);
    g.scale(1 / LOGO_GRID, 1 / LOGO_GRID, 0.4 / LOGO_GRID);
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    return g;
  });
  const mark = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  mark.computeVertexNormals();

  const shown = { r: 0, g: 0, b: 0 };
  const fog = PETROL.getRGB(shown, SRGBColorSpace);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFogNear: { value: 1.7 },
      uFogFar: { value: 4.2 },
      uFogColor: { value: new Vector3(fog.r, fog.g, fog.b) },
      uQuiet: { value: [0, 0, 1, 1] },
    },
  });
  let mesh: Mesh | null = null;
  let geometry: InstancedBufferGeometry | null = null;
  let posAttr: InstancedBufferAttribute | null = null;
  let rotAttr: InstancedBufferAttribute | null = null;
  let marks: Mark[] = [];
  let hero: Mark | null = null;
  let tanHalf = 0.29;
  let camZ = 1.7;
  let aspect = 1;
  let gentle = 1;

  // The pointer on screen: where it is, its velocity (smoothed), how fast its direction turns, its recent path.
  let hasPointer = false;
  let px = 0;
  let py = 0;
  let lastX = 0;
  let lastY = 0;
  let vx = 0;
  let vy = 0;
  let turnRate = 0;
  const trail: TrailPoint[] = [];
  let lastTrail = -1;
  let lastTime = -1;
  let shock: { at: Vector3; time: number; strength: number } | null = null;
  const tmp = new Vector3();
  const force = new Vector3();
  const home = new Vector3();
  const ndc = new Vector3();
  const grid = new Map<number, number[]>();
  const push = new Vector2();

  const halfHeightAt = (z: number) => Math.max(0.05, (camZ - z) * tanHalf);

  /** Its resting place, breathing a little. */
  const restAt = (m: Mark, time: number, out: Vector3) => {
    const b = m.breath;
    return out.set(
      m.rest.x + b * Math.sin(time * m.rate.x + m.phase.x),
      m.rest.y + b * 0.8 * Math.sin(time * m.rate.y + m.phase.y) + m.scale * 0.006 * Math.sin(m.rest.x * 3.1 + time * 0.5),
      m.rest.z + b * 1.6 * Math.sin(time * m.rate.z + m.phase.z),
    );
  };

  const integrate = (m: Mark, time: number, dt: number, pointerOn: boolean, mover: FieldMover | null) => {
    const s = m.scale;
    // Excited, its pull home loosens (it is free to travel); calm, it is held in the collection.
    const free = m.excite * m.excite;
    restAt(m, time, home);
    force
      .copy(home)
      .sub(m.p)
      .multiplyScalar(m.stiffness * (1 - 0.9 * free))
      .addScaledVector(m.v, -m.damping * (1 - 0.45 * free));
    const speed = Math.hypot(vx * aspect, vy);
    if (pointerOn) {
      // On screen, in screen units (x corrected for the aspect ratio): how far from the pointer.
      const dx = (m.sx - px) * aspect;
      const dy = m.sy - py;
      const d = Math.hypot(dx, dy);
      const reach = REACH + REACH_FAST * Math.min(2, speed);
      const near = Math.exp(-((d / reach) ** 2)) * m.share;
      if (near > 0.002) {
        // Stirred: flow along with the movement, a lift, depth as it rises or falls …
        force.x += near * FLOW * vx * aspect * s * gentle;
        force.y += near * (FLOW * vy + LIFT * Math.min(2, speed)) * s * gentle;
        force.z += near * DEPTH_PUSH * (vy * 0.7 + speed * 0.3) * s;
        // … and a soft swirl around a circling pointer.
        const sw = (near * SWIRL * Math.max(-6, Math.min(6, turnRate)) * Math.min(1.5, speed) * s) / Math.max(0.05, d);
        force.x += -dy * sw * 0.5;
        force.y += dx * sw * 0.5;
        m.excite = Math.min(1, m.excite + near * EXCITE * Math.min(1.5, speed + 0.15) * dt);
        m.w.x += near * vy * 5 * dt;
        m.w.y += near * vx * 5 * dt;
        m.w.z += near * (vx - vy) * 2.5 * dt;
      }
      // Excited marks are drawn after the pointer wherever it goes (each by its own measure).
      if (m.excite > 0.05 && speed > 0.03) {
        const far = Math.exp(-((d / FOLLOW_REACH) ** 2));
        const pull = FOLLOW * m.excite * far * m.share * Math.min(1, speed * 1.5) * gentle;
        force.x += -dx * pull * s;
        force.y += -dy * pull * s;
      }
    }
    // The trail: the pointer's recent path keeps carrying a stream behind it.
    for (const t of trail) {
      const age = time - t.time;
      if (age > TRAIL_LIFE || age < 0) continue;
      const dx = (m.sx - t.x) * aspect;
      const dy = m.sy - t.y;
      const w = Math.exp(-((dx * dx + dy * dy) / (TRAIL_REACH * TRAIL_REACH))) * (1 - age / TRAIL_LIFE) ** 2 * m.share;
      if (w < 0.002) continue;
      force.x += w * TRAIL_FLOW * t.vx * aspect * s * gentle;
      force.y += w * TRAIL_FLOW * t.vy * s * gentle;
      m.excite = Math.min(1, m.excite + w * Math.hypot(t.vx * aspect, t.vy) * 3 * dt);
    }
    if (mover) {
      tmp.copy(m.p).sub(mover.position);
      const d = tmp.length() / s;
      const w = Math.exp(-((d / 0.2) ** 2));
      if (w > 0.002) {
        force.addScaledVector(mover.velocity, w * 1.4);
        force.addScaledVector(tmp, (w * mover.velocity.length() * 0.7) / Math.max(1e-4, d * s));
      }
    }
    if (shock) {
      // A soft wave out from the landing.
      const age = time - shock.time;
      if (age < 2.4) {
        tmp.copy(m.p).sub(shock.at);
        const d = tmp.length();
        const ring = Math.exp(-(((d - age * 1.1) / 0.14) ** 2)) * Math.exp(-age * 1.6) * (1 / (1 + d * 2));
        if (ring > 0.002) force.addScaledVector(tmp, (ring * 2.2 * shock.strength * s) / Math.max(1e-3, d));
      }
    }
    m.excite *= Math.exp(-CALM * dt);
    m.v.addScaledVector(force, dt);
    // Never flung: a ceiling on speed.
    const cap = 3.2 * s;
    const sp = m.v.length();
    if (sp > cap) m.v.multiplyScalar(cap / sp);
    m.p.addScaledVector(m.v, dt);
    // Turning: it tumbles a little as it travels, springing back to its own slow tumble, damped.
    m.w.x += (m.v.y / s) * 0.35 * dt + (-3 * m.a.x - 1.7 * m.w.x) * dt;
    m.w.y += (m.v.x / s) * 0.35 * dt + (-3 * m.a.y - 1.7 * m.w.y) * dt;
    m.w.z += (-3 * m.a.z - 1.7 * m.w.z) * dt;
    m.a.addScaledVector(m.w, dt);
  };

  /** Close marks keep a little apart: a light push over a spatial hash (on screen, per frame). */
  const separate = (dt: number) => {
    grid.clear();
    const cell = SPACING * 2;
    const key = (cx: number, cy: number) => (cx + 2048) * 4096 + (cy + 2048);
    marks.forEach((m, i) => {
      if (m.excite < 0.08) return; // the resting collection is allowed its overlaps
      const k = key(Math.floor((m.sx * aspect) / cell), Math.floor(m.sy / cell));
      const bucket = grid.get(k);
      if (bucket) bucket.push(i);
      else grid.set(k, [i]);
    });
    grid.forEach((bucket, k) => {
      const cx = Math.floor(k / 4096) - 2048;
      const cy = (k % 4096) - 2048;
      for (const i of bucket) {
        const a = marks[i];
        push.set(0, 0);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const other = grid.get(key(cx + ox, cy + oy));
            if (!other) continue;
            for (const j of other) {
              if (j === i) continue;
              const b = marks[j];
              const dx = (a.sx - b.sx) * aspect;
              const dy = a.sy - b.sy;
              const d2 = dx * dx + dy * dy;
              if (d2 > SPACING * SPACING || d2 < 1e-10) continue;
              const d = Math.sqrt(d2);
              const f = (1 - d / SPACING) / d;
              push.x += dx * f;
              push.y += dy * f;
            }
          }
        }
        a.v.x += push.x * REPEL * a.scale * dt;
        a.v.y += push.y * REPEL * a.scale * dt;
      }
    });
  };

  const project = (camera: PerspectiveCamera) => {
    for (const m of marks) {
      ndc.copy(m.p).project(camera);
      m.sx = ndc.x;
      m.sy = ndc.y;
    }
    if (hero) {
      ndc.copy(hero.p).project(camera);
      hero.sx = ndc.x;
      hero.sy = ndc.y;
    }
  };

  const write = (time: number) => {
    if (!posAttr || !rotAttr) return;
    const pos = posAttr.array as Float32Array;
    const rot = rotAttr.array as Float32Array;
    marks.forEach((m, i) => {
      pos[i * 3] = m.p.x;
      pos[i * 3 + 1] = m.p.y;
      pos[i * 3 + 2] = m.p.z;
      rot[i * 3] = m.spin.x + 0.18 * Math.sin(time * m.spinRate.x + m.phase.y) + m.a.x;
      rot[i * 3 + 1] = m.spin.y + 0.18 * Math.sin(time * m.spinRate.y + m.phase.z) + m.a.y;
      rot[i * 3 + 2] = m.spin.z + 0.12 * Math.sin(time * m.spinRate.z + m.phase.x) + m.a.z;
    });
    posAttr.needsUpdate = true;
    rotAttr.needsUpdate = true;
  };

  const settle = () => {
    for (const m of [...marks, ...(hero ? [hero] : [])]) {
      m.p.copy(m.rest);
      m.v.set(0, 0, 0);
      m.a.set(0, 0, 0);
      m.w.set(0, 0, 0);
      m.excite = 0;
    }
    shock = null;
    trail.length = 0;
    lastTrail = -1;
    lastTime = -1;
    hasPointer = false;
    vx = vy = turnRate = 0;
  };

  return {
    /** Places the collection (seen through the final camera); returns where the travelling mark comes to rest and its size there. */
    build(parent: Object3D, o: FieldOptions) {
      mesh?.removeFromParent();
      geometry?.dispose();
      const cam = o.camera;
      tanHalf = Math.tan(((cam.fov / 2) * Math.PI) / 180);
      camZ = cam.position.z;
      aspect = o.width / o.height;
      gentle = o.compact ? 0.75 : 1;
      material.uniforms.uQuiet.value = [o.quiet.x, o.quiet.y, o.quiet.rx, o.quiet.ry];
      const dir = new Vector3();
      const at = (nx: number, ny: number, z: number) => {
        dir.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
        return cam.position.clone().addScaledVector(dir, (z - cam.position.z) / dir.z);
      };
      /** Scene units per CSS pixel at depth z. */
      const unit = (z: number) => (2 * halfHeightAt(z)) / o.height;
      let seed = 20261110;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      // The collection's top edge: uneven, a little higher toward the sides.
      const edge = (nx: number) => o.top + 0.07 * Math.sin(nx * 2.6 + 0.9) + 0.04 * Math.sin(nx * 6.7 + 2.3) + 0.025 * Math.sin(nx * 14.1) + 0.06 * Math.abs(nx) ** 2;

      const make = (p: Vector3, px: number): Mark => {
        const s = halfHeightAt(p.z);
        return {
          rest: p.clone(),
          phase: new Vector3(rand() * 6.28, rand() * 6.28, rand() * 6.28),
          rate: new Vector3(0.25 + rand() * 0.45, 0.2 + rand() * 0.4, 0.15 + rand() * 0.35),
          breath: (0.004 + rand() * 0.008) * s,
          stiffness: 2.2 + rand() * 1.6,
          damping: 1.7 + rand() * 0.6,
          spin: new Vector3((rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, (rand() - 0.5) * 1.4),
          spinRate: new Vector3(0.2 + rand() * 0.4, 0.15 + rand() * 0.35, 0.12 + rand() * 0.3),
          size: px * unit(p.z),
          scale: s,
          share: 0.55 + rand() * 0.75,
          p: p.clone(),
          v: new Vector3(),
          a: new Vector3(),
          w: new Vector3(),
          excite: 0,
          sx: 0,
          sy: 0,
        };
      };

      marks = [];
      const colours: Color[] = [];
      for (let i = 0; i < o.count; i++) {
        const nx = rand() * 2.16 - 1.08;
        const top = edge(nx);
        // Thickest toward the foot, thinning to the edge; a few strays just above it.
        const u = rand();
        const ny = rand() < 0.05 ? top + rand() * 0.08 : -1.06 + (top + 1.06) * (1 - Math.sqrt(1 - u)) ** 1.25;
        // Depth: mostly the middle ground, some further back, a few nearer.
        const r = rand();
        const z = r < 0.55 ? -0.9 + rand() * 1.0 : r < 0.9 ? -2.0 + rand() * 1.1 : 0.1 + rand() * 0.45;
        const far = z < -0.9;
        const px = (far ? 5 + rand() * 3 : 6 + rand() ** 1.4 * 6) * (o.compact ? 0.85 : 1);
        const yellow = rand() < 0.13;
        colours.push(yellow ? YELLOW[Math.floor(rand() * YELLOW.length)] : IVORY[Math.floor(rand() * IVORY.length)]);
        marks.push(make(at(nx, ny, z), px));
      }
      const count = marks.length;

      // The travelling mark, once landed: one of them.
      const landing = at(o.landing.x, o.landing.y, o.landing.z);
      hero = make(landing, o.landingSize);

      geometry = new InstancedBufferGeometry();
      geometry.index = mark.index;
      geometry.setAttribute("position", mark.getAttribute("position"));
      geometry.setAttribute("normal", mark.getAttribute("normal"));
      posAttr = new InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
      rotAttr = new InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
      const sizes = new Float32Array(count);
      const tints = new Float32Array(count * 3);
      marks.forEach((m, i) => {
        sizes[i] = m.size;
        const c = colours[i].getRGB(shown, SRGBColorSpace);
        tints.set([c.r, c.g, c.b], i * 3);
      });
      geometry.setAttribute("aPos", posAttr);
      geometry.setAttribute("aRot", rotAttr);
      geometry.setAttribute("aSize", new InstancedBufferAttribute(sizes, 1));
      geometry.setAttribute("aColor", new InstancedBufferAttribute(tints, 3));
      geometry.instanceCount = count;
      mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      parent.add(mesh);
      settle();
      write(0);
      return { landing, size: hero.size };
    },
    /** Shows or hides the whole field (it is not drawn while the benefits are on screen). */
    show(on: boolean) {
      if (mesh) mesh.visible = on;
    },
    /**
     * The landing: the travelling mark strikes the collection with the speed it falls at. Around
     * the point, each mark is struck at once (more the nearer it lies, each by its own measure):
     * those beneath pressed down, those beside thrown up and out, all set tumbling, their hold
     * on their place loosened for a while so they travel before they settle (2-4 seconds); a wave
     * runs on out through the rest. The travelling mark then joins the field where it stands.
     */
    land(position: Vector3, velocity: Vector3, time: number, camera: PerspectiveCamera) {
      const strength = Math.min(1.6, Math.max(0.5, velocity.length() / halfHeightAt(position.z) / 2.4));
      shock = { at: position.clone(), time, strength };
      ndc.copy(position).project(camera);
      for (const m of marks) {
        const dx = (m.sx - ndc.x) * aspect;
        const dy = m.sy - ndc.y;
        const d = Math.hypot(dx, dy);
        const near = Math.exp(-((d / IMPACT_REACH) ** 2));
        const w = near + 0.3 * Math.exp(-((d / (IMPACT_REACH * 2.4)) ** 2));
        if (w < 0.01) continue;
        // Its own measure, the same every time (from its phases): a few of them fly farther.
        const own = (k: number) => {
          const v = Math.sin(m.phase.x * 12.9898 + m.phase.y * 78.233 + k * 37.719) * 43758.5453;
          return v - Math.floor(v);
        };
        const energy = strength * (0.55 + 0.9 * own(1) ** 2) * m.share;
        const ux = d > 1e-4 ? dx / d : 0;
        const uy = d > 1e-4 ? dy / d : 1;
        const push = IMPACT_PUSH * w * energy;
        const lift = (uy > -0.35 ? 1 : -0.8) * IMPACT_LIFT * near * energy;
        m.v.x += ux * push * m.scale;
        m.v.y += (uy * push + lift) * m.scale;
        m.v.z += (own(2) - 0.5) * push * 0.8 * m.scale;
        m.w.x += (own(3) - 0.5) * 9 * near * energy;
        m.w.y += (own(4) - 0.5) * 9 * near * energy;
        m.w.z += (own(5) - 0.5) * 12 * near * energy;
        m.excite = Math.max(m.excite, Math.min(0.62, near * 0.75 * strength));
      }
      if (hero) {
        hero.rest.copy(position);
        hero.p.copy(position);
        hero.v.copy(velocity).multiplyScalar(0.3);
        hero.a.set(0, 0, 0);
        hero.w.set(0, 0, 0);
        hero.excite = 0;
      }
    },
    /** The travelling mark as one of the field: where it is now (after `land`). */
    heroPosition(out: Vector3) {
      return hero ? out.copy(hero.p) : out;
    },
    /** Its turn as the field moves it (what moved it, on top of its own slow tumble). */
    heroTurn(time: number, out: Vector3) {
      if (!hero) return out.set(0, 0, 0);
      return out.set(hero.a.x + 0.12 * Math.sin(time * hero.spinRate.x), hero.a.y + 0.12 * Math.sin(time * hero.spinRate.y), hero.a.z);
    },
    /**
     * Runs the field on to `time` (seconds): the pointer (seen through `camera`)
     * moves it when `interactive`; a `mover` pushes it; once `landed`, the
     * travelling mark moves as one of them.
     */
    update(time: number, camera: PerspectiveCamera, p: FieldPointer | null, interactive: boolean, mover: FieldMover | null, landed: boolean) {
      const dt = lastTime < 0 ? 0 : Math.min(MAX_DT, Math.max(0, time - lastTime));
      lastTime = time;
      if (dt <= 0) return write(time);
      const pointerOn = !!(p && p.on && interactive);
      if (pointerOn && p) {
        if (hasPointer) {
          // Velocity on screen (normalised device units per second), smoothed; how fast its direction turns.
          const ease = 1 - Math.exp(-dt * 14);
          const before = Math.atan2(vy, vx * aspect);
          vx += ((p.x - lastX) / dt - vx) * ease;
          vy += ((p.y - lastY) / dt - vy) * ease;
          let turned = Math.atan2(vy, vx * aspect) - before;
          if (turned > Math.PI) turned -= Math.PI * 2;
          if (turned < -Math.PI) turned += Math.PI * 2;
          const speed = Math.hypot(vx * aspect, vy);
          turnRate += ((speed > 0.15 ? turned / dt : 0) - turnRate) * (1 - Math.exp(-dt * 5));
          // A flick never throws the whole field (both components alike: the direction is kept).
          const limit = 3.2;
          if (speed > limit) {
            vx *= limit / speed;
            vy *= limit / speed;
          }
        }
        lastX = px = p.x;
        lastY = py = p.y;
        hasPointer = true;
        // The trail: a point of the path every ~40ms while it moves.
        if (Math.hypot(vx * aspect, vy) > 0.1 && time - lastTrail > 0.04) {
          trail.push({ x: px, y: py, vx, vy, time });
          lastTrail = time;
          if (trail.length > 24) trail.shift();
        }
      } else {
        hasPointer = false;
        vx *= Math.exp(-dt * 6);
        vy *= Math.exp(-dt * 6);
        turnRate *= Math.exp(-dt * 4);
      }
      while (trail.length && time - trail[0].time > TRAIL_LIFE) trail.shift();

      project(camera);
      separate(dt);
      let left = dt;
      while (left > 1e-6) {
        const h = Math.min(STEP, left);
        const t = time - left + h;
        for (const m of marks) integrate(m, t, h, pointerOn, mover);
        if (hero && landed) integrate(hero, t, h, pointerOn, null);
        left -= h;
      }
      write(time);
    },
    /** Back to rest (when the visitor runs the drop back up). */
    reset: settle,
    dispose() {
      geometry?.dispose();
      mark.dispose();
      material.dispose();
    },
  };
}
