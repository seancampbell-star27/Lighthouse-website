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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') return handleContact(request, env);
      return json({ ok: false, error: 'Method not allowed.' }, 405);
    }

    // Everything else: serve the static site (dist/).
    return env.ASSETS.fetch(request);
  },
};
