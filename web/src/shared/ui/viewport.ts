/**
 * Keeps the app a phone-sized app even when the browser asks for the desktop site.
 *
 * Mobile browsers in "Desktop site" mode ignore the viewport meta tag and lay the page out about
 * 980 CSS px wide, then shrink it to fit the screen, so everything looks tiny. When that happens on
 * a touch device we zoom the page by the same ratio, so the layout is again as wide as the screen.
 * Normal phone use, landscape phones, tablets, laptops and desktops return 1 (no change).
 */
const MAX_SCREEN = 900;
const DESKTOP_RATIO = 1.4;

export function desktopModeZoom(
  layoutWidth: number,
  screenWidth: number,
  touchPoints: number,
): number {
  if (touchPoints < 1 || screenWidth <= 0 || screenWidth > MAX_SCREEN) return 1;
  if (layoutWidth <= screenWidth * DESKTOP_RATIO) return 1;
  return Math.min(layoutWidth / screenWidth, 4);
}

export function fitMobileViewport(win: Window = window): () => void {
  const root = win.document.documentElement;
  const apply = (): void => {
    // Measure without our own zoom so a rotation or a mode change is judged on the browser's layout.
    root.style.removeProperty('zoom');
    root.style.removeProperty('--page-zoom');
    const zoom = desktopModeZoom(win.innerWidth, win.screen.width, win.navigator.maxTouchPoints);
    if (zoom !== 1) {
      root.style.setProperty('zoom', String(zoom));
      // Viewport units are multiplied by the zoom too; CSS divides them back (see `.app`).
      root.style.setProperty('--page-zoom', String(zoom));
    }
  };
  apply();
  win.addEventListener('orientationchange', apply);
  win.addEventListener('resize', apply);
  return () => {
    win.removeEventListener('orientationchange', apply);
    win.removeEventListener('resize', apply);
  };
}
