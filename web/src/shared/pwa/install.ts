import { signal } from '@preact/signals';

/**
 * "Install the app" prompt for people who open the site in a browser tab.
 * Android Chrome and similar fire `beforeinstallprompt`; we keep that event and show our own banner.
 * iPhone Safari has no such event, so we show a short how-to instead. Nothing is stored: if the
 * person dismisses the banner it stays hidden for this visit only.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

export const installAvailable = signal(false);
export const installDismissed = signal(false);

let deferred: InstallPromptEvent | null = null;

export function isStandalone(win: Window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return win.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iPhone, iPad and iPod Safari (other iOS browsers cannot add to the home screen). */
export function isIosSafari(userAgent: string): boolean {
  return (
    /iphone|ipad|ipod/i.test(userAgent) &&
    /safari/i.test(userAgent) &&
    !/crios|fxios|edgios/i.test(userAgent)
  );
}

/** True when the how-to for iPhone should be shown instead of an install button. */
export function showIosHint(): boolean {
  if (typeof window === 'undefined') return false;
  return isIosSafari(window.navigator.userAgent) && !isStandalone(window);
}

export function listenForInstall(): void {
  if (typeof window === 'undefined') return;
  const win = window;
  if (isStandalone(win)) return;
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    installAvailable.value = true;
  });
  win.addEventListener('appinstalled', () => {
    deferred = null;
    installAvailable.value = false;
  });
}

export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (event === null) return;
  deferred = null;
  installAvailable.value = false;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    // The browser may refuse a second prompt; the banner stays hidden for this visit.
  }
}
