# Temporary logo and app icon

**Status: TEMPORARY, NEEDS REVIEW.** Used until a final logo is chosen (owner decision, 2026-11-15).

- Source: `logo-source-grok.jpg`, supplied by the owner on 2026-11-15. It is an AI-generated image (the owner's file carries a "Grok" mark in its bottom-right corner). The tool, prompt, terms of use and who owns the rights are **not recorded and not reviewed**. Do not treat it as cleared for the Play Store listing, advertising or a trademark filing until that is checked.
- Derived files in `web/public/`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180 px), `logo-96.png` (in-app logo), `icon-maskable-512.png` (artwork at 76% on the gold frame colour, so Android's circular and squircle masks do not cut it). All are a square crop of the artwork area (the watermark and the black corners are outside the crop), resized and colour-reduced to 160 colours to keep the offline cache small.
- To rebuild after a new logo: crop a square, write the five files above, run `npm run build:web`.
- Rights, similarity to existing marks and Play Store policy are open questions for counsel (OQ-016, `docs/legal/trademark-review.md`).
