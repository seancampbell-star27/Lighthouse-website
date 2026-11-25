/**
 * Cloudflare Worker — serves the static Astro site and handles
 * POST /api/contact (the contact form).
 *
 * Mail delivery (flag for Sean): by default this validates the submission
 * and returns success WITHOUT sending email, so the form works on staging.
 * To deliver mail, set env vars in the Cloudflare dashboard
 * (Workers & Pages -> lighthouse-website -> Settings -> Variables):
 *   RESEND_API_KEY = (from resend.com — needs the domain verified)
 *   CONTACT_TO     = contact@lighthousedigitalmedia.net
 *   CONTACT_FROM   = website@lighthousedigitalmedia.net
 * The Resend block below activates automatically once RESEND_API_KEY exists.
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid form submission.' }, 400);
  }

  const name = (form.get('name') || '').toString().trim();
  const email = (form.get('email') || '').toString().trim();
  const company = (form.get('company') || '').toString().trim();
  const message = (form.get('message') || '').toString().trim();
  const honeypot = (form.get('company_website') || '').toString().trim();

  // Honeypot: bots fill hidden fields. Pretend success, drop the message.
  if (honeypot) return json({ ok: true });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailOk || !message) {
    return json({ ok: false, error: 'Please complete all required fields.' }, 422);
  }

  const to = env.CONTACT_TO || 'contact@lighthousedigitalmedia.net';
  const from = env.CONTACT_FROM || 'website@lighthousedigitalmedia.net';
  const subject = `New website enquiry from ${name}`;
  const text = `Name: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\n${message}`;

  if (env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to, reply_to: email, subject, text }),
    });
    if (!r.ok) return json({ ok: false, error: 'Delivery failed.' }, 502);
    return json({ ok: true });
  }

  // No provider configured yet: accept + log so the form works on staging.
  console.log('Contact submission (not yet delivered):', { to, from, subject, text });
  return json({ ok: true });
}

// Canonical host (Sean, 2026-11-20): www.lighthousedigitalmedia.net.
// DORMANT until a custom domain is actually routed to this Worker. Today only
// the workers.dev staging host reaches it, and that host is deliberately NOT
// in the set below so staging keeps working.
const CANONICAL_HOST = 'www.lighthousedigitalmedia.net';
const REDIRECT_HOSTS = new Set([
  'lighthousedigitalmedia.net',      // apex -> www
  'lighthousedigitalmedia.com',      // legacy .com -> .net
  'www.lighthousedigitalmedia.com',
]);

// Legacy paths from the old site (Sean, 2026-11-23). Both go to the homepage.
// /case-studies is TEMPORARY (302): the page will return once real content
// exists — delete that entry when un-parking src/pages/_case-studies.astro.
// /login was a dead page on the old site, so its redirect is permanent (301).
const LEGACY_REDIRECTS = {
  '/case-studies': 302,
  '/login': 301,
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Astro inlines small scripts/styles, so 'unsafe-inline' is required.
  // Google Tag Manager + GA4 (+ GTM Preview mode) domains per Google's CSP
  // guidance. Any NON-Google tag added in GTM needs its domains added here too,
  // or it will silently fail to load.
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com https://tagmanager.google.com; " +
    "style-src 'self' 'unsafe-inline' https://tagmanager.google.com https://fonts.googleapis.com; " +
    "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com " +
    "https://ssl.gstatic.com https://www.gstatic.com https://*.g.doubleclick.net https://www.google.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com " +
    "https://*.googletagmanager.com https://*.g.doubleclick.net https://www.google.com; " +
    "frame-ancestors 'none'; " +
    "frame-src https://lookerstudio.google.com https://datastudio.google.com https://*.googletagmanager.com; " +
    "base-uri 'self'; form-action 'self'",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonical-host redirect. Preserves path + query. 301 is cacheable for
    // GET/HEAD; 308 keeps a POST a POST instead of silently downgrading it.
    if (REDIRECT_HOSTS.has(url.hostname)) {
      url.hostname = CANONICAL_HOST;
      url.protocol = 'https:';
      url.port = '';
      const status =
        request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
      return new Response(null, { status, headers: { Location: url.toString() } });
    }

    // Legacy-path redirects (match with or without trailing slash, and any
    // sub-path such as /case-studies/some-old-study).
    const legacyRoot = '/' + (url.pathname.split('/')[1] || '');
    if (Object.hasOwn(LEGACY_REDIRECTS, legacyRoot)) {
      return new Response(null, {
        status: LEGACY_REDIRECTS[legacyRoot],
        headers: { Location: new URL('/', url).toString() },
      });
    }

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') return handleContact(request, env);
      return json({ ok: false, error: 'Method not allowed.' }, 405);
    }

    // Everything else: serve the static site (dist/).
    const asset = await env.ASSETS.fetch(request);
    const res = new Response(asset.body, asset);
    const type = res.headers.get('content-type') || '';

    if (type.includes('text/html')) {
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
    }

    // Hashed build assets are immutable — cache aggressively.
    if (url.pathname.startsWith('/_astro/')) {
      res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Keep the staging host (workers.dev) out of search indexes.
    // Does NOT apply to the production custom domain.
    if (url.hostname.endsWith('.workers.dev')) {
      res.headers.set('X-Robots-Tag', 'noindex');
    }

    return res;
  },
};
