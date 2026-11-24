# Lighthouse Website — Project Handoff & Status

> **Purpose:** working reference for anyone (human or Claude session) picking up
> this project. Read this before making changes. Last updated: 2026-11-23.

---

## 1. Current state

- **Framework:** Astro 5 (static output) + `@astrojs/sitemap` + `@astrojs/rss`;
  self-hosted Inter/Fraunces via Fontsource.
- **Hosting:** Cloudflare **Workers** project (NOT classic Pages — this matters, see §4)
  named `lighthouse-website`, Git-connected to GitHub `seancampbell-star27/Lighthouse-website`,
  production branch `main`.
- **Staging URL:** https://lighthouse-website.sean-campbell.workers.dev (live, verified)
- **Production domain:** www.lighthousedigitalmedia.net — **still points at the OLD site.**
  Nothing changes there until the custom domain is attached in Cloudflare (§8).
- **Canonical host decided (Sean, 11/20/26): `www.lighthousedigitalmedia.net`.**
  `lighthousedigitalmedia.com` is a SECOND live property also serving the old
  site (not a redirect — its internal links point at .com). Host redirects for
  .com and the .net apex are already in `worker/index.js`, dormant until a
  custom domain is routed to the Worker.
- **DNS (moved 11/23/26):** lighthousedigitalmedia.net nameservers now point to
  Cloudflare (`leanna` / `milan.ns.cloudflare.com`), same Cloudflare account as the
  Worker. Squarespace remains the REGISTRAR only (DNSSEC was disabled there for the
  switch; can re-enable via Cloudflare later). Email + old site verified working after
  the move. Old site = Laravel Forge on DigitalOcean (`104.248.229.71`); `@`/`www` A
  records and both `_acme-challenge` CNAMEs (Forge cert renewal) are kept as DNS-only
  until launch day. Google Workspace MX + Mailgun (`mg.`, old site) records carried over.
  `lighthousedigitalmedia.com` is NOT in Cloudflare yet.
- **Publish flow:** edit files → `npm run dev` to preview → commit → `git push` →
  Cloudflare auto-builds (~1–2 min). A push to `main` IS the publish button.
  After ANY visual check on staging: hard refresh (Ctrl+F5) — Sean's browser has
  repeatedly served stale pages after deploys.
- **Working agreement:** Sean approves every push. Never invent client claims,
  stats, case studies, or team bios — flag gaps with the `ContentPending` component instead.

## 2. Architecture map

| Path | Role |
|---|---|
| `src/config/site.ts` | Single source of truth: name, phone, email, nav, SEO description |
| `src/layouts/BaseLayout.astro` | Meta/OG/canonical/JSON-LD injection, fonts, RSS link, scroll-reveal script |
| `src/pages/*.astro` | One file per page; copy is edited directly in these |
| `src/pages/rss.xml.js` | RSS feed endpoint (auto-includes blog posts) |
| `src/content/blog/*.md` | Blog posts (markdown + frontmatter: title, description, pubDate) |
| `src/components/AnimatedMark.astro` | Vector logo mark; optional rotating-beam sweep (`sweep` prop) |
| `src/components/Header.astro` | Nav + animated logo lockup: mark + `wordmark.webp` + expanding gold beam |
| `src/components/ContentPending.astro` | Yellow "content pending" flag — remove instances as real copy lands |
| `worker/index.js` | Cloudflare Worker: static assets + `POST /api/contact` + security/cache/noindex headers |
| `wrangler.jsonc` | Worker config: entry script + `dist/` as static assets |
| `public/images/team/` | Optimized headshot webps (Matt, Sean, Maria; Gary + Holly pending) |
| `public/images/dashboard-web/` | Optimized dashboard screenshots used on /dashboards |
| `public/images/wordmark.webp` | Transparent-background wordmark (beam passes behind it) |
| `drafts/` | Gitignored inbox for Word-doc blog drafts (see §7) |
| `input/` | Content reference scraped from the old live site — source of truth for copy |

Design decisions already made (don't relitigate): Boston-based framing kept;
client logo wall carried over as-is; Fraunces headings + Inter body;
favicon/OG card generated from logo mark; navy `#074F89` / gold `#F4D35E`;
header logo animation = beam expands from light source across wordmark (6s cycle);
NO hero watermark, NO spinning-values graphic (Sean removed both 7/10/26).

## 3. Page status

| Page | Status |
|---|---|
| Home | Done (animated header logo; hero; approach; services; clients; testimonial) |
| Services | Done (carried from old site copy) |
| Dashboards | Done — live Looker Studio embed (click-to-load) + screenshot gallery |
| Team | Done — 5 real bios; photos for Matt/Sean/Maria; initials placeholders for Gary + Holly |
| Case Studies | **PARKED (11/20/26)** — route hidden pending real content. Page source preserved at `src/pages/_case-studies.astro` |
| Blog | **PARKED (11/20/26)** — route hidden pending real posts. Source at `src/pages/_blog/`; sample post set `draft: true` |
| Contact | Form works end-to-end EXCEPT email delivery (see §5) |

## 4. Critical gotchas — read before touching anything

- **This is a Workers deployment, not Pages.** Pages-style `functions/` directories
  are silently ignored. All server logic goes in `worker/index.js` (routed via
  `wrangler.jsonc`).
- **Astro scoped CSS cannot style JS-created elements.** Elements created at
  runtime (e.g. the dashboard iframe) don't get Astro's scoping attribute, so
  `<style>` rules in the component silently fail. Use inline styles via JS.
  This caused a multi-round embed bug on /dashboards.
- **Looker Studio embed:** report renders at fixed canvas size; the iframe gets
  its size from inline JS styles and Looker fits the report into it. Mobile
  (<700px) intentionally opens the report in a new tab instead of embedding.
  CSP `frame-src` whitelists lookerstudio.google.com + datastudio.google.com —
  any NEW third-party embed needs its domain added to the CSP in `worker/index.js`
  or it will silently fail to render.
- **OneDrive mount staleness (Claude sessions):** the sandbox's mounted view of
  this folder can serve stale/truncated file contents right after Write/Edit
  (files cut at their old byte length). Before any `git commit`, verify file
  tails/sizes on the mount; if stale, `cp` known-good copies from the /tmp build
  onto the mount first. Verify builds from a /tmp copy, never trust the mount blindly.
- **Never create a `.npmrc` with a session-specific cache path** — it silently
  breaks `npm install` in every later session. This happened once already.
- **Keep `node_modules` and npm caches out of this folder** (OneDrive churn).
  Sean's local installs are fine.
- **Claude CANNOT build from the mounted folder.** Sean's `node_modules` is a
  WINDOWS install, so the Linux-side shell fails with
  `Cannot find module @rollup/rollup-linux-x64-gnu`. That shell also has no
  network, so `npm install` can't repair it there. Copying `node_modules` to
  /tmp is too slow (times out). **Correct workflow: clone the repo into the
  cloud container, `npm ci`, build and verify there, then apply the same edits
  to the mounted folder and commit.** Confirmed 11/20/26.
- **GitHub: Claude has READ access only.** The cloud container can clone/fetch
  the repo, but the repo API returns 403 and there is no push credential.
  Claude commits locally; Sean runs `git push` from his own PowerShell.
- **Cloudflare: Claude has NO access.** No API token, no wrangler auth. Setting
  Worker env vars, attaching domains, and reading build logs are Sean-only.
- **PowerShell on Sean's machine:** execution policy set to RemoteSigned
  (CurrentUser). If npm errors return, `npm.cmd` bypasses it.
- **Stale browser cache:** Sean's browser has served old page versions after
  deploys multiple times. Always ask for a hard refresh before debugging
  "it didn't change" reports.

## 5. Launch blockers (in priority order)

1. **Case studies** — RESOLVED FOR LAUNCH 11/23/26: launch without it;
   `/case-studies` (and sub-paths) TEMPORARILY 302-redirects to the homepage via
   `LEGACY_REDIRECTS` in `worker/index.js`. When real content exists: delete that
   entry AND un-hide the page (below). Original notes:
   page is PARKED (hidden), not broken.
   Un-hide by renaming `_case-studies.astro` back and restoring the NAV entry.
   NOTE: the OLD site serves a live `/case-studies` page, so launching with the
   route hidden turns a working URL into a 404 — decide redirect vs un-hide.
2. ~~**Contact form email delivery**~~ — **DONE 11/23/26.** Resend account created,
   domain verified (records `resend._domainkey`, `send`, `rsend`, `_dmarc` p=none in
   Cloudflare), `RESEND_API_KEY` set as a RUNTIME secret (Settings → Variables and
   Secrets — NOT the Build section's variables, which the live Worker can't see).
   Test delivered to contact@. Pending: Matt to confirm inbox/spam + Reply-To.
   Original notes: form validates + returns success but does
   NOT send email. Wiring: Sean creates a Resend account, verifies the domain
   (2 DNS records — need to know who hosts DNS), then sets Worker env vars
   (Cloudflare → lighthouse-website → Settings → Variables): `RESEND_API_KEY`
   (secret), optionally `CONTACT_TO`/`CONTACT_FROM`. Code in `worker/index.js`
   activates delivery automatically once the key exists. Test end-to-end after.
3. **Replace the sample blog post** (`transparency-in-media-buying.md`, now
   `draft: true`). Blog route is PARKED until there is real content.
4. **Gary + Holly headshots** (initials placeholders show until then; drop
   photos in `public/images/Headshots/` and ask Claude to process).
5. **Google Partner badge** — confirm status is current before displaying.
6. **Cookie consent** — no analytics on the new site yet; if GA4 is added,
   revisit consent requirements.
7. **Legacy URL decisions** — `/login` RESOLVED 11/23/26: dead page, nobody uses
   it; 301-redirects to the homepage (`LEGACY_REDIRECTS`). `/cookies` still has no
   redirect — superseded 11/23/26: `/cookies` is now a real page (Cookie Policy,
   text mirrored verbatim from the old site, linked in the footer). Original notes
   (found 11/20/26): The old site links to two paths
   the new site does not have: `/cookies` (Cookie Settings) and `/login`.
   `/login` may be a client portal — confirm with Sean what it does before
   launch; killing it could break something clients use. Neither has a
   redirect yet; do not invent targets.

8. **Privacy Notice + Terms of Service are still PLACEHOLDERS** (`privacy.astro`,
   `terms.astro` show the yellow ContentPending flag). The old site has real
   `/privacy` and `/terms` pages — mirror them (as done for `/cookies`) or replace
   with reviewed copy before launch.
9. **Cookie Policy accuracy:** the mirrored text says the site uses analytics and
   marketing cookies. True only once GA4/GTM is added (old site ran GTM-WXNFQGQH;
   the new site has NO tracking). Either add GA4/GTM before/at launch or revise
   that section.

**Legacy URL inventory (checked 11/23/26 via Google `site:` + old-site nav/footer):**
`/`, `/services`, `/dashboards`, `/team`, `/contact`, `/privacy`, `/terms`,
`/cookies` all exist on the new site. `/case-studies` (+ detail sub-pages) → 302
home; `/login` → 301 home. No other indexed legacy URLs found.

## 6. Verification checklist (after ANY change)

1. `npm run build` completes with **zero warnings** (a CSS warning previously
   indicated a silently truncated file — take warnings seriously).
2. Spot-check `dist/index.html`: title/meta/OG/canonical/JSON-LD present.
3. `robots.txt` + `sitemap-index.xml` + `rss.xml` in dist.
4. After push: hard-refresh staging, check changed pages, test the contact form
   (expect green success message).

## 7. Blog publishing workflow (Word doc -> live post)

Sean drops drafts (.docx/.md/.txt) in `drafts/` (gitignored; see
`drafts/README.md`). When asked to "publish" a draft, Claude:

1. Converts to markdown, preserving headings/bold/lists/links.
2. Writes frontmatter: `title`, `description` (SEO-friendly ~150 chars — draft
   one if missing), `pubDate` (today unless specified).
3. Saves to `src/content/blog/<seo-friendly-slug>.md` — the filename IS the URL.
4. Extracts embedded images to `public/images/blog/`, compresses large ones.
5. Runs §6 verification, commits; Sean reviews and pushes.

RSS, sitemap, and blog index update automatically on build. If publishing
volume grows or non-Claude users need to publish, consider a git-based CMS
(Decap/Pages CMS) — the collection structure is ready for it.

## 8. Launch runbook (when Sean says go)

1. Confirm §5 blockers are closed and §6 checks pass on staging.
2. Confirm old-site URL inventory: `/services`, `/dashboards`, `/case-studies`,
   `/team`, `/contact` match 1:1 (they were built to). Check for other indexed
   legacy URLs (site:lighthousedigitalmedia.net) and add redirects in
   `worker/index.js` if needed.
3. Run a Lighthouse/CWV audit on staging; fix anything red.
4. ⚠️ **BEFORE moving nameservers to Cloudflare: copy the MX records first.**
   Company email is on lighthousedigitalmedia.net (contact@...). Cloudflare's
   zone import usually catches MX, but verify manually — a miss takes email
   down. Workers custom domains require the zone to live in the Cloudflare
   account, so nameservers must point at Cloudflare.
5. (Step 4 DONE 11/23/26 — zone is Active in Cloudflare.) Launch-day: in DNS →
   Records delete the `@` and `www` A records (Cloudflare refuses a custom domain
   while a conflicting record exists), then lighthouse-website → Domains tab → add
   custom domains `www.lighthousedigitalmedia.net` AND `lighthousedigitalmedia.net`.
   After verifying, delete both `_acme-challenge` CNAMEs. Then cancel Forge/
   DigitalOcean hosting (Matt has the Laravel Forge login) — likely no Squarespace
   site plan exists. Apex → www and .com → .net are
   already handled in `worker/index.js` once the domains route to the Worker.
5. Verify: production domain serves new site, HTTPS valid, canonicals correct,
   contact form delivers a real email end-to-end, workers.dev noindex did NOT
   leak to production (it's hostname-gated in worker/index.js).
6. Post-launch: submit sitemap in Google Search Console; watch CWV.
7. Update this file and mark launch complete.

## 9. Session history (context for future sessions)

- **6/17/26 (Opus):** scaffolded site, all pages, blog, contact form (as Pages
  Functions), content reference in `input/`.
- **7/8–7/9/26 (Fable):** review + polish (Fraunces, favicons, OG card); fixed
  broken `.npmrc`; initial commit; diagnosed empty GitHub repo; first push;
  discovered Workers deployment ignored `functions/` → migrated contact API to
  `worker/index.js` + `wrangler.jsonc`; Astro 5 upgrade; self-hosted fonts;
  Worker hardening; RSS; drafts/ blog pipeline; HANDOFF created.
- **7/9–7/10/26 (Fable):** Dashboards page built out — Looker embed (multi-round
  sizing saga, see §4 gotchas) + optimized screenshot gallery; Team page with 5
  real bios + 3 headshots; recreated original site's animated header logo (beam
  expands over wordmark; wordmark rebuilt with transparent bg); spinning-values
  graphic built then removed at Sean's request; hero watermark removed at
  Sean's request. All verified on staging.

- **11/20/26 (Opus 5):** Verified staging healthy (HTTP 200) after Sean
  reported the site down — he had checked an unrelated URL
  (`lighthouse.dev-lindell.com`), which does not resolve and appears nowhere in
  this repo. Confirmed `.com` AND `.net` both serve the OLD site independently.
  Canonical set to `www.lighthousedigitalmedia.net`. PARKED Case Studies + Blog
  routes (underscore-prefix) so they can't launch as placeholders. Added dormant
  canonical-host redirects to `worker/index.js`. Discovered the Windows
  `node_modules` build blocker (§4) and corrected the stale "no GitHub auth"
  note. Flagged MX-record risk and the `/cookies` + `/login` legacy paths.

- **11/23/26 (Opus 5.5):** Sean moved DNS from Squarespace to Cloudflare (records
  imported + checked; added missing `_acme-challenge.www`; deleted `_domainconnect`;
  website/Mailgun/acme records set DNS-only). Zone Active same day; email + old site
  tested OK. Set up Resend for the contact form; first attempt failed silently because
  the key was in the Build variables — moved to runtime secrets, test email Delivered.
  Note: the form shows "Thanks" even with NO key configured — confirm delivery in
  Resend → Emails, not by the success message.
