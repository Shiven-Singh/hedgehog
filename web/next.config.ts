import type { NextConfig } from 'next';

// Runs as an ordinary local server rather than a static export, because the
// review can be re-run from the page and that needs a route handler behind it.
// Nothing is deployed anywhere; `npm run dev` is the whole story.
const config: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  trailingSlash: true,
};

export default config;
