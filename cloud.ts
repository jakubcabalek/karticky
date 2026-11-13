// Account and sync (Supabase, like Fakturo). The app works without an account;
// signing in keeps the collection, wishlist and decks the same on the web and the phone.
// Sign-in: Google, Facebook, or e-mail and password.
import 'react-native-url-polyfill/auto';
import { AppState, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeLibrary, type Library } from './cardData';

export type { Session };
export type OAuthProvider = 'google' | 'facebook';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const cloudConfigured = Boolean(supabaseUrl && supabaseKey);

/** Where Google/Facebook send the person back after signing in. Must be allowed in Supabase → Auth → URL configuration. */
export const NATIVE_REDIRECT = 'kartoteka://auth-callback';

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        // PKCE: the provider returns a one-time code that only this device can exchange.
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

const client = () => {
  if (!supabase) throw new Error('Účty zatím nejsou nastavené.');
  return supabase;
};

// ---- Sign-in ----

/**
 * Google or Facebook. On the web the page goes to the provider and comes back signed in.
 * On the phone the provider opens in Safari and returns to the app via kartoteka://auth-callback.
 */
export const signInWithProvider = async (provider: OAuthProvider) => {
  const auth = client().auth;
  const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/` : NATIVE_REDIRECT;
  const { data, error } = await auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      ...(provider === 'facebook' ? { scopes: 'email' } : {}),
    },
  });
  if (error) throw error;
  if (Platform.OS !== 'web' && data.url) await Linking.openURL(data.url);
};

/** Finishes a Google/Facebook sign-in when the phone app is opened via kartoteka://auth-callback?code=… */
export const completeSignInFromUrl = async (url: string | null): Promise<string | null> => {
  if (!url || !url.startsWith(NATIVE_REDIRECT) || !supabase) return null;
  const params = new URL(url).searchParams;
  const failure = params.get('error_description') ?? params.get('error');
  if (failure) return failure;
  const code = params.get('code');
  if (!code) return null;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? error.message : null;
};

export const listenForSignInLinks = (onError: (message: string) => void) => {
  if (Platform.OS === 'web') return () => undefined;
  const handle = (url: string | null) => void completeSignInFromUrl(url).then(message => { if (message) onError(message); });
  void Linking.getInitialURL().then(handle);
  const subscription = Linking.addEventListener('url', event => handle(event.url));
  return () => subscription.remove();
};

export const signInWithEmail = async (email: string, password: string) => {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
};

/** Returns true when the account still needs the link from the confirmation e-mail. */
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await client().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: Platform.OS === 'web' ? `${window.location.origin}/` : 'https://kartoteka.pages.dev/' },
  });
  if (error) throw error;
  return !data.session;
};

export const resetPassword = async (email: string) => {
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: Platform.OS === 'web' ? `${window.location.origin}/` : 'https://kartoteka.pages.dev/',
  });
  if (error) throw error;
};

export const signOut = async () => { await client().auth.signOut(); };

/** Czech messages for the errors people actually meet. */
export const authErrorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/invalid login credentials/i.test(message)) return 'Špatný e-mail nebo heslo.';
  if (/email not confirmed/i.test(message)) return 'Nejdřív potvrď e-mail odkazem, který ti přišel.';
  if (/already registered|already been registered/i.test(message)) return 'Tenhle e-mail už účet má. Přihlas se.';
  if (/password should be at least|weak password/i.test(message)) return 'Heslo je moc krátké, použij aspoň 8 znaků.';
  if (/provider is not enabled|unsupported provider/i.test(message)) return 'Tohle přihlášení ještě není zapnuté v nastavení účtů.';
  if (/network|fetch/i.test(message)) return 'Nejde se připojit. Zkontroluj internet.';
  return message || 'Něco se pokazilo, zkus to znovu.';
};

// ---- Library in the cloud: one row per account, with a revision against overwriting ----

export type CloudLibrary = { library: Library; revision: number };

const toCloud = (row: { data?: unknown; revision?: unknown }): CloudLibrary => ({ library: normalizeLibrary(row.data), revision: Number(row.revision) });

export const readCloudLibrary = async (userId: string): Promise<CloudLibrary | null> => {
  const { data, error } = await client().from('library_data').select('data, revision').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? toCloud(data) : null;
};

/** Saves when nobody else saved in between; otherwise returns the newer cloud version to merge with. */
export const writeCloudLibrary = async (
  userId: string,
  expectedRevision: number | null,
  library: Library,
): Promise<{ saved: CloudLibrary } | { conflict: CloudLibrary | null }> => {
  const db = client();
  if (expectedRevision === null) {
    const { data, error } = await db.from('library_data').insert({ user_id: userId, data: library, revision: 1 }).select('data, revision').maybeSingle();
    if (!error && data) return { saved: toCloud(data) };
    if (error?.code !== '23505') throw error ?? new Error('Uložení do účtu se nepovedlo.');
    return { conflict: await readCloudLibrary(userId) };
  }
  const { data, error } = await db
    .from('library_data')
    .update({ data: library, revision: expectedRevision + 1, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('revision', expectedRevision)
    .select('data, revision')
    .maybeSingle();
  if (error) throw error;
  return data ? { saved: toCloud(data) } : { conflict: await readCloudLibrary(userId) };
};
