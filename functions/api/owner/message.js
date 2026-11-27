// Owner message channel: an authenticated owner (Tsubame, or the creator)
// can leave a message for the creator from inside the owner menu.
import { json, getSession, sameOrigin, audit, randomHex } from "./_shared.js";

const KEY = "messages_v1";
const MAX_MESSAGES = 200;
const CREATOR_UID = "YOUR_X_USER_ID"; // TODO: the site operator's own X user ID
const KINDS = ["warning", "request", "other"];
const KIND_JA = { warning: "⚠️ 警告", request: "削除・修正のお願い", other: "連絡" };

async function readAll(env) {
  try {
    const raw = await env.PORTAL_STATE.get(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = await getSession(request, env);
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  const all = await readAll(env);
  const messages = all.map((m) => ({
    id: m.id,
    kind: m.kind,
    body: m.body,
    created_at: m.created_at,
    from: m.author === CREATOR_UID ? "creator" : "artist",
    mine: m.author === s.uid
  }));
  return json({ ok: true, messages });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const s = await getSession(request, env);
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  if (!sameOrigin(request)) return json({ ok: false, error: "bad_origin" }, 403);
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const action = String(body.action || "");
  const all = await readAll(env);

  if (action === "create") {
    const kind = KINDS.includes(body.kind) ? body.kind : "other";
    const text = String(body.body || "").trim().slice(0, 2000);
    if (!text) return json({ ok: false, error: "empty" }, 400);
    const testMode = String(env.OWNER_TEST_MODE || "") === "1";
    const isCreator = !testMode && s.uid === CREATOR_UID;
    const entry = {
      id: randomHex(8),
      kind,
      body: text,
      author: isCreator ? CREATOR_UID : s.uid,
      created_at: Date.now()
    };
    all.unshift(entry);
    await env.PORTAL_STATE.put(KEY, JSON.stringify(all.slice(0, MAX_MESSAGES)));
    audit(env, context, s.uid, "message_create", entry.id);

    let emailed = false;
    const to = isCreator
      ? []
      : String(env.OWNER_ALERT_EMAILS || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

    if (to.length && (env.MAIL_RELAY || env.EMAIL)) {
      const subject = "【つばめレコード】" + KIND_JA[kind] + "が届きました";
      const mailText =
        "つばめレコードの本人メニューから、メッセージが届きました。\n\n" +
        "種別: " + KIND_JA[kind] + "\n\n" +
        text +
        "\n\n— このメールはサイトからの自動送信です。同じ内容がサイト内の本人メニューにも保存されています。";
      const sendTask = (async () => {
        try {
          if (env.MAIL_RELAY && env.RELAY_SECRET) {
            await env.MAIL_RELAY.fetch("https://relay.internal/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-relay-secret": env.RELAY_SECRET
              },
              body: JSON.stringify({ to, subject, text: mailText })
            });
          } else if (env.EMAIL) {
            await env.EMAIL.send({
              from: { email: "record@example.com", name: "つばめレコード" },
              to,
              subject,
              text: mailText
            });
          }
        } catch (_) {}
      })();
      if (context && typeof context.waitUntil === "function") {
        context.waitUntil(sendTask);
        emailed = "queued";
      } else {
        await sendTask;
        emailed = true;
      }
    }
    return json({ ok: true, id: entry.id, emailed });
  }

  if (action === "delete") {
    const id = String(body.id || "");
    const next = all.filter((m) => m.id !== id);
    if (next.length === all.length) return json({ ok: false, error: "not_found" }, 404);
    await env.PORTAL_STATE.put(KEY, JSON.stringify(next));
    audit(env, context, s.uid, "message_delete", id);
    return json({ ok: true });
  }

  return json({ ok: false, error: "bad_action" }, 400);
}
