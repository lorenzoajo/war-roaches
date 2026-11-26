# War Roaches

Hot-seat artillery chaos for 2–4 players on one phone or tablet. Cartoon roaches, absurd destructible maps, silly weapons.

## Develop
```sh
nix develop --no-pure-eval   # or: direnv allow
npm install
npm run dev                  # open on your phone via the LAN URL
npm test
```

## Build
```sh
nix build                    # static site in ./result
```
When `package-lock.json` changes, update `npmDepsHash` in `flake.nix` (run `nix build`, copy the `got:` hash).

## Deploy
GitHub Pages via `.github/workflows/deploy.yml`: runs on push to `master` and manually (Actions → Deploy to GitHub Pages → Run workflow).
One-time: repo Settings → Pages → Source: **GitHub Actions**. The site is served at `/war-roaches/`.
