# Ghat content review

Open [official-content-review.html](official-content-review.html) locally in a browser to inspect the ghat review candidate. It is a self-contained page for team review, separate from the public app.

The page distinguishes 15 names on the East Godavari district source page, 159 user-submitted rows, and a newspaper-reported plan of 440 ghats across six districts. These are different evidence sets. The submitted rows and the planned total are not a verified inventory of open or safe ghats. Current access, facilities, directions and operating status remain unknown.

See [official-source-review.md](official-source-review.md) for sources, conflicts and approvals still needed. The JSON files are marked `NEEDS_REVIEW`. To regenerate the page with Node 22, run `npm run review:official` from the repository root. This does not add data to `public` or activate a Ghats list in the app.
