const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

const loadCloud = ({ configured = true, platform = 'ios', exchange = async () => ({ error: null }), oauth } = {}) => {
  const calls = { opened: [], exchanged: [], oauth: [] };
  const auth = {
    exchangeCodeForSession: async code => { calls.exchanged.push(code); return exchange(code); },
    signInWithOAuth: async options => { calls.oauth.push(options); return oauth ? oauth(options) : { data: { url: 'https://project.supabase.co/auth/v1/authorize?x' }, error: null }; },
    startAutoRefresh() {}, stopAutoRefresh() {},
  };
  const cloud = load('cloud.ts', {
    env: configured ? { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk' } : {},
    dependencies: {
      'react-native-url-polyfill/auto': {},
      'react-native': {
        Platform: { OS: platform },
        AppState: { addEventListener() {} },
        Linking: { openURL: async url => { calls.opened.push(url); } },
      },
      '@react-native-async-storage/async-storage': {},
      '@supabase/supabase-js': { createClient: () => ({ auth }) },
      './cardData': { normalizeLibrary: value => value },
    },
    globals: { URL },
  });
  return { cloud, calls };
};

test('without Supabase settings accounts are simply off', () => {
  assert.equal(loadCloud({ configured: false }).cloud.cloudConfigured, false);
});

test('on the phone Google opens in the browser and returns to the app', async () => {
  const { cloud, calls } = loadCloud();
  await cloud.signInWithProvider('google');
  assert.equal(calls.oauth[0].provider, 'google');
  assert.equal(calls.oauth[0].options.redirectTo, 'kartoteka://auth-callback');
  assert.equal(calls.oauth[0].options.skipBrowserRedirect, true);
  assert.equal(calls.opened.length, 1);
  await cloud.signInWithProvider('facebook');
  assert.equal(calls.oauth[1].options.scopes, 'email');
});

test('the return link is exchanged for a session; errors and foreign links are handled', async () => {
  const { cloud, calls } = loadCloud();
  assert.equal(await cloud.completeSignInFromUrl('kartoteka://auth-callback?code=abc'), null);
  assert.deepEqual(calls.exchanged, ['abc']);
  assert.equal(await cloud.completeSignInFromUrl('kartoteka://auth-callback?error=access_denied&error_description=User+cancelled'), 'User cancelled');
  assert.equal(await cloud.completeSignInFromUrl('https://evil.example/?code=abc'), null);
  assert.equal(calls.exchanged.length, 1);
});

test('common sign-in errors are explained in Czech', () => {
  const { cloud } = loadCloud();
  assert.equal(cloud.authErrorText(new Error('Invalid login credentials')), 'Špatný e-mail nebo heslo.');
  assert.match(cloud.authErrorText(new Error('Unsupported provider: provider is not enabled')), /není zapnuté/);
});
