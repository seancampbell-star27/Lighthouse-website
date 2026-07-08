/**
 * Cloudflare Pages Function — handles POST /api/contact
 *
 * Wiring required before this delivers mail (flag for Sean):
 *  - Set one of the delivery integrations below. By default it validates the
 *    submission and returns success WITHOUT sending, so the form works in
 *    preview. Choose a provider and uncomment the matching block:
 *      A) MailChannels (free from Cloudflare Workers/Pages) — needs a verified
 *         domain + SPF/DKIM DNS records.
 *      B) Resend / SendGrid / Postmark — set the API key as an env var in the
 *         Cloudflare Pages dashboard (Settings → Environment variables).
 *  - Optionally add a Turnstile secret (TURNSTILE_SECRET) for stronger spam
 *    protection instead of / in addition to the honeypot.
 *
 * Env vars to add in Cloudflare Pages:
 *   CONTACT_TO       = contact@lighthousedigitalmedia.net
 *   CONTACT_FROM     = website@lighthousedigitalmedia.net  (must be on your domain)
 *   RESEND_API_KEY   = (if using Resend)
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function onRequestPost({ request, env }) {
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
  const text =
    `Name: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\n${message}`;

  // ---- Delivery (uncomment one) ------------------------------------------

  // A) Resend
  // if (env.RESEND_API_KEY) {
  //   const r = await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${env.RESEND_API_KEY}`,
  //       'content-type': 'application/json',
  //     },
  //     body: JSON.stringify({ from, to, reply_to: email, subject, text }),
  //   });
  //   if (!r.ok) return json({ ok: false, error: 'Delivery failed.' }, 502);
  //   return json({ ok: true });
  // }

  // B) MailChannels (Cloudflare-native, no API key)
  // const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
  //   method: 'POST',
  //   headers: { 'content-type': 'application/json' },
  //   body: JSON.stringify({
  //     personalizations: [{ to: [{ email: to }] }],
  //     from: { email: from, name: 'Lighthouse Website' },
  //     reply_to: { email },
  //     subject,
  //     content: [{ type: 'text/plain', value: text }],
  //   }),
  // });
  // if (!r.ok) return json({ ok: false, error: 'Delivery failed.' }, 502);
  // return json({ ok: true });

  // Default (no provider configured yet): accept + log so the form works in
  // preview. Replace with a real provider above before launch.
  console.log('Contact submission (not yet delivered):', { to, from, subject, text });
  return json({ ok: true });
}
// Other HTTP methods automatically receive a 405 from Cloudflare Pages
// because only onRequestPost is exported.
