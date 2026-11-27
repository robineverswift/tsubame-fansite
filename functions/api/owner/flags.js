// /api/owner/flags — Owner-managed feature flags (KV: flags_v1).
// Follows _shared.js session + sameOrigin + action/id-only audit conventions.
import { getSession, sameOrigin, audit, json } from "./_shared.js";

const KEY = "flags_v1";
const ALLOWED_KEYS = ["show_upcoming_public", "hide_almanac", "show_data_health_badge", "external_youtube_only"];

async function readFlags(env) {
  if (!env.PORTAL_STATE) return {};
  try {
    const raw = await env.PORTAL_STATE.get(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = await getSession(request, env);
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  const flags = await readFlags(env);
  return json({ ok: true, flags, allowed: ALLOWED_KEYS });
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
  if (action === "set") {
    const k = String(body.key || "").trim();
    if (!ALLOWED_KEYS.includes(k)) return json({ ok: false, error: "unknown_flag" }, 400);
    const flags = await readFlags(env);
    flags[k] = body.on === true;
    await env.PORTAL_STATE.put(KEY, JSON.stringify(flags));
    audit(env, context, s.uid, "flag_set", k + ":" + (flags[k] ? "1" : "0"));
    return json({ ok: true, flags });
  }
  if (action === "reset") {
    await env.PORTAL_STATE.delete(KEY);
    audit(env, context, s.uid, "flag_reset", "all");
    return json({ ok: true, flags: {} });
  }
  return json({ ok: false, error: "bad_action" }, 400);
}
