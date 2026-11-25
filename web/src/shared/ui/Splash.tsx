import { useEffect, useState } from 'preact/hooks';
import { Bi } from './Bi';

const SHOW_MS = 1800;
const SHOW_MS_REDUCED = 500;
const FADE_MS = 400;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Branded splash, shown once at each launch over the app while it settles; nothing is stored. It is decorative:
 * the app underneath is already rendered and readable, so it is hidden from assistive technology
 * and any tap or key press skips it. It carries no data and makes no request beyond the logo.
 */
export function Splash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const wait = prefersReducedMotion() ? SHOW_MS_REDUCED : SHOW_MS;
    const leave = setTimeout(() => {
      setLeaving(true);
    }, wait);
    const done = setTimeout(() => {
      setVisible(false);
    }, wait + FADE_MS);
    const skip = (): void => {
      setLeaving(true);
      setTimeout(() => {
        setVisible(false);
      }, FADE_MS);
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div class={leaving ? 'splash splash--leaving' : 'splash'} aria-hidden="true">
      <span class="splash__ripple" />
      <span class="splash__ripple splash__ripple--2" />
      <span class="splash__ripple splash__ripple--3" />
      <div class="splash__card">
        <img
          class="splash__logo"
          src="/hero-logo.png"
          width={168}
          height={201}
          alt=""
          decoding="async"
        />
      </div>
      <p class="splash__name">
        <Bi k="app.name" stacked />
      </p>
      <p class="splash__tag">
        <Bi k="app.tagline" />
      </p>
      <span class="splash__bar">
        <span class="splash__bar-fill" />
      </span>
      <p class="splash__fine">
        <Bi k="app.disclaimer" />
      </p>
    </div>
  );
}
