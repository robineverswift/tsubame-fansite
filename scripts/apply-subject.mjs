#!/usr/bin/env node
// apply-subject.mjs — stamp subject.config.json into the site sources.
//
// The framework is configured through ONE file: subject.config.json at the
// repository root (subject identity, site name, footer declaration, brand
// assets, fonts, theme tokens). Edit that file, then run:
//
//   node scripts/apply-subject.mjs           # write the values into the sources
//   node scripts/apply-subject.mjs --check   # exit 1 if any source has drifted
//
// What gets stamped:
//   - src/packages/data/site-copy.json : siteName, footerDeclaration, brandAssets
//                                        (the "version" field is never touched)
//   - src/packages/ui/styles/web.css   : --th-* theme tokens, --font-round/--font-num
//   - src/packages/ui/styles/admin.css : its own --th-* palette (adminTheme),
//                                        --font-round/--font-num
//   - src/pages/index.astro            : Google Fonts URL (fonts.webFamilies)
//   - src/pages/admin.astro            : Google Fonts URL (fonts.adminFamilies)
//   - public/scripts/web-client.js     : the LINKS channel directory, regenerated
//                                        from cfg.channels between the
//                                        subject:channels markers
//   - functions/api/owner/me.js        : CREATOR_UID (owner.creatorXUserId)
//   - functions/api/owner/message.js   : CREATOR_UID (owner.creatorXUserId)
//
// The script is idempotent: running it twice changes nothing the second time.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const cfg = JSON.parse(readFileSync(join(ROOT, "subject.config.json"), "utf-8"));

const drift = [];
function stamp(relPath, transform) {
  const p = join(ROOT, relPath);
  const before = readFileSync(p, "utf-8");
  const after = transform(before);
  if (after !== before) {
    drift.push(relPath);
    if (!CHECK) writeFileSync(p, after);
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1) site-copy.json — structured edit, preserving other keys and key order.
stamp("src/packages/data/site-copy.json", (text) => {
  const indentMatch = text.match(/\n( +)"/);
  const indent = indentMatch ? indentMatch[1].length : 1;
  const data = JSON.parse(text);
  data.siteName = cfg.site.name;
  data.footerDeclaration = cfg.site.footerDeclaration;
  data.brandAssets = data.brandAssets || {};
  if (cfg.brand.adminIcon) data.brandAssets.adminYuzuSlice = cfg.brand.adminIcon;
  if (cfg.brand.adminDashPuff) data.brandAssets.adminDashPuff = cfg.brand.adminDashPuff;
  return JSON.stringify(data, null, indent) + "\n";
});

// 2) CSS — theme tokens + font stacks (definition lines are unique per file).
function stampCss(text, tokens, stacks) {
  let out = text;
  for (const [token, value] of Object.entries(tokens)) {
    out = out.replace(new RegExp("(" + esc(token) + ":\\s*)[^;]+;"), "$1" + value + ";");
  }
  for (const [name, stack] of Object.entries(stacks)) {
    out = out.replace(new RegExp("(" + esc(name) + ":\\s*)[^;]+;"), "$1" + stack + ";");
  }
  return out;
}
stamp("src/packages/ui/styles/web.css", (t) =>
  stampCss(t, cfg.theme.tokens, { "--font-round": cfg.fonts.stacks.webRound, "--font-num": cfg.fonts.stacks.webNum }));
stamp("src/packages/ui/styles/admin.css", (t) =>
  stampCss(t, cfg.adminTheme.tokens, { "--font-round": cfg.fonts.stacks.adminRound, "--font-num": cfg.fonts.stacks.adminNum }));

// 3) Astro pages — rebuild the Google Fonts css2 URL from the family list.
function fontUrl(families) {
  return "https://fonts.googleapis.com/css2?family=" +
    families.map((f) => f.replace(/ /g, "+")).join("&family=") + "&display=swap";
}
function stampAstro(text, families) {
  return text.replace(/https:\/\/fonts\.googleapis\.com\/css2\?family=[^"]+/, fontUrl(families));
}
stamp("src/pages/index.astro", (t) => stampAstro(t, cfg.fonts.webFamilies));
stamp("src/pages/admin.astro", (t) => stampAstro(t, cfg.fonts.adminFamilies));

// 4) Channel directory — regenerate the LINKS array between the markers.
function channelsBlock(channels) {
  const entries = channels.map((c) => {
    const o = {};
    for (const k of ["plat", "icon", "name", "ja", "cn", "en"]) o[k] = c[k];
    if (c.tag) o.tag = { ja: c.tag.ja, cn: c.tag.cn, en: c.tag.en, tone: c.tag.tone };
    o.url = c.url;
    return JSON.stringify(o, null, 2).split("\n").map((l) => "      " + l).join("\n");
  });
  return "    var LINKS = [\n" + entries.join(",\n") + "\n    ];";
}
stamp("public/scripts/web-client.js", (t) => {
  const S = "    /* subject:channels:start";
  const E = "    /* subject:channels:end */";
  const i = t.indexOf(S), j = t.indexOf(E);
  if (i < 0 || j < 0) throw new Error("subject:channels markers not found in public/scripts/web-client.js");
  const startLine = S + " — generated from subject.config.json (channels); do not hand-edit */\n";
  return t.slice(0, i) + startLine + channelsBlock(cfg.channels) + "\n" + t.slice(j);
});

// 5) Owner console — the creator's X user ID constant.
for (const f of ["functions/api/owner/me.js", "functions/api/owner/message.js"]) {
  stamp(f, (t) => t.replace(/const CREATOR_UID = "[^"]*";/,
    "const CREATOR_UID = \"" + cfg.owner.creatorXUserId + "\";"));
}

if (drift.length === 0) {
  console.log("apply-subject: all sources already match subject.config.json");
} else if (CHECK) {
  console.error("apply-subject: drift in: " + drift.join(", "));
  process.exit(1);
} else {
  console.log("apply-subject: stamped " + drift.join(", "));
}
