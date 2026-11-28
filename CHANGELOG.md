# Changelog

All notable changes to tsubame-fansite. Versions follow SemVer (a minor is a
new capability; everything else is a patch). Full notes for each version are
on the [Releases](https://github.com/robineverswift/tsubame-fansite/releases)
page.

## v2.4.1 — 2026-11-28

- Repository hygiene: `LICENSE` is now the unmodified MIT text, so GitHub
  detects the license correctly. The third-party rights notice that used to
  be appended to it moved to `NOTICE.md`, content unchanged.
- Added this changelog.

## v2.4.0 — 2026-11-27

- Export sync from tsubame-record v1.5.0.
- Dual-font hierarchy: M PLUS Rounded 1c for display type, BIZ UDPGothic for
  body text.
- Admin console streamlined to four panels; dead feature flags and the
  retired OAuth 1.0a helper code removed.

## v2.3.0 — 2026-11-27

- BOOTH adapter: `scripts/sync-booth.mjs` builds the catalogue from a BOOTH
  shop's public pages.

## v2.2.0 — 2026-11-27

- YouTube adapter (Data API v3): `scripts/sync-youtube.mjs` builds the
  catalogue from one channel. Scheduled streams land in `upcoming.json` and
  promote automatically once they go live.

## v2.1.0 — 2026-11-27

- The channel directory and the owner console's creator ID join the subject
  pack: `channels` in `subject.config.json` drives the official-channels
  directory, and `owner.creatorXUserId` replaces the hand-edited creator-ID
  placeholders in the owner functions.

## v2.0.0 — 2026-11-27

- Config-driven framework: identity, palettes, fonts and brand assets now
  live in `subject.config.json`, stamped into the tree by
  `scripts/apply-subject.mjs` with drift detection.

## v1.1.0 — 2026-11-27

- Framework sync from TSUBAME RECORD v1.4.9.
- Open Graph / Twitter card meta on the homepage.

## v1.0.0 — 2026-11-27

- Initial release.
- Public archive site (Astro, Cloudflare Pages; JA / CN / EN UI modes) with
  works catalogue, statistics and an on-this-day layer.
- Owner console (`/admin`) with X OAuth 2.0 sign-in, a publication kill
  switch and a rights-holder message window.
- DLsite adapter as the reference data pipeline.
