# Interface foundation: local review candidate

This is a provisional design for the synthetic local prototype. Human visual, language and accessibility review remain open; it is not an approved release design.

## Shared decisions

- **Colour:** warm paper, deep brown and muted clay, with river green and restrained blue accents. Light and dark appearances use the existing CSS tokens; colour is not the only indication of a selected tab.
- **Type:** locally hosted Roboto, Noto Sans Telugu and Noto Sans Devanagari. The source, licences and current-subset limits are recorded in `typography.md`.
- **Icons and images:** original SVG line drawings in `public/assets/icons.v1.mjs` remain for navigation and fallback. Home shortcuts use a locally generated photographic-style image sheet of fictional scenes, clearly identified in the interface as fictional. Asset provenance is in `docs/legal/asset-permissions.md`; cultural and visual review remain pending.
- **Scale:** on narrow screens shortcut images are 34px square, section symbols are 18px inside 32px accents, and bottom-tab symbols are 19px. Their containing links and controls retain larger touch targets. Labels stay visible rather than relying on pictures alone.
- **Shapes and spacing:** consistent rounded cards and buttons, lighter shadows, and four compact shortcut tiles per row on ordinary phone widths. Labels are vertically balanced within each tile. Tiles grow for long labels and enlarged text; at very narrow viewport widths they fall back to two columns. Expanded feature previews use compact full-width rows on phones, with fictional images, clear status labels and readable descriptions. Detail cards retain full-width mobile reading space.
- **Navigation:** five labeled bottom tabs on phones and the existing sidebar on wider screens. Active tabs have a background and top accent as well as colour.

## Representative screens

Home demonstrates the hero, shortcut grid and navigation. Plan shows a review-pending state until official content is approved. Ghats or Stays demonstrates unavailable states. No real event, map, weather, emergency or personal service is implied.

## Review still required

Review Home, Plan and one detail screen at 320px and 390px, in light and dark appearances and in Telugu, English and Hindi. Check icon recognition, text wrapping, keyboard focus, text enlargement and native-language wording. Actual device, screen-reader and legal reviews are not implied by the code or automated tests. Further illustration and animation polish can follow working feature flows.
