// Build-time generator: public/data/on-this-day.json
// Aggregates the works catalogue by calendar day (MM-DD) so the
// "Special Dates & Today's Record" card can tell a real story for
// every day of the year: which works were released on this day in
// past years, plus dated upcoming releases (for "out tomorrow").
// Runs as the first step of `npm run build`; the output is a static
// data file, regenerated on every deployment (works-watch pushes a
// fresh works.json -> the next build refreshes this file too).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const works = readJson("public/data/works.json");
const upcoming = readJson("public/data/upcoming.json");
const stats = readJson("public/data/stats.json");

// works.json row layout: [rj, title, date, circle, price, rating, ?,
// sales, tags, genre, url, ageCode] — ageCode: 0 all-ages, 1 R-15, 2 R18
// (same semantics the archive uses: only code 2 is behind the age gate).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const days = {};
const circlesSet = new Set();
for (const r of works) {
  const c = String(r[3] || "").trim();
  if (c) circlesSet.add(c);
  const date = String(r[2] || "");
  if (!DATE_RE.test(date)) continue;
  const md = date.slice(5);
  (days[md] = days[md] || []).push({
    y: Number(date.slice(0, 4)),
    rj: r[0],
    t: r[1],
    c: r[3],
    s: Number(r[7] || 0),
    r18: r[11] === 2,
  });
}
for (const md of Object.keys(days)) {
  days[md].sort((a, b) => b.y - a.y || b.s - a.s);
}

const upcomingDated = [];
for (const r of upcoming) {
  const date = String(r[2] || "");
  if (!DATE_RE.test(date)) continue;
  upcomingDated.push({ date, rj: r[0], t: r[1], c: r[3], r18: r[11] === 2 });
}
upcomingDated.sort((a, b) => (a.date < b.date ? -1 : 1));

const out = {
  generated: new Date().toISOString().slice(0, 10),
  totals: {
    works: stats.works_total,
    circles: circlesSet.size,
  },
  days,
  upcoming: upcomingDated,
};

writeFileSync(join(root, "public/data/on-this-day.json"), JSON.stringify(out));
const dayCount = Object.keys(days).length;
console.log(`[on-this-day] ${out.totals.works} works across ${dayCount} calendar days; ${upcomingDated.length} dated upcoming releases.`);
