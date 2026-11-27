// Low-power DLsite catalog sync for TSUBAME RECORD.
// Refreshes numeric sales/ratings/prices via batched `product/info/ajax` (~38 calls total),
// promotes released items from upcoming.json -> works.json, discovers new/upcoming works
// crediting [ARTIST NAME] (verified against voice_by + audio work_type), and recomputes stats.json.
// Enforces max(old, new) dl_count monotonic protection against JP-region stripping.
// Usage: node scripts/sync-dlsite.mjs [--write]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKS_PATH = join(ROOT, "public/data/works.json");
const UPCOMING_PATH = join(ROOT, "public/data/upcoming.json");
const STATS_PATH = join(ROOT, "public/data/stats.json");

const WRITE = process.argv.includes("--write");
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Cookie": "adult=1; locale=ja-jp",
  "Accept-Language": "ja,en;q=0.8",
};
const TARGET_CV = "YOUR_TARGET_CV_NAME"; // TODO: the voice-actor name to match on DLsite
const BATCH_SIZE = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function todayJst() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function toAgeCode(ageCat) {
  if (ageCat === 1 || ageCat === "general" || ageCat === "全年齢") return 0;
  if (ageCat === 2 || ageCat === "r15" || ageCat === "R-15") return 1;
  return 2;
}

function toDateStr(registDate) {
  if (!registDate) return "";
  const m = String(registDate).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function resolveNuxtArray(arr, idx, depth = 0, seen = new Set()) {
  if (depth > 8 || typeof idx !== "number" || idx < 0 || idx >= arr.length) return idx;
  if (seen.has(idx)) return null;
  const nextSeen = new Set(seen);
  nextSeen.add(idx);
  const node = arr[idx];
  if (Array.isArray(node)) return node.map((v) => (typeof v === "number" ? resolveNuxtArray(arr, v, depth + 1, nextSeen) : v));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = typeof v === "number" ? resolveNuxtArray(arr, v, depth + 1, nextSeen) : v;
    }
    return out;
  }
  return node;
}

function parseNuxtWorkPayload(html) {
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = m[1];
    if (!body.includes("work_name")) continue;
    const i = body.indexOf("[");
    const j = body.lastIndexOf("]");
    if (i < 0 || j <= i) continue;
    try {
      const arr = JSON.parse(body.slice(i, j + 1));
      for (let k = 0; k < arr.length; k++) {
        const node = arr[k];
        if (node && typeof node === "object" && !Array.isArray(node) && "work_name" in node && "product_id" in node) {
          return resolveNuxtArray(arr, k);
        }
      }
    } catch {}
  }
  return null;
}

async function inspectCandidate(rj, isAnnounceHint = false) {
  const sites = ["maniax", "home"];
  if (!isAnnounceHint) {
    for (const site of sites) {
      try {
        const raw = await fetchJson(`https://www.dlsite.com/${site}/api/=/product.json?workno=${rj}`);
        const w = Array.isArray(raw) ? raw[0] : raw;
        if (w && w.work_name) {
          const voiceList = (w.creaters?.voice_by || []).map((p) => p?.name || "");
          const isTarget = voiceList.some((n) => n.includes(TARGET_CV));
          const isAudio = w.work_type === "SOU" || String(w.work_type_string || "").includes("ボイス") || String(w.work_type_string || "").includes("ASMR");
          if (!isTarget || !isAudio) return null;
          const tags = (w.genres || []).map((g) => g?.name).filter(Boolean).slice(0, 8).join(" / ");
          return {
            kind: "work",
            row: [
              rj,
              w.work_name,
              toDateStr(w.regist_date),
              w.maker_name || "",
              typeof w.price === "number" ? Math.round(w.price) : null,
              typeof w.rate_average_2dp === "number" ? w.rate_average_2dp : null,
              typeof w.rate_count === "number" ? w.rate_count : 0,
              typeof w.dl_count === "number" ? w.dl_count : 0,
              tags,
              w.work_type_string || "ボイス・ASMR",
              `https://www.dlsite.com/${site}/work/=/product_id/${rj}.html`,
              toAgeCode(w.age_category),
            ],
          };
        }
      } catch {}
    }
  }
  // Fallback / announce HTML inspection via Nuxt payload
  for (const site of sites) {
    for (const kindPath of isAnnounceHint ? ["announce", "work"] : ["work", "announce"]) {
      try {
        const url = `https://www.dlsite.com/${site}/${kindPath}/=/product_id/${rj}.html`;
        const html = await fetchText(url);
        const w = parseNuxtWorkPayload(html);
        if (!w || !w.work_name) continue;
        const voiceNames = [];
        for (const c of w.creators || []) {
          if (c?.role === "voice_by") {
            for (const p of c.creators || []) if (p?.name) voiceNames.push(p.name);
          }
        }
        if (!voiceNames.some((n) => n.includes(TARGET_CV))) return null;
        const wt = w.work_type?.work_type_name || "ボイス・ASMR";
        const wtKey = w.work_type?.work_type || "";
        if (wtKey && wtKey !== "SOU" && !wt.includes("ボイス") && !wt.includes("ASMR")) return null;
        const tags = (w.genres || []).map((g) => g?.genre_name).filter(Boolean).slice(0, 8).join(" / ");
        const price = w.currency_price?.JPY ?? null;
        const dateStr = typeof w.release_date === "number" && w.release_date > 0
          ? new Date((w.release_date + 9 * 3600) * 1000).toISOString().slice(0, 10)
          : toDateStr(w.regist_date_str);
        return {
          kind: kindPath === "announce" ? "announce" : "work",
          row: [
            rj,
            w.work_name,
            dateStr,
            w.maker?.maker_name || "",
            typeof price === "number" ? Math.round(price) : null,
            w.rating?.average ?? null,
            w.rating?.count ?? 0,
            0,
            tags,
            wt,
            url,
            toAgeCode(w.age_category),
          ],
        };
      } catch {}
    }
  }
  return null;
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

function extractFsrIds(html) {
  const s = html.indexOf('id="search_result_list"');
  const e = html.indexOf('id="search_result_pager"', s > 0 ? s : 0);
  const seg = s > 0 ? html.slice(s, e > s ? e : s + 120000) : html;
  const ids = [...seg.matchAll(/data-product_id="(RJ\d{6,8})"/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

function extractAnnounceIds(html) {
  const parts = html.split('<div class="n_worklist_item"');
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i].slice(0, 4500);
    if (!block.includes(TARGET_CV)) continue;
    const m = block.match(/\/announce\/=\/product_id\/(RJ\d{6,8})\.html/);
    if (m) out.push(m[1]);
  }
  return [...new Set(out)];
}

async function main() {
  const works = JSON.parse(readFileSync(WORKS_PATH, "utf8"));
  let upcoming = JSON.parse(readFileSync(UPCOMING_PATH, "utf8"));
  if (!Array.isArray(works) || works.length < 1500) {
    throw new Error(`Safety abort: works.json count too small (${works?.length})`);
  }

  const today = todayJst();
  const byId = new Map(works.map((w) => [w[0], w]));
  const upcomingIds = new Set(upcoming.map((u) => u[0]));

  // 1. Batched numeric refresh across works + upcoming
  const allIds = [...new Set([...works.map((w) => w[0]), ...upcoming.map((u) => u[0])])];
  const ajaxData = new Map();
  let batchFails = 0;
  const totalBatches = Math.ceil(allIds.length / BATCH_SIZE);

  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const chunk = allIds.slice(i, i + BATCH_SIZE);
    try {
      const j = await fetchJson(`https://www.dlsite.com/maniax/product/info/ajax?product_id=${chunk.join(",")}`);
      for (const [k, v] of Object.entries(j || {})) ajaxData.set(k, v);
    } catch {
      batchFails++;
    }
    await sleep(250);
  }

  if (batchFails / Math.max(1, totalBatches) > 0.35) {
    throw new Error(`Aborting: ${batchFails}/${totalBatches} AJAX batches failed`);
  }

  let salesUpdated = 0;
  let promoted = 0;
  let addedWorks = 0;
  let addedUpcoming = 0;

  for (const w of works) {
    const info = ajaxData.get(w[0]);
    if (!info) continue;
    if (w[0] !== "BJ633449") {
      const nextSales = typeof info.dl_count === "number" ? info.dl_count : null;
      if (nextSales !== null && nextSales > (w[7] ?? 0)) {
        w[7] = nextSales;
        salesUpdated++;
      }
    }
    if (typeof info.rate_count === "number" && info.rate_count >= (w[6] || 0) && info.rate_average_2dp) {
      w[5] = info.rate_average_2dp;
      w[6] = info.rate_count;
    }
    if (typeof info.price === "number" && info.price > 0) {
      w[4] = Math.round(info.price);
    }
  }

  // 2. Check existing upcoming items for release promotion
  const nextUpcoming = [];
  for (const u of upcoming) {
    const info = ajaxData.get(u[0]);
    const rdate = toDateStr(info?.regist_date) || u[2] || "";
    const released = info && info.on_sale === 1 && info.is_ana !== 1 && rdate && rdate <= today;
    if (released && !byId.has(u[0])) {
      const cand = await inspectCandidate(u[0], false);
      if (cand && cand.kind === "work") {
        cand.row[7] = typeof info.dl_count === "number" ? info.dl_count : cand.row[7];
        works.push(cand.row);
        byId.set(u[0], cand.row);
        promoted++;
        continue;
      }
    }
    if (info && typeof info.price === "number" && info.price > 0) u[4] = Math.round(info.price);
    if (rdate) u[2] = rdate;
    nextUpcoming.push(u);
  }
  upcoming = nextUpcoming;

  // 3. Discover newly released works & new upcoming announcements
  const releaseSearchUrls = [
    "https://www.dlsite.com/maniax/fsr/=/keyword/%E6%9F%9A%E6%9C%A8%E3%81%A4%E3%81%B0%E3%82%81/order[0]/release_d/per_page[0]/100",
    "https://www.dlsite.com/home/fsr/=/keyword/%E6%9F%9A%E6%9C%A8%E3%81%A4%E3%81%B0%E3%82%81/order[0]/release_d/per_page[0]/100",
  ];
  for (const url of releaseSearchUrls) {
    try {
      const html = await fetchText(url);
      const ids = extractFsrIds(html);
      for (const rj of ids) {
        if (byId.has(rj)) continue;
        const cand = await inspectCandidate(rj, false);
        if (!cand) continue;
        if (cand.kind === "work") {
          const info = ajaxData.get(rj);
          if (info && typeof info.dl_count === "number") cand.row[7] = Math.max(cand.row[7] || 0, info.dl_count);
          works.push(cand.row);
          byId.set(rj, cand.row);
          upcoming = upcoming.filter((x) => x[0] !== rj);
          addedWorks++;
        } else if (!upcomingIds.has(rj)) {
          upcoming.push(cand.row);
          upcomingIds.add(rj);
          addedUpcoming++;
        }
        await sleep(250);
      }
    } catch {}
  }

  const announceSearchUrls = [
    "https://www.dlsite.com/maniax/announce/list/=/keyword/%E6%9F%9A%E6%9C%A8%E3%81%A4%E3%81%B0%E3%82%81",
    "https://www.dlsite.com/home/announce/list/=/keyword/%E6%9F%9A%E6%9C%A8%E3%81%A4%E3%81%B0%E3%82%81",
  ];
  for (const url of announceSearchUrls) {
    try {
      const html = await fetchText(url);
      const ids = extractAnnounceIds(html);
      for (const rj of ids) {
        if (byId.has(rj) || upcomingIds.has(rj)) continue;
        const cand = await inspectCandidate(rj, true);
        if (!cand || cand.kind !== "announce") continue;
        upcoming.push(cand.row);
        upcomingIds.add(rj);
        addedUpcoming++;
        await sleep(250);
      }
    } catch {}
  }

  works.sort((a, b) => (b[2] || "").localeCompare(a[2] || "") || b[0].localeCompare(a[0]));
  upcoming.sort((a, b) => (a[2] || "9999").localeCompare(b[2] || "9999") || a[0].localeCompare(b[0]));
  const stats = recomputeStats(works);

  console.log(JSON.stringify({
    mode: WRITE ? "write" : "dry-run",
    todayJst: today,
    ajaxItems: ajaxData.size,
    batchFails,
    salesUpdated,
    promotedUpcoming: promoted,
    addedWorks,
    addedUpcoming,
    worksTotal: stats.works_total,
    totalSales: stats.total_sales,
    upcomingTotal: upcoming.length,
  }));

  if (WRITE) {
    writeFileSync(WORKS_PATH, JSON.stringify(works));
    writeFileSync(UPCOMING_PATH, JSON.stringify(upcoming, null, 1) + "\n");
    writeFileSync(STATS_PATH, JSON.stringify(stats, null, 1) + "\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
