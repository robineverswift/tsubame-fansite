// Shared helpers for the Owner Control Console (Cloudflare Pages Functions).
// Not a route (underscore-prefixed). Imported by the owner endpoints and middleware.

export const BUNDLE_FILE = "source-bundle-7c6db917923b0e0d.txt"; // base64 of the pre-generated source ZIP
export const OFFICIAL_SITE = "https://example.com/";
export const SESSION_COOKIE = "owner_session";
export const PKCE_COOKIE = "owner_pkce";
export const SESSION_TTL_MS = 15 * 60 * 1000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecodeToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function randomHex(nBytes) {
  const a = new Uint8Array(nBytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256B64url(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return b64urlEncode(digest);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(secret, payloadObj) {
  const payload = b64urlEncode(enc.encode(JSON.stringify(payloadObj)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return payload + "." + b64urlEncode(sig);
}

export async function verifySession(secret, token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let sigBytes;
  try {
    sigBytes = b64urlDecodeToBytes(sig);
  } catch {
    return null;
  }
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  if (!ok) return null;
  let obj;
  try {
    obj = JSON.parse(dec.decode(b64urlDecodeToBytes(payload)));
  } catch {
    return null;
  }
  if (!obj || typeof obj.exp !== "number" || Date.now() > obj.exp) return null;
  if (typeof obj.uid !== "string") return null;
  return obj;
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookieHeader(name, value, { maxAge, path = "/api/owner" } = {}) {
  let h = `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=${path}`;
  if (typeof maxAge === "number") h += `; Max-Age=${maxAge}`;
  return h;
}

export function clearCookieHeader(name, path = "/api/owner") {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=${path}; Max-Age=0`;
}

export function whitelist(env) {
  return (env.OWNER_X_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getSession(request, env) {
  if (!env.OWNER_SESSION_SECRET) return null;
  const cookies = parseCookies(request);
  return verifySession(env.OWNER_SESSION_SECRET, cookies[SESSION_COOKIE]);
}

export function sameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      return new URL(origin).host === url.host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).host === url.host;
    } catch {
      return false;
    }
  }
  return false;
}

export async function audit(env, ctx, uid, action, detail) {
  if (!env.PORTAL_STATE) return;
  const t = new Date().toISOString();
  const entry = JSON.stringify({ t, uid, action, detail: detail || null });
  const p = env.PORTAL_STATE.put(`audit:${t}:${uid}`, entry);
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
  else await p;
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}

export function htmlPage(title, bodyHtml, status = 200) {
  const doc = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;background:#faf6ef;color:#333;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{max-width:26rem;padding:2rem;text-align:center;line-height:1.8}a{color:#7a5c2e}</style></head><body><div class="card">${bodyHtml}</div></body></html>`;
  return new Response(doc, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
