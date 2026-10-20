// Páginas indexables de la web y su SEO. Lo usa React (cliente y servidor) y el servidor para
// el <head>, el sitemap y los datos estructurados. Las páginas de traslados se generan solas a partir
// de las tarifas (/admin/tarifas) y sus textos se editan en /admin → «Páginas de traslados».
import { fill } from './util.js';
import { money } from './pricing.js';

export const HOME = { ES: '/', EN: '/en' };
export const ROUTES_INDEX = { ES: '/traslados', EN: '/en/transfers' };
const AIRPORT_SLUG = { ES: 'aeropuerto-sevilla', EN: 'seville-airport' };
const CITY_SLUG = { ES: 'sevilla', EN: 'seville' };

// Lista de páginas de traslado: el aeropuerto y cada destino de la tabla
export function routeList(p) {
  return [{ key: 'airport', kind: 'airport' }, ...p.destinations.map(d => ({ key: d.id, kind: 'route', dest: d }))];
}

export function routePath(route, lang) {
  const slug = route.kind === 'airport' ? AIRPORT_SLUG[lang] : `${CITY_SLUG[lang]}-${route.key}`;
  return `${ROUTES_INDEX[lang]}/${slug}`;
}

// ¿Qué página es esta URL? kind: home | routes | route | notfound (las legales y el pago se resuelven aparte)
export function resolvePage(pathname, search, p) {
  const path = pathname.replace(/[/]+$/, '') || '/';
  const qsEn = new URLSearchParams(search || '').get('lang') === 'en';
  if (path === '/') return { kind: 'home', lang: qsEn ? 'EN' : 'ES' };
  if (path === '/en') return { kind: 'home', lang: 'EN' };
  for (const lang of ['ES', 'EN']) {
    const base = ROUTES_INDEX[lang];
    if (path === base) return { kind: 'routes', lang };
    if (path.startsWith(base + '/')) {
      const route = routeList(p).find(r => routePath(r, lang) === path);
      return route ? { kind: 'route', lang, route } : { kind: 'notfound', lang };
    }
  }
  return null;
}

// Ruta equivalente en el otro idioma (para el botón ES/EN y hreflang)
export function pagePath(page, lang) {
  if (page.kind === 'route') return routePath(page.route, lang);
  if (page.kind === 'routes' || page.kind === 'notfound') return ROUTES_INDEX[lang];
  return HOME[lang];
}

// Duración aproximada por carretera: ~100 km/h de media (autovía) + 10 min, redondeada a 5 min
export function duration(km, lang) {
  const m = Math.round((km / 100 * 60 + 10) / 5) * 5;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : (lang === 'EN' ? `${h} h` : `${h} h`);
}

// Variables para los textos de una página de traslado
export function routeVars(route, t, p, lang) {
  const r = t.routes;
  const extra = Math.min(...Object.values(p.extras || {}).filter(v => v > 0), Infinity);
  const base = {
    from: r.city, max: p.maxPax, extra: Number.isFinite(extra) ? money(extra, lang) : '',
    small: money(p.airport.small, lang), large: money(p.airport.large, lang),
    smallPax: p.airport.smallMaxPax, maxPax: p.maxPax, largeFrom: p.airport.smallMaxPax + 1
  };
  if (route.kind === 'airport') return { ...base, to: r.airportName, price: base.small };
  const d = route.dest;
  return {
    ...base, to: d.name, km: d.km, duration: duration(d.km, lang),
    t1: money(d.t1, lang), t2: money(d.t2, lang), price: money(d.t1, lang)
  };
}

// ---------- <head>: título, descripción, canónica, idiomas, Open Graph y datos estructurados ----------
export function headFor(page, data, baseUrl) {
  const { lang } = page;
  const t = data[lang], r = t.routes, p = data.pricing;
  const abs = u => (/^https?:/.test(u) ? u : baseUrl + u);
  let title, description, jsonld = [];
  const business = businessLd(data, baseUrl);

  if (page.kind === 'home') {
    title = lang === 'EN' ? r.homeSeoTitle : data.seo.title;
    description = lang === 'EN' ? r.homeSeoDescription : data.seo.description;
    jsonld = [business];
  } else if (page.kind === 'routes' || page.kind === 'notfound') {
    const vars = { count: p.destinations.length };
    title = fill(r.indexSeoTitle, vars);
    description = fill(r.indexSeoDescription, vars);
    jsonld = [business, breadcrumbLd([[r.home, HOME[lang]], [r.nav, ROUTES_INDEX[lang]]], abs)];
  } else {
    const v = routeVars(page.route, t, p, lang);
    const airport = page.route.kind === 'airport';
    title = fill(airport ? r.airportSeoTitle : r.seoTitle, v);
    description = fill(airport ? r.airportSeoDescription : r.seoDescription, v);
    const faq = (airport ? r.airportFaq : r.faq).map(f => ({ q: fill(f.q, v), a: fill(f.a, v) }));
    jsonld = [
      business,
      {
        '@context': 'https://schema.org', '@type': 'TaxiService',
        name: airport ? fill(r.airportTitle, v) : fill(r.title, v),
        description, url: abs(pagePath(page, lang)),
        provider: { '@id': baseUrl + '/#empresa' },
        areaServed: { '@type': 'State', name: 'Andalucía' },
        offers: {
          '@type': 'Offer', priceCurrency: 'EUR',
          price: airport ? p.airport.small : page.route.dest.t1,
          url: abs(pagePath(page, lang)), availability: 'https://schema.org/InStock'
        }
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      },
      breadcrumbLd([[r.home, HOME[lang]], [r.nav, ROUTES_INDEX[lang]], [airport ? fill(r.airportTitle, v) : fill(r.title, v), pagePath(page, lang)]], abs)
    ];
  }
  if (page.kind !== 'home') title = `${title} | ${t.brand.name.replace(/[A-ZÁÉÍÓÚÑ]+/g, w => w.charAt(0) + w.slice(1).toLowerCase())}`;

  const alternates = page.kind === 'notfound' ? [] : ['ES', 'EN'].map(L => ({ lang: L.toLowerCase(), href: abs(pagePath(page, L)) }));
  return {
    title, description,
    canonical: page.kind === 'notfound' ? null : abs(pagePath(page, lang)),
    alternates, xDefault: page.kind === 'notfound' ? null : abs(pagePath(page, 'ES')),
    image: abs(data.images.hero), locale: lang === 'EN' ? 'en_GB' : 'es_ES',
    noindex: page.kind === 'notfound', jsonld
  };
}

function breadcrumbLd(items, abs) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(url) }))
  };
}

function businessLd(data, baseUrl) {
  const lg = data.legal, c = data.contact;
  const phone = lg.phone || (c.whatsapp ? '+' + c.whatsapp : '');
  return {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': baseUrl + '/#empresa',
    name: 'Alayan Driver', url: baseUrl + '/',
    logo: baseUrl + '/img/icon-512.png', image: baseUrl + data.images.hero,
    description: data.seo.description,
    ...(phone ? { telephone: phone } : {}),
    ...(lg.email ? { email: lg.email } : {}),
    address: { '@type': 'PostalAddress', ...(lg.address ? { streetAddress: lg.address } : {}), addressLocality: 'Sevilla', addressRegion: 'Andalucía', addressCountry: 'ES' },
    areaServed: [{ '@type': 'City', name: 'Sevilla' }, { '@type': 'State', name: 'Andalucía' }],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' }],
    priceRange: '€€',
    paymentAccepted: 'Credit Card, Debit Card, Apple Pay, Google Pay',
    currenciesAccepted: 'EUR'
  };
}

// Todas las URL indexables con sus versiones por idioma (para sitemap.xml)
export function sitemapPages(p) {
  const pages = [{ kind: 'home' }, { kind: 'routes' }, ...routeList(p).map(route => ({ kind: 'route', route }))];
  return pages.map(pg => ({
    es: pagePath({ ...pg, lang: 'ES' }, 'ES'),
    en: pagePath({ ...pg, lang: 'EN' }, 'EN'),
    priority: pg.kind === 'home' ? '1.0' : pg.kind === 'routes' || pg.route?.kind === 'airport' ? '0.9' : '0.7'
  }));
}
