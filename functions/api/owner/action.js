// POST /api/owner/action — authenticated owner actions.
// Requires a valid owner session cookie AND a same-origin request (CSRF).
// Actions: kill_switch {on}, hide_r18 {on}, set_notice {text},
//          download_source, logout. Every action is written to a KV audit log.
import {
  BUNDLE_FILE,
  SESSION_COOKIE,
  clearCookieHeader,
  getSession,
  sameOrigin,
  audit,
  json,
  b64urlDecodeToBytes,
} from "./_shared.js";

function b64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
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

  if (action === "logout") {
    await audit(env, context, uid, "logout", null);
    const res = json({ ok: true });
    res.headers.append("Set-Cookie", clearCookieHeader(SESSION_COOKIE, "/"));
    return res;
  }

  if (action === "kill_switch") {
    const on = body.on === true;
    await env.PORTAL_STATE.put("kill_switch", on ? "true" : "false");
    await audit(env, context, uid, "kill_switch", { on });
    return json({ ok: true, kill_switch: on });
  }

  if (action === "hide_r18") {
    const on = body.on === true;
    await env.PORTAL_STATE.put("hide_r18", on ? "true" : "false");
    await audit(env, context, uid, "hide_r18", { on });
    return json({ ok: true, hide_r18: on });
  }

  if (action === "set_notice") {
    const text = typeof body.text === "string" ? body.text.slice(0, 200) : "";
    await env.PORTAL_STATE.put("custom_notice", text);
    await audit(env, context, uid, "set_notice", { text });
    return json({ ok: true, custom_notice: text });
  }

  if (action === "download_source") {
    // The bundle is a pre-generated ZIP (base64 text asset) built at deploy
    // time. Direct external access to the asset is blocked by middleware;
    // here it is fetched through the ASSETS binding after authentication.
    const assetUrl = new URL("/" + BUNDLE_FILE, request.url);
    const assetRes = await env.ASSETS.fetch(assetUrl);
    if (!assetRes.ok) return json({ ok: false, error: "bundle_missing" }, 500);
    const bytes = b64ToBytes(await assetRes.text());
    await audit(env, context, uid, "download_source", { bytes: bytes.length });
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="tsubame-portal-source.zip"',
        "Cache-Control": "no-store",
      },
    });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
