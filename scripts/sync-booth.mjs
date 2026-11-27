// BOOTH catalog sync for the fansite framework.
// Builds public/data/{works,upcoming,stats}.json from one BOOTH shop's
// public pages: shop listing pages (?page=N) for discovery, then each
// item page for the details. A "work" is a product: price is the listed
// minimum price in JPY, metric is 0 (BOOTH exposes no public sales count),
// rating stays null/0, type is the item's category, age is 2 when the item
// carries BOOTH's adult label. BOOTH has no announced-future listing, so
// upcoming.json is always an empty array.
// Enforces the adapter contract (docs/ADAPTERS.md): generated files only,
// fail-safe aborts (a Cloudflare challenge page, an age gate on every item,
// or a collapsed fetch never writes anything), public listings only.
//
// Usage:
//   BOOTH_SHOP=your-shop node scripts/sync-booth.mjs [--write]
// BOOTH_SHOP is the shop subdomain (https://<shop>.booth.pm). Without
// --write the sync is a dry run. BOOTH_BASE overrides the shop origin
// (testing). BOOTH_COOKIE optionally carries a Cookie header copied from
// your browser — needed from networks BOOTH challenges, and to read
// age-gated items (the cookie BOOTH sets after the 18+ confirmation).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKS_PATH = join(ROOT, "public/data/works.json");
const UPCOMING_PATH = join(ROOT, "public/data/upcoming.json");
const STATS_PATH = join(ROOT, "public/data/stats.json");

const WRITE = process.argv.includes("--write");
const SHOP = process.env.BOOTH_SHOP || "";
const BASE = (process.env.BOOTH_BASE || (SHOP ? `https://${SHOP}.booth.pm` : "")).replace(/\/$/, "");
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "ja,en;q=0.8",
  ...(process.env.BOOTH_COOKIE ? { Cookie: process.env.BOOTH_COOKIE } : {}),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  if (text.includes("Just a moment") && text.includes("challenges.cloudflare.com")) {
    throw new Error("BOOTH served a Cloudflare challenge page — retry from an unchallenged network or set BOOTH_COOKIE from your browser. Nothing was written.");
  }
  return text;
}

function deHtml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}

function parseItemPage(html, id, shopName) {
  let title = "", price = null, date = "", type = "", tags = "";
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ld) {
    try {
      const j = JSON.parse(ld[1]);
      const prod = Array.isArray(j) ? j.find((x) => x["@type"] === "Product") : j;
      if (prod) {
        title = deHtml(prod.name || "");
        const offers = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
        if (offers) {
          const p = offers.lowPrice != null ? offers.lowPrice : offers.price;
          if (p != null) price = Number(p);
        }
      }
    } catch {}
  }
  if (!title) {
    const og = html.match(/property="og:title" content="([^"]*)"/);
    if (og) title = deHtml(og[1]).replace(/\s*-\s*[^-]*BOOTH\s*$/i, "");
  }
  if (price == null) {
    const pm = html.match(/¥\s?([\d,]+)\s?~/) || html.match(/([\d,]+)\s?JPY/) || html.match(/¥\s?([\d,]+)/);
    if (pm) price = Number(pm[1].replace(/,/g, ""));
  }
  const dm = html.match(/商品公開日時：\s*(\d{4}-\d{2}-\d{2})/);
  if (dm) date = dm[1];
  const crumbs = [...html.matchAll(/<a[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>([^<]+)<\/a>/g)].map((m) => deHtml(m[1]));
  if (crumbs.length) type = crumbs[crumbs.length - 1];
  const tagSet = [...html.matchAll(/href="\/ja\/search\/[^"]*"[^>]*>([^<]{1,40})<\/a>/g)].map((m) => deHtml(m[1]));
  tags = [...new Set(tagSet)].slice(0, 8).join(" / ");
  const head = html.slice(0, 60000);
  const age = /(成人向け|Adult<\/span>|label[^>]*>\s*Adult)/.test(head) ? 2 : 0;
  const gated = html.includes("Are you over 18 years of age?") || html.includes("あなたは18歳以上ですか");
  return {
    gated,
    row: [String(id), title, date, shopName, price, null, 0, 0, tags, type,
      `${BASE}/items/${id}`, age],
  };
}

function recomputeStats(works) {
  const ageBreakdown = { "R18": 0, "全年齢": 0, "R-15": 0 };
  let totalSales = 0;
  const yearlyCounts = {};
  const monthlyMatrix = {};
  const circleCounts = new Map();

  for (const w of works) {
    const age = w[11] === 0 ? "全年齢" : (w[11] === 1 ? "R-15" : "R18");
    ageBreakdown[age] = (ageBreakdown[age] || 0) + 1;
    if (typeof w[7] === "number" && Number.isFinite(w[7])) totalSales += w[7];
    const d = String(w[2] || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const yr = d.slice(0, 4);
      const mo = parseInt(d.slice(5, 7), 10) - 1;
      yearlyCounts[yr] = (yearlyCounts[yr] || 0) + 1;
      if (!monthlyMatrix[yr]) monthlyMatrix[yr] = new Array(12).fill(0);
      monthlyMatrix[yr][mo] += 1;
    }
    const c = String(w[3] || "").trim();
    if (c) circleCounts.set(c, (circleCounts.get(c) || 0) + 1);
  }
  const topCircles = [...circleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([circle, count]) => ({ circle, count }));

  return {
    works_total: works.length,
    age_breakdown: ageBreakdown,
    total_sales: totalSales,
    yearly_counts: Object.fromEntries(Object.entries(yearlyCounts).sort()),
    monthly_matrix: Object.fromEntries(Object.entries(monthlyMatrix).sort()),
    top_circles: topCircles,
  };
}

async function main() {
  if (!BASE) {
    throw new Error("Set BOOTH_SHOP (the shop subdomain, e.g. BOOTH_SHOP=your-shop). Nothing was written.");
  }
  const prevWorks = readJson(WORKS_PATH, []);
  const prevById = new Map(prevWorks.map((r) => [r[0], r]));

  // Discovery: paginate the shop listing until a page adds no new items.
  const ids = [];
  const seen = new Set();
  let shopName = SHOP;
  for (let page = 1; page <= 50; page++) {
    const html = await fetchText(page === 1 ? `${BASE}/` : `${BASE}/?page=${page}`);
    if (page === 1) {
      const og = html.match(/property="og:title" content="([^"]*)"/);
      if (og) shopName = deHtml(og[1]).replace(/\s*-\s*BOOTH\s*$/i, "") || SHOP;
    }
    let fresh = 0;
    for (const m of html.matchAll(/\/items\/(\d+)/g)) {
      if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); fresh++; }
    }
    if (fresh === 0) break;
    await sleep(300);
  }
  if (ids.length === 0) throw new Error("Discovery found no items — aborting, nothing written.");

  // Fail safe: a collapsed fetch must never shrink the published archive.
  if (prevWorks.length >= 10 && ids.length < prevWorks.length * 0.5) {
    throw new Error(`Discovered ${ids.length} items vs ${prevWorks.length} previously listed — aborting, nothing written.`);
  }

  const worksById = new Map(prevById);
  let added = 0, updated = 0, gated = 0, failed = 0;
  for (const id of ids) {
    try {
      const html = await fetchText(`${BASE}/items/${id}`);
      const { row, gated: isGated } = parseItemPage(html, id, shopName);
      if (isGated) { gated++; continue; }
      if (!row[1] || row[4] == null) { failed++; continue; }
      if (prevById.has(id)) updated++; else added++;
      worksById.set(id, row);
    } catch (e) {
      failed++;
    }
    await sleep(300);
  }
  if (gated + failed === ids.length) {
    throw new Error(`Every item fetch failed or was age-gated (${gated} gated, ${failed} failed) — aborting, nothing written. Set BOOTH_COOKIE from a browser that passed the gate.`);
  }

  const works = [...worksById.values()]
    .sort((a, b) => (b[2] || "").localeCompare(a[2] || "") || b[0].localeCompare(a[0]));
  const stats = recomputeStats(works);

  console.log(JSON.stringify({
    mode: WRITE ? "write" : "dry-run",
    shop: shopName,
    discovered: ids.length,
    added, updated, skippedAgeGated: gated, failed,
    worksTotal: stats.works_total,
  }));

  if (WRITE) {
    writeFileSync(WORKS_PATH, JSON.stringify(works));
    writeFileSync(UPCOMING_PATH, JSON.stringify([], null, 1) + "\n");
    writeFileSync(STATS_PATH, JSON.stringify(stats, null, 1) + "\n");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
