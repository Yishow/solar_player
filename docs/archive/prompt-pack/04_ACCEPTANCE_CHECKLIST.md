# 完整驗收 Checklist

此文件用於每個 Phase 結束前驗收。任何一項不通過，都不得進入下一 Phase。

---

## 全域驗收，每個 Phase 都適用

- [ ] 已執行 `spectra-propose`
- [ ] 已執行 `spectra-apply`
- [ ] 已遵守該 Phase 的範圍，未偷跑下一 Phase
- [ ] 已執行 typecheck
- [ ] 已執行 lint
- [ ] 已執行 build
- [ ] 已執行 test 或 smoke test
- [ ] 初版 commit 使用繁體中文
- [ ] 已完成 code-review
- [ ] 已修正 code-review 發現的 bug
- [ ] 修正 commit 使用繁體中文
- [ ] UI 相關變更已參考 `solar_complete_spec_md/UI`
- [ ] API 相關變更已更新 OpenAPI
- [ ] DB 相關變更已更新 schema 文件
- [ ] 沒有新增登入、權限、JWT、OAuth
- [ ] README 或相關文件已同步

---

## Phase 1 驗收

- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 可啟動 web 與 server
- [ ] Frontend 首頁可開啟
- [ ] Backend `/health` 回傳 `{ success: true }` 或 ok
- [ ] Backend `/docs` 可顯示 OpenAPI 文件
- [ ] SQLite DB 自動建立
- [ ] schema tables 存在
- [ ] shared types 可被 web 與 server import
- [ ] TypeScript 無錯誤
- [ ] Phase 1 spectra / commit / review / fix 完成

## Phase 2 驗收

- [ ] 14 個頁面都可透過 router 開啟
- [ ] Header 顯示 logo、系統名稱、時間、日期、天氣、MQTT 狀態
- [ ] Footer 顯示頁碼、導覽、slogan、leaf ornament
- [ ] 1920x1080 不爆版
- [ ] 所有主要區塊有 placeholder data
- [ ] 共用元件可重用且無巨型 component
- [ ] Phase 2 spectra / commit / review / fix 完成

## Phase 3 驗收

- [ ] Overview KPI 正確顯示
- [ ] Solar flow 正確顯示
- [ ] Factory Circuit flow 正確顯示
- [ ] Images 大圖與 thumbnails 正確顯示
- [ ] Sustainability KPI 正確顯示
- [ ] 數值格式包含 kW、kWh、MWh、GWh、t、%
- [ ] API mock fallback 正常
- [ ] UI 與範例圖大致一致
- [ ] Phase 3 spectra / commit / review / fix 完成

## Phase 4 驗收

- [ ] MQTT settings 可讀取
- [ ] MQTT settings 可儲存
- [ ] MQTT test connection 可用
- [ ] 可訂閱 `solar/KN/summary`
- [ ] 可訂閱 `solar/KN/total_power_kw`
- [ ] 可訂閱 `solar/KN/today_mwh`
- [ ] 可訂閱 `solar/KN/month_mwh`
- [ ] 可訂閱 `solar/KN/zone/+/...`
- [ ] 可解析 `{ "value": 586 }`
- [ ] 可解析 `586`
- [ ] 可解析 `"586"`
- [ ] 可解析 summary object
- [ ] 可解析 zone object
- [ ] 可設定 prefix，不限定 `solar`
- [ ] 可設定 factory_id，不限定 `KN`
- [ ] MQTT disconnected / reconnecting / connected 狀態正確
- [ ] timeout 後 status 正確
- [ ] Phase 4 spectra / commit / review / fix 完成

## Phase 5 驗收

- [ ] MQTT message 進來後 Socket.IO 推送
- [ ] 前端 1 秒內更新 live metrics
- [ ] Header MQTT badge 即時更新
- [ ] Offline Error Display 可觸發
- [ ] Offline Error Display 顯示最後更新時間
- [ ] Offline Error Display 顯示錯誤原因
- [ ] retry countdown 正確
- [ ] 連線恢復後自動回展示頁
- [ ] Socket reconnect 不重複 listener
- [ ] Phase 5 spectra / commit / review / fix 完成

## Phase 6 驗收

- [ ] 累積值寫入 SQLite
- [ ] 系統重啟後累積值不歸零
- [ ] `today_mwh` 可正確轉為 kWh
- [ ] `zone.total_mwh` 可正確轉為 kWh
- [ ] power 積分估算合理
- [ ] CO₂ 換算公式可設定
- [ ] metric snapshots 正常寫入
- [ ] daily summary 正常寫入
- [ ] history API 可查 day / week / month / year
- [ ] Energy Trend Summary 圖表正確
- [ ] Energy Data History 圖表正確
- [ ] Phase 6 spectra / commit / review / fix 完成

## Phase 7 驗收

- [ ] 播放頁可自動輪播
- [ ] 每頁停留秒數可設定
- [ ] 頁面順序可設定
- [ ] 頁面啟用 / 停用可設定
- [ ] autoplay off 時不自動播放
- [ ] loop off 時播完停止
- [ ] schedule 正確
- [ ] idle mode 正確
- [ ] Slideshow Preview 顯示目前頁面與倒數
- [ ] 設定更新後即時生效
- [ ] Phase 7 spectra / commit / review / fix 完成

## Phase 8 驗收

- [ ] 圖片可上傳
- [ ] 只允許 JPG / PNG / WebP
- [ ] metadata 正確寫入 DB
- [ ] 圖片列表正確顯示
- [ ] 圖片可修改標題與描述
- [ ] 圖片可加入 / 移出輪播
- [ ] 圖片可設為封面
- [ ] 圖片可刪除
- [ ] storage usage 正確
- [ ] Images 展示頁讀取 enabled images
- [ ] Phase 8 spectra / commit / review / fix 完成

## Phase 9 驗收

- [ ] 可新增迴路
- [ ] 可修改迴路
- [ ] 可刪除迴路
- [ ] 可排序迴路
- [ ] 可設定 mqttTopic
- [ ] 可設定 ratedCapacity
- [ ] loadPercent 正確
- [ ] normal / attention / warning 判斷正確
- [ ] MQTT topic 對應 circuit power 正確
- [ ] Factory Circuit 動態顯示啟用迴路
- [ ] Phase 9 spectra / commit / review / fix 完成

## Phase 10 驗收

- [ ] Device Status 可顯示 uptime
- [ ] Device Status 可顯示 OS / app version
- [ ] Device Status 可顯示 IP / MAC
- [ ] Device Status 可顯示 CPU / memory / disk
- [ ] Device Status 可顯示 MQTT status
- [ ] logs 可查詢
- [ ] logs 可匯出
- [ ] reboot stub 不會危險執行
- [ ] systemd 文件完整
- [ ] kiosk mode 文件完整
- [ ] `.env.example` 完整
- [ ] production build 成功
- [ ] SQLite backup script 可用
- [ ] 最終 smoke test 通過
- [ ] Phase 10 spectra / commit / review / fix 完成
