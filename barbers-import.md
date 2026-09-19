# Barbers + Services Import (2026-09-19)

Replaced the placeholder demo data with the real shop data from the deployed
site `https://azeu-mark-f5d345acc10c.herokuapp.com/`.

## Source (read-only — nothing was written to the live site)

| What | How it was read |
|---|---|
| Barber names + positions | Rendered landing HTML (`#team`): name + title under each photo |
| Barber photos | Already local: `client/src/pages/public/images/barbers-template/` (user-confirmed) |
| Service names, prices, durations, categories, descriptions | Live API `GET /api/services` (public endpoint) |
| Service photos | Downloaded from the live API image streams (`/api/services/:id/image`) |

No scraper wrote anything anywhere; the Heroku app was only ever GET-requested.

## Barbers (exact names + positions from the site)

| Full name | Position (nickname) | Login email | Source photo |
|---|---|---|---|
| Cristiano Ronaldo | Stylist | cristiano@azcuts.com | `barbers-template/christiano-ronaldo.png` (2.6 MB) |
| Joshua Garcia | Barber | joshua@azcuts.com | `barbers-template/joshua-garcia.jpg` (33 KB) |
| Zayn Malik | Hairstylist | zayn@azcuts.com | `barbers-template/zayn-malik.jpg` (244 KB) |

All three positions already existed in `Settings.nicknames`, so no settings
change was needed. Password for all three: `Staff@123` (same bcrypt hash as
the old seeds — `seed/staff.seed.json` stores pre-hashed passwords).

Removed: `Miguel Santos` and `Ramon Cruz` (deleted from seeds + dev DB).

## Services (exact catalog from the live API)

| Name | Category | Price | Duration | Photo (new `images/services/` folder) |
|---|---|---|---|---|
| Bob Cut | haircut | ₱50 | 30 min | `bob-cut.png` (1.2 MB) |
| Burst Fade | haircut | ₱149 | 25 min | `burst-fade.jpg` (115 KB) |
| Wolf Cut | haircut | ₱199 | 30 min | `wolf-cut.png` (1.9 MB) |
| Pedicure | salon | ₱130 | 45 min | `pedicure.png` (2.0 MB) |

Descriptions copied verbatim from the live API. Removed the 5 placeholder
services (Classic Haircut, Skin Fade, Beard Trim & Shape, Hair Color,
Hair Rebond) from seeds + dev DB. Extras and products untouched.

## Images

- New folder `client/src/pages/public/images/services/` sits beside
  `barbers-template/`; files downloaded with extensions from the served
  `Content-Type` (verified bytes, not placeholders).
- Barbers reuse the existing `barbers-template/` files in place (no duplicates).
- Pushed into MongoDB on the documents (`avatarData`/`imageData` + streaming
  URLs), so the landing roster and service cards show real photos with zero
  code changes — both read the DB. Verified live: all 3 avatars + 4 service
  images stream 200 with correct mime types.

## Files changed

- `server/seed/staff.seed.json` — 3 real barbers (was Miguel/Ramon)
- `server/seed/services.seed.json` — 4 real services (was 5 placeholders)
- `client/src/pages/public/images/services/` — 4 downloaded photos (new)
- `client/src/guide/data.js`, `defense-script.md` — demo accounts updated
- Dev DB migrated the same way (old docs deleted, `seed.js` re-run, photos
  attached). New baseline: admin + 3 staff, 4 services, 4 extras,
  5 products, 0 appointments, 0 sales.

## What was NOT needed

- **AI image generation: skipped.** Every needed photo was obtainable — the
  barber photos already existed locally and the service photos downloaded
  cleanly from the live API. No generated images, no API key stored anywhere
  in the repo (and none is needed for this result).
- **No application code changed.** Roster, gallery, booking, and login all
  read live data, so new seeds + photos flow through automatically.
