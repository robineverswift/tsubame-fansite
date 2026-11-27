// /api/owner/milestones — owner-managed commemorative days （記念日）.
// Stored in the PORTAL_STATE KV (see ../_milestones.js); served publicly
// through /api/milestones. Any whitelisted owner can create, edit and
// delete entries, or reset the list to the verified defaults.
// Audit entries carry only the action and entry id, never content.
import { getSession, sameOrigin, audit, json, randomHex } from "./_shared.js";
import {
  loadMilestones,
  saveMilestones,
  resetMilestones,
  MAX_MILESTONES,
} from "../_milestones.js";

const MAX_LABEL = 60;
const MAX_BODY = 1000;
const MAX_CHIP = 80;
const MAX_CHIPS = 8;
const MD_RE = /^\d{2}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanStr(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function cleanLangObj(v, max) {
  if (!v || typeof v !== "object") return { ja: "", cn: "", en: "" };
  return {
    ja: cleanStr(v.ja, max),
    cn: cleanStr(v.cn, max),
    en: cleanStr(v.en, max),
  };
}

function cleanChips(v) {
  if (!v || typeof v !== "object") return { ja: [], cn: [], en: [] };
  const one = (arr) =>
    Array.isArray(arr)
      ? arr.filter((s) => typeof s === "string").map((s) => s.slice(0, MAX_CHIP)).slice(0, MAX_CHIPS)
      : [];
  return { ja: one(v.ja), cn: one(v.cn), en: one(v.en) };
}

function validMd(md) {
  if (!MD_RE.test(md || "")) return false;
  const m = Number(md.slice(0, 2));
  const d = Number(md.slice(3, 5));
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

function cleanEntry(body, existing) {
  const md = cleanStr(body.md, 5);
  const date = cleanStr(body.date, 10);
  const entry = {
    id: existing ? existing.id : "",
    label: cleanLangObj(body.label, MAX_LABEL),
    body: cleanLangObj(body.body, MAX_BODY),
    chips: cleanChips(body.chips),
  };
  if (date && DATE_RE.test(date)) entry.date = date;
  else if (validMd(md)) entry.md = md;
  else return null;
  if (!entry.label.ja || !entry.body.ja) return null;
  return entry;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.PORTAL_STATE) return json({ ok: false, error: "not_configured" }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);
  const { list, isDefault } = await loadMilestones(env);
  return json({ ok: true, milestones: list, is_default: isDefault });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.PORTAL_STATE) return json({ ok: false, error: "not_configured" }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);
  if (!sameOrigin(request)) return json({ ok: false, error: "bad_origin" }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const action = body && body.action;
  const uid = session.uid;
  const { list } = await loadMilestones(env);

  if (action === "create") {
    if (list.length >= MAX_MILESTONES) return json({ ok: false, error: "too_many_entries" }, 400);
    const entry = cleanEntry(body, null);
    if (!entry) return json({ ok: false, error: "invalid_entry" }, 400);
    entry.id = randomHex(6);
    list.push(entry);
    await saveMilestones(env, list);
    await audit(env, context, uid, "milestone_create", { id: entry.id });
    return json({ ok: true, entry });
  }

  if (action === "update") {
    const idx = list.findIndex((m) => m.id === body.id);
    if (idx < 0) return json({ ok: false, error: "not_found" }, 404);
    const entry = cleanEntry(body, list[idx]);
    if (!entry) return json({ ok: false, error: "invalid_entry" }, 400);
    list[idx] = entry;
    await saveMilestones(env, list);
    await audit(env, context, uid, "milestone_update", { id: entry.id });
    return json({ ok: true, entry });
  }

  if (action === "delete") {
    const idx = list.findIndex((m) => m.id === body.id);
    if (idx < 0) return json({ ok: false, error: "not_found" }, 404);
    const [removed] = list.splice(idx, 1);
    await saveMilestones(env, list);
    await audit(env, context, uid, "milestone_delete", { id: removed.id });
    return json({ ok: true, deleted: removed.id });
  }

  if (action === "reset") {
    await resetMilestones(env);
    await audit(env, context, uid, "milestone_reset", {});
    const fresh = await loadMilestones(env);
    return json({ ok: true, milestones: fresh.list, is_default: true });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
