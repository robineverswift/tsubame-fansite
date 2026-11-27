# Data adapters — the catalogue contract

The site renders whatever an **adapter** writes into `public/data/`. An
adapter is any program (the reference is a Node script) that reads one
platform's public listings for one creator and emits the files below. This is
the seam where a new fandom plugs in: the framework does not know what a
"work" is on your platform — your adapter decides, within this contract.

## Output files

### `public/data/works.json` — released works

A JSON array of rows. Each row is a positional array of exactly 12 fields:

| # | Field | Type | Meaning |
| --- | --- | --- | --- |
| 0 | `id` | string | The platform's product/work ID (`RJ…` on DLsite). Unique per row. |
| 1 | `title` | string | Work title as listed. |
| 2 | `date` | string | Release date, `YYYY-MM-DD`. |
| 3 | `maker` | string | Circle / label / channel name as listed. |
| 4 | `price` | number \| null | Listed price in the platform's currency unit; `null` when not applicable (e.g. a free video). |
| 5 | `rating` | number \| null | Average rating when the platform exposes one, else `null`. |
| 6 | `ratingCount` | number | How many ratings; `0` when unknown. |
| 7 | `metric` | number | The platform's primary popularity count — downloads/sales on DLsite, views on YouTube. Labelled per platform in the UI copy; never mix two metrics in one file. |
| 8 | `tags` | string | Up to 8 tags, joined with `" / "`. |
| 9 | `type` | string | The platform's work-type label (`ボイス・ASMR`, `Video`, …). |
| 10 | `url` | string | Canonical public URL of the work. |
| 11 | `age` | number | `0` = all-ages, `1` = R-15, `2` = adult. Drives the site's age gate. Platforms without ratings use `0` unless a work is adult, then `2`. |

Rows are sorted newest first. The file is compact JSON (no pretty-printing).

### `public/data/stats.json` — aggregates

An object with at least: `works_total` (number), `total_sales` (sum of the
`metric` column), `age_breakdown` (counts keyed by the platform's age labels),
`yearly_counts`, `monthly_matrix`, `top_circles`. Compute it from the same
snapshot as `works.json`; the site never recomputes sales figures itself.

### `public/data/upcoming.json` — announced, not yet released

Same row shape as `works.json`, for works announced with a future date. When
a work releases, the adapter moves its row into `works.json`.

## Adapter rules

1. **Generated, never hand-edited.** If the data is wrong, fix the adapter.
2. **Fail safe.** Abort the write when the fetched count collapses versus the
   previous snapshot (the reference adapter refuses to write a catalogue that
   shrinks below a sanity floor) — a blocked scrape must never publish an
   empty archive.
3. **Monotonic metric.** The `metric` column never decreases for a work that
   was already listed; keep the maximum of old and new. Some platforms strip
   counts by region, and a smaller reading is a reading error, not a fact.
4. **Public listings only.** An adapter reads what any visitor can see. No
   logged-in scraping of someone else's account, no private data.

## Reference adapters

`scripts/sync-dlsite.mjs` implements this contract for DLsite (voice works by
one voice actress, filtered by credited cast). Read it as the worked example:
discovery, per-work fetch, row construction, stats rebuild, upcoming →
released promotion, and the safety rules above.

`scripts/sync-youtube.mjs` implements it for YouTube (a VTuber's or creator's
channel), via the YouTube Data API v3:

```sh
YOUTUBE_API_KEY=... YOUTUBE_CHANNEL_ID=UC... node scripts/sync-youtube.mjs --write
```

Get a free API key in the Google Cloud console (YouTube Data API v3); the
channel ID is the `UC…` identifier on the channel's page. A sync costs
roughly 1 quota unit per API call — a 1,000-video channel is ~41 units of
the free 10,000/day. Mapping notes: `metric` is the view count,
`ratingCount` the like count, `type` is `Video` / `Stream` / `Short`
(≤ 60 s), dates are the publish date in Asia/Tokyo, and a scheduled stream
that has not started yet lands in `upcoming.json` and promotes itself once
it goes live. Without `--write` the sync is a dry run.

`scripts/sync-booth.mjs` implements it for BOOTH (a creator's shop), from
the shop's public pages — BOOTH has no public API:

```sh
BOOTH_SHOP=yuzuki-tsubame node scripts/sync-booth.mjs --write
```

`BOOTH_SHOP` is the shop subdomain (`https://<shop>.booth.pm`). Mapping
notes: `price` is the listed minimum price in JPY, `metric` is `0` (BOOTH
exposes no public sales count), `date` is the item's publication date
（商品公開日時）, `type` is the item's category, `age` is `2` when the item
carries BOOTH's adult label, and `upcoming.json` is always empty (BOOTH
lists pre-orders as normal products). Two operational notes: BOOTH sits
behind a bot check, so run the sync from a normal connection — if your
network is challenged, copy your browser's Cookie header into
`BOOTH_COOKIE`; and adult items sit behind an 18+ confirmation, which the
same cookie (set after confirming once in your browser) unlocks. The sync
aborts without writing if every item fetch fails or is gated.

## Writing an adapter for another platform

The audiences this framework is built for live mostly on a few platforms:

- **Ci-en / Fantia** (creator posts) — posts can be catalogued the same way,
  with the post date as `date` and no price/metric.

Keep the platform's vocabulary in the `type` and `tags` columns instead of
translating it into DLsite terms; the UI displays them as-is.
