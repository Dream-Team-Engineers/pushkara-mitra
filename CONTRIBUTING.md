# Contributing

## Branches and commits

- Branch prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `sec/`.
- [Conventional Commits](https://www.conventionalcommits.org/). The **PR title** is validated (`pr-title`) because it becomes the squash commit.
- Keep pull requests under 400 lines. Split larger work.
- Never push to `main`. Open a pull request.

## Review

- Same-day review is the target. A code owner must approve.
- Work-in-progress limit: **2 items per person**.
- Add the `needs-owner-review` label if payments, donations, location, children or audit code is touched.
- Tick every box in the PR template. Write "N/A" next to a conditional item that does not apply.

## Sign your commits (SSH signing)

The `main` ruleset requires signed commits.

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

Then add the same public key to GitHub as a **Signing key** (Settings, SSH and GPG keys).

## Local checks before you push

```bash
npm ci
npm run check
npm run licence-check
```

## Adding a dependency

1. Prefer none. The Worker has zero runtime dependencies today.
2. The licence must be on the allow-list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, Unlicense, BlueOak-1.0.0.
3. Run `npm run licence-check`. Anything else needs an `ip-licence-review` issue and a reviewed entry in `docs/legal/licence-exceptions.json`.
4. Regenerate or update `docs/legal/licence-register.md` in the same pull request.
5. Check `npm audit --omit=dev` is clean.

## Rules you must not break

- No location persisted or logged.
- No secrets, no personal data in tests or fixtures.
- Pin GitHub Actions to full commit SHAs. Never `pull_request_target`.
- GitHub settings change only through `scripts/setup-github.sh`.
