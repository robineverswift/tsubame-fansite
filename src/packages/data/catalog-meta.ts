import statsData from "../../../public/data/stats.json";
import almanacData from "../../../public/data/almanac.json";
import worksData from "../../../public/data/works.json";
import siteCopy from "./site-copy.json";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const worksTotal = Number(statsData.works_total) || worksData.length;
const age = (statsData.age_breakdown ?? {}) as Record<string, number>;
const nonR18Total = Number(age["全年齢"] ?? 0) + Number(age["R-15"] ?? 0);
const almanacDays = Object.keys(almanacData).length;

let latestDate = "";
const circles = new Set<string>();
let rateSum = 0;
let rateCount = 0;
for (const row of worksData as unknown[][]) {
  const d = String(row[2] ?? "");
  if (DATE_RE.test(d) && d > latestDate) latestDate = d;
  const c = String(row[3] ?? "").trim();
  if (c) circles.add(c);
  const r = Number(row[5]);
  if (Number.isFinite(r) && r > 0) {
    rateSum += r;
    rateCount += 1;
  }
}

const circlesTotal = circles.size;
const avgRatingFormatted = rateCount > 0 ? (rateSum / rateCount).toFixed(2) : "—";

export const CATALOG_META = {
  version: siteCopy.version,
  worksTotal,
  worksTotalFormatted: worksTotal.toLocaleString("en-US"),
  circlesTotal,
  circlesTotalFormatted: circlesTotal.toLocaleString("en-US"),
  nonR18Total,
  nonR18TotalFormatted: nonR18Total.toLocaleString("en-US"),
  avgRatingFormatted,
  almanacDays,
  snapshotDate: latestDate || new Date().toISOString().slice(0, 10),
} as const;
