# Local review typography

The current candidate uses self-hosted Roboto for Latin interface text, Noto Sans Telugu for Telugu, and Noto Sans Devanagari for Hindi. The same sans-serif hierarchy is used in headings, menus and body text. This replaces the previous Georgia and Segoe UI pairing. The user-provided font comparison image is a visual reference only; no artwork or font files were copied from it.

Roboto was selected over Ubuntu for this prototype because its neutral forms suit dense navigation. The [Roboto metadata](https://github.com/google/fonts/blob/main/ofl/roboto/METADATA.pb) lists Latin coverage and SIL OFL 1.1. [Ubuntu's official font page](https://design.ubuntu.com/font) describes Latin, Cyrillic and Greek support, so it would still require separate Telugu and Hindi faces. The [Noto Sans Telugu](https://github.com/google/fonts/blob/main/ofl/notosanstelugu/METADATA.pb) and [Noto Sans Devanagari](https://github.com/google/fonts/blob/main/ofl/notosansdevanagari/METADATA.pb) metadata identify their scripts and SIL OFL 1.1. This is an engineering font choice, not brand or legal approval.

## Local assets and reproducibility

The three variable TTF sources were fetched from the official `google/fonts` repository on 2026-11-05 and checked before subsetting. Source SHA-256 values were:

| Family               | Downloaded TTF SHA-256                                             |
| -------------------- | ------------------------------------------------------------------ |
| Roboto               | `d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134` |
| Noto Sans Telugu     | `e618af7bf999df192ed4f388eba2e563f2b5015034e9cbb317b5bd793bd7334d` |
| Noto Sans Devanagari | `14ec4af41f27482216d1c2229f417ff9b1425e1babb014e57d1d40d03229853e` |

FontTools generated static weights 400 and 700 at width 100 and WOFF files. Roboto was subset to Latin `U+0000-024F`, punctuation `U+2000-206F` and the rupee sign `U+20B9`. The two Noto families were subset to the Telugu and Devanagari characters in the current local HTML and browser modules, retaining OpenType layout features. All current script code points were checked against both corresponding WOFF character maps with zero missing. If copy changes, rebuild those subsets and repeat coverage and shaping checks; system fonts remain fallback for missing glyphs. The browser still needs visual review at 390px, 320px and enlarged text, including native-language review.

The six WOFF assets total **217,236 bytes**; the two Telugu assets total **57,472 bytes**. The proposed first-load transfer budget has not been measured on a device or network. The service worker precaches only these own static font URLs alongside the public shell. The matching SIL OFL files are included beside the fonts. No external runtime font request is made.

| WOFF asset                    | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `Roboto-400-latin.woff`       | `5b90c77658e5a04721e5e8fb9b678f990a86a34ac708781f16b77638f068001d` |
| `Roboto-700-latin.woff`       | `9293341a32211a1ec094cdd103a8501d1489f7683f39f24c41cbc111d5726036` |
| `NotoSansTelugu-400.woff`     | `206ec4a1dbd06bc94e158e8ab2d46c0832f09f681eed3909d4cbda402356de10` |
| `NotoSansTelugu-700.woff`     | `9ce1672a984199d370492dc21509bcf4a4b39af14c98a58a8134e8b25b1b98b7` |
| `NotoSansDevanagari-400.woff` | `c365dadd9bb66872d2460239718edc3bcd462af38f06e2112f50d2a428b8492b` |
| `NotoSansDevanagari-700.woff` | `4966ff01fea1a715c37b52f3ad0b88e48e89b923095fe2312d8024012bdfc7c2` |
