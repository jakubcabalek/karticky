const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

test('production stays the default and version destinations are fixed HTTPS addresses', () => {
  const version = load('appVersion.ts');
  assert.equal(version.isDevelopmentVersion, false);
  assert.equal(version.versionUrl(true), 'https://dev.karticky-9w4.pages.dev/');
  assert.equal(version.versionUrl(false), 'https://karticky-9w4.pages.dev/');
  assert.equal(load('appVersion.ts', { env: { EXPO_PUBLIC_APP_CHANNEL: 'unexpected' } }).isDevelopmentVersion, false);
});

test('the displayed revision identifies the build', () => {
  const version = load('appVersion.ts', { env: { EXPO_PUBLIC_APP_CHANNEL: 'development', EXPO_PUBLIC_APP_REVISION: 'abcdef123456' } });
  assert.equal(version.isDevelopmentVersion, true);
  assert.equal(version.appRevision, 'abcdef1');
});
