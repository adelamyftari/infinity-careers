import { MeshPhysicalMaterial } from "three";
import { LOGO_BRAND_COLOR } from "./logo-mark";

type Uniform = { value: number };

/** Shared by every piece: the finale's edge light, sweep and sparkle. */
type LedUniforms = { glow: Uniform; sweep: Uniform; sparkle: Uniform };

export const createLedUniforms = (): LedUniforms => ({
  glow: { value: 0 },
  sweep: { value: -6 },
  sparkle: { value: 0 },
});

/**
 * Brand-yellow gold with LED edges. Bevels are found from the object-space
 * normal (anything not facing straight along an axis), so only the edges
 * light up; a diagonal band (`sweep`, in logo units along x + y) travels
 * across the assembled logo, and `pulse` flashes a piece as it connects.
 */
export function createLuminousGold(led: LedUniforms, pulse: Uniform) {
  const material = new MeshPhysicalMaterial({
    color: LOGO_BRAND_COLOR,
    metalness: 0.3,
    roughness: 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.4,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = led.glow;
    shader.uniforms.uSweep = led.sweep;
    shader.uniforms.uSparkle = led.sparkle;
    shader.uniforms.uPulse = pulse;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjectNormal;\nvarying vec3 vLedPosition;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvObjectNormal = normal;\nvLedPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uGlow;
uniform float uSweep;
uniform float uSparkle;
uniform float uPulse;
varying vec3 vObjectNormal;
varying vec3 vLedPosition;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
vec3 axis = abs(normalize(vObjectNormal));
float bevel = smoothstep(0.03, 0.25, 1.0 - max(axis.x, max(axis.y, axis.z)));
// Grazing faces (the sides seen in perspective) carry the edge light too.
float grazing = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.0);
float edge = max(bevel, grazing);
float band = exp(-pow(((vLedPosition.x + vLedPosition.y) * 0.5 - uSweep) / 0.8, 2.0));
totalEmissiveRadiance += vec3(1.0, 0.7, 0.22) * (edge * (uGlow * (0.9 + 1.8 * band) + uPulse * 1.4) + 0.08 * uGlow);
totalEmissiveRadiance += vec3(1.0, 0.88, 0.6) * band * uSparkle * 0.4;`,
      );
  };
  material.customProgramCacheKey = () => "luminous-gold";

  return material;
}
