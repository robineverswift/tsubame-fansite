// GET /api/owner/login — start X OAuth 2.0 (PKCE) sign-in for the site owner.
// Generates a one-time state + PKCE verifier (kept in a short-lived HttpOnly
// cookie) and redirects to X's authorize endpoint.
// Scope note: GET /2/users/me requires BOTH users.read and tweet.read on
// OAuth 2.0 user tokens — with users.read alone the token is issued but
// /users/me deterministically returns 403 (root cause found 2026-11-21).
import { PKCE_COOKIE, cookieHeader, randomHex, sha256B64url, htmlPage } from "./_shared.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.X_OAUTH_CLIENT_ID) {
    return htmlPage("準備中", "<p>オーナー認証はまだ有効化されていません。</p>", 503);
  }
  const url = new URL(request.url);
  const state = randomHex(16);
  const verifier = randomHex(32);
  const challenge = await sha256B64url(verifier);
  const redirectUri = `${url.origin}/api/owner/callback`;

  const auth = new URL("https://twitter.com/i/oauth2/authorize");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", env.X_OAUTH_CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", "users.read tweet.read");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");

  const headers = new Headers({ Location: auth.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookieHeader(PKCE_COOKIE, `${state}.${verifier}`, { maxAge: 600 }));
  return new Response(null, { status: 302, headers });
}
