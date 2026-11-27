// GET /api/milestones — public, read-only milestone （記念日） list for the
// "Special Dates & Today's Record" card. Content is owner-managed in
// /admin; until an owner saves changes, the verified defaults are served.
import { loadMilestones } from "./_milestones.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { list } = await loadMilestones(env);
  return new Response(JSON.stringify({ ok: true, milestones: list }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
