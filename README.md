# TRPG Player Sheet

繁體中文 D&D 角色建立器，支援 2014 與 2024 規則，並能將角色資料匯出至對應的中文 PDF 角色紙。

## 施工規則

修改規則、Feature、PDF、FVTT 對應或升級流程前，必須先遵守 [`PROJECT_RULES.md`](PROJECT_RULES.md) 的 Change Propagation Gate；不得只驗單一畫面後標記 PASS。

## 使用方式

開啟 GitHub Pages 網站，依畫面完成角色建立，最後按下「下載正式角色紙」。

## 部署

網站由 GitHub Pages 自動部署；入口為 `index.html`。PDF 模板、中文字型與瀏覽器端 PDF 工具位於 `assets/`。


## Maintenance / Extension

- Engineering guide: `docs/MAINTENANCE_AND_EXTENSION_GUIDE.md`
- Full 2024 character matrix: `tests/qa-full-character-matrix.js`
- Ability Lookup module: `assets/ability-lookup.js`
- Save compatibility helper: `assets/save-compat.js`
- Legacy save fixtures: `tests/fixtures/legacy-*.json`
- Save migration gate: `tests/qa-save-migration-fixtures.js`
- Override provenance: `assets/data/feature-override-manifest.json` + `tests/qa-feature-override-provenance.js`
