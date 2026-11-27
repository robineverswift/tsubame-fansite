// /api/owner/records — private record book (Record positioning, Robin 2026-11-22).
// Records are PRIVATE BY DEFAULT: they are never exposed through /api/state
// or any public route, never enter the repo or the source bundle, and live
// only in the PORTAL_STATE KV under a single key. Any whitelisted owner
// (X-authenticated) can list, create, edit and permanently delete entries.
// Deletion is real deletion — no tombstones, no copies; audit entries carry
// only the action and entry id, never record content.
import { getSession, sameOrigin, audit, json, randomHex } from "./_shared.js";

const KV_KEY = "records_v1";
const MAX_ENTRIES = 500;
const MAX_TITLE = 120;
const MAX_BODY = 5000;
const MAX_DATE = 20;

async function loadRecords(env) {
  const raw = await env.PORTAL_STATE.get(KV_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveRecords(env, records) {
  await env.PORTAL_STATE.put(KV_KEY, JSON.stringify(records));
}

function cleanStr(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.PORTAL_STATE) return json({ ok: false, error: "not_configured" }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);
  const records = await loadRecords(env);
  return json({ ok: true, records: [...records].reverse() });
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
  const records = await loadRecords(env);
  const now = new Date().toISOString();

  if (action === "create") {
    const text = cleanStr(body.body, MAX_BODY).trim();
    if (!text) return json({ ok: false, error: "empty_body" }, 400);
    if (records.length >= MAX_ENTRIES) return json({ ok: false, error: "too_many_entries" }, 400);
    const entry = {
      id: randomHex(8),
      date: cleanStr(body.date, MAX_DATE),
      title: cleanStr(body.title, MAX_TITLE),
      body: text,
      author: uid,
      created_at: now,
      updated_at: now,
    };
    records.push(entry);
    await saveRecords(env, records);
    await audit(env, context, uid, "record_create", { id: entry.id });
    return json({ ok: true, entry });
  }

  if (action === "update") {
    const idx = records.findIndex((r) => r.id === body.id);
    if (idx < 0) return json({ ok: false, error: "not_found" }, 404);
    const text = cleanStr(body.body, MAX_BODY).trim();
    if (!text) return json({ ok: false, error: "empty_body" }, 400);
    records[idx] = {
      ...records[idx],
      date: cleanStr(body.date, MAX_DATE),
      title: cleanStr(body.title, MAX_TITLE),
      body: text,
      updated_at: now,
    };
    await saveRecords(env, records);
    await audit(env, context, uid, "record_update", { id: records[idx].id });
    return json({ ok: true, entry: records[idx] });
  }

  if (action === "delete") {
    const idx = records.findIndex((r) => r.id === body.id);
    if (idx < 0) return json({ ok: false, error: "not_found" }, 404);
    const [removed] = records.splice(idx, 1);
    await saveRecords(env, records);
    await audit(env, context, uid, "record_delete", { id: removed.id });
    return json({ ok: true, deleted: removed.id });
  }

  if (action === "delete_all") {
    const count = records.length;
    await saveRecords(env, []);
    await audit(env, context, uid, "record_delete_all", { count });
    return json({ ok: true, deleted: count });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
