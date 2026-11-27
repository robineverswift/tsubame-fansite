// /api/owner/drafts — Almanac candidate drafts review queue (KV: drafts_v1).
// Stores candidate entries spotted in daily updates or submitted in admin for owner review.
// Follows _shared.js session + sameOrigin + action/id-only audit conventions.
import { getSession, sameOrigin, audit, json, randomHex } from "./_shared.js";

const KEY = "drafts_v1";
const MAX_DRAFTS = 120;
const MD_RE = /^\d{2}-\d{2}$/;

async function readDrafts(env) {
  if (!env.PORTAL_STATE) return [];
  try {
    const raw = await env.PORTAL_STATE.get(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = await getSession(request, env);
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  const drafts = await readDrafts(env);
  return json({ ok: true, drafts });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const s = await getSession(request, env);
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  if (!sameOrigin(request)) return json({ ok: false, error: "bad_origin" }, 403);
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const action = String(body.action || "");
  const drafts = await readDrafts(env);

  if (action === "create") {
    const md = String(body.md || "").trim();
    if (!MD_RE.test(md)) return json({ ok: false, error: "bad_md" }, 400);
    const year = Number(body.year) || new Date().getFullYear();
    const emoji = String(body.emoji || "✨").trim().slice(0, 8) || "✨";
    const ja = String((body.text && body.text.ja) || "").trim().slice(0, 500);
    const cn = String((body.text && body.text.cn) || "").trim().slice(0, 500);
    const en = String((body.text && body.text.en) || "").trim().slice(0, 500);
    if (!ja) return json({ ok: false, error: "empty_ja" }, 400);
    const entry = {
      id: randomHex(8),
      md,
      y: year,
      emoji,
      text: { ja, cn: cn || ja, en: en || ja },
      status: "pending",
      created_at: Date.now()
    };
    drafts.unshift(entry);
    await env.PORTAL_STATE.put(KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
    audit(env, context, s.uid, "draft_create", entry.id);
    return json({ ok: true, draft: entry });
  }

  if (action === "approve") {
    const id = String(body.id || "");
    const item = drafts.find((d) => d.id === id);
    if (!item) return json({ ok: false, error: "not_found" }, 404);
    item.status = "approved";
    item.reviewed_at = Date.now();
    await env.PORTAL_STATE.put(KEY, JSON.stringify(drafts));
    audit(env, context, s.uid, "draft_approve", id);
    return json({ ok: true, draft: item });
  }

  if (action === "dismiss") {
    const id = String(body.id || "");
    const next = drafts.filter((d) => d.id !== id);
    if (next.length === drafts.length) return json({ ok: false, error: "not_found" }, 404);
    await env.PORTAL_STATE.put(KEY, JSON.stringify(next));
    audit(env, context, s.uid, "draft_dismiss", id);
    return json({ ok: true });
  }

  return json({ ok: false, error: "bad_action" }, 400);
}
