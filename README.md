This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Properties map ("Where we are", `/properties`)

The section lives on its own page, `app/properties/page.tsx`, linked from the header and the menu. "Explore opportunities" on a property hands its filter to the homepage job explorer across the navigation (`lib/careers/property-filter.ts`).

The map is [MapLibre GL JS](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) tiles: no API key, no account, no billing. Its attribution (OpenFreeMap, OpenMapTiles, OpenStreetMap) is shown on the map and must stay visible.

Properties are configured in `lib/properties/properties.ts`. A property's pin comes from its verified `position` (the current ones are taken from the OpenStreetMap feature linked in `source`). A property without a position still appears in the panel and index, marked "Map location to be confirmed". Adding an entry adds it to the map, the panel and the index.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
