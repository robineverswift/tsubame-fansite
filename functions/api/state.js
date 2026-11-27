// GET /api/state — public, read-only site state for the frontend.
// Exposes only the non-sensitive live toggles stored in KV.
export async function onRequestGet(context) {
  const { env } = context;
  let hideR18 = false;
  let notice = "";
  let killSwitch = false;
  let flags = {};
  if (env.PORTAL_STATE) {
    hideR18 = (await env.PORTAL_STATE.get("hide_r18")) === "true";
    notice = (await env.PORTAL_STATE.get("custom_notice")) || "";
    killSwitch = (await env.PORTAL_STATE.get("kill_switch")) === "true";
    try {
      const rawFlags = await env.PORTAL_STATE.get("flags_v1");
      if (rawFlags) {
        const parsed = JSON.parse(rawFlags);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) flags = parsed;
      }
    } catch (_) {}
  }
  return new Response(JSON.stringify({ hide_r18: hideR18, custom_notice: notice, kill_switch: killSwitch, flags }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
