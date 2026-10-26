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
