const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

const deps = { './appVersion': { isDevelopmentVersion: true } };

test('development feature switches persist and only accept booleans', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const features = load('devFeatures.ts', { dependencies: deps, globals: { localStorage: storage } });
  assert.equal(features.developmentFeatureEnabled('cardPrices'), true);
  features.saveDevelopmentFeatures({ cardPrices: false });
  assert.equal(features.developmentFeatureEnabled('cardPrices'), false);
  storage.setItem('kartoteka-development-features-v1', '{"cardPrices":"false"}');
  assert.equal(features.developmentFeatureEnabled('cardPrices'), true);
  storage.setItem('kartoteka-development-features-v1', 'invalid json');
  assert.equal(features.developmentFeatureEnabled('cardPrices'), true);
});

test('production keeps every feature in testing off and never touches the switches', () => {
  const features = load('devFeatures.ts', {
    dependencies: { './appVersion': { isDevelopmentVersion: false } },
    globals: { localStorage: { getItem() { assert.fail('Production must not read dev switches'); }, setItem() { assert.fail('Production must not write dev switches'); } } },
  });
  features.saveDevelopmentFeatures({ cardPrices: true });
  for (const { key } of features.developmentFeatures) assert.equal(features.developmentFeatureEnabled(key), false);
});

test('native feature switches use the persisted file across app starts', () => {
  const files = new Map();
  class File {
    constructor(directory, name) { this.path = `${directory}/${name}`; }
    get exists() { return files.has(this.path); }
    create() { files.set(this.path, ''); }
    textSync() { return files.get(this.path); }
    writeSync(value) { files.set(this.path, value); }
  }
  const start = () => {
    const runtime = { localStorage: { getItem() { assert.fail('Native must not use browser storage'); }, setItem() { assert.fail('Native must not use browser storage'); } } };
    load('nativeRuntime.native.ts', { dependencies: { 'expo-file-system': { File, Paths: { document: 'documents' } } }, globals: { globalThis: runtime } });
    return load('devFeatures.ts', { dependencies: deps, globals: { globalThis: runtime } });
  };
  const features = start();
  features.saveDevelopmentFeatures({ ...features.readDevelopmentFeatures(), cardPrices: false });
  assert.equal(start().readDevelopmentFeatures().cardPrices, false);
});
