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

/**
 * A real map, a little desaturated so it sits with the brand: pale natural land
 * under the shaded relief, soft greens for woods and parks, quiet blue water,
 * light roads, and dark teal place names.
 */
const LAND = "#e7eadd";
const WATER = "#a9c3ca";
const WOOD = "#c4d3b3";
const PARK = "#d0dcc2";
const ROAD = "#fbfaf4";
const ROAD_EDGE = "#c9cdc0";
const MOTORWAY = "#f3e8c8";
const HALO = "#f3f5ee";

type PaintName = Parameters<MapLibreMap["setPaintProperty"]>[1];
type LayoutName = Parameters<MapLibreMap["setLayoutProperty"]>[1];
type Filter = NonNullable<Parameters<MapLibreMap["setFilter"]>[1]>;

/** The palette over OpenFreeMap's layers (by layer id). */
const PAINT: [layer: string, property: PaintName, value: string | number][] = [
  ["background", "background-color", LAND],
  ["water", "fill-color", WATER],
  ["waterway", "line-color", WATER],
  ["landcover_wood", "fill-color", WOOD],
  ["landcover_wood", "fill-opacity", 0.55],
  ["landuse_park", "fill-color", PARK],
  ["landuse_residential", "fill-color", "#dfe0d6"],
  ["landuse_residential", "fill-opacity", 0.75],
  ["building", "fill-color", "#d6d8cf"],
  ["highway_path", "line-color", "#e1e3d9"],
  ["highway_minor", "line-color", ROAD],
  ["highway_major_casing", "line-color", ROAD_EDGE],
  ["highway_major_inner", "line-color", ROAD],
  ["highway_major_subtle", "line-color", ROAD],
  ["highway_motorway_casing", "line-color", "#cfc4a4"],
  ["highway_motorway_inner", "line-color", MOTORWAY],
  ["highway_motorway_subtle", "line-color", MOTORWAY],
  ["railway", "line-color", "#c2c6bc"],
  ["railway_minor", "line-color", "#c2c6bc"],
  ["railway_transit", "line-color", "#c2c6bc"],
  ["boundary_state", "line-color", "#a9b2a6"],
  ["water_name", "text-color", "#4f7884"],
  ["water_name", "text-halo-color", WATER],
  ["highway_name_other", "text-color", "#6d7f7c"],
  ["highway_name_other", "text-halo-color", HALO],
  ["highway_name_motorway", "text-color", "#6d7f7c"],
  ["place_other", "text-color", "#5d7476"],
  ["place_other", "text-halo-color", HALO],
  ["place_suburb", "text-color", "#5d7476"],
  ["place_suburb", "text-halo-color", HALO],
  ["place_village", "text-color", "#5d7476"],
  ["place_village", "text-halo-color", HALO],
  ["place_town", "text-color", "#34575a"],
  ["place_town", "text-halo-color", HALO],
  ["place_city", "text-color", "#1f4044"],
  ["place_city", "text-halo-color", HALO],
  ["place_city_large", "text-color", "#102f32"],
  ["place_city_large", "text-halo-color", HALO],
];
/** Readable, quiet place names: written as places are (Shkodër, not SHKODER), sized by rank. */
const LAYOUT: [layer: string, property: LayoutName, value: string | number][] = [
  ["place_city_large", "text-transform", "none"],
  ["place_city_large", "text-size", 15],
  ["place_city", "text-transform", "none"],
  ["place_city", "text-size", 13],
  ["place_town", "text-transform", "none"],
  ["place_town", "text-size", 11.5],
  ["place_village", "text-transform", "none"],
  ["place_village", "text-size", 10.5],
  ["place_suburb", "text-transform", "none"],
  ["place_other", "text-transform", "none"],
];
/**
 * Albania's main cities, named at country scale (the tiles carry only a few places that far
 * out): their points as OpenStreetMap has them, served by OpenFreeMap (OpenMapTiles "place"
 * layer), read at zoom 9 and rounded. From zoom 9 the map's own labels take over.
 */
/**
 * Where each name sits against its point: inland of the coast and the eastern border (a name
 * spilling past the outline would be cut by it), and clear of the marker on a city's point.
 */
type Side = "below" | "below-east" | "above-east" | "east" | "west";
const CITY_LABELS: [name: string, lat: number, lng: number, large: boolean, side: Side][] = [
  ["Shkodër", 42.06816, 19.51206, true, "east"],
  ["Tiranë", 41.3281, 19.81848, true, "below"],
  ["Durrës", 41.31327, 19.44632, true, "above-east"],
  ["Elbasan", 41.11273, 20.08215, true, "below"],
  ["Fier", 40.72514, 19.55824, false, "east"],
  ["Berat", 40.70185, 19.95804, false, "below"],
  ["Vlorë", 40.47072, 19.49129, true, "east"],
  ["Korçë", 40.61591, 20.77721, true, "west"],
  ["Pogradec", 40.89989, 20.65739, false, "west"],
  ["Gjirokastër", 40.07715, 20.13931, false, "below"],
  ["Sarandë", 39.87523, 20.00645, false, "below-east"],
];
/** Anchor and offset (em) for each side: far enough out to clear a 34px marker. */
const SIDE: Record<Side, { anchor: "top" | "top-left" | "bottom-left" | "left" | "right"; offset: [number, number] }> = {
  "above-east": { anchor: "bottom-left", offset: [0.3, -1.6] },
  below: { anchor: "top", offset: [0, 1.75] },
  "below-east": { anchor: "top-left", offset: [0.3, 1.6] },
  east: { anchor: "left", offset: [1.7, 0] },
  west: { anchor: "right", offset: [-1.7, 0] },
};
const CITY_LABELS_UNTIL = 9;
/** Below this map width the names are too close to all show: the map keeps those that fit. */
const CITY_LABELS_ALL_FROM = 520;

/**
 * On a wide map the names, placed by hand so they never meet, are always drawn (never dropped
 * for a road number); on a narrow one the map keeps those that fit.
 */
const allowCityOverlap = (map: MapLibreMap) => map.getContainer().clientWidth >= CITY_LABELS_ALL_FROM;

/** Re-decides that on a change of size. */
export function fitCityLabels(map: MapLibreMap) {
  if (map.getLayer("albania-city-labels")) map.setLayoutProperty("albania-city-labels", "text-allow-overlap", allowCityOverlap(map));
}

/** Woods from country scale (the style starts them at zoom 10); the map's own city names from zoom 9. */
const ZOOM_RANGE: [layer: string, min: number, max: number][] = [
  ["landcover_wood", 6, 24],
  ["place_city_large", CITY_LABELS_UNTIL, 24],
  ["place_city", CITY_LABELS_UNTIL, 24],
  ["place_town", CITY_LABELS_UNTIL, 24],
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

/**
 * The country as a real map: natural land under Natural Earth's shaded relief,
 * woods, water, roads and Albania's own place names, all a little desaturated.
 * What lies outside the border is clipped away by the component.
 */
export function applyInfinityStyle(map: MapLibreMap, boundary: Boundary) {
  for (const [id, property, value] of PAINT) {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value);
  }
  for (const [id, property, value] of LAYOUT) {
    if (map.getLayer(id)) map.setLayoutProperty(id, property, value);
  }
  for (const [id, min, max] of ZOOM_RANGE) {
    if (map.getLayer(id)) map.setLayerZoomRange(id, min, max);
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

  // The main cities at country scale, named just below their point (so a marker on the point
  // never covers the name), in the style's own place-name face.
  const font = map.getLayer("place_city") ? map.getLayoutProperty("place_city", "text-font") : undefined;
  if (!map.getSource("albania-cities")) {
    map.addSource("albania-cities", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: CITY_LABELS.map(([name, lat, lng, large, side]) => ({
          type: "Feature",
          properties: { name, large, anchor: SIDE[side].anchor },
          geometry: { type: "Point", coordinates: [lng, lat] },
        })),
      },
    });
    map.addLayer({
      id: "albania-city-labels",
      type: "symbol",
      source: "albania-cities",
      maxzoom: CITY_LABELS_UNTIL,
      layout: {
        "text-field": ["get", "name"],
        ...(font ? { "text-font": font } : {}),
        "text-size": ["case", ["get", "large"], 13, 11.5],
        "text-anchor": ["get", "anchor"],
        "text-offset": ["match", ["get", "anchor"], "left", ["literal", SIDE.east.offset], "right", ["literal", SIDE.west.offset], "top-left", ["literal", SIDE["below-east"].offset], "bottom-left", ["literal", SIDE["above-east"].offset], ["literal", SIDE.below.offset]],
        "text-allow-overlap": allowCityOverlap(map),
        "text-padding": 2,
      },
      paint: {
        "text-color": ["case", ["get", "large"], "#163a3e", "#34575a"],
        "text-halo-color": HALO,
        "text-halo-width": 1.4,
      },
    });
  }

  // Natural Earth's shaded relief with its land cover (part of the OpenFreeMap style): the
  // terrain, greener lowlands and darker ranges, its colour kept but softened.
  if (map.getSource("ne2_shaded") && map.getLayer("water")) {
    map.addLayer(
      {
        id: "albania-relief",
        type: "raster",
        source: "ne2_shaded",
        paint: {
          "raster-opacity": 0.9,
          "raster-saturation": -0.12,
          "raster-contrast": 0.05,
          "raster-brightness-min": 0.26,
          "raster-brightness-max": 1,
          "raster-resampling": "linear",
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
