# 2024 Higher-Level Starting Resources

Scope: existing native Creator step 14, after level/spells and after the ordinary class/background equipment is selected. This is not a level-up reward. DM discretion applies.

## Provenance

- PHB 2024 / Free Basic Rules, Starting Equipment at Higher Levels: https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character
- SRD v5.2.1: https://www.dndbeyond.com/srd
- DMG 2024 Chapter 7, Random Magic Items: https://roll20.net/compendium/dnd5e/Rules:Random%20Magic%20Items?expansion=33359
- Four theme table links are defined once by `StartingResources5R.tableURL`. The full proprietary table corpus is not bundled or redistributed. An exact official lookup requires an authorized local table file; otherwise the UI clearly requires the player to consult the linked table and manually select the result. The separately labeled equal-rarity random pool is NOT the official weighted D100 distribution.
- Reuse existing XDMG canonical stable IDs, rarity, display projection and MagicItemImport5R. No new item definitions or rules text.

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

## Local table format

Supply a JSON file with a tables object. The key is theme:rarity. Theme values: arcana, armaments, implements, relics. Rarities: common, uncommon, rare, very rare, legendary. Each row has min, max and id (stable catalog item ID), or ids for DM-selected variants. All integer faces 1–100 must be covered exactly once, with no overlap, gaps, unknown IDs or rarity mismatches. 00 is represented by 100. Import lives in page memory; only selected IDs/dice/provenance enter character state. Do not insert official non-SRD table content into the public repository or cloud.

For spell scrolls, enspelled equipment and other variants the table may specify choices through existing IDs. Spell identity, base weapon or armor choice beyond existing catalog entries is left to DM adjudication; the importer does not invent an item or auto-equip it.

## State

- `S.gear.startingResourcesDraft2024`: optional pre-confirmation level/class-bound selection.
- `S.gear.startingResources2024`: receipt with version, starting level, GP, D10, stable item IDs, per-slot mode/theme/D4/D100/verification; or skipped/legacy marker.
- Atomic grant uses existing `MagicItemImport5R.add` on a draft gear snapshot. Any failure rolls back all changes. Existing normal equipment and currency are preserved. No automatic attunement.
- Existing creator final confirmation freezes the optional grant/skip decision. Reopen of pre-existing finalized characters records a legacy skip marker instead of issuing rewards. Level edits after a grant do not generate a second grant or silently remove spent resources. DM handles subsequent changes.
- Serialize/deserializes via existing gear object; item list, wallet and equipment output use existing readers. No new public or cloud table storage. No guarantee of simultaneous multi-tab transaction integrity; the website's existing character save model still applies.

## Acceptance

1. Levels 1–20, both gold endpoints, invalid dice, four themes and rarity counts.
2. D100 exact coverage, rejection of gaps, overlaps and mismatches, variant choices.
3. Actual Creator gear controls, mobile/desktop overflow, manual official table workflow and exact lookup from a synthetic authorized test fixture (not official corpus parity), random/free selection, final sheet and save/reload.
4. No duplicate grant on reopen or normal level-up; 2014 stays unchanged.
5. Existing gear, magic item, save migration, export and required release CI.
6. No official full table data release until redistribution rights and per-face parity are verified.
