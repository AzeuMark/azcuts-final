# Guide module — SCHOOL/DEFENSE ONLY. DELETE BEFORE REAL-WORLD DEPLOY.

This folder (`client/src/guide/`, routed at `/guide/*`) is a classmate-facing
tour of the paper-required features. It is NOT part of the product.

## Why it must be deleted on a real deploy (safety)

1. **Demo credentials on screen.** The guide home lists working seed logins
   (`admin@azcuts.com`, staff accounts). Shipping that publicly hands out keys.
2. **Internal blueprint exposure.** The HIPO/IPO + database chart pages publish
   the system's internals (collections, flows, endpoints) — useful for a
   defense panel, dangerous on the open internet (attack reconnaissance).
3. **Dead weight + dependency.** The guide pulls `mermaid` (~1 MB) into the
   bundle and adds six public routes with zero business value.

## Removal (30 seconds)

```bash
# from the repo root
rm -rf client/src/guide
# then delete the three "Guide" lines in client/src/App.jsx
# (the lazy imports + the /guide route block — marked with GUIDE-ONLY)
pnpm --dir client install --prefer-offline && npm run build --prefix client
```

Also rotate ALL seed credentials (`admin`, staff passwords) on any public
deploy — the guide is not the only place they were ever written down
(see `server/seed/*.json`, `defense-script.md`).
