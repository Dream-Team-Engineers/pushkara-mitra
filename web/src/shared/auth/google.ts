import { signal } from '@preact/signals';
import { GOOGLE_CLIENT_ID } from '../flags/flags';

/**
 * Google sign-in for the Me tab (ADR 0008, OQ-030). The person signs in with the Google account on
 * their phone. Google's own script is loaded only when they have agreed and are ready to sign in, the
 * ID token is sent once to our Worker, which verifies it, and only the name and email come back.
 * Nothing is stored in the browser or on the server: the signed-in person lives in memory and is gone
 * when the page is closed or they sign out.
 */
export interface SignedInUser {
  readonly name: string;
  readonly email: string;
}

export const user = signal<SignedInUser | null>(null);
export const signInError = signal(false);
/** True when the Worker also set a cookie, so the person stays signed in on this device. */
export const remembered = signal(false);

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google !== undefined) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Google sign-in could not load'));
    };
    document.head.append(script);
  });
  return loading;
}

export function isRealUser(value: unknown): value is SignedInUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SignedInUser).name === 'string' &&
    typeof (value as SignedInUser).email === 'string'
  );
}

async function exchange(credential: string): Promise<void> {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const body: unknown = await response.json();
    if (response.ok && isRealUser(body)) {
      user.value = { name: body.name, email: body.email };
      remembered.value = (body as { remembered?: unknown }).remembered === true;
      signInError.value = false;
    } else {
      signInError.value = true;
    }
  } catch {
    signInError.value = true;
  }
}

/** On page load: if this device still holds a valid sign-in cookie, show the person as signed in. */
export async function restoreSession(): Promise<void> {
  if (GOOGLE_CLIENT_ID === undefined) return;
  try {
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) return;
    const body: unknown = await response.json();
    if (isRealUser(body)) {
      user.value = { name: body.name, email: body.email };
      remembered.value = true;
    }
  } catch {
    // Offline or not configured: the person simply starts signed out.
  }
}

/** Draws Google's own sign-in button into `parent`. Rejects when the script cannot load. */
export async function renderGoogleButton(parent: HTMLElement): Promise<void> {
  if (GOOGLE_CLIENT_ID === undefined) return;
  await loadScript();
  const id = window.google?.accounts.id;
  if (id === undefined) throw new Error('Google sign-in is unavailable');
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (typeof response.credential === 'string') void exchange(response.credential);
      else signInError.value = true;
    },
  });
  id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill',
    width: 280,
  });
}

/** Signs out here and asks the Worker to clear the cookie on this device. */
export async function signOut(): Promise<void> {
  user.value = null;
  remembered.value = false;
  signInError.value = false;
  window.google?.accounts.id.disableAutoSelect();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    // Offline: the cookie expires on its own; the screen is already signed out.
  }
}
