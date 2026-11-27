# Quickstart — run this archive for your own artist

This framework builds a fan-run works archive for **one individual creator**:
a public catalogue of everything they have released, an "on this day" layer,
statistics, and a private owner console with a rights-holder window. It was
designed for the fans of individual creators — voice actors, VTubers, and
other independent artists whose work is scattered across storefronts and
platforms.

You do not need to edit the site code to make it yours. Identity lives in one
configuration file; catalogue data comes from a replaceable adapter.

## 1. Get the code

Fork this repository, or clone it into a new repository of your own.

## 2. Make it yours: `subject.config.json`

Edit `subject.config.json` at the repository root:

| Section | What it controls |
| --- | --- |
| `subject` | The artist's name (ja / cn / en) and role — used in documentation and meta text. |
| `site.name` | Your archive's name in the three languages. |
| `site.footerDeclaration` | The rights statement printed in the footer. Keep it factual. |
| `brand` | Paths to your brand assets (admin icon, decorative marks). Replace the placeholder images under `public/assets/brand/` with your own. |
| `fonts` | Google Fonts families and the CSS font stacks for the public site and the console. |
| `theme.tokens` / `adminTheme.tokens` | The colour palettes (CSS custom properties) of the public site and the console. |
| `data` | Which platform adapter feeds the catalogue (see `docs/ADAPTERS.md`). |
| `channels` | The official-channels directory: one entry per channel (platform label, icon key, name, trilingual description, optional tag, URL). |
| `owner.creatorXUserId` | The artist's numeric X user ID — the owner console distinguishes the artist from the operator by it. |

Then stamp the configuration into the sources:

```sh
node scripts/apply-subject.mjs
```

Commit the result. `node scripts/apply-subject.mjs --check` fails if the
sources and the configuration ever drift apart.

The stamp covers the identity and declaration in `site-copy.json`, the theme
tokens in `web.css` / `admin.css`, the brand asset paths, the font URLs in
both Astro pages, the channel directory in `public/scripts/web-client.js`
(regenerated from `channels` between the `subject:channels` markers — do not
hand-edit that block), and the `CREATOR_UID` constant in the owner
functions. Channel entries pick an icon from the built-in library in
`web-client.js` (`site`, `x`, `x-notice`, `x-runa`, `cien`, `tsubamate`,
`dlsite-mic`, `youtube`, `booth`, `skeb`, `tiktok`, `line`, `amazon`,
`pommu`, `litlink`, `fantia`); an unknown key falls back to the site icon.

## 3. Feed it data

The catalogue is three generated files under `public/data/` (`works.json`,
`stats.json`, `upcoming.json`). Never edit them by hand — an **adapter**
generates them from your artist's platform. The reference adapter covers
DLsite:

```sh
node scripts/sync-dlsite.mjs
```

For another platform (BOOTH, YouTube, …), write an adapter that outputs the
same files. The contract is specified in
[docs/ADAPTERS.md](ADAPTERS.md).

The data shipped in this repository is a small all-ages sample from the
reference instance, so the site builds and renders before your adapter exists.
Replace it wholesale with your own output.

## 4. Owner console access

The console at `/admin` signs the artist and the operator in with X OAuth 2.0
(PKCE, read-only scopes). Create your own X developer app, register the
callback `https://<your-domain>/api/owner/callback`, and set the app
credentials as Cloudflare Pages secrets (see `.env.example`). The artist's
own numeric X user ID goes into `subject.config.json` as
`owner.creatorXUserId` (step 2) — the stamp writes it into the owner
functions for you; the operator's allowed IDs are part of the Pages secrets.
Until then the public site works normally; the console simply cannot sign
anyone in.

## 5. Deploy

Deploy to Cloudflare Pages with the repository's build command
(`npm run build`). Point your domain at the Pages project. That is the whole
operation: a static site plus KV-backed console state, nothing else to run.

## Ground rules that are part of the design

- **Public sources only.** Catalogue what the artist has publicly listed or
  publicly said. Do not aggregate private-life information.
- **The artist outranks the archive.** The console gives the artist (and the
  operator acting on their word) viewing, correction and deletion rights,
  including a reversible publication kill switch. Build your instance so the
  answer to "take it down" is always yes.
- **One operator, honestly presented.** The public copy never implies a team
  or a fan community runs the site when it is one person.
