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

## Reference adapter

`scripts/sync-dlsite.mjs` implements this contract for DLsite (voice works by
one voice actress, filtered by credited cast). Read it as the worked example:
discovery, per-work fetch, row construction, stats rebuild, upcoming →
released promotion, and the safety rules above.

## Writing an adapter for another platform

The audiences this framework is built for live mostly on a few platforms:

- **BOOTH** (doujin goods by fellow creators) — products map naturally:
  price is real, `metric` is usually unavailable → use `0` and let rating
  columns stay `null` / `0`.
- **YouTube** (VTuber videos and streams) — a "work" is a video: `price` is
  `null`, `metric` carries the view count, `type` distinguishes videos,
  streams and shorts, `maker` is the channel.
- **Ci-en / Fantia** (creator posts) — posts can be catalogued the same way,
  with the post date as `date` and no price/metric.

Keep the platform's vocabulary in the `type` and `tags` columns instead of
translating it into DLsite terms; the UI displays them as-is.
