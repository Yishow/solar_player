# Design Tokens — Solar Display System

## 1. 設計風格摘要

整體視覺為：

- 綠能、自然、乾淨、低飽和
- 大量留白
- 淺米白背景
- 深綠為主要品牌色
- 橘黃色用於太陽能與提示
- 細線、圓角卡片、柔和陰影
- 中英雙語資訊層級
- 16:9 大螢幕優先

## 2. Color Tokens

```css
:root {
  --color-bg: #F8F6EF;
  --color-bg-soft: #FBFAF5;
  --color-surface: #FFFFFF;
  --color-surface-glass: rgba(255, 255, 255, 0.82);

  --color-brand-900: #2F4F2D;
  --color-brand-800: #3E6537;
  --color-brand-700: #4F7A44;
  --color-brand-600: #5F8B50;
  --color-brand-500: #739B62;
  --color-brand-300: #AFC5A2;
  --color-brand-100: #E7EFE1;

  --color-accent-sun: #F5A623;
  --color-accent-sun-soft: #FFF3D8;
  --color-accent-leaf: #88A66C;
  --color-accent-line: #D9B763;

  --color-text-primary: #333333;
  --color-text-secondary: #686868;
  --color-text-muted: #8A8A8A;
  --color-text-inverse: #FFFFFF;

  --color-border: #E4DFD4;
  --color-border-strong: #D5CEBF;

  --color-success: #2E7D32;
  --color-warning: #E6A23C;
  --color-danger: #EF5350;
  --color-info: #409EFF;

  --shadow-card: 0 6px 18px rgba(47, 79, 45, 0.10);
  --shadow-card-hover: 0 10px 28px rgba(47, 79, 45, 0.14);
  --shadow-soft: 0 3px 12px rgba(0, 0, 0, 0.08);
}
```

## 3. Typography Tokens

```css
:root {
  --font-sans: "Noto Sans TC", "Inter", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-number: "Inter", "DIN Alternate", "Noto Sans TC", sans-serif;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 28px;
  --font-size-2xl: 40px;
  --font-size-3xl: 56px;
  --font-size-hero: 72px;

  --line-height-tight: 1.12;
  --line-height-normal: 1.5;
  --line-height-loose: 1.75;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

## 4. Spacing Tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

## 5. Radius Tokens

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 999px;
}
```

## 6. Layout Tokens

```css
:root {
  --screen-width: 1920px;
  --screen-height: 1080px;
  --header-height: 128px;
  --footer-height: 88px;
  --page-padding-x: 56px;
  --page-padding-y: 32px;
  --card-padding: 24px;
  --metric-card-height: 220px;
}
```

## 7. Component Tokens

### Card

```css
.card {
  background: var(--color-surface-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(10px);
}
```

### Metric Number

```css
.metric-number {
  font-family: var(--font-number);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-brand-900);
  letter-spacing: -0.02em;
}
```

### Status Badge

```css
.status-badge {
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border-strong);
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-brand-800);
  padding: 10px 22px;
}
```

## 8. Data Status Colors

| 狀態 | 色彩 |
|---|---|
| Normal | `--color-success` |
| Attention | `--color-warning` |
| Warning | `--color-danger` |
| Offline | `--color-danger` |
| MQTT Online | `--color-success` |
| MQTT Reconnecting | `--color-warning` |

## 9. Motion Tokens

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 600ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

## 10. Chart Tokens

```css
:root {
  --chart-generation: #4F7A44;
  --chart-consumption: #F57C00;
  --chart-self-consumption: #2196F3;
  --chart-grid: #E7E1D6;
  --chart-axis: #7A7A7A;
}
```
