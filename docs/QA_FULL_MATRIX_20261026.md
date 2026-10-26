# 5R Full Character Matrix QA — 2026-10-26

- Seed: `0x5A17C0DE`
- Total cases: **1104**
- Base class cases: 240
- Subclass cases: 864
- Feature checks: **13241**
- Spell checks: 1104
- Classes covered: 12
- Subclasses covered: 48
- Species covered: 10
- Backgrounds covered: 16
- Runtime spell count: 391
- Spell class parity failures: 0
- Matrix failures: **0**
- Matrix process exit code: **0**

## Defect found by this matrix

Celestial Patron level 9 used the Chinese label `召喚天界生物`, which resolved to the 7th-level `Conjure Celestial`. PHB2024 requires the 5th-level `Summon Celestial`, whose runtime Traditional Chinese display name is `天界生物召喚術`.

The mapping was corrected and the complete matrix was rerun.

## Evidence

Machine-readable report:
`D:\Tools\zizi-ai-runtime	rpg-playercheet-qaull-character-matrix-report.json`

Log:
`D:\Tools\zizi-ai-runtime	rpg-playercheet-qaull-character-matrix-last.log`
