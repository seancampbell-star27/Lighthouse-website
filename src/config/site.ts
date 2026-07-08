// Central site config — single source of truth for nav, contact, and SEO defaults.
export const SITE = {
  name: 'Lighthouse Digital Media',
  legalName: 'Lighthouse Digital Media LLC',
  url: 'https://www.lighthousedigitalmedia.net',
  // Decision (Sean, 6/17/26): keep Boston-based framing.
  description:
    'Lighthouse Digital Media is a Boston-based media agency specializing in promoting products, services, and brands through digital channels — search, social, video, and programmatic — with transparent reporting and custom dashboards.',
  locality: 'Boston',
  region: 'MA',
  country: 'US',
  phone: '+1 (617) 270-8228',
  phoneHref: 'tel:+16172708228',
  email: 'contact@lighthousedigitalmedia.net',
  linkedin: 'https://www.linkedin.com/company/lighthouse-digital-media-net/about/',
} as const;

export const NAV = [
  { label: 'Strategy & Buying', href: '/services' },
  { label: 'Custom Dashboards', href: '/dashboards' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'The Team', href: '/team' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
] as const;
