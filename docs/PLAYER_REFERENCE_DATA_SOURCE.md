# 5R Player Reference Data Source

Upstream: 5etools-mirror-3/5etools-src v2.37.0, commit 8c026b807fac21862a309379a0c3228a0683198b.

## Scope

- Raw XDMG item-source records: 584. This includes mundane treasure/trade goods and must not be called 584 magic items.
- Actual generated XDMG magic items (`rarity != none`): 435.
- Creatures: XMM 503 + XPHB 15 + XDMG 2 = 520.
- Builder: `scripts/build-5r-player-reference.py`.
- Generated data: `assets/data/magic-items-5r.js`, `assets/data/creatures-5r.js`, `assets/data/player-reference-5r-meta.js`.

## Player creature derivations

Wild Shape is derived from canonical stat blocks, not a hand-maintained list. Base Druid: level 2 CR <= 1/4 and no Fly Speed; level 4 CR <= 1/2 and no Fly Speed; level 8 CR <= 1 and Fly Speed allowed. Swarms are excluded. Circle of the Moon maximum CR is floor(Druid level / 3), while the general no-Fly restriction remains until Druid level 8.

Mounts: Otherworldly Steed is an explicit Find Steed stat block. `Large Beast mount candidate` is only a prefilter for non-swarm Beasts of Large+ size with walking speed; suitable anatomy and final eligibility remain a rules/DM determination.

XPHB `summonedBySpell` and `summonedByClass` are preserved. The builder additionally scans every XPHB spell for direct `{@creature ...}` references, so Find Familiar, Find Steed, Animate Dead, Animate Objects, Create Undead, Giant Insect, Phantom Steed and future direct creature references are indexed without a hand-maintained whitelist.

## Language

Where the project has no authoritative 2024 Traditional Chinese source for XDMG/XMM content, canonical upstream English names/rule text are retained. Machine-translated text must not be presented as canonical 5RTools text.

## Traditional Chinese projection

- Structured source: `tjliqy/5etools-cn`, branch `cn2.0`, pinned commit `5cc0bbe2c2b241a334e731af4448bdba2168e8bd`.
- Exact identity coverage: XDMG magic items 435/435 by `(ENG_name, XDMG)`; creatures 520/520 by `(ENG_name, source)`.
- Conversion: OpenCC `s2twp` to Taiwan Traditional Chinese.
- The English canonical datasets remain unchanged and continue to come from the pinned 5etools-src v2.37.0 snapshot.
- Runtime display contract: names are `繁中｜English`; rarity/type/attunement/source/stat labels/rule body/traits/actions/reactions/spellcasting are Traditional Chinese only.
- Official builder: `scripts/build-5r-zh-projection.py`.
- CHM/website/machine-translation experiments were evaluated only as fallback research and are not runtime sources.

## Bounded translation corrections

`assets/data/player-reference-zh-corrections.json` contains only evidence-backed corrections where the structured Chinese source or OpenCC projection is demonstrably wrong. The current mechanics correction is `Baboon|XMM|Pack Tactics`, verified against the pinned English XMM canonical rule. OpenCC context fixes are limited to the `內存`→`記憶體` false-positive phrases. These corrections are provenance, not a second rule database.

## Familiar eligibility 2024

The player-facing labels are derived independently from the canonical stat block's `familiar` metadata and direct `spellRefs`. `Find Familiar` (XPHB) allows a non-swarm Beast with CR 0 (including qualifying forms not explicitly named in the spell text); this is computed rather than manually enumerated. A monster's `familiar` flag is a reference annotation, not spell eligibility. `spellRefs` are source references and must not create a second eligibility tag.

The 2024 Warlock invocation **Pact of the Chain** (鎖鏈魔契) adds exactly eight special forms: Imp, Pseudodragon, Quasit, Skeleton, Slaad Tadpole, Sphinx of Wonder, Sprite, Venomous Snake. Preserve these English XMM identities as the explicit rules-list exception; notably Imp does not have the upstream `familiar` flag. Chain forms remain distinct from regular Find Familiar, while unrelated tags (Wild Shape, Animate Dead) remain visible. This is a UI classification only; no stat block mechanics or saved identities change.

## Character-sheet reference imports

The 2024 tool reference now filters the pinned 520 creature records by exact CR, size, and creature type, intersected with existing mode/source/Wild Shape filters. The source's type, cr, sizeCodes and canonical id are not rewritten.

A creature is **not** granted by importing its card. Direct import stores stable creature IDs in the current character save (v10), with the original stat block and Traditional Chinese projection read at render time. Existing S.familiar remains the sole familiar choice; Warlock Pact of the Chain is still gated to its eight exclusive forms. 2024 Druid Wild Shape stores creatureLibrary.wildShape as known forms (4 at Druid Lv2, 6 at Lv4, 8 at Lv8), with standard CR/fly rules and the Moon circle's level-based maximum. Old forms remain saved but are marked invalid if the character changes to an ineligible level/subclass. Ranger Beast Master writes directly to the existing classChoices2024["遊俠"].primalBeast choice and displays the matching XPHB Primal Beast stat block (not an ordinary Beast with CR).

Other spell-referenced summons and Large Beast mount candidates are optional **reference cards** under creatureLibrary.summons/mounts; no spell known/prepared state, slot usage, controls, HP or combat conditions are granted. Mount candidates still require DM adjudication. The save importer validates IDs, spell reference provenance, and list limits. Old v9 saves without this optional field load with empty attachment lists. Existing 2014 character rules remain isolated.

## 2024 mount tiers

PHB 2024 Equipment > Mounts and Other Animals is the provenance for eight standard listed animal forms: Camel, Elephant, Draft Horse, Riding Horse, Mastiff, Mule, Pony, Warhorse. Exact XMM canonical English names are used for this deliberate whitelist. Mounted Combat independently requires a willing creature with suitable anatomy, one size category larger than the rider. Only trained mounts can be controlled. Medium Mastiff/Mule/Pony are suitable by size only for Small-or-smaller riders; the PHB equipment table does not waive these conditions.

The XPHB Otherworldly Steed belongs to Find Steed, its own spell category. Other derived Large+ non-swarm walking Beasts remain special candidates requiring DM adjudication. The three mutually exclusive tiers partition the combined mount filter (8 standard + 1 spell + 37 other = 46). No canonical stat block or schema modified. Saved mount reference IDs must use the same classifier to retain Medium standard mounts through JSON save-load, and adding reference cards never grants a creature, saddle, training or spell.
