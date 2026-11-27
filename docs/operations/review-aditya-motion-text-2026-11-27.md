# Review of Aditya's changes: reduced motion, text size, countdown wording (2026-11-27)

Reviewer: Claude Code (agent). This is a code read plus the automated checks listed at the end. It is **not** a check on a real phone, a screen reader or at 200% zoom, and it is not an independent review (none exists). Reported separately from legal sign-in.

Commits reviewed (now merged into `web/src/shared/ui/styles.css` and `src/admin/render.ts`): `f6f888f` admin restyle, `5110bbe` splash and loaders, `a9efef4` home countdown, glow and card motion, and the web parts of `fc76aac`.

## Reduced motion

| Area                                                                                         | Result                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Splash (card, name, tag, ripples, progress bar), spinner, skeleton shimmer                   | OK. Each animated class is in the `prefers-reduced-motion` block; the bar is filled instead of animated. The splash also stays 0.5 s instead of 1.8 s (`Splash.tsx`) and a tap or key skips it. |
| Home countdown glow, logo float, quick cards, card lists, tiles, map sheet, appearance panel | OK. Every `animation:` use found has a matching `animation: none` rule.                                                                                                                         |
| Admin page (aurora blobs, rise-in, pulse, sparkline draw)                                    | OK before and after: the block covers `*`.                                                                                                                                                      |
| Admin page, `.hero::before` (rotating border beam) and `.btn--go::before` (spinning ring)    | **FIXED.** The old rule was `*{animation:none}`, which does not match `::before` or `::after`, so these two kept spinning. It is now `*,*::before,*::after`.                                    |

## Text size and zoom

| Area                           | Result                                                                                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Splash                         | OK. Text uses the shared size tokens and wraps; the fixed pixel sizes are decorative shapes only. It is hidden from assistive technology and does not trap focus.                                                                                        |
| Home countdown rings           | **FIXED.** Four rings stayed in one row at every width, so "minutes", "seconds" (and longer Telugu words) and three-digit day counts could collide below 18rem (about 200% text on a 375px phone). Below 18rem the rings are now 2 by 2 and labels wrap. |
| Admin page                     | Not checked at large text; it is a staff page. Open.                                                                                                                                                                                                     |
| Telugu and Hindi at large text | Not checked. Open.                                                                                                                                                                                                                                       |

## Countdown wording (owner to decide)

- The title says "Godavari Pushkaralu 2027 starts in" and counts down to 26 June 2027 00:00 IST, to the second. The date comes from the district page (owner-confirmed 2026-11-14, `src/.../time.ts`). The first holy-dip time is separately marked pending (`ghats.snanamPending`), so counting to midnight may imply a precision the sources do not give. Options: keep as is, drop the seconds ring, or say "from 26 June 2027". NEEDS REVIEW by the owner.
- The four rings change every second and are plain list items without a live region, so a screen reader is not interrupted. Not tested with a real screen reader.

## Privacy

Splash and countdown store and send nothing (`Splash.tsx` header; no storage calls in either). The admin changes are styling only.

## What ran

- `npm run check` on 2026-11-27: lint, typecheck, 1162 tests passed (24 skipped), prettier clean.
- No browser, device or screen-reader run.
