// Milestones （記念日） — shared store for the owner API and the public API.
// Entries live in the PORTAL_STATE KV under one key; until an owner saves
// changes, DEFAULT_MILESTONES below are served (seeded from the site's
// long-standing commemorative-days copy, all facts verified).
// An entry is either annual ("md": "10-21") or one-off ("date": "2026-12-10").
// label/body/chips are per-language objects {ja, cn, en}; ja is required,
// cn/en fall back to ja at render time. Bodies may contain simple HTML
// (the public card renders them as HTML, as the original copy did).

export const MILESTONES_KV_KEY = "milestones_v1";
export const MAX_MILESTONES = 60;

export const DEFAULT_MILESTONES = [
  {
    id: "bday",
    md: "10-21",
    label: { ja: "10/21 🎂 お誕生日", cn: "10/21 🎂 生日", en: "10/21 🎂 Birthday" },
    body: {
      ja: "<b>10月21日</b>はアーティストのお誕生日です。（サンプル：対象に合わせて編集してください）",
      cn: "<b>10 月 21 日</b>是艺人的生日。（示例：请按目标艺人改写）",
      en: "<b>October 21</b> is the artist's birthday. (Sample — edit for your artist.)",
    },
    chips: { ja: ["🎂 10/21 お誕生日"], cn: ["🎂 10/21 生日"], en: ["🎂 Oct 21 Birthday"] },
  },
  {
    id: "sample-event",
    date: "2027-04-01",
    label: { ja: "4/1 📌 サンプルイベント", cn: "4/1 📌 示例事件", en: "4/1 📌 Sample Event" },
    body: {
      ja: "one-off（単発）マイルストーンのサンプルです。",
      cn: "一次性里程碑示例。",
      en: "A sample one-off milestone entry.",
    },
    chips: { ja: ["📌 サンプル"], cn: ["📌 示例"], en: ["📌 Sample"] },
  },
];

export async function loadMilestones(env) {
  const defaults = () => JSON.parse(JSON.stringify(DEFAULT_MILESTONES));
  if (!env.PORTAL_STATE) return { list: defaults(), isDefault: true };
  const raw = await env.PORTAL_STATE.get(MILESTONES_KV_KEY);
  if (!raw) return { list: defaults(), isDefault: true };
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return { list: arr, isDefault: false };
  } catch {
    /* fall through to defaults */
  }
  return { list: defaults(), isDefault: true };
}

export async function saveMilestones(env, list) {
  await env.PORTAL_STATE.put(MILESTONES_KV_KEY, JSON.stringify(list));
}

export async function resetMilestones(env) {
  await env.PORTAL_STATE.delete(MILESTONES_KV_KEY);
}
