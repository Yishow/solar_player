// Device status — FHD content area (1920 × 858) layout, aligned to management surface standard.
// Actions are placed at the top header right of the title.
// Layout Variant: Plan A — Top KPI Bar + Dual-Wing Panels (Total 740px height from top 118px to 858px).
//
// Vertical budget:
//   28-90    title (left) and action buttons (right, top 32)
//   118-228  top KPI banner (height: 110, width: 1820)
//   244-858  dual-wing panels (height: 614, left: 896w, right: 908w)

export const deviceLayout = {
  actions: { height: 48, left: 1190, top: 32, width: 680 },
  kpiBar: { height: 116, left: 50, top: 118, width: 1820 },
  leftPanel: { height: 612, left: 50, top: 246, width: 896 },
  rightPanel: { height: 612, left: 962, top: 246, width: 908 },
  title: { left: 58, top: 28 }
} as const;
