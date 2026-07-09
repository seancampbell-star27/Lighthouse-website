# Lighthouse Website — Project Handoff & Status

> **Purpose:** working reference for anyone (human or Claude session) picking up
> this project. Read this before making changes. Last updated: 2026-07-09.

---

## 1. Current state

- **Framework:** Astro 5 (static output) + `@astrojs/sitemap`; self-hosted fonts via Fontsource.
- **Hosting:** Cloudflare **Workers** project (NOT classic Pages — this matters, see §4)
  named `lighthouse-website`, Git-connected to GitHub `seancampbell-star27/Lighthouse-website`,
  production branch `main`.
- **Staging URL:** https://lighthouse-website.sean-campbell.workers.dev
- **Production domain:** www.lighthousedigitalmedia.net — **still points at the OLD site.**
  Nothing changes there until the custom domain is attached in Cloudflare (§7).
- **Publish flow:** edit files → `npm run dev` to preview → commit → `git push` →
  Cloudflare auto-builds (~1–2 min). A push to `main` IS the publish button.
- **Working agreement:** Sean approves every push. Never invent client claims,
  stats, case studies, or team bios — flag gaps with the `ContentPending` component instead.

## 2. Architecture map

| Path | Role |
|---|---|
| `src/config/site.ts` | Single source of truth: name, phone, email, nav, SEO description |
| `src/layouts/BaseLayout.astro` | Meta/OG/canonical/JSON-LD injection, fonts, scroll-reveal script |
| `src/pages/*.astro` | One file per page; copy is edited directly in these |
| `src/content/blog/*.md` | Blog posts (markdown + frontmatter: title, description, pubDate) |
| `src/components/ContentPending.astro` | Yellow "content pending" flag — remove instances as real copy lands |
| `worker/index.js` | Cloudflare Worker: serves static site + handles `POST /api/contact` |
| `wrangler.jsonc` | Worker config: entry script + `dist/` as static assets |
| `public/` | Favicons, OG card (`images/og-default.png`), logo, robots.txt |
| `input/` | Content reference scraped from the old live site — source of truth for copy |

Design decisions already made (don't relitigate): Boston-based framing kept;
client logo wall carried over as-is; Fraunces for headings + Inter body;
favicon/OG card generated from the logo mark; navy `#074F89` / gold `#F4D35E`.

## 3. Launch blockers (in priority order)

1. **Content from Sean** — `/dashboards`, `/case-studies`, `/team` are structured
   placeholders. Do not invent this copy.
2. **Contact form email delivery** — the form validates and returns success but
   does NOT send email. Wiring: create a Resend account, verify the domain
   (2 DNS records), then set env vars on the Worker (Cloudflare dashboard →
   Workers & Pages → lighthouse-website → Settings → Variables):
   `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`. The code in `worker/index.js`
   activates delivery automatically once `RESEND_API_KEY` exists. Test after.
3. **Google Partner badge** — confirm status is current before displaying (not
   currently on the new site; old site had it).
4. **Cookie consent** — old site had "Cookie Settings"; new site has no analytics
   yet. If GA4/analytics are added, revisit consent requirements.

## 4. Critical gotchas — read before touching anything

- **This is a Workers deployment, not Pages.** Pages-style `functions/` directories
  are silently ignored. All server logic goes in `worker/index.js` (routed via
  `wrangler.jsonc`). A `functions/` folder was already removed for this reason.
- **OneDrive mount staleness (Claude sessions):** the sandbox's mounted view of
  this folder can serve stale/truncated file contents right after Write/Edit
  (files cut at their old byte length). Before any `git commit`, verify file
  tails/sizes on the mount; if stale, `cp` known-good copies from the /tmp build
  onto the mount first. Verify builds from a /tmp copy, never trust the mount blindly.
- **Never create a `.npmrc` with a session-specific cache path** — it silently
  breaks `npm install` in every later session. This happened once already.
- **Keep `node_modules` and npm caches out of this folder** where possible
  (OneDrive churn). Claude sessions: build in /tmp. Sean's local installs are fine.
- **No GitHub auth in Claude's sandbox.** Claude commits locally; Sean runs
  `git push` from his own PowerShell. Don't attempt pushes from the sandbox.
- **PowerShell on Sean's machine:** execution policy was set to RemoteSigned
  (CurrentUser) to allow npm. If npm errors return, `npm.cmd` bypasses it.

## 5. Verification checklist (after ANY change)

1. `npm run build` completes with **zero warnings** (a CSS warning previously
   indicated a silently truncated file — take warnings seriously).
2. Spot-check `dist/index.html`: title/meta/OG/canonical/JSON-LD present.
3. `robots.txt` + `sitemap-index.xml` in dist.
4. After push: staging URL loads, check the changed pages, test the contact form
   (expect green success message).

## 6. Recommended pre-launch work (no new content required)

- [x] **Astro 4 → 5 upgrade** (done 7/9/26) — breaking changes in content collections API
      (`src/content/config.ts` and blog templates). Follow the official v5
      migration guide; verify blog index + post pages after.
- [x] **Worker hardening** (done 7/9/26) — add security headers (CSP, X-Content-Type-Options,
      X-Frame-Options, Referrer-Policy), cache headers for `/_astro/*` hashed
      assets, and `X-Robots-Tag: noindex` when the request host ends in
      `workers.dev` (prevents staging being indexed; must NOT apply to the
      production domain).
- [x] **Self-host fonts** (done 7/9/26, via Fontsource) — Inter + Fraunces currently load from Google Fonts
      (render-blocking, extra connection). Download WOFF2 subsets, serve from
      `public/fonts/`, add `@font-face` with `font-display: swap`, remove the
      Google Fonts links from BaseLayout.
- [x] **favicon.ico fallback** (done 7/9/26) at site root for legacy crawlers/tools.
- [x] **RSS feed** (done 7/9/26) — live at `/rss.xml` with head autodiscovery link.
- [ ] **Lighthouse/CWV audit** on the staging URL once the above land.

## 7. Blog publishing workflow (Word doc -> live post)

Sean writes drafts in Word (or anything) and drops them in `drafts/`
(gitignored; see `drafts/README.md`). When asked to "publish" a draft, Claude:

1. Converts it to markdown, preserving headings/bold/lists/links.
2. Writes frontmatter: `title`, `description` (SEO-friendly, ~150 chars — draft
   one if missing), `pubDate` (today unless specified). Author defaults to
   "Lighthouse Digital Media" via the collection schema.
3. Saves to `src/content/blog/<seo-friendly-slug>.md` — the filename IS the URL.
4. Extracts any embedded images to `public/images/blog/`, references them
   relatively, compresses large ones.
5. Runs the §5 verification, commits; Sean reviews and pushes.

RSS (`/rss.xml`), the sitemap, and the blog index all update automatically on
build — no extra steps. The sample post `transparency-in-media-buying.md` should
be REPLACED with real content before launch.

If publishing volume grows or non-Claude users need to publish, consider a
git-based CMS (Decap/Pages CMS) — the collection structure is ready for it.

## 8. Launch runbook (when Sean says go)

1. Confirm §3 blockers are closed and §5 checks pass on staging.
2. Confirm old-site URL inventory: `/services`, `/dashboards`, `/case-studies`,
   `/team`, `/contact` match 1:1 (they were built to). Check for any other
   indexed legacy URLs (site:lighthousedigitalmedia.net) and add redirects in
   `worker/index.js` if needed.
3. Cloudflare dashboard → lighthouse-website → Settings → Domains & Routes →
   add custom domain `www.lighthousedigitalmedia.net` (and decide apex handling:
   redirect apex → www).
4. Verify: production domain serves new site, HTTPS valid, canonical URLs
   correct, contact form delivers a real email end-to-end.
5. Post-launch: submit sitemap in Google Search Console; watch CWV; update the
   `© year` check; confirm the workers.dev noindex did NOT leak to production.
6. Update this file and mark launch complete.

## 9. Session history (context for future sessions)

- **6/17/26 (Opus):** scaffolded site, all pages, blog, contact form (as Pages
  Functions), content reference in `input/`.
- **7/8–7/9/26 (Fable):** reviewed + kept structure; fixed broken `.npmrc`;
  Fraunces typography; favicons + OG card from logo mark; hero watermark;
  initial commit; diagnosed empty GitHub repo; Sean pushed; discovered Workers
  (not Pages) deployment ignored `functions/` → migrated contact API to
  `worker/index.js` + `wrangler.jsonc`; staging verified live.
- **7/9/26 (Fable, cont.):** Astro 5 upgrade (content layer API), self-hosted
  Inter/Fraunces via Fontsource, Worker security/cache/noindex headers,
  favicon.ico. All verified: 11 pages build clean.
