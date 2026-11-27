// YouTube catalog sync for the fansite framework.
// Builds public/data/{works,upcoming,stats}.json from one channel's public
// videos via the YouTube Data API v3: channels.list -> uploads playlist ->
// playlistItems.list -> videos.list. A "work" is a video: price null,
// metric = view count (monotonic, max of old and new), ratingCount = likes,
// type = Video / Stream / Short. Scheduled (not yet started) streams go to
// upcoming.json and promote automatically once they start.
// Enforces the adapter contract (docs/ADAPTERS.md): generated files only,
// fail-safe abort when the fetched catalogue collapses versus the previous
// snapshot, public listings only.
//
// Usage:
//   YOUTUBE_API_KEY=... YOUTUBE_CHANNEL_ID=UC... node scripts/sync-youtube.mjs [--write]
// Without --write the sync is a dry run: it reports what would change and
// writes nothing. YOUTUBE_API_BASE overrides the API origin (testing).
// Quota: ~1 unit per call; a 1,000-video channel costs ~41 units of the
// free 10,000/day.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKS_PATH = join(ROOT, "public/data/works.json");
const UPCOMING_PATH = join(ROOT, "public/data/upcoming.json");
const STATS_PATH = join(ROOT, "public/data/stats.json");

const WRITE = process.argv.includes("--write");
const API_KEY = process.env.YOUTUBE_API_KEY || "";
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "";
const API_BASE = (process.env.YOUTUBE_API_BASE || "https://www.googleapis.com/youtube/v3").replace(/\/$/, "");

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function toJstDate(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function parseDurationSeconds(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

async function api(path, params) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${path} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
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
  if (!API_KEY || !CHANNEL_ID) {
    throw new Error("Set YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID (see docs/ADAPTERS.md). Nothing was written.");
  }

  const prevWorks = readJson(WORKS_PATH, []);
  const prevById = new Map(prevWorks.map((r) => [r[0], r]));

  const ch = await api("/channels", { part: "contentDetails,snippet", id: CHANNEL_ID });
  const item = (ch.items || [])[0];
  if (!item) throw new Error(`Channel not found: ${CHANNEL_ID}`);
  const uploads = item.contentDetails.relatedPlaylists.uploads;
  const channelTitle = (item.snippet && item.snippet.title) || CHANNEL_ID;

  const ids = [];
  let pageToken = "";
  do {
    const pl = await api("/playlistItems", {
      part: "contentDetails", playlistId: uploads, maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const it of pl.items || []) ids.push(it.contentDetails.videoId);
    pageToken = pl.nextPageToken || "";
  } while (pageToken);

  const fetched = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const vs = await api("/videos", {
      part: "snippet,statistics,contentDetails,liveStreamingDetails",
      id: batch.join(","), maxResults: "50",
    });
    for (const v of vs.items || []) fetched.set(v.id, v);
  }

  // Fail safe: a collapsed fetch must never shrink the published archive.
  if (prevWorks.length >= 10 && fetched.size < prevWorks.length * 0.5) {
    throw new Error(`Fetched ${fetched.size} videos vs ${prevWorks.length} previously listed — aborting, nothing written.`);
  }

  const worksById = new Map(prevById);
  const upcomingById = new Map();
  let addedWorks = 0, updatedWorks = 0, addedUpcoming = 0;

  for (const v of fetched.values()) {
    const sn = v.snippet || {};
    const st = v.statistics || {};
    const cd = v.contentDetails || {};
    const live = v.liveStreamingDetails || {};
    const tags = (sn.tags || []).slice(0, 8).join(" / ");
    const age = (cd.contentRating && cd.contentRating.ytRating === "ytAgeRestricted") ? 2 : 0;
    const base = [
      v.id,
      sn.title || "",
      "", // date, set below
      sn.channelTitle || channelTitle,
      null,
      null,
      Number(st.likeCount || 0),
      Number(st.viewCount || 0),
      tags,
      "", // type, set below
      `https://www.youtube.com/watch?v=${v.id}`,
      age,
    ];
    if (live.scheduledStartTime && !live.actualStartTime) {
      base[2] = toJstDate(live.scheduledStartTime);
      base[9] = "Stream";
      if (!upcomingById.has(v.id)) addedUpcoming++;
      upcomingById.set(v.id, base);
      continue;
    }
    base[2] = toJstDate(sn.publishedAt);
    base[9] = live.actualStartTime ? "Stream" : (parseDurationSeconds(cd.duration) <= 60 ? "Short" : "Video");
    const prev = prevById.get(v.id);
    if (prev) {
      base[7] = Math.max(base[7], Number(prev[7] || 0)); // monotonic metric
      updatedWorks++;
    } else {
      addedWorks++;
    }
    worksById.set(v.id, base);
  }

  const works = [...worksById.values()]
    .sort((a, b) => (b[2] || "").localeCompare(a[2] || "") || b[0].localeCompare(a[0]));
  const upcoming = [...upcomingById.values()]
    .sort((a, b) => (a[2] || "9999").localeCompare(b[2] || "9999") || a[0].localeCompare(b[0]));
  const stats = recomputeStats(works);

  console.log(JSON.stringify({
    mode: WRITE ? "write" : "dry-run",
    channel: channelTitle,
    fetchedVideos: fetched.size,
    addedWorks, updatedWorks, addedUpcoming,
    worksTotal: stats.works_total,
    totalViews: stats.total_sales,
    upcomingTotal: upcoming.length,
  }));

  if (WRITE) {
    writeFileSync(WORKS_PATH, JSON.stringify(works));
    writeFileSync(UPCOMING_PATH, JSON.stringify(upcoming, null, 1) + "\n");
    writeFileSync(STATS_PATH, JSON.stringify(stats, null, 1) + "\n");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
