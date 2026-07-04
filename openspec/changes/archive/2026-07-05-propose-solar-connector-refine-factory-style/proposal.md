## Why

為了讓太陽能（Solar）頁面的連接線視覺風格更貼近用電迴路（FactoryCircuit），我們需要將 Solar 頁面中的連接線箭頭移除，並將線條的寬度（strokeWidth）從原本粗重的大小調整為精緻的 2.5px，實現風格統一且美觀的無縫循環流動動畫。

## What Changes

優化 Solar 連接線以符合 FactoryCircuit 的極簡風格：
- 修改 `apps/web/src/pages/Solar/index.tsx` 中的 SVG 連接線渲染：
  - 移除 `solarToInverter`、`inverterToFactory`、`inverterToCo2` 連接線末端的 `<polygon>` 箭頭。
  - 將所有連接線的 `<line>` 與 `<path>` 屬性中的 `strokeWidth` 統一設為與 FactoryCircuit 相同的 `2.5`。
  - 微調 SVG 的 viewBox 與 positioning，使其能以 2.5px 寬度完美渲染。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/Solar/index.tsx
