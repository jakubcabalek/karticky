const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const shops = load('functions/api/shop-prices.js', { globals: { URL, encodeURIComponent } });
const base = 'https://shop.example/hledat?q=bolt';

test('prices in Czech notation become numbers', () => {
  assert.equal(shops.parsePrice('1 234,50 Kč'), 1234.5);
  assert.equal(shops.parsePrice('89&nbsp;Kč'), 89);
  assert.equal(shops.parsePrice(12), 12);
  assert.equal(shops.parsePrice('na dotaz'), null);
});

test('names match without accents, case or punctuation, and only whole names', () => {
  const offers = [
    { title: 'Lightning Bolt (M10) - NM', price: 40, inStock: true, url: base },
    { title: 'Lightning Bolt - foil', price: 20, inStock: false, url: base },
    { title: 'Lightning Bolts Galore', price: 5, inStock: true, url: base },
    { title: 'Æther Vial', price: 300, inStock: true, url: base },
  ];
  assert.deepEqual(plain(shops.offersForCard(offers, 'lightning bolt')).map(o => o.price), [40, 20]);
  assert.equal(shops.offersForCard(offers, 'Aether Vial').length, 1);
});

test('schema.org JSON-LD products, lists and aggregate offers are read', () => {
  const html = `<html><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: [
      { '@type': 'ListItem', item: { '@type': 'Product', name: 'Lightning Bolt [M10]', url: '/karta/bolt-m10', offers: { '@type': 'Offer', price: '39', priceCurrency: 'CZK', availability: 'https://schema.org/InStock' } } },
      { '@type': 'ListItem', item: { '@type': 'Product', name: 'Lightning Bolt [2X2] foil', offers: { '@type': 'AggregateOffer', lowPrice: '120', priceCurrency: 'CZK' } } },
      { '@type': 'ListItem', item: { '@type': 'Product', name: 'Chain Lightning', offers: { price: '500' } } },
    ],
  })}</script><script type="application/ld+json">{ broken</script></html>`;
  const offers = plain(shops.offersFromHtml(html, base, 'Lightning Bolt'));
  assert.deepEqual(offers.map(o => [o.title, o.price, o.inStock]), [['Lightning Bolt [M10]', 39, true], ['Lightning Bolt [2X2] foil', 120, true]]);
  assert.equal(offers[0].url, 'https://shop.example/karta/bolt-m10');
});

test('microdata is used when a page has no JSON-LD', () => {
  const html = `
    <div itemscope itemtype="https://schema.org/Product"><a href="/p/1" itemprop="url">x</a>
      <h2 itemprop="name">Lightning Bolt (Revised)</h2>
      <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
        <span itemprop="price" content="149.00"></span><meta itemprop="priceCurrency" content="CZK">
        <link itemprop="availability" href="https://schema.org/OutOfStock"></div></div>
    <div itemscope itemtype="https://schema.org/Product"><h2 itemprop="name">Lightning Bolt (M11)</h2>
      <span itemprop="price">59 Kč</span></div>`;
  const offers = plain(shops.offersFromHtml(html, base, 'Lightning Bolt'));
  assert.deepEqual(offers.map(o => [o.title, o.price, o.inStock]), [['Lightning Bolt (M11)', 59, true], ['Lightning Bolt (Revised)', 149, false]]);
  assert.equal(offers[1].url, 'https://shop.example/p/1');
});

test('every shop has a search address for the card', () => {
  for (const shop of shops.SHOPS) assert.match(shop.searchUrl('Lightning Bolt'), /^https:\/\/.+Lightning%20Bolt/);
});
