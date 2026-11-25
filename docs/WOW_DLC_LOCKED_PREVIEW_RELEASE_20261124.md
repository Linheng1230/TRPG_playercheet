# WoW DLC locked preview release — 2026-11-24

Scope: **public-safe preview only** for [Issue #116](https://github.com/Linheng1230/TRPG_playercheet/issues/116), event on **2026-12-19**: Deadmines, four level-2 characters, four hours, 40% story / 60% absurd comedy.

## Included
- 2014 / 2024 chooser adds a non-selectable `WoW DLC・施工中` entry and a factual readiness dialog, including GM-approved D&D 5R species mixing.
- A verified, static `.js` browser artifact is generated deterministically from `assets/wow-dlc-entry.mjs` and public-safe policy metadata. No paid book text, private secrets, or runtime authorization tokens are embedded.
- Existing 2014 / 2024 ruleset computation is untouched. Unknown `dlcId` cannot silently deserialize into a 2024 character.
- Imported, unsupported DLC roster entries are visibly identified; editing and copying are disabled while **original JSON export and backup preservation remain available**.
- Public metadata policy / P0 completeness tests remain locked. GM approval is *not* granted by client JSON.
- `tests/qa-spell-traditional.py` now validates this checkout rather than the dirty local main, and protects two precisely source-proven OpenCC lexical ambiguities. It still rejects simplified text elsewhere.

## Explicitly not included
- Full WoW licensed PHB translations or any private Babele/Foundry pack data.
- Enabled WoW character creation, paid species/feature mechanics, class resource calculation, legal WoW Lv2 character completion.
- Connected Cloud/GM role change, private entitlement provider, PDF/FVTT WoW export, Foundry world changes.
- No claim that four playable WoW level-2 characters or production GM Live-UAT pass.

These remain **ACTIVE / RELEASE HOLD** in original Draft PR #117. The private content must never be committed to public GitHub Pages.

## Release acceptance and evidence
- Isolated site branch from `origin/main` (base `754cdde3a24492d63991f956af27245ee3a76bff`), not dirty main; source PR #117 at `c1d5675`.
- Bundle parity: `node scripts/build-wow-dlc-entry.mjs --check` PASS; MIME `text/javascript` under HTTP server.
- Seven dedicated WoW policy/compatibility/quarantine tests PASS.
- **35/35** existing website release-gate tests PASS, including full character matrix, 2014 regression, 2024 exact subclass/progression gates, save migration and previously failing final spell sheet metadata.
- Human-equivalent isolated Chrome visual/click tests **25/25 PASS** (desktop, 390px mobile, DLC dialog and 2014/2024, roster JSON file-input/import/export).
- Existing creator E2E 2014/2024, critical PDF raster PASS.
- Traditional Chinese 391 spell-source entries checked with **0 outstanding differences**, plus two negative controls.
- `git diff --check`, CI, exact site SHA/readback and Pages post-deploy Chrome acceptance still have to be verified at the final release moment.

Evidence folder (not published): `D:\Tools\zizi-ai-runtime\wow-dlc-p0-20261124`.

## Owner / rollback
- Website index and main release are claimed through durable task `wow-dlc-20261219`; permissions remain limited to public-safe static website changes.
- Keep PR #117 Draft. Do not overwrite shared dirty main or other active PRs.
- Before merge record current main HEAD, GitHub Pages run and deployment SHA. If production runtime mismatches, mark release REOPENED, revert the exact preview merge through the normal protected repository process and reverify deployed source.
