// GET /api/owner/callback — X OAuth 2.0 callback (PKCE).
// Verifies the one-time state against the PKCE cookie, exchanges the code,
// reads /2/users/me, and only if the numeric user ID is on the whitelist
// issues a signed 15-minute owner session cookie. The X access token is
// used for the single /users/me call and then discarded (never stored).
import {
  PKCE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clearCookieHeader,
  cookieHeader,
  parseCookies,
  signSession,
  whitelist,
  audit,
  htmlPage,
} from "./_shared.js";

function fail(message, status = 400) {
  const page = htmlPage("認証エラー", `<p>${message}</p><p><a href="/">トップへ戻る</a></p>`, status);
  const h = new Headers(page.headers);
  h.append("Set-Cookie", clearCookieHeader(PKCE_COOKIE));
  return new Response(page.body, { status, headers: h });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.X_OAUTH_CLIENT_ID || !env.X_OAUTH_CLIENT_SECRET || !env.OWNER_SESSION_SECRET) {
    return htmlPage("準備中", "<p>オーナー認証はまだ有効化されていません。</p>", 503);
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request);
  const pkce = cookies[PKCE_COOKIE] || "";
  const dot = pkce.indexOf(".");
  const savedState = dot > 0 ? pkce.slice(0, dot) : "";
  const verifier = dot > 0 ? pkce.slice(dot + 1) : "";

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return fail("認証の有効期限が切れたか、状態が一致しません。もう一度お試しください。", 400);
  }

  const redirectUri = `${url.origin}/api/owner/callback`;
  const basic = btoa(`${env.X_OAUTH_CLIENT_ID}:${env.X_OAUTH_CLIENT_SECRET}`);
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) {
    const detail = (await tokenRes.text()).slice(0, 300);
    console.error("owner callback: token exchange failed", tokenRes.status, detail);
    return fail(`X 側でトークン交換に失敗しました。[${tokenRes.status}]`, 502);
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return fail("X 側でトークン交換に失敗しました。もう一度お試しください。", 502);
  }

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    const detail = (await meRes.text()).slice(0, 300);
    console.error("owner callback: users/me failed", meRes.status, detail);
    return fail(`X アカウント情報を取得できませんでした。[${meRes.status}]`, 502);
  }
  const me = await meRes.json();
  const uid = me && me.data && me.data.id ? String(me.data.id) : "";
  const username = me && me.data && me.data.username ? String(me.data.username) : "";
  // accessToken is discarded here — never stored, never logged.

  if (!uid || !whitelist(env).includes(uid)) {
    const page = htmlPage(
      "権限がありません",
      "<p>このアカウントにはオーナー権限がありません。</p><p>ご本人様専用の機能です。</p><p><a href=\"/\">トップへ戻る</a></p>",
      403
    );
    const h = new Headers(page.headers);
    h.append("Set-Cookie", clearCookieHeader(PKCE_COOKIE));
    return new Response(page.body, { status: 403, headers: h });
  }

  const session = await signSession(env.OWNER_SESSION_SECRET, {
    uid,
    username,
    exp: Date.now() + SESSION_TTL_MS,
  });
  await audit(env, context, uid, "login", { username });

  const headers = new Headers({ Location: "/admin", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearCookieHeader(PKCE_COOKIE));
  // Session cookie Path is "/" (not the /api/owner default) so the
  // browser also presents it to the authenticated /admin/reports/:name
  // route (v1.3.10.3); the token itself is unchanged (HMAC-signed,
  // HttpOnly, Secure, SameSite=Lax, 15-minute TTL).
  headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, session, { maxAge: SESSION_TTL_MS / 1000, path: "/" }));
  return new Response(null, { status: 302, headers });
}
