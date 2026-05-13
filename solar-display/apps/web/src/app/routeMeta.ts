export type RouteGroup = "playback" | "management";

export type RouteMeta = {
  allowOfflineWhenDisconnected?: boolean;
  path: string;
  navLabel: string;
  title: string;
  subtitle: string;
  group: RouteGroup;
  order: number;
};

export const routeMetaList: RouteMeta[] = [
  {
    path: "/overview",
    navLabel: "總覽",
    title: "總覽頁",
    subtitle: "Overview",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 1
  },
  {
    path: "/solar",
    navLabel: "太陽能",
    title: "太陽能發電",
    subtitle: "Solar Generation",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 2
  },
  {
    path: "/factory-circuit",
    navLabel: "迴路",
    title: "工廠迴路",
    subtitle: "Factory Circuit",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 3
  },
  {
    path: "/images",
    navLabel: "圖庫",
    title: "展示圖像",
    subtitle: "Images",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 4
  },
  {
    path: "/sustainability",
    navLabel: "永續",
    title: "永續成果",
    subtitle: "Sustainability",
    allowOfflineWhenDisconnected: true,
    group: "playback",
    order: 5
  },
  {
    path: "/trends",
    navLabel: "趨勢",
    title: "能源趨勢",
    subtitle: "Energy Trend",
    group: "management",
    order: 6
  },
  {
    path: "/settings/playback",
    navLabel: "播放設定",
    title: "播放設定",
    subtitle: "Playback Settings",
    group: "management",
    order: 7
  },
  {
    path: "/settings/images",
    navLabel: "圖片管理",
    title: "圖片管理",
    subtitle: "Image Management",
    group: "management",
    order: 8
  },
  {
    path: "/settings/mqtt",
    navLabel: "MQTT",
    title: "MQTT 設定",
    subtitle: "MQTT Settings",
    group: "management",
    order: 9
  },
  {
    path: "/settings/circuits",
    navLabel: "迴路設定",
    title: "迴路設定",
    subtitle: "Circuit Settings",
    group: "management",
    order: 10
  },
  {
    path: "/history",
    navLabel: "歷史",
    title: "發電歷史",
    subtitle: "Energy History",
    group: "management",
    order: 11
  },
  {
    path: "/offline",
    navLabel: "離線",
    title: "離線錯誤",
    subtitle: "Offline Error",
    group: "management",
    order: 12
  },
  {
    path: "/slideshow-preview",
    navLabel: "預覽",
    title: "輪播預覽",
    subtitle: "Slideshow Preview",
    group: "management",
    order: 13
  },
  {
    path: "/device-status",
    navLabel: "裝置狀態",
    title: "裝置狀態",
    subtitle: "Device Status",
    group: "management",
    order: 14
  }
];

export const routeMetaMap = new Map(routeMetaList.map((route) => [route.path, route]));
