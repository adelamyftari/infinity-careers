/**
 * The destinations in the "7 PROPERTIES" showcase, in their running order: the
 * seven properties, then the headquarters, which is not counted among them.
 * Everything the gallery shows comes from here.
 *
 * Media, per property, from public/videos and public/images. Set any of these
 * and the gallery uses it, with no change to the layout or the animation:
 *   videoSrc   its footage, portrait, about 9:16: "/videos/GCT VIDEO WEB 720.mp4"
 *   posterSrc  a still from that footage (a frame taken from it, as WebP): the small
 *              cards and the deck show it, and the video shows it until it can play
 *   imageSrc   its photograph, used when there is no video: "/images/panevino.jpeg"
 * With none of them it shows the branded surface. Only the property's own
 * footage and photographs belong here.
 */

export type Destination = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  videoSrc?: string;
  imageSrc?: string;
  posterSrc?: string;
  /** Its careers property id (lib/careers/properties.ts), once roles are listed against it: "Explore opportunities" then filters to them. */
  jobFilter?: string;
  /** The headquarters speaks differently: its own line, and an architectural treatment. */
  headquarters?: { title: string; subtitle: string; note: string };
};

export const DESTINATIONS: Destination[] = [
  {
    id: "grand-casino-tirana",
    name: "Grand Casino Tirana",
    category: "Casino",
    city: "Tirana",
    country: "Albania",
    videoSrc: "/videos/GCT VIDEO WEB 720.mp4",
    posterSrc: "/images/grand-casino-tirana-cover.webp",
  },
  { id: "grand-panevino", name: "Grand Panevino", category: "Restaurant", city: "Tirana", country: "Albania", imageSrc: "/images/panevino.jpeg" },
  {
    id: "arena-casino",
    name: "Arena Casino",
    category: "Casino",
    city: "Tirana",
    country: "Albania",
    videoSrc: "/videos/ACT VIDEO WEB 720.mp4",
    posterSrc: "/images/arena-casino-cover.webp",
  },
  { id: "hotel-butrinti", name: "Hotel Butrinti", category: "Hotel", city: "Saranda", country: "Albania", imageSrc: "/images/Hotel Butrinti.jpeg" },
  {
    id: "grand-casino-durres",
    name: "Grand Casino Durrës",
    category: "Casino",
    city: "Durrës",
    country: "Albania",
    imageSrc: "/images/Grand Casino Durres.png",
  },
  {
    id: "international-casino-tirana",
    name: "International Casino Tirana",
    category: "Casino",
    city: "Tirana",
    country: "Albania",
    videoSrc: "/videos/ICT VIDEO WEB 720.mp4",
    posterSrc: "/images/international-casino-tirana-cover.webp",
  },
  { id: "royal-casino", name: "Royal Casino", category: "Casino", city: "Korçë", country: "Albania", imageSrc: "/images/Royal Casino.png" },
  {
    id: "infinity-hq",
    name: "Infinity HQ",
    category: "Corporate Headquarters",
    city: "Tirana",
    country: "Albania",
    headquarters: {
      title: "Behind every experience.",
      subtitle: "Infinity Headquarters — Tirana",
      note: "Corporate and operational careers.",
    },
  },
];

/** The cities, as the index beside the gallery shows them. */
export const CITIES = ["Tirana", "Durrës", "Korçë", "Saranda"];
