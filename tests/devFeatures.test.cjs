const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

// While the app is not shared, there are no switches: everything is in the one version.
test('there are no feature switches while the app has one version', () => {
  const features = load('devFeatures.ts', { dependencies: { './appVersion': { isDevelopmentVersion: false } }, globals: { localStorage: {} } });
  assert.equal(features.developmentFeatures.length, 0);
});

test('saved switches that no longer exist are ignored and broken storage never crashes', () => {
  const values = new Map([['karticky-development-features-v1', '{"cardScanner":false}']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const features = load('devFeatures.ts', { dependencies: { './appVersion': { isDevelopmentVersion: true } }, globals: { localStorage: storage } });
  assert.deepEqual(plain(features.readDevelopmentFeatures()), {});
  values.set('karticky-development-features-v1', 'invalid json');
  assert.deepEqual(plain(features.readDevelopmentFeatures()), {});
});

test('production never touches the switch storage', () => {
  const features = load('devFeatures.ts', {
    dependencies: { './appVersion': { isDevelopmentVersion: false } },
    globals: { localStorage: { getItem() { assert.fail('Production must not read dev switches'); }, setItem() { assert.fail('Production must not write dev switches'); } } },
  });
  features.saveDevelopmentFeatures({});
  assert.deepEqual(plain(features.readDevelopmentFeatures()), {});
});
