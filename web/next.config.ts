import type { NextConfig } from 'next';

// Exported as static HTML. The review it renders is already committed to the
// repository, so the site needs no server, no API key and no network access.
const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default config;
