import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  build: {
    // Outputs dist/index.html (/) and dist/admin.html (/admin) so Cloudflare Pages
    // matches functions/_middleware.js (/admin & /admin.html exemptions) cleanly.
    format: "file"
  },
  vite: {
    build: {
      assetsInlineLimit: 0
    }
  }
});
