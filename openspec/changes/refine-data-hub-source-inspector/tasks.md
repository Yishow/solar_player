## 0. 跨發布端前置契約
- [ ] 0.1 對齊最新 MQTT-OWNERSHIP、PUBLISH-TAG-REGISTER 與 G 的 KNE/EPR 工程契約，實作 DHI-R4，以對應 PM/KN 驗收案例證明責任不跨界。
- [ ] 0.2 側欄以觀音／工程別為標題，sourceKind=engineering 可為正式來源；物理錶欄位只屬physical分支，期間與dataRevision不混入設定dirty。未批准virtual仍只診斷。驗證 DHI-R4 及 G 對應情境；產品實作不因本次文件提交而勾選。

## 1. 基線與回歸
- [ ] 1.1 建立既有 focus effect、背景保存位置、窄容器欄位的 regression cases（U1-R6）。
- [ ] 1.2 檢查同一套 modal primitive 能否復用；盤點 inert、scroll lock、focus restoration 的既有實作。
- [ ] 1.3 定義四個 inspector section 的輸入模型，區別 generic、E1-reviewed 與 managed（DHI-R1）。

## 2. 側欄結構
- [ ] 2.1 實作固定 header、tabs、單一 content scroll 區、footer；避免多層 card 邊框（DHI-R1）。
- [ ] 2.2 分離 ManagedSourceCard 的內容與折疊外殼，選中即呈現主要內容。
- [ ] 2.3 實作容器感知的一／兩欄表單、長 technical value 展開與複製（DHI-R2）。
- [ ] 2.4 建立局部 semantic tokens、文字層級、44 px 點擊區與 reduced-motion。
- [ ] 2.5 實作 loading/error/unknown/empty/readonly 的局部面板狀態。

## 3. 互動
- [ ] 3.1 修正焦點 effect 生命週期，包含 callback identity、IME、hidden tabbables、trigger 消失（U1-R6）。
- [ ] 3.2 接 E 的 save/discard/close controller，所有操作與錯誤在面板內（DHI-R3）。
- [ ] 3.3 接 B 的 panel mode/selection URL 與返回列表位置，展開共用同一草稿。
- [ ] 3.4 為使用情況與樣本重試建立取消／過期回應處理，禁止上一筆資料污染新選取。

## 4. 驗收
- [ ] 4.1 執行 component tests 與 real-browser focus/IME regression。
- [ ] 4.2 擷取 1366×768、1440×900、1920×1080 與窄螢幕 witness；驗證 footer/錯誤可達。
- [ ] 4.3 鍵盤、讀屏與對比／reflow 檢查；不得把 HTML 設計稿當正式 acceptance。
- [ ] 4.4 程式完成後 focused checks、最終 pnpm verify；明列尚未人工驗收項。
