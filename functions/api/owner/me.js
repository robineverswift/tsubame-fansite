// GET /api/owner/me — report whether the caller holds a valid owner session.
import { getSession, json } from "./_shared.js";

const CREATOR_UID = "YOUR_X_USER_ID"; // TODO: the site operator's own X user ID

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);
  const testMode = String(env.OWNER_TEST_MODE || "") === "1";
  const isCreator = !testMode && session.uid === CREATOR_UID;
  let killSwitch = false;
  if (env.PORTAL_STATE) {
    try {
      killSwitch = (await env.PORTAL_STATE.get("kill_switch")) === "true";
    } catch (_) {}
  }
  return json({
    ok: true,
    uid: session.uid,
    username: session.username || null,
    is_creator: isCreator,
    kill_switch: killSwitch
  });
}
