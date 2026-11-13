// "Účet" in Profile: optional. Google, Facebook, or e-mail and password.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import {
  authErrorText, cloudConfigured, resetPassword, signInWithEmail, signInWithProvider, signOut, signUpWithEmail,
  type OAuthProvider, type Session,
} from './cloud';
import { SmallButton, s } from './ui';

export type SyncState = 'off' | 'syncing' | 'synced' | 'error';

const PROVIDERS: { id: OAuthProvider; label: string; bg: string; fg: string; border?: string }[] = [
  { id: 'google', label: 'Pokračovat přes Google', bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0' },
  { id: 'facebook', label: 'Pokračovat přes Facebook', bg: '#1877F2', fg: '#FFFFFF' },
];

const providerName = (session: Session) => {
  const provider = session.user.app_metadata?.provider;
  return provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'e-mail';
};

export default function Account({ session, syncState, externalError }: { session: Session | null; syncState: SyncState; externalError?: string }) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!cloudConfigured) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Účet</Text>
        <Text style={s.muted}>Přihlášení se zapne, až bude nastavený Supabase (viz DEPLOY.md).</Text>
      </View>
    );
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setInfo('');
    try { await action(); } catch (failure) { setError(authErrorText(failure)); } finally { setBusy(false); }
  };

  if (session) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Účet</Text>
        <View style={s.card}>
          <Text style={s.rowTitle}>{session.user.email ?? 'Přihlášen'}</Text>
          <Text style={s.muted}>Přihlášení přes {providerName(session)}</Text>
          <Text style={syncState === 'error' ? s.error : s.muted}>
            {syncState === 'syncing' ? 'Synchronizuju…' : syncState === 'error' ? 'Synchronizace se nepovedla, zkusím to znovu.' : 'Sbírka, wishlist a balíčky jsou uložené v účtu.'}
          </Text>
          <SmallButton label="Odhlásit se" onPress={() => void run(signOut)} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Účet</Text>
      <Text style={s.muted}>Účet není potřeba. S ním máš sbírku, wishlist a balíčky stejné na webu i v telefonu a nepřijdeš o ně.</Text>
      {PROVIDERS.map(provider => (
        <Pressable
          key={provider.id}
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void run(() => signInWithProvider(provider.id))}
          style={[s.providerButton, { backgroundColor: provider.bg, borderColor: provider.border ?? provider.bg }]}
        >
          <Text style={[s.providerText, { color: provider.fg }]}>{provider.label}</Text>
        </Pressable>
      ))}

      <Text style={[s.muted, s.divider]}>nebo e-mailem</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'signUp' ? 'Heslo, aspoň 8 znaků' : 'Heslo'}
        secureTextEntry
        autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
        textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
      />
      <Pressable
        style={s.primaryButton}
        disabled={busy}
        onPress={() => void run(async () => {
          if (mode === 'signIn') await signInWithEmail(email, password);
          else if (await signUpWithEmail(email, password)) setInfo('Hotovo. Potvrď účet odkazem, který ti přišel e-mailem, a pak se přihlas.');
        })}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>{mode === 'signIn' ? 'Přihlásit se' : 'Vytvořit účet'}</Text>}
      </Pressable>
      <View style={s.actions}>
        <SmallButton label={mode === 'signIn' ? 'Nemám účet · Vytvořit' : 'Už účet mám · Přihlásit se'} onPress={() => { setMode(m => m === 'signIn' ? 'signUp' : 'signIn'); setError(''); }} />
        {mode === 'signIn' && (
          <SmallButton
            label="Zapomenuté heslo"
            onPress={() => void run(async () => {
              if (!email.trim()) throw new Error('Napiš nahoru svůj e-mail.');
              await resetPassword(email);
              setInfo('Poslali jsme ti e-mail s odkazem na nové heslo.');
            })}
          />
        )}
      </View>
      {!!(error || externalError) && <Text style={s.error}>{error || externalError}</Text>}
      {!!info && <Text style={s.price}>{info}</Text>}
    </View>
  );
}
