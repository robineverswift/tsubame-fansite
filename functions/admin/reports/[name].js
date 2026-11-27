// GET /admin/reports/:name — owner-only Catalog Archive report files
// (v1.3.10.3, Gemini handoff 2026-11-25 20:26 JST).
// The report payloads live as static assets under /_reports/; direct
// external access to that prefix is 403'd by the root middleware, the
// same pattern as the pre-generated source bundle. They are served
// only here, after the X-OAuth owner session check (getSession, the
// exact mechanism behind /api/owner/*), via the ASSETS binding.
// The PDF travels as a base64 text asset because the repo push
// pipeline is text-only; it is decoded here, mirroring the
// download_source action in functions/api/owner/action.js.
import { getSession, audit } from "../../api/owner/_shared.js";

const REPORTS = {
  "catalog-2026-11-25.html": {
    asset: "/_reports/catalog-2026-11-25.html",
    type: "text/html; charset=utf-8",
    base64: false,
  },
  "catalog-2026-11-25.pdf": {
    asset: "/_reports/catalog-2026-11-25.pdf.b64.txt",
    type: "application/pdf",
    base64: true,
  },
  "catalog-deep-2026-11-26.html": {
    asset: "/_reports/catalog-deep-2026-11-26.html",
    type: "text/html; charset=utf-8",
    base64: false,
  },
  "catalog-deep-2026-11-26.pdf": {
    asset: "/_reports/catalog-deep-2026-11-26.pdf.b64.txt",
    type: "application/pdf",
    base64: true,
  },
};

function b64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function plain(text, status) {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const name = params && params.name;
  const entry = REPORTS[name];
  if (!entry) return plain("Not Found", 404);
  const session = await getSession(request, env);
  if (!session) return plain("Unauthorized — please sign in via /admin first.", 401);
  if (!env.ASSETS) return plain("Reports are not configured on this deployment.", 503);
  const assetRes = await env.ASSETS.fetch(new URL(entry.asset, request.url));
  if (!assetRes.ok) return plain("Report asset missing.", 500);
  await audit(env, context, session.uid, "view_report", { name });
  if (entry.base64) {
    const bytes = b64ToBytes(await assetRes.text());
    return new Response(bytes, {
      status: 200,
      headers: { "Content-Type": entry.type, "Cache-Control": "no-store" },
    });
  }
  return new Response(assetRes.body, {
    status: 200,
    headers: { "Content-Type": entry.type, "Cache-Control": "no-store" },
  });
}
