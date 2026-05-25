const exactLabelMap: Record<string, string> = {
  "Actions": "操作",
  "Add Card": "新增卡片",
  "Asset Health": "素材健康",
  "Basis Source Label": "基準來源標籤",
  "Canvas Preview": "畫布預覽",
  "Card Height": "卡片高度",
  "Card Left": "卡片左側",
  "Card Template": "卡片模板",
  "Card Top": "卡片上方",
  "Card Width": "卡片寬度",
  "Contain": "完整顯示",
  "Delete Card": "刪除卡片",
  "Direct Src": "直接路徑",
  "Disclaimer": "免責說明",
  "Duplicate Card": "複製卡片",
  "Edit Mode OFF": "編輯模式關閉",
  "Edit Mode ON": "編輯模式開啟",
  "Enabled": "啟用",
  "Eyebrow": "頁眉短標",
  "Fallback Asset Ref": "備援素材 ID",
  "Fallback Source Mode": "備援素材來源",
  "Fallback Src": "備援圖片來源",
  "Fit Mode": "填滿模式",
  "Focus X": "焦點 X",
  "Focus Y": "焦點 Y",
  "Headline": "標題文案",
  "Height": "高度",
  "Highlight Item": "高亮項目",
  "Highlight Items": "高亮項目",
  "Household Count Display": "家庭等值數值",
  "Household Equivalent": "家庭等值",
  "Household Label": "家庭等值標籤",
  "Image Alt": "替代文字",
  "Image Source": "圖片來源",
  "Inspector": "屬性",
  "Label": "標籤",
  "Left": "左側",
  "Locked": "已鎖定",
  "Managed Asset": "已管理素材",
  "Managed Asset Ref": "素材 ID",
  "Metric Highlight": "指標重點",
  "Move Earlier": "向前移動",
  "Move Later": "向後移動",
  "Pan Left": "向左平移",
  "Pan Right": "向右平移",
  "Publishing": "發布",
  "Redo": "重做",
  "Region Tree": "區域樹",
  "Reset Field": "重設欄位",
  "Reset View": "重設視圖",
  "Seed Default": "種子預設",
  "Source Mode": "素材來源",
  "Subtitle": "副標",
  "Supporting Line": "補充說明",
  "Title": "標題",
  "Toggle Visible": "切換顯示",
  "Top": "上方",
  "Undo": "復原",
  "Unit": "單位",
  "Unknown field type": "未知欄位類型",
  "Value": "數值",
  "Width": "寬度",
  "Zoom +": "放大",
  "Zoom -": "縮小",
  "dirty": "已修改"
};

const replacementPairs: Array<[string, string]> = [
  ["Factory Circuit", "工廠迴路"],
  ["Sustainability", "永續成果"],
  ["Overview", "總覽"],
  ["Solar", "太陽能"],
  ["Images", "展示圖像"],
  ["Hero Copy", "主視覺文案"],
  ["Hero Media", "主視覺圖片"],
  ["Hero Container", "主視覺容器"],
  ["Copy Layout", "文案版位"],
  ["Main Stage", "主畫面"],
  ["Info Panel", "資訊面板"],
  ["Highlight Rail", "重點卡片列"],
  ["Status Block", "狀態區塊"],
  ["Load Panel", "負載面板"],
  ["Gold Line", "金線"],
  ["Leaf Ornament", "葉片裝飾"],
  ["Summary", "摘要卡"],
  ["Counter", "計數器"],
  ["Arrows", "箭頭"],
  ["Copy", "文案"],
  ["Registry", "清單"],
  ["Icon", "圖示"],
  ["Node", "節點"]
];

function replaceLinePattern(label: string, pattern: RegExp, formatter: (value: string) => string) {
  return label.replace(pattern, (_match, value) => formatter(String(value)));
}

export function localizeDisplayEditorLabel(label: string) {
  if (exactLabelMap[label]) {
    return exactLabelMap[label];
  }

  let localized = label;
  localized = replaceLinePattern(localized, /^Title Line (\d+)$/, (value) => `標題第 ${value} 行`);
  localized = replaceLinePattern(localized, /^Subtitle Line (\d+)$/, (value) => `副標第 ${value} 行`);
  localized = replaceLinePattern(localized, /^Copy Line (\d+)$/, (value) => `文案第 ${value} 行`);
  localized = replaceLinePattern(localized, /^Copy Zh (\d+)$/, (value) => `中文文案第 ${value} 行`);

  for (const [source, target] of replacementPairs) {
    localized = localized.replaceAll(source, target);
  }

  localized = localized
    .replaceAll(" Align X", " 對齊 X")
    .replaceAll(" Align Y", " 對齊 Y")
    .replaceAll(" 圖示", "圖示")
    .replaceAll(" Left", " 左側")
    .replaceAll(" Top", " 上方")
    .replaceAll(" Width", " 寬度")
    .replaceAll(" Height", " 高度")
    .replaceAll(" Source Mode", " 素材來源")
    .replaceAll(" Asset Ref", " 素材 ID");

  return localized.trim();
}

export function localizeDisplayEditorRegionTreeLabel(label: string) {
  return localizeDisplayEditorLabel(label).replace(
    /^(總覽|太陽能|工廠迴路|展示圖像|永續成果)\s+/,
    ""
  );
}

export function localizeDisplayEditorMessage(message: string) {
  return localizeDisplayEditorLabel(message);
}

export function localizeDisplayPageLabel(pageId: string) {
  return localizeDisplayEditorLabel(
    {
      "factory-circuit": "Factory Circuit",
      images: "Images",
      overview: "Overview",
      solar: "Solar",
      sustainability: "Sustainability"
    }[pageId] ?? pageId
  );
}

export function localizeFindingSeverity(severity: string) {
  return {
    blocking: "阻擋",
    warning: "警告"
  }[severity] ?? severity;
}
