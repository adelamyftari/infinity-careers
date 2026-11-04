import type { FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";

/** OpenFreeMap's dark vector style: free, no key. Recoloured below. */
export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

/**
 * Albania's national boundary (ADM0), geoBoundaries gbOpen release, public
 * domain: https://www.geoboundaries.org/ (served unmodified from /public).
 */
export const ALBANIA_BOUNDARY_URL = "/geo/albania-adm0.geojson";

export type Boundary = FeatureCollection<Polygon | MultiPolygon>;

/** The country itself, a warm stone a shade deeper than the page. */
const PLATE = "#e9e5dc";
const WATER = "#d9dde0";
const ROAD = "#d3cec2";
const LABEL = "#7a766e";

type PaintName = Parameters<MapLibreMap["setPaintProperty"]>[1];
type Filter = NonNullable<Parameters<MapLibreMap["setFilter"]>[1]>;

/**
 * A light Infinity palette over OpenFreeMap's layers (by layer id): a stone
 * plate, pale water, quiet roads and warm-grey labels.
 */
const PAINT: [layer: string, property: PaintName, value: string | number][] = [
  ["background", "background-color", PLATE],
  ["water", "fill-color", WATER],
  ["waterway", "line-color", WATER],
  ["landcover_wood", "fill-color", "#e2dfd4"],
  ["landcover_wood", "fill-opacity", 0.6],
  ["landuse_park", "fill-color", "#e2dfd4"],
  ["landuse_residential", "fill-color", "#e4e0d6"],
  ["building", "fill-color", "#dcd7cc"],
  ["highway_path", "line-color", "#dedad0"],
  ["highway_minor", "line-color", ROAD],
  ["highway_major_casing", "line-color", PLATE],
  ["highway_major_inner", "line-color", ROAD],
  ["highway_major_subtle", "line-color", ROAD],
  ["highway_motorway_casing", "line-color", PLATE],
  ["highway_motorway_inner", "line-color", "#cbc5b8"],
  ["highway_motorway_subtle", "line-color", "#cbc5b8"],
  ["railway", "line-color", "#d6d1c6"],
  ["railway_minor", "line-color", "#d6d1c6"],
  ["railway_transit", "line-color", "#d6d1c6"],
  ["boundary_state", "line-color", "#cfcabe"],
  ["water_name", "text-color", "#9aa2a8"],
  ["water_name", "text-halo-color", WATER],
  ["highway_name_other", "text-color", "#8d887f"],
  ["highway_name_other", "text-halo-color", PLATE],
  ["highway_name_motorway", "text-color", "#8d887f"],
  ["highway_name_motorway", "text-halo-color", PLATE],
  ["place_other", "text-color", LABEL],
  ["place_other", "text-halo-color", PLATE],
  ["place_suburb", "text-color", LABEL],
  ["place_suburb", "text-halo-color", PLATE],
  ["place_village", "text-color", LABEL],
  ["place_village", "text-halo-color", PLATE],
  ["place_town", "text-color", "#5f5b54"],
  ["place_town", "text-halo-color", PLATE],
  ["place_city", "text-color", "#3a3833"],
  ["place_city", "text-halo-color", PLATE],
  ["place_city_large", "text-color", "#26252a"],
  ["place_city_large", "text-halo-color", PLATE],
];
/** Layers that only make sense with neighbours on screen. */
const HIDDEN = [
  "boundary_country_z0-4",
  "boundary_country_z5-",
  "place_state",
  "place_country_other",
  "place_country_minor",
  "place_country_major",
];

const PLACE_LABELS = ["place_other", "place_suburb", "place_village", "place_town", "place_city", "place_city_large"];

/** The country's outer rings (holes are not needed for the outline). */
function outerRings(boundary: Boundary): Position[][] {
  return boundary.features.flatMap(({ geometry }) =>
    geometry.type === "Polygon" ? [geometry.coordinates[0]] : geometry.coordinates.map((polygon) => polygon[0]),
  );
}

/** [[west, south], [east, north]] of the boundary. */
export function boundaryBounds(boundary: Boundary): [[number, number], [number, number]] {
  let west = 180, south = 90, east = -180, north = -90;
  for (const ring of outerRings(boundary)) {
    for (const [lng, lat] of ring) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return [
    [west, south],
    [east, north],
  ];
}

/** Ray casting: is the point inside the boundary? */
export function insideBoundary(boundary: Boundary, lng: number, lat: number) {
  return outerRings(boundary).some((ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

/**
 * The light Infinity palette for the country itself: a stone plate with
 * quiet roads, warm-grey labels (Albania's own places only) and soft shaded
 * relief. What lies outside the border is clipped away by the component.
 */
export function applyInfinityStyle(map: MapLibreMap, boundary: Boundary) {
  for (const [id, property, value] of PAINT) {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value);
  }
  for (const id of HIDDEN) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }
  // Only Albania's own place names: a neighbour's label would otherwise
  // poke through the outline.
  const country = boundary.features[0]?.geometry;
  if (country) {
    const within: Filter = ["within", country];
    for (const id of PLACE_LABELS) {
      if (!map.getLayer(id)) continue;
      // OpenFreeMap's place filters are expressions, so they combine with `within`.
      const current = map.getFilter(id);
      map.setFilter(id, current ? (["all", current, within] as Filter) : within);
    }
  }

  // Natural Earth shaded relief (part of the OpenFreeMap style), kept soft and light.
  if (map.getSource("ne2_shaded") && map.getLayer("water")) {
    map.addLayer(
      {
        id: "albania-relief",
        type: "raster",
        source: "ne2_shaded",
        paint: {
          "raster-opacity": 0.45,
          "raster-saturation": -1,
          "raster-contrast": 0.1,
          "raster-brightness-min": 0.72,
          "raster-brightness-max": 1,
        },
      },
      "water",
    );
  }
}

/**
 * Albania's outline as an SVG path in the map's own pixels, projected by the
 * map itself, so it lies exactly on the rendered country. The component clips
 * the map canvas to it (so the section's background shows all around the
 * country) and draws the rim and shadow along it.
 */
export function outlinePath(map: MapLibreMap, boundary: Boundary) {
  return outerRings(boundary)
    .map((ring) => {
      const points = ring.map(([lng, lat]) => {
        const { x, y } = map.project({ lng, lat });
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return `M${points.join("L")}Z`;
    })
    .join("");
}
