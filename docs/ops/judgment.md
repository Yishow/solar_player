# Repo 風險與授權判準

任務分流、完成狀態與提交依 `docs/ops/workflow.md`；測試入口依 `docs/ops/conventions.md`；FHD 證據依 `docs/ops/fhd-closeout.md`。本檔只定義何時需要決策與何時偏離方向。

## 何時詢問

- 預期行為、change 目標或產品需求有實質歧義，現有規格與對話無法解決。
- 需要超出授權範圍，例如原本的樣式修正變成 route shell、API 契約、SQLite schema 或 MQTT topic 結構改造。
- 尚未取得相應授權，就要部署／重啟真實環境、修改真實 `.env`／SQLite 資料／uploads，或進行不可逆操作；先說明目標、影響與回復方式。
- 想放寬既有安全邊界，如上傳限制、MQTT 密碼遮罩、device reboot 停用，而使用者尚未明確核准。
- 批次歸檔或刪除 changes，尚未取得具體清單核准；單一已完成 change 按 workflow 歸檔。
- FHD 差異是否 intentional、品質是否可接受、deployment／launch acceptance，必須由使用者判定；既有有效驗收可沿用，影響驗收結果的變更須重新驗證與驗收。

只暫停依賴答案的工作，繼續獨立且已授權的部分。先檢查既有授權，不為相同範圍重問。

## 可直接執行

- 已授權需求／Spectra tasks 內的本機實作、命名、測試與必要檔案切分；不因路徑是 `deploy/` 或涉及 schema 就再次詢問。
- 受影響測試、witness、read-back、review、範圍內 findings 修正與最後驗證；操作仍須遵守真實環境與資料的授權邊界。
- FHD 差距無法由 editor 表達時，依 capability-first 原則補足已授權的 editor 能力；若需要改變產品契約或超出原範圍，先釐清並更新 change。

## 偏離方向的訊號

- 用 playback page-local hardcode 繞過 `/display-pages/editor`，或以 prototype HTML 取代 `docs/reference/FHD/` PNG 為視覺依據。
- 為 playback 視覺 polish 擴張 route shell、server API 或資料架構；應回到 editor capability 與本次差距。
- 共用 component／style 修改讓 management 頁意外跟著變，或把 playback 的 flow／circuit／展示版面換成管理表格、toolbar、generic 管理元件。

出現上述訊號時停止該修改方向，確認影響與需求，再決定有界修正；不得把 AI 判斷的「看起來可以」當成人工 acceptance。
