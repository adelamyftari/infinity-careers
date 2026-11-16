import {
  Camera,
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/**
 * A sheet of liquid over the page, simulated as waves on a small height field.
 *
 * True refraction of page content would mean capturing the DOM every frame, so
 * the sheet is drawn on two layers instead. The one behind the content redraws
 * the dot grid bent by the liquid, which is real refraction: the grid is
 * mathematical. The one in front adds only the light on the liquid's surface.
 *
 * Both come from a single WebGL context, drawn off-screen and handed to each
 * canvas in turn. Nothing runs while the liquid is still.
 */

/** Size of one simulation cell in CSS pixels. Waves are smooth, so few are needed. */
const CELL = 8;
const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 4;
const MAX_PIXEL_RATIO = 2;
/** How long after the last real movement the liquid has fully settled. */
const SETTLE_MS = 2800;

/** The follower's spring: how it lags the cursor, then catches up. */
const SPRING = 0.14;
const DAMPING = 0.74;

/** Brush spread in CSS pixels: small when slow, about 130px to its feathered edge when fast. */
const SPREAD_SLOW = 26;
const SPREAD_FAST = 46;
/** How far behind the cursor a fast stroke trails, in steps of its own velocity. */
const TRAIL = 3.5;
/** The speed, in CSS pixels per step, at which a stroke counts as fast. */
const FAST = 30;

/** Infinity yellow, as the shaders want it. */
const YELLOW = new Vector3(233 / 255, 173 / 255, 0);

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** One wave step: the height (r) moves with its velocity (g), then the cursor's stroke is added. */
const SIMULATE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uField;
  uniform vec2 uTexel;
  uniform vec2 uSize;
  uniform vec2 uFrom;
  uniform vec2 uTo;
  uniform float uSpread;
  uniform float uStrength;

  void main() {
    vec4 c = texture2D(uField, vUv);
    float l = texture2D(uField, vUv - vec2(uTexel.x, 0.0)).r;
    float r = texture2D(uField, vUv + vec2(uTexel.x, 0.0)).r;
    float d = texture2D(uField, vUv - vec2(0.0, uTexel.y)).r;
    float u = texture2D(uField, vUv + vec2(0.0, uTexel.y)).r;

    float velocity = (c.g + (l + r + d + u - 4.0 * c.r) * 0.12) * 0.9;
    float height = (c.r + velocity) * 0.945;

    // Distance to the stroke, a line rather than a point, so fast ones stretch.
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    vec2 along = uTo - uFrom;
    float t = clamp(dot(p - uFrom, along) / max(dot(along, along), 0.0001), 0.0, 1.0);
    vec2 away = p - (uFrom + along * t);
    height += uStrength * exp(-dot(away, away) / (2.0 * uSpread * uSpread));

    gl_FragColor = vec4(height, velocity, 0.0, 1.0);
  }
`;

/** Shared by both layers: how far the liquid bends light here, in CSS pixels. */
const REFRACTION = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uField;
  uniform vec2 uTexel;
  uniform float uCell;

  const float MAX_BEND = 14.0;

  vec2 bend() {
    float dx = texture2D(uField, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uField, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uField, vUv + vec2(0.0, uTexel.y)).r - texture2D(uField, vUv - vec2(0.0, uTexel.y)).r;
    // Screen y runs downward, the texture's upward.
    vec2 offset = vec2(dx, -dy) / (2.0 * uCell) * 1000.0;
    float size = length(offset);
    return size > MAX_BEND ? offset * MAX_BEND / size : offset;
  }
`;

/**
 * Behind the content: the page's own surface and dots, bent. Where the liquid is
 * flat it is fully transparent, so the real background shows untouched.
 */
const BEHIND = /* glsl */ `
  ${REFRACTION}
  uniform vec2 uSize;
  uniform vec2 uOrigin;
  uniform vec3 uSurface;
  uniform vec3 uDot;
  uniform vec3 uYellow;
  uniform float uDotAlpha;
  uniform float uDotRadius;
  uniform float uSpacing;
  uniform float uPixel;

  void main() {
    vec2 offset = bend();
    float size = length(offset);
    float presence = smoothstep(0.1, 0.5, size);
    if (presence <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize + uOrigin + offset;
    float fromDot = length(mod(p, uSpacing) - uSpacing * 0.5);
    float dotMask = 1.0 - smoothstep(uDotRadius - uPixel * 0.5, uDotRadius + uPixel * 0.5, fromDot);
    // A trace of yellow caught in the dots where the bend is strongest.
    vec3 dotColor = mix(uDot, uYellow, size / MAX_BEND * 0.5);
    vec3 color = mix(uSurface, dotColor, dotMask * uDotAlpha);
    gl_FragColor = vec4(color * presence, presence);
  }
`;

/** In front of the content: only the light on the surface, faint enough to read through. */
const IN_FRONT = /* glsl */ `
  ${REFRACTION}
  uniform vec3 uYellow;

  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  }

  void main() {
    vec2 offset = bend();
    float size = length(offset);
    float strength = size / MAX_BEND;
    if (strength <= 0.01) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec3 normal = normalize(vec3(-offset / 16.0, 1.0));
    vec3 toLight = normalize(vec3(-0.45, 0.65, 0.62));
    vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));

    float highlight = pow(max(dot(normal, halfway), 0.0), 70.0) * 0.3 * smoothstep(0.02, 0.2, strength);
    float shade = max(dot(normal.xy, -toLight.xy), 0.0) * 0.03;
    float fade = smoothstep(0.01, 0.07, strength);
    float tint = strength * (1.0 - strength) * 0.1;

    // Premultiplied: white light, black shade, yellow tint. Grain stops faint gradients banding.
    float alpha = clamp((highlight + shade + tint + grain(gl_FragCoord.xy) / 255.0) * fade, 0.0, 1.0);
    gl_FragColor = vec4((vec3(highlight) + uYellow * tint) * fade, alpha);
  }
`;

type DotGrid = {
  surface: Vector3;
  dot: Vector3;
  dotAlpha: number;
  dotRadius: number;
  spacing: number;
  fixed: boolean;
};

/** The dots are read from the page, so the bent ones always match the real ones. */
function readDotGrid(): DotGrid | null {
  const style = getComputedStyle(document.documentElement);
  const channels = (css: string) => css.match(/[\d.]+/g)?.map(Number) ?? [];
  const surface = channels(style.backgroundColor);
  const stop = style.backgroundImage.match(/rgba?\([^)]+\)\s+([\d.]+)px/);
  const spacing = parseFloat(style.backgroundSize);
  if (surface.length < 3 || !stop || !spacing) return null;
  const dot = channels(stop[0].slice(0, stop[0].indexOf(")")));
  return {
    surface: new Vector3(surface[0] / 255, surface[1] / 255, surface[2] / 255),
    dot: new Vector3(dot[0] / 255, dot[1] / 255, dot[2] / 255),
    dotAlpha: dot[3] ?? 1,
    dotRadius: parseFloat(stop[1]),
    spacing,
    fixed: style.backgroundAttachment === "fixed",
  };
}

export type LiquidGlass = {
  moveTo: (x: number, y: number) => void;
  /** The cursor left: the next movement starts a new stroke, not a streak across the page. */
  release: () => void;
  destroy: () => void;
};

/** Returns null where the browser can't run it; the page simply goes without. */
export function createLiquidGlass(behind: HTMLCanvasElement, inFront: HTMLCanvasElement): LiquidGlass | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  const behindContext = behind.getContext("bitmaprenderer");
  const inFrontContext = inFront.getContext("bitmaprenderer");
  if (!behindContext || !inFrontContext) return null;

  const stage = new OffscreenCanvas(1, 1);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: stage,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  if (!renderer.extensions.has("EXT_color_buffer_float") && !renderer.extensions.has("EXT_color_buffer_half_float")) {
    renderer.dispose();
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const grid = readDotGrid();
  const camera = new Camera();
  const geometry = new PlaneGeometry(2, 2);
  const size = new Vector2();
  const texel = new Vector2();
  const from = new Vector2();
  const to = new Vector2();
  const origin = new Vector2();
  const field = { value: null as WebGLRenderTarget["texture"] | null };

  const material = (fragmentShader: string, uniforms: ShaderMaterial["uniforms"]) =>
    new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader,
      uniforms: { uField: field, uTexel: { value: texel }, ...uniforms },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    });

  const spread = { value: SPREAD_SLOW };
  const strength = { value: 0 };
  const simulate = material(SIMULATE, {
    uSize: { value: size },
    uFrom: { value: from },
    uTo: { value: to },
    uSpread: spread,
    uStrength: strength,
  });
  const pixel = { value: 1 };
  const drawBehind = grid
    ? material(BEHIND, {
        uCell: { value: CELL },
        uSize: { value: size },
        uOrigin: { value: origin },
        uSurface: { value: grid.surface },
        uDot: { value: grid.dot },
        uYellow: { value: YELLOW },
        uDotAlpha: { value: grid.dotAlpha },
        uDotRadius: { value: grid.dotRadius },
        uSpacing: { value: grid.spacing },
        uPixel: pixel,
      })
    : null;
  const drawInFront = material(IN_FRONT, { uCell: { value: CELL }, uYellow: { value: YELLOW } });

  const quad = new Mesh(geometry, simulate);
  quad.frustumCulled = false;

  const makeTarget = (width: number, height: number) =>
    new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
  let targets: [WebGLRenderTarget, WebGLRenderTarget] | null = null;

  const clearField = () => {
    if (!targets) return;
    for (const target of targets) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
  };

  const resize = () => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    pixel.value = 1 / ratio;
    size.set(width, height);
    const cellsX = Math.max(2, Math.ceil(width / CELL));
    const cellsY = Math.max(2, Math.ceil(height / CELL));
    texel.set(1 / cellsX, 1 / cellsY);
    targets?.[0].dispose();
    targets?.[1].dispose();
    targets = [makeTarget(cellsX, cellsY), makeTarget(cellsX, cellsY)];
    clearField();
  };

  const cursor = new Vector2();
  const follower = new Vector2();
  const velocity = new Vector2();
  let frame = 0;
  let lastFrame = 0;
  let owed = 0;
  let lastMovement = 0;
  let fresh = true;
  let needsResize = true;

  /** One fixed step: the follower chases the cursor on its spring, and paints a stroke. */
  const step = () => {
    if (!targets) return;
    velocity.x = (velocity.x + (cursor.x - follower.x) * SPRING) * DAMPING;
    velocity.y = (velocity.y + (cursor.y - follower.y) * SPRING) * DAMPING;
    follower.add(velocity);

    const speed = velocity.length();
    const fast = Math.min(speed / FAST, 1);
    if (speed > 0.25) lastMovement = performance.now();
    spread.value = SPREAD_SLOW + (SPREAD_FAST - SPREAD_SLOW) * fast;
    // Slow strokes stay soft; fast ones reach full depth, spread over more of the page.
    strength.value = Math.min(0.03 * speed * (speed / (speed + 6)), 0.3);
    to.copy(follower);
    from.copy(follower).addScaledVector(velocity, -TRAIL);

    field.value = targets[0].texture;
    quad.material = simulate;
    renderer.setRenderTarget(targets[1]);
    renderer.render(quad, camera);
    renderer.setRenderTarget(null);
    targets = [targets[1], targets[0]];
  };

  const present = (shader: ShaderMaterial, canvas: ImageBitmapRenderingContext) => {
    quad.material = shader;
    renderer.render(quad, camera);
    canvas.transferFromImageBitmap(stage.transferToImageBitmap());
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    fresh = true;
    velocity.set(0, 0);
    clearField();
    // No image: both canvases are transparent again.
    behindContext.transferFromImageBitmap(null);
    inFrontContext.transferFromImageBitmap(null);
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (needsResize) {
      needsResize = false;
      resize();
    }
    // Capped, so a background tab doesn't come back to a burst of catching up.
    owed = Math.min(owed + now - lastFrame, STEP_MS * MAX_STEPS_PER_FRAME);
    lastFrame = now;
    while (owed >= STEP_MS) {
      step();
      owed -= STEP_MS;
    }
    if (now - lastMovement > SETTLE_MS) {
      stop();
      return;
    }
    if (!targets) return;
    field.value = targets[0].texture;
    if (grid && drawBehind) {
      // A fixed grid stays with the viewport; otherwise it scrolls with the page.
      if (grid.fixed) origin.set(0, 0);
      else origin.set(window.scrollX, window.scrollY);
      present(drawBehind, behindContext);
    }
    present(drawInFront, inFrontContext);
  };

  const onResize = () => {
    needsResize = true;
  };
  window.addEventListener("resize", onResize, { passive: true });

  return {
    moveTo(x, y) {
      cursor.set(x, y);
      if (fresh) {
        fresh = false;
        follower.copy(cursor);
        velocity.set(0, 0);
      }
      if (!frame) {
        lastFrame = performance.now();
        lastMovement = lastFrame;
        owed = 0;
        frame = requestAnimationFrame(loop);
      }
    },
    release() {
      fresh = true;
    },
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", onResize);
      behindContext.transferFromImageBitmap(null);
      inFrontContext.transferFromImageBitmap(null);
      targets?.[0].dispose();
      targets?.[1].dispose();
      geometry.dispose();
      simulate.dispose();
      drawBehind?.dispose();
      drawInFront.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
