// Build-time generator: per-theme bird sprites in public/assets/brand/
// The theme-switcher bird sprites are stored in this repo as base64 text
// (scripts/theme-birds.json) because the repo's GitHub write path is
// UTF-8 text only and cannot carry binary files. This step materializes
// the real .webp/.png sprites into public/assets/brand/ before
// `astro build` copies public/ into dist/, so production serves them as
// ordinary static files. The materialized binaries are gitignored.
// Variants were produced from the master birds (noto-bird-apricot.webp /
// admin-apricot-bird.png) by OKLCH hue/chroma/lightness shifts in image
// processing — alpha, outline and shading preserved, no redraw —
// mirroring the palette transforms: apricot = the azuki nudge
// (hue -15.3°, chroma x0.95, slight deepening; RETIRED in v1.3.10.12),
// yuzu = citrus anchor #F59E0B (hue +27°, chroma x1.10, lightness lift),
// coral = berry family #E8536B (hue -28°, chroma x1.08, slight
// deepening), midori = leaf-green anchor #3F9E4D (hue +103.5°/+106.3°,
// chroma x0.97/x0.87, slight deepening; added v1.3.10.12).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(readFileSync(join(root, "scripts/theme-birds.json"), "utf8"));

let count = 0;
for (const [rel, b64] of Object.entries(payload.files)) {
  const dest = join(root, rel);
  mkdirSync(dirname(dest), { recursive: true });
  const buf = Buffer.from(b64, "base64");
  writeFileSync(dest, buf);
  count++;
  console.log(`[theme-birds] ${rel} (${buf.length} B)`);
}
console.log(`[theme-birds] materialized ${count} theme bird sprites.`);
