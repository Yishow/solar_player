const exactLabelMap: Record<string, string> = {
  "Actions": "操作",
  "Add Card": "新增卡片",
  "Align X": "對齊 X",
  "Align Y": "對齊 Y",
  "Arrow Border Radius": "箭頭圓角半徑",
  "Arrow Button Size": "箭頭按鈕大小",
  "Arrow Font Size": "箭頭字型大小",
  "Asset Health": "素材健康",
  "Asset Image": "圖片素材",
  "Basis Source Label": "基準來源標籤",
  "Blur": "模糊",
  "Blur Amount": "模糊強度",
  "Blur Enabled": "模糊啟用",
  "Body Font Size": "內容字型大小",
  "Body Margin Top": "內容上方邊距",
  "Canvas Preview": "畫布預覽",
  "Card Height": "卡片高度",
  "Card Left": "卡片左側",
  "Card Template": "卡片模板",
  "Card Top": "卡片上方",
  "Card Width": "卡片寬度",
  "Center": "置中對齊",
  "Chip Font Size": "標籤字型大小",
  "Chip Gap": "標籤間距",
  "Chip Padding X": "標籤水平邊距",
  "Chip Padding Y": "標籤垂直邊距",
  "Chip Radius": "標籤圓角半徑",
  "Contain": "完整顯示",
  "Corner Radius": "圓角半徑",
  "Cover": "填滿容器",
  "Current Font Size": "當前數值字型大小",
  "Delete Card": "刪除卡片",
  "Direct Src": "直接路徑",
  "Disclaimer": "免責說明",
  "Duplicate Card": "複製卡片",
  "Edit Mode OFF": "編輯模式關閉",
  "Edit Mode ON": "編輯模式開啟",
  "Edge Fade": "邊緣淡出",
  "Edge Fade Side": "邊緣淡出方向",
  "Edge Fade Width": "邊緣淡出寬度",
  "Enabled": "啟用",
  "Eyebrow": "頁眉短標",
  "Eyebrow Font Size": "頁眉字型大小",
  "Eyebrow Letter Spacing": "頁眉字距",
  "Eyebrow Margin Bottom": "頁眉下方邊距",
  "Factory Circuit Icon": "工廠迴路圖示",
  "Fallback Asset Ref": "備援素材 ID",
  "Fallback Source Mode": "備援素材來源",
  "Fallback Src": "備援圖片來源",
  "Fit Mode": "填滿模式",
  "Focus X": "焦點 X",
  "Focus Y": "焦點 Y",
  "Footer Padding Top": "頁尾上方邊距",
  "Gold Line Opacity": "金線不透明度",
  "Gold Line Offset Y": "金線 Y 軸偏移",
  "Gold Line Thickness": "金線粗細",
  "Header Gap": "標題間距",
  "Headline": "標題文案",
  "Height": "高度",
  "Highlight Item": "高亮項目",
  "Highlight Items": "高亮項目",
  "Household Count Display": "家庭等值數值",
  "Household Equivalent": "家庭等值",
  "Household Label": "家庭等值標籤",
  "Icon Box Size": "圖示框大小",
  "Icon Registry": "圖示庫",
  "Icon Source Mode": "圖示來源模式",
  "Image Alt": "替代文字",
  "Image Source": "圖片來源",
  "Inspector": "屬性",
  "Item Gap": "項目間距",
  "Label": "標籤",
  "Leaf Offset X": "葉片 X 軸偏移",
  "Leaf Offset Y": "葉片 Y 軸偏移",
  "Leaf Opacity": "葉片不透明度",
  "Leaf Scale": "葉片縮放比",
  "Left": "左側",
  "Locked": "已鎖定",
  "Managed Asset": "已管理素材",
  "Managed Asset Ref": "素材 ID",
  "Managed Icon Alt": "圖示替代文字",
  "Managed Icon Asset": "圖示素材",
  "Managed Icon Fallback Src": "圖示備援來源",
  "Metric Highlight": "指標重點",
  "Move Earlier": "向前移動",
  "Move Later": "向後移動",
  "Padding Bottom": "下方內邊距",
  "Padding Left": "左側內邊距",
  "Padding Right": "右側內邊距",
  "Padding Top": "上方內邊距",
  "Page Icon Key": "頁面圖示鍵值",
  "Opacity": "不透明度",
  "Opacity Value": "不透明度數值",
  "Ornament Image": "裝飾圖片",
  "Pan Left": "向左平移",
  "Pan Right": "向右平移",
  "Progress Thickness": "進度條粗細",
  "Progress Top Offset": "進度條上方偏移",
  "Provenance Font Size": "來源標記字型大小",
  "Provenance Line Height": "來源標記行高",
  "Publishing": "發布",
  "Redo": "重做",
  "Reference Glyph": "參考符號",
  "Region Tree": "區域樹",
  "Reset Field": "重設欄位",
  "Reset View": "重設視圖",
  "Seed Default": "種子預設",
  "Source Mode": "素材來源",
  "Start": "起點對齊",
  "Subtitle": "副標",
  "Subtitle Font Size": "副標字型大小",
  "Subtitle Line Height": "副標行高",
  "Subtitle Margin Top": "副標上方邊距",
  "Supporting Line": "補充說明",
  "Sustainability Icon": "永續成果圖示",
  "Title": "標題",
  "Title Emphasis Weight": "標題強調字重",
  "Title Font Size": "標題字型大小",
  "Title Letter Spacing": "標題字距",
  "Title Line Height": "標題行高",
  "Toggle Visible": "切換顯示",
  "Top": "上方",
  "Total Font Size": "總數字型大小",
  "Undo": "復原",
  "Unit": "單位",
  "Unit Font Size": "單位字型大小",
  "Unit Padding Bottom": "單位下方邊距",
  "Unknown field type": "未知欄位類型",
  "Value": "數值",
  "Value Font Size": "數值字型大小",
  "Value Margin Top": "數值上方邊距",
  "Value Row Align": "數值列對齊方式",
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
