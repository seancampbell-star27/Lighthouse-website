import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from "@astrojs/cloudflare";

// Update `site` to the final production domain before launch.
export default defineConfig({
  site: 'https://www.lighthousedigitalmedia.net',
  output: "hybrid",
  integrations: [sitemap()],

  build: {
    inlineStylesheets: 'auto',
  },

  adapter: cloudflare()
});