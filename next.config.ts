import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // `cacheComponents` and `partialPrefetching` are disabled because
  // the root layout reads the language cookie via `cookies()`
  // (`readServerLang`) which the blocking-prerender check refuses
  // to allow on a not-found page that wants to be static. With
  // these off, Next 16 honours `export const dynamic =
  // "force-dynamic"` and streams the layout instead of trying to
  // prerender it.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
