// Edge middleware for the whole site.
// 1. The pre-generated source bundle asset is never served to direct
//    external requests — it is only reachable through the authenticated
//    /api/owner/action download (via the ASSETS binding). The same
//    applies to the /_reports/ source assets (owner Catalog Archive
//    reports): only reachable through the authenticated
//    /admin/reports/:name route (functions/admin/reports/[name].js).
// 2. Kill switch: when KV kill_switch === "true", every route except
//    /api/owner/* and /api/state responds 302 (never 301 — a permanent
//    redirect would be cached by browsers and become hard to reverse)
//    to the official site, with Cache-Control: no-store.
// If the KV binding is missing, the middleware fails open so a config
// mistake can never take the site down.
import { BUNDLE_FILE, OFFICIAL_SITE } from "./api/owner/_shared.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/" + BUNDLE_FILE) {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (path.startsWith("/_reports/")) {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const exempt =
    path.startsWith("/api/owner/") ||
    path === "/api/state" ||
    path === "/admin" ||
    path === "/admin.html" ||
    path === "/scripts/admin-client.js" ||
    path.startsWith("/_astro/") ||
    path.startsWith("/assets/brand/") ||
    path.startsWith("/assets/icons/");
  if (!exempt && env.PORTAL_STATE) {
    let kill = null;
    try {
      kill = await env.PORTAL_STATE.get("kill_switch");
    } catch {
      kill = null;
    }
    if (kill === "true") {
      return new Response(null, {
        status: 302,
        headers: { Location: OFFICIAL_SITE, "Cache-Control": "no-store" },
      });
    }
  }
  return next();
}
