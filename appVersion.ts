// The channel is fixed at build time, never enabled by a query parameter. On a
// phone the person may choose it in Profile; nativeRuntime applies that choice
// before any module reads this one.
const runtimeChannel = (globalThis as { __KARTICKY_APP_CHANNEL__?: string }).__KARTICKY_APP_CHANNEL__;
export const isDevelopmentVersion = (runtimeChannel ?? process.env.EXPO_PUBLIC_APP_CHANNEL) === 'development';
export const appRevision = process.env.EXPO_PUBLIC_APP_REVISION?.slice(0, 7) || 'lokální';

export const versionUrl = (development: boolean) =>
  development ? 'https://dev.karticky.pages.dev/' : 'https://karticky.pages.dev/';

// The app owner's account; only it sees the switch to the test version in the public app.
export const ownerEmail = 'jakubcabalek@gmail.com';
