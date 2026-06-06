# Visual Fidelity Review — 2026-06-06 (官方 CC 回填用)

> 這份檔由**另一個走官方 Anthropic API（可看圖）的 Claude Code session** 填寫。
> 本 repo 主 session 走 pioneer proxy，無法讀取圖像，只能做 DOM 量測。
> 官方 CC 看圖後把每頁「視覺偏差方向」填進下方「待回填」區塊，主 session 會讀回來據此 polish。
>
> **填寫原則**：給「方向 + 幅度」，不要求像素值。例：
> - 「hero fade 太硬，reference 的右側淡出更柔、淡出範圍更寬」
> - 「KPI 卡太矮太擠，reference 卡更高、卡間留白更大」
> - 「connector 太細，reference 線條明顯更粗」
> 不確定就寫「與 reference 大致一致，無明顯偏差」。

---

## 給官方 CC 的 prompt（直接複製貼上執行）

```
你在 solar_player repo。任務：對 5 個 playback 頁做 FHD 視覺保真比對，把結果寫回
docs/reference-match/visual-fidelity-review-2026-06-06.md 的「待回填」區塊。

前置：
1. 起 dev server（含後端）：在 repo 根目錄執行 `pnpm dev`，等 web=5173 與 server=3000 都 200。
2. 五頁必須加 ?autoplay=0 凍結輪播，否則畫面會自動輪走：
   /overview?autoplay=0  /solar?autoplay=0  /factory-circuit?autoplay=0
   /images?autoplay=0    /sustainability?autoplay=0
   用 1920x1080 viewport 截圖（Playwright 或 agent-browser 皆可）。

比對對象（reference 大圖）：
   docs/reference/FHD/01-1.Overview (大).png    ↔ /overview
   docs/reference/FHD/02-2.Solar (大).png       ↔ /solar
   docs/reference/FHD/03-3.Factory Circuit (大).png ↔ /factory-circuit
   docs/reference/FHD/04-4.Images (大).png      ↔ /images
   docs/reference/FHD/05-5.Sustainability (大).png ↔ /sustainability

對每一頁，並排看「current 截圖 vs reference 大圖」，回答下方「待回填」區塊裡列出的
具體問題（每頁一段）。重點是 DOM 量不到的『像素視覺保真』：fade 柔和度/範圍、
顏色濃淡、line/connector 粗細觀感、ornament 與 hero 疊合感、卡片密度張力、
4-up thumbnail 排佈、ring glow 強度。

不要改任何程式碼。只填這份 md。填完存檔即可。
```

---

## 待回填區塊

### Overview（/overview ↔ 01-1）
重點看：
1. **Hero photo fade**：現行是右側水平 mask（mask stop 42%）+ 上下 gradient。fade 比 reference 太硬還是太柔？淡出範圍要更寬/更窄？
2. **雙語 title/eyebrow/lead 節奏**：title 現 82px/LH1.15。與 reference 比，行高太擠或太鬆？
3. **底部 5 張 KPI 卡**：現 352×232、卡間 gap 20px、value 64px。卡太矮/太擠？value 不夠大？層級張力夠不夠？
4. **gold line / leaf ornament**：opacity/位置與 reference 疊合感如何？

> 回填（官方 CC，2026-06-06，1920×1080 / ?autoplay=0）：與 reference 大致一致，偏差偏小。
> 1. **Hero fade**：左緣與上緣的 feather 比 reference 略「硬一點、範圍略窄」；reference 左側淡出更柔、羽化帶更寬，photo 也延伸得略低。建議左緣/上緣 fade 範圍再放寬一點點（小幅）。另：current hero 取景偏建物特寫，少了 reference 前景的草地/光電板綠意與更亮的藍天——此屬 hero 素材選擇差異，非 fade 參數。
> 2. **雙語 title 節奏**：行高/字級與 reference 接近，無明顯偏擠或偏鬆，維持即可。
> 3. **底部 5 張 KPI 卡**：校正解析度後高度/張力與 reference 接近（先前 1280 縮圖誤判為偏矮）。若要更貼，卡內上下 padding 與 value 字級可再「微增一格」讓 value 更主導，幅度小。
> 4. **gold line / leaf ornament**：eyebrow 旁淡綠葉飾與細線兩邊都很淡，疊合感大致一致，無明顯偏差。

### Solar（/solar ↔ 02-2）
重點看：
1. **connector 粗細**：現 solarToInverter/inverterToFactory 9px、inverterToCo2 5px（橘）。與 reference 比太細/太粗？三條粗細關係對嗎？
2. **flow node 視覺語言**：圓底 icon node 是否與 reference 一致（icon 大小、留白、是否 source-like 而非 generic glyph）？
3. **flow node 座標 + KPI row**：流程圖與 KPI row 垂直節奏；KPI 五卡寬度不一（380~330），reference 是否等寬？
4. **hero stage**：reference 的 hero 區有無圓角/框線？（現行 borderRadius 0）

> 回填（官方 CC，2026-06-06）：
> 1. **connector 粗細**：三條走向都在，green 主線與 orange CO2 線可辨識；與 reference 比偏「略細/略淡」，尤其 inverter→CO2 的 orange 曲線。建議三條同步小幅加粗、提高綠/橘飽和；三條「主線粗、CO2 線細」的粗細關係本身正確。
> 2. **flow node 視覺語言（主要偏差）**：current 的 node 多呈「白底/淡底＋細綠 icon 的圓形 tile」，reference 讀起來是「綠色飽和度更高、存在感更強的 tile」。current 偏淡、偏 generic。建議提高 node 底色綠飽和/權重，讓它更 source-like、less generic。
> 3. **flow node 座標 + KPI row**：垂直節奏 OK；KPI 五卡校正解析度後寬度看起來接近等寬，僅最右 1–2 張疑略寬，可再對齊成等寬（小幅）。
> 4. **hero stage**：reference hero 為直角 band、無明顯圓角/外框，current borderRadius 0 一致，維持即可。

### Factory Circuit（/factory-circuit ↔ 03-3）
重點看：
1. **電路線條粗細**（最關鍵）：現行 routing 線是烘焙 PNG。與 reference 比，線條粗細／密度對嗎？是否需要更粗/更細？
2. **DisplayLeafOrnament opacity/scale**：seed 0.38 但實測 watermark opacity=1（疑 binding 異常）。reference 的 leaf 是淡浮水印還是明顯？
3. **load panel 從屬性**：load panel 是否維持「從屬展示」而非變成管理表格觀感？
4. **KPI / hero 字級**：與 reference 比是否需調整？

> 回填（官方 CC，2026-06-06）：
> 1. **電路線條粗細（最關鍵）**：current 的 routing 線、特別是配電盤→右側 6 項負載的扇出線，**明顯偏細/偏淡、幾乎看不清**；reference 線條更實、扇出可辨。建議加粗/提高對比（中–高幅度）。
> 2. **DisplayLeafOrnament opacity/scale**：**校正解析度後，current 葉飾呈現為「淡浮水印」，與 reference 大致一致**，並非先前 1280 縮圖誤判的 opacity≈1 大葉。畫面觀感不需大改；seed 0.38 vs 實測 opacity 的 binding 疑慮請由 DOM 自行確認，但「視覺」這項判定為大致一致。
> 3. **load panel 從屬性**：current 右側為輕量 icon＋label＋% 清單，維持「從屬展示」，**未退化成管理表格**，與 reference 一致（良好，維持）。
> 4. **KPI / hero 字級**：大致一致；node tile 整體略淡（同 Solar 第 2 點傾向），可小幅提綠飽和。注意：`太陽能供電占比` 顯示 `— —%`、右側負載 % 為異常 seed，屬資料問題非視覺。

### Images（/images ↔ 04-4）
重點看：
1. **media stage 裁切比例**：現 1292×622、object-fit cover、16px 圓角 + soft shadow。reference 是全出血無圓角，還是帶框？比例對嗎？
2. **thumbnail strip 密度**：注意——現行 playlist 只有 1 entry，只渲染 1 張 thumb；config 定義 4-up（stride 278/gap 22）。reference 的 thumbnail 排佈密度如何？（這項可能需要先補測試資料才看得到 4-up）
3. **caption card 字級/張力**：caption body 19px。與 reference 比展示張力夠不夠？

> 回填（官方 CC，2026-06-06）：
> 1. **media stage 裁切比例**：current 為含 16px 圓角＋soft shadow 的 contained card，與 reference 一致（reference 同樣非全出血、帶圓角），比例接近；current 舞台略小一點點，可考慮放大一點貼近 reference（小幅）。
> 2. **thumbnail strip 密度**：**BLOCKED — current playlist 只有 1 筆，只渲染 1 張置中 thumb，無法評估 4-up 排佈密度**。reference 為 4-up 等距。需先補 ≥4 筆測試資料才能比對；列為 follow-up，非本輪可判定的視覺 gap。
> 3. **caption card 字級/張力**：current 浮動 caption card 的結構/位置與 reference 同（右側疊在 media 上），但內容是 placeholder（`images-hero-reference`／「未來提供圖片說明」／「未綁定圖層」），且卡片比 reference 窄、文字張力弱。建議補真實 caption 內容、卡片加寬/字級加大以拉張力；其中「內容」屬資料、「卡片尺寸/字級」屬視覺。

### Sustainability（/sustainability ↔ 05-5）
重點看：
1. **ring ornament 與 hero media 疊合**：ring opacity 0.34、overlap 118px、glow opacity 0.24。與 reference 比 ring 太淡/太明顯？glow 強度？疊合位置對嗎？
2. **Trees/stat card 節奏**：6 張卡 h220。與 reference 比節奏/留白如何？
3. **highlight rail 密度**：現 2 張卡 gap 20。reference 是幾張、多密？
4. **leaf rotation**：CSS 設 -28deg 但 transform matrix 為 identity（疑未套用）。reference 的 leaf 有旋轉嗎？

> 回填（官方 CC，2026-06-06）：
> 1. **ring ornament 與 hero media 疊合**：校正解析度後 hero（光電板＋建物）可見並向左淡出，ring＋leaf＋glow 疊在右上可辨。與 reference 比，current hero 整體「略淡/略洗白」，且 ring glow 所在的右上角偏亮、偏 wash；reference 是較飽和 hero 上疊「克制的」ring。建議：提高 hero 飽和/對比，並讓右上 glow 收斂一點（中幅）；ring 疊合位置大致正確。
> 2. **Trees/stat card 節奏**：底部 6 卡校正後等寬、節奏與 reference 接近，留白尚可，維持即可（小幅可調 padding）。
> 3. **highlight rail 密度**：current 在 lead 下方有 2 張 highlight chip，與 reference 量級相近；密度大致一致。
> 4. **leaf rotation**：畫面上看不出明顯旋轉差異；CSS -28deg vs matrix identity 的套用疑慮請由 DOM 確認，單看畫面這項「無明顯偏差」。

---

## 主 session 讀回後的動作
主 session 會把每頁「回填」內容對應到 `fhd-playback-boundary-classification-2026-06-05.md` 的
reference-quality-target 列，據此在各 page `displayPageConfig.ts` 調值（Stage C–F），
並把官方 CC 指出的 actual-gap（無 config 欄位者）維持為 follow-up，不偷加 schema。
