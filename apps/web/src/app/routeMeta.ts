import type { ShellDensity } from "../components/shellDensity";

export type RouteGroup = "playback" | "management";

export type RouteMeta = {
  allowOfflineWhenDisconnected?: boolean;
  path: string;
  navLabel: string;
  title: string;
  subtitle: string;
  group: RouteGroup;
  order: number;
  shellDensity: ShellDensity;
};

export const routeMetaList: RouteMeta[] = [
  {
    path: "/overview",
    navLabel: "總覽",
    title: "總覽頁",
    subtitle: "Overview",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 1,
    shellDensity: "playback"
  },
  {
    path: "/solar",
    navLabel: "太陽能",
    title: "太陽能發電",
    subtitle: "Solar Generation",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 2,
    shellDensity: "playback"
  },
  {
    path: "/factory-circuit",
    navLabel: "迴路",
    title: "工廠迴路",
    subtitle: "Factory Circuit",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 3,
    shellDensity: "playback"
  },
  {
    path: "/images",
    navLabel: "圖庫",
    title: "展示圖像",
    subtitle: "Images",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 4,
    shellDensity: "playback"
  },
  {
    path: "/sustainability",
    navLabel: "永續",
    title: "永續成果",
    subtitle: "Sustainability",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 5,
    shellDensity: "playback"
  },
  {
    path: "/trends",
    navLabel: "趨勢",
    title: "能源趨勢",
    subtitle: "Energy Trend",
    group: "management",
    order: 6,
    shellDensity: "management"
  },
  {
    path: "/brand",
    navLabel: "品牌",
    title: "品牌資產",
    subtitle: "Brand Assets",
    group: "management",
    order: 7,
    shellDensity: "management"
  },
  {
    path: "/display-pages/editor",
    navLabel: "展示編輯",
    title: "展示頁編輯",
    subtitle: "展示頁編輯器",
    group: "management",
    order: 8,
    shellDensity: "management"
  },
  {
    path: "/shell-decorations/editor",
    navLabel: "殼層裝飾",
    title: "共用殼層裝飾",
    subtitle: "Shared Shell Decorations",
    group: "management",
    order: 9,
    shellDensity: "management"
  },
  {
    path: "/settings/playback",
    navLabel: "播放設定",
    title: "播放設定",
    subtitle: "Playback Settings",
    group: "management",
    order: 10,
    shellDensity: "management"
  },
  {
    path: "/settings/assets",
    navLabel: "資產庫",
    title: "資產庫管理",
    subtitle: "Asset Library",
    group: "management",
    order: 11,
    shellDensity: "management"
  },
  {
    path: "/settings/images",
    navLabel: "圖片管理",
    title: "圖片管理",
    subtitle: "Image Management",
    group: "management",
    order: 12,
    shellDensity: "management"
  },
  {
    path: "/settings/mqtt",
    navLabel: "MQTT",
    title: "MQTT 設定",
    subtitle: "MQTT Settings",
    group: "management",
    order: 13,
    shellDensity: "management"
  },
  {
    path: "/settings/circuits",
    navLabel: "迴路設定",
    title: "迴路設定",
    subtitle: "Circuit Settings",
    group: "management",
    order: 14,
    shellDensity: "management"
  },
  {
    path: "/history",
    navLabel: "歷史",
    title: "發電歷史",
    subtitle: "Energy History",
    group: "management",
    order: 15,
    shellDensity: "management"
  },
  {
    path: "/offline",
    navLabel: "離線",
    title: "離線錯誤",
    subtitle: "Offline Error",
    group: "management",
    order: 16,
    shellDensity: "management"
  },
  {
    path: "/slideshow-preview",
    navLabel: "預覽",
    title: "輪播預覽",
    subtitle: "Slideshow Preview",
    group: "management",
    order: 17,
    shellDensity: "management"
  },
  {
    path: "/device-status",
    navLabel: "裝置狀態",
    title: "裝置狀態",
    subtitle: "Device Status",
    group: "management",
    order: 18,
    shellDensity: "device-detail"
  }
];

export const routeMetaMap = new Map(routeMetaList.map((route) => [route.path, route]));
