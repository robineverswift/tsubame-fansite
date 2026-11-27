// Automatically builds dist/source-bundle-7c6db917923b0e0d.txt during `npm run build`
// so `functions/api/owner/action.js` (download_source) always serves the exact
// deployed source tree without manual base64 commits.
// NOTE: the output filename MUST stay source-bundle-7c6db917923b0e0d.txt — it is
// the BUNDLE_FILE constant in functions/api/owner/_shared.js (also used by
// functions/_middleware.js to block direct external access). A different name
// makes download_source answer bundle_missing.
// Audio (public/audio) stays out of the bundle, as in the v2 bundle: the mp3s
// are large and already served as static files; everything else needed to
// rebuild the site (src, functions, public/scripts, public/assets, public/data)
// is included.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const BUNDLE_NAME = "source-bundle-7c6db917923b0e0d.txt";
const INCLUDE_DIRS = ["src", "functions", "public/data", "public/scripts", "public/assets", "scripts"];
const INCLUDE_FILES = ["package.json", "tsconfig.json", "astro.config.mjs", "README.md", "BUILD-INFO.txt", "public/_headers"];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Minimal dependency-free ZIP writer (Store/Deflate) for Cloudflare Pages CI
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const rel of files) {
    const data = fs.readFileSync(path.join(ROOT, rel));
    const comp = zlib.deflateRawSync(data, { level: 6 });
    const nameBuf = Buffer.from(rel.replace(/\\/g, "/"), "utf8");
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    localParts.push(lh, nameBuf, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    centralParts.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + comp.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

const collected = new Set();
for (const f of INCLUDE_FILES) {
  if (fs.existsSync(path.join(ROOT, f))) collected.add(f);
}
for (const d of INCLUDE_DIRS) {
  for (const full of walk(path.join(ROOT, d))) {
    collected.add(path.relative(ROOT, full));
  }
}

const fileList = Array.from(collected).sort();
const zipBuf = buildZip(fileList);
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, BUNDLE_NAME), zipBuf.toString("base64"), "utf8");
console.log(`[build-source-bundle] Packaged ${fileList.length} files (${zipBuf.length} bytes ZIP) -> dist/${BUNDLE_NAME}`);
