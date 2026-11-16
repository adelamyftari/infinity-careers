/**
 * The Golden Infinity Flow: a stream of a few very fine illuminated filaments
 * along one curve through all three benefits, led by the Infinity mark. Each
 * filament is a hairline (a native WebGL line: one device pixel), held close to
 * its neighbours in a slowly turning silk band; they gather to a point at the
 * mark and fan out a little behind it, so the mark leads and the flow trails.
 *
 * Light is selective: each filament has its own strength, sparse glints travel
 * along it as the page scrolls, and the strands brighten only near the mark.
 * Brand gold on petrol; a deeper gold while it is drawn over the warm white.
 *
 * The geometry is built once per layout. Scrolling changes uniforms only: where
 * the mark is (the head), where the flow begins (the tail, which closes up at
 * the end), and its opacity. Depth tested, so the letters hide what passes
 * behind them; it never writes depth, so filaments never hide one another.
 */
import { BufferAttribute, BufferGeometry, LineSegments, NormalBlending, ShaderMaterial, Vector3, type CatmullRomCurve3, type Object3D } from "three";

const vertexShader = /* glsl */ `
attribute vec3 offset;
attribute float along;
attribute float seed;
uniform float uHead;
uniform float uGather;
varying float vAlong;
varying float vSeed;
varying float vBehind;
void main() {
  float d = uHead - along;
  // The filaments meet at the mark and open out behind it.
  float spread = mix(0.08, 1.0, smoothstep(0.0, uGather, d));
  vec3 p = position + offset * spread;
  vAlong = along;
  vSeed = seed;
  vBehind = d;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uHead;
uniform float uTail;
uniform float uOpacity;
uniform float uLength;
uniform float uLight;
uniform vec3 uGold;
uniform vec3 uGlint;
uniform vec3 uDeep;
varying float vAlong;
varying float vSeed;
varying float vBehind;
void main() {
  if (vBehind < 0.0 || vAlong < uTail) discard;
  float units = vAlong * uLength;
  float head = uHead * uLength;
  // Each filament its own strength, all of it quiet: a fine thread, not a beam.
  float base = 0.2 + 0.24 * fract(vSeed * 7.31);
  // Sparse glints, travelling forward along the filament as the mark moves on.
  float wave = sin(units * (7.0 + 5.0 * fract(vSeed * 3.7)) - head * 4.0 + vSeed * 40.0);
  float glint = pow(max(0.0, wave), 14.0) * (0.5 + 0.5 * sin(units * 1.3 + vSeed * 11.0));
  // Brighter close behind the mark.
  float near = exp(-vBehind * uLength * 2.2);
  float tail = smoothstep(uTail, uTail + 0.6 / uLength, vAlong);
  float alpha = uOpacity * tail * min(1.0, base + 0.35 * glint + 0.32 * near);
  vec3 colour = mix(uGold, uGlint, clamp(glint * 0.7 + near * 0.3, 0.0, 1.0));
  gl_FragColor = vec4(mix(colour, uDeep, uLight), alpha);
}
`;

/** Display colours, written as they are shown (the shader does no colour conversion). */
const rgb = (hex: number) => new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

export function createFlow() {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: NormalBlending,
    depthWrite: false,
    uniforms: {
      uHead: { value: 0 },
      uTail: { value: 0 },
      uGather: { value: 0.05 },
      uOpacity: { value: 1 },
      uLength: { value: 1 },
      uLight: { value: 0 },
      uGold: { value: rgb(0xe9ae00) },
      uGlint: { value: rgb(0xfff1c4) },
      uDeep: { value: rgb(0xa97c00) },
    },
  });
  let lines: LineSegments | null = null;

  return {
    /**
     * Lays the flow along `curve` (its arc-length parameter is the flow's own):
     * `widths` is the band's half-width at each of the curve's control points
     * (narrow where it passes through an opening); `gather` is how far behind
     * the mark, in scene units, the filaments open out.
     */
    build(parent: Object3D, curve: CatmullRomCurve3, widths: number[], options: { strands: number; samples: number; gather: number }) {
      if (lines) {
        lines.removeFromParent();
        lines.geometry.dispose();
      }
      const { strands, samples } = options;
      const length = curve.getLength();
      material.uniforms.uLength.value = length;
      material.uniforms.uGather.value = options.gather / length;

      // The curve's control point at each sample, for the band's width there.
      const lengths = curve.getLengths(curve.arcLengthDivisions);
      const total = lengths[lengths.length - 1];
      const last = widths.length - 1;
      const knotAt = (u: number) => {
        // u (arc length) → t (curve parameter) → position between control points.
        const target = u * total;
        let lo = 0;
        let hi = lengths.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (lengths[mid] < target) lo = mid;
          else hi = mid;
        }
        return (lo / (lengths.length - 1)) * last;
      };

      const centre: Vector3[] = [];
      const width: number[] = [];
      for (let j = 0; j < samples; j++) {
        const u = j / (samples - 1);
        centre.push(curve.getPointAt(u));
        const f = knotAt(u);
        const i = Math.min(last - 1, Math.floor(f));
        width.push(widths[i] + (widths[i + 1] - widths[i]) * (f - i));
      }

      // A frame carried along the curve (parallel transport: no sudden flips).
      const tangent = new Vector3();
      const normal = new Vector3(0, 1, 0);
      const binormal = new Vector3();
      const offsets: Float32Array[] = Array.from({ length: strands }, () => new Float32Array(samples * 3));
      const seeds = Array.from({ length: strands }, (_, k) => ((k * 0.618034) % 1) + 0.013 * k);
      for (let j = 0; j < samples; j++) {
        tangent.copy(centre[Math.min(samples - 1, j + 1)]).sub(centre[Math.max(0, j - 1)]).normalize();
        normal.addScaledVector(tangent, -normal.dot(tangent));
        if (normal.lengthSq() < 1e-8) normal.set(0, 0, 1).addScaledVector(tangent, -tangent.z);
        normal.normalize();
        binormal.crossVectors(tangent, normal);
        const along = (j / (samples - 1)) * length;
        // The band turns slowly about the curve, all filaments together: about one turn every four units.
        const twist = along * 1.55;
        const c = Math.cos(twist);
        const s = Math.sin(twist);
        for (let k = 0; k < strands; k++) {
          const u = strands > 1 ? (k / (strands - 1)) * 2 - 1 : 0;
          // A gentle drift of each filament within the band, and a little out of its plane.
          const drift = u * 0.9 + 0.1 * Math.sin(along * 2.1 + seeds[k] * 9);
          const lift = 0.12 * Math.sin(along * 1.7 + seeds[k] * 13);
          const a = (c * drift - s * lift) * width[j];
          const b = (s * drift + c * lift) * width[j];
          offsets[k].set([normal.x * a + binormal.x * b, normal.y * a + binormal.y * b, normal.z * a + binormal.z * b], j * 3);
        }
      }

      // Segments ordered along the curve, each strand's pair of points.
      const segments = (samples - 1) * strands;
      const position = new Float32Array(segments * 6);
      const offset = new Float32Array(segments * 6);
      const along = new Float32Array(segments * 2);
      const seed = new Float32Array(segments * 2);
      let v = 0;
      for (let j = 0; j < samples - 1; j++) {
        for (let k = 0; k < strands; k++) {
          for (const n of [j, j + 1]) {
            position.set([centre[n].x, centre[n].y, centre[n].z], v * 3);
            offset.set(offsets[k].subarray(n * 3, n * 3 + 3), v * 3);
            along[v] = n / (samples - 1);
            seed[v] = seeds[k];
            v++;
          }
        }
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(position, 3));
      geometry.setAttribute("offset", new BufferAttribute(offset, 3));
      geometry.setAttribute("along", new BufferAttribute(along, 1));
      geometry.setAttribute("seed", new BufferAttribute(seed, 1));
      lines = new LineSegments(geometry, material);
      lines.frustumCulled = false;
      lines.renderOrder = 1;
      parent.add(lines);
    },
    /**
     * Shows the flow from `tail` to `head` (arc-length fractions; the mark is at
     * the head), at `opacity`; `light` deepens its gold over the warm white.
     */
    reveal(head: number, tail: number, opacity: number, light: number) {
      if (!lines) return;
      const u = material.uniforms;
      u.uHead.value = head;
      u.uTail.value = tail;
      u.uOpacity.value = opacity;
      u.uLight.value = light;
      lines.visible = head > tail && opacity > 0.001;
    },
    dispose() {
      lines?.geometry.dispose();
      material.dispose();
    },
  };
}
