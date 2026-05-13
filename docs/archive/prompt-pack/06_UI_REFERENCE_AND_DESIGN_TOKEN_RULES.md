# UI 參考與 Design Token 規則

UI 實作不得自由發揮到偏離範例圖。每頁都必須參考 `solar_complete_spec_md` 與 `solar_complete_spec_md/UI` 底下對應分頁提示詞與範例圖。

## 必讀文件

開發任何 UI 前，必須先閱讀：

```txt
solar_complete_spec_md/08_design_tokens.md
solar_complete_spec_md/09_Page_Requirements.md
solar_complete_spec_md/11_Acceptance_Criteria.md
solar_complete_spec_md/UI/<對應頁面>.md
```

若 `solar_complete_spec_md/UI` 內有範例圖，必須同時參考範例圖的：

- 版面比例
- Header 高度
- Footer 高度
- 卡片間距
- 字級層級
- 綠色主色
- 橘色太陽能 accent
- 淺米背景
- leaf ornament
- icon style
- 雙語文字排列
- KPI 數值格式

## 預設 Design Tokens

```ts
export const tokens = {
  colors: {
    bg: '#F7F6F1',
    surface: '#FFFFFF',
    surfaceSoft: '#FAF8F2',
    primary: '#4F7D3A',
    primaryDark: '#2F5F2A',
    primaryLight: '#DDE8D2',
    accentSolar: '#F5A623',
    warning: '#EF6B6B',
    text: '#2F3333',
    textMuted: '#6E7672',
    border: '#DDD8CC',
    shadow: 'rgba(42, 47, 42, 0.12)'
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '22px',
    xl: '32px',
    pill: '999px'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  font: {
    sans: '"Noto Sans TC", "Inter", system-ui, sans-serif',
    mono: '"Roboto Mono", monospace'
  },
  layout: {
    width: '1920px',
    height: '1080px',
    headerHeight: '132px',
    footerHeight: '96px'
  }
}
```

## CSS Variables

必須轉成 CSS variables：

```css
:root {
  --color-bg: #F7F6F1;
  --color-surface: #FFFFFF;
  --color-surface-soft: #FAF8F2;
  --color-primary: #4F7D3A;
  --color-primary-dark: #2F5F2A;
  --color-primary-light: #DDE8D2;
  --color-accent-solar: #F5A623;
  --color-warning: #EF6B6B;
  --color-text: #2F3333;
  --color-text-muted: #6E7672;
  --color-border: #DDD8CC;
  --shadow-card: 0 12px 28px rgba(42, 47, 42, 0.12);
  --radius-card: 22px;
  --radius-pill: 999px;
  --layout-width: 1920px;
  --layout-height: 1080px;
  --header-height: 132px;
  --footer-height: 96px;
}
```

## Page Reference Mapping

| Page | 必須參考 |
|---|---|
| Overview | `solar_complete_spec_md/UI/01_Overview.md` |
| Solar | `solar_complete_spec_md/UI/02_Solar.md` |
| Factory Circuit | `solar_complete_spec_md/UI/03_Factory_Circuit.md` |
| Images | `solar_complete_spec_md/UI/04_Images.md` |
| Sustainability | `solar_complete_spec_md/UI/05_Sustainability.md` |
| Energy Trend Summary | `solar_complete_spec_md/UI/06_Energy_Trend_Summary.md` |
| Playback Settings | `solar_complete_spec_md/UI/07_Playback_Settings.md` |
| Image Management | `solar_complete_spec_md/UI/08_Image_Management.md` |
| MQTT Settings | `solar_complete_spec_md/UI/09_MQTT_Settings.md` |
| Circuit Settings | `solar_complete_spec_md/UI/10_Circuit_Settings.md` |
| Energy Data History | `solar_complete_spec_md/UI/11_Energy_Data_History.md` |
| Offline Error Display | `solar_complete_spec_md/UI/12_Offline_Error_Display.md` |
| Slideshow Preview | `solar_complete_spec_md/UI/13_Slideshow_Preview.md` |
| Device Status Details | `solar_complete_spec_md/UI/14_Device_Status_Details.md` |

## UI 實作原則

- 優先 1920x1080 橫式 kiosk
- Header 固定在上方
- Footer 固定在下方
- 主內容不得被 Header / Footer 擋住
- 主要 KPI 數字要大
- 中英文雙語文字要一致
- 卡片陰影要柔和
- 不使用高飽和背景色
- 不使用暗色主題
- icon stroke 以綠色為主
- solar icon 可使用橘色
- warning / error 才使用紅色
- 圖表線條顏色固定來源於 tokens
- 所有文字大小必須有階層
- 所有頁面共用 Header / Footer，不要每頁重寫

## Code Review UI 檢查

每個 UI Phase code-review 必須檢查：

- [ ] 是否讀取對應 `solar_complete_spec_md/UI` 文件
- [ ] 是否使用 design tokens
- [ ] 是否有散落 hard-coded color
- [ ] 是否 1920x1080 不爆版
- [ ] Header / Footer 是否一致
- [ ] MetricCard 是否共用
- [ ] 雙語 label 是否一致
- [ ] 數值單位是否正確
- [ ] 圖表比例是否接近範例
- [ ] 管理頁表格 / 表單是否有足夠間距
