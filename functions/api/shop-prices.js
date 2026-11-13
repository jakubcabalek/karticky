// Cloudflare Pages Function: what Czech shops have in stock for a card, with prices in CZK.
// Shops do not allow calls from the browser (no CORS), so the app asks here.
// GET /api/shop-prices?name=Lightning%20Bolt
// → { name, shops: [{ id, name, searchUrl, status, offers: [{ title, price, currency, inStock, url }] }] }
//
// Each shop is asked once per card per 6 hours (Cloudflare cache), with a short timeout.
// Prices are read from the shop's structured product data (schema.org JSON-LD or
// microdata), which shops publish for search engines. A shop whose page has none
// still gets a link to its search. Before adding a shop, check its terms.

const CACHE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 6000;
const USER_AGENT = 'Karticky/0.1 (MTG collection app; +https://karticky-9w4.pages.dev)';

// Search addresses must be checked against each shop (verified: false = not yet checked).
export const SHOPS = [
  { id: 'najada', name: 'Najada', verified: false, searchUrl: name => `https://www.najada.games/mtg/singles/search?q=${encodeURIComponent(name)}` },
  { id: 'cernyrytir', name: 'Černý rytíř', verified: false, searchUrl: name => `https://www.cernyrytir.cz/index.php3?akce=3&jmenokarty=${encodeURIComponent(name)}` },
  { id: 'blacklotus', name: 'Blacklotus', verified: false, searchUrl: name => `https://www.blacklotus.cz/vyhledavani/?string=${encodeURIComponent(name)}` },
];

/** Lower case, no diacritics, only letters and digits: "Æther Vial" and "aether vial" compare equal. */
export const normalizeName = text => String(text ?? '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/æ/gi, 'ae').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** "1 234,50 Kč", "89 Kč", "1234.5" → number, or null. */
export const parsePrice = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').replace(/\s|&nbsp;/g, '').replace(/kč|czk/gi, '');
  const match = text.match(/\d+(?:[.,]\d{1,2})?/);
  if (!match) return null;
  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

const decodeEntities = text => text
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const asList = value => (Array.isArray(value) ? value : value == null ? [] : [value]);
const inStockFrom = availability => !availability || /InStock|LimitedAvailability|OnlineOnly/i.test(String(availability));

/** Products with offers from <script type="application/ld+json"> blocks (Product, ItemList, @graph). */
export const parseJsonLdOffers = (html, baseUrl) => {
  const offers = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const types = asList(node['@type']).map(String);
    if (types.includes('Product')) {
      for (const offer of asList(node.offers).flatMap(o => (o && o['@type'] === 'AggregateOffer' ? asList(o.offers).concat(o.lowPrice != null ? [{ ...o, price: o.lowPrice }] : []) : [o]))) {
        const price = parsePrice(offer?.price);
        if (price == null) continue;
        offers.push({
          title: decodeEntities(String(node.name ?? '')),
          price,
          currency: String(offer.priceCurrency ?? 'CZK'),
          inStock: inStockFrom(offer.availability),
          url: absolute(offer.url ?? node.url, baseUrl),
        });
      }
    }
    for (const key of ['@graph', 'itemListElement', 'item', 'mainEntity']) visit(node[key]);
  };
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    try { visit(JSON.parse(body.trim())); } catch { /* a broken block is skipped */ }
  }
  return offers;
};

/** Products marked with schema.org microdata (itemtype=".../Product" with itemprop name and price). */
export const parseMicrodataOffers = (html, baseUrl) => {
  const offers = [];
  const parts = html.split(/(?=<[^>]+itemtype=["'][^"']*schema\.org\/Product["'])/i).slice(1);
  for (const part of parts) {
    const block = part.slice(0, 6000);
    const prop = name => {
      const content = block.match(new RegExp(`itemprop=["']${name}["'][^>]*(?:content|href)=["']([^"']*)["']`, 'i'))
        ?? block.match(new RegExp(`content=["']([^"']*)["'][^>]*itemprop=["']${name}["']`, 'i'));
      if (content) return decodeEntities(content[1]);
      const inner = block.match(new RegExp(`itemprop=["']${name}["'][^>]*>([\\s\\S]*?)<`, 'i'));
      return inner ? decodeEntities(inner[1].replace(/<[^>]+>/g, '').trim()) : null;
    };
    const price = parsePrice(prop('price'));
    const title = prop('name');
    if (price == null || !title) continue;
    const href = block.match(/itemprop=["']url["'][^>]*(?:href|content)=["']([^"']+)["']/i)?.[1] ?? block.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1];
    offers.push({ title, price, currency: prop('priceCurrency') ?? 'CZK', inStock: inStockFrom(prop('availability')), url: absolute(href, baseUrl) });
  }
  return offers;
};

const absolute = (href, baseUrl) => {
  try { return href ? new URL(decodeEntities(String(href)), baseUrl).toString() : baseUrl; } catch { return baseUrl; }
};

/** Offers for this card only: the title must contain the whole card name. Cheapest in stock first. */
export const offersForCard = (offers, cardName) => {
  const wanted = normalizeName(cardName);
  const seen = new Set();
  return offers
    .filter(offer => ` ${normalizeName(offer.title)} `.includes(` ${wanted} `))
    .filter(offer => { const key = `${offer.title}|${offer.price}|${offer.url}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price)
    .slice(0, 12);
};

export const offersFromHtml = (html, baseUrl, cardName) => {
  const structured = parseJsonLdOffers(html, baseUrl);
  return offersForCard(structured.length ? structured : parseMicrodataOffers(html, baseUrl), cardName);
};

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
  },
});

const askShop = async (shop, name) => {
  const searchUrl = shop.searchUrl(name);
  try {
    const response = await fetch(searchUrl, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html', 'accept-language': 'cs' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    });
    if (!response.ok) return { id: shop.id, name: shop.name, searchUrl, status: 'error', offers: [] };
    const offers = offersFromHtml(await response.text(), searchUrl, name);
    return { id: shop.id, name: shop.name, searchUrl, status: offers.length ? 'ok' : 'empty', offers };
  } catch {
    return { id: shop.id, name: shop.name, searchUrl, status: 'error', offers: [] };
  }
};

export const onRequestGet = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const name = (url.searchParams.get('name') ?? '').trim();
  if (name.length < 2 || name.length > 141) return json({ error: 'Použij ?name=Název karty' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/shop-prices?name=${encodeURIComponent(normalizeName(name))}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const shops = await Promise.all(SHOPS.map(shop => askShop(shop, name)));
  const response = json({ name, shops }, 200, CACHE_SECONDS);
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};
