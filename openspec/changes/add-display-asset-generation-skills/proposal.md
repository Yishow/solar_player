## Why

Display 五頁的素材若靠臨場 prompt 或個人記憶產生，品質會不穩：圖片色調漂移、icon 線寬不一、素材命名混亂、版本不可追、preview 驗收缺少標準。最新 `main` 已新增 Codex multi-agent 架構與 `frontend_guide` agent，因此這個 change 以同樣脈絡新增 `display_asset_guide`，讓展示牆素材生成與治理也能成為可調用、可複用的技能。

這個 change 要建立 display asset generation skills：把素材生成拆成 manifest、prompt recipe、post-process/export、preview QA 與版本管理。目標是讓 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 的 hero photos、gallery photos、icons、flow/circuit nodes、ornaments 能穩定產出並接入 seed/runtime config。

## What Changes

- 新增 Codex agent `display_asset_guide`，專責 display 五頁素材生成、prompt recipes、asset manifest、輸出規格與 preview QA。
- 註冊 `display_asset_guide` 到 `.codex/config.toml`，與既有 `frontend_guide` 並列。
- 新增 display asset generation skill pack 文件，包含素材分類、命名規範、prompt recipe、輸出規格、後處理規則與 preview QA checklist。
- 定義 Asset Manifest contract，要求每個素材記錄 page、slot、assetKey、role、format、size、source mode、recipe、version、status。
- 定義 Prompt Recipe contract，將共享風格、頁面語意、素材角色、限制條件、禁止項目拆成可重用模板。
- 定義 Icon / Ornament / Hero Photo 的穩定生成與後處理流程，避免圖片中生成文字、Logo、人臉特寫與雜訊。
- 定義素材交付後如何透過 runtime seed config、managed asset 或 direct-src fallback 接入 display pages。

## Non-Goals

- 不在此 change 直接生成最終 production 素材圖檔。
- 不導入外部 AI 影像服務 API 或自動上傳流程。
- 不改現有 backend image asset schema，除非後續實作 change 另行提出。
- 不取代設計師或人工審核；技能包只提供穩定流程與驗收標準。
- 不修改 playback routes 的 runtime behavior。

## Capabilities

### New Capabilities

- `display-asset-generation-skills`: 定義 display 五頁素材生成技能包、Codex agent、manifest、prompt recipes、post-process/export 與 preview QA contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-asset-generation-skills`
- Affected code/docs:
  - `.codex/agents/display_asset_guide.toml`
  - `.codex/config.toml`
  - `docs/display-assets/README.md`
  - `docs/display-assets/asset-manifest.template.md`
  - `docs/display-assets/skills/hero-photo-generation.md`
  - `docs/display-assets/skills/icon-generation.md`
  - `docs/display-assets/skills/ornament-generation.md`
  - `docs/display-assets/skills/preview-qa.md`
  - `docs/display-assets/prompt-recipes/shared-style.md`
  - `docs/display-assets/prompt-recipes/display-pages.md`
- Validation:
  - `spectra validate --strict --changes add-display-asset-generation-skills`
  - manual docs review against display five-page prototype/reference family
