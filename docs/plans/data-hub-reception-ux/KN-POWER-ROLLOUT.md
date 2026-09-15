# 觀音 KN 電力導入計畫

## 目前已知與尚未確認

使用者已確認：電力資料由上游 server 交給 opc_mqtt 發布，Player 訂閱。使用者亦明確表示觀音電力尚未規畫。因此本檔只預留邏輯 tag 與驗收步驟，不代表現場已有這些設備。最新 bridge 用 DDE；KN 是否也具備同一 InTouch／DDE 介面，尚待現場核對。[S18/S20]

## 先做哪個最小成果

第一個目標是**可追蹤到實際電錶的單一累積通道**。優先核對 SITE_LOAD_KWH 的全廠負載邊界；若現場暫時只有 GRID_IMPORT_KWH，先明確顯示「電網購入電量」，全廠總用電保持未完成。沒有即時功率點就不顯示 kW；沒有分錶清單就不做部門百分比。

Solar 是發電資料，不是用電。購電＋發電也不一定等於負載用電：外送、儲能、量測邊界可能不同。此案不硬寫新的能源公式；由有電氣知識的現場負責人確認邊界，再依既有 E1 role/E6 profile 支援的配置審核。[S26]

## 階段與出口條件

| 階段 | 工作與負責角色 | 完成證據／未通過時 |
|---|---|---|
| 0 現場盤點 | 現場電力負責人提供來源協定、VIEW Session、精確 Item、物理錶號、上下游關係、方向、CT/PT 是否已乘、單位與更新週期；整合工程師登錄 | 每個候選有審核表；缺 Item/邊界的項目維持 disabled，不複製 CL |
| 1 唯讀取得 | 整合工程師在批准的 source host 測讀，不寫 PLC/SCADA；DDE 與 VIEW 同使用者同 Session，或先確認另一 acquisition adapter | 原始 text＋逐點時間＋品質限制；正常數字不等於已完成 MQTT |
| 2 發布契約 | 實作獨立 publisher/site/Client ID、v1 schema、sampleId、decimal、live retain=false、診斷分流 | 隔離 Broker 檢查 exact topic／payload／ACK；CL 同時在線不互踢 |
| 3 Player shadow | 實作共同 v1 gate，設定批准 KN profile；只檢視與預覽，不寫 accepted history／baseline | topic/site/tag/publisher 對得上；時間、單位、scaling、virtual/raw 清楚；preview=零 domain writes |
| 4 E1 審核啟用 | 審核物理 meter/channel/epoch、role、來源時間／估計政策及品質限制；只開一條 canonical writer | 原始與 normalized 值一致；same sample 重送／restart 不重複寫；無 source time 不假裝精確 |
| 5 E6／區間 | 確認 siteTotal、部門與 shareBasis；不把 main+child 或 raw+virtual 重複算；siteTimeZone=Asia/Taipei 經 profile 審核 | 足夠 baseline 才有日／月區間；新起算的月資料標 coverage 不足，不能填滿過往月份 |
| 6 展示接線 | 經既有 display editor 綁定 KN scoped metrics，不改畫面硬碼 | 展示值與明確來源／單位／時間／coverage 一致；缺 power 仍不可用 |
| 7 受控切換 | 現場負責人簽認；整合工程師留配置備份與回退方式 | 只有通過的 KN 通道啟用，CL/Solar 不受影響；未確認的保持未配置 |

角色是責任分工，不是已指派的人名。階段依賴順序是 0→1→2→3→4→5→6→7；UI 外觀與模擬 fixture 可獨立前進，不能用它們跳過現場 gate。

## 需取得的點位審核欄位

每列記錄：logical tag、exact source Item、site/physical meter/channel、盤別與上游/下游、原始數值與單位、方向、CT/PT/乘數是否已套、設備 reset/rollover 行為、來源事件時間或缺失、source quality 可用性、更新週期、最大讀取／傳送延遲、時鐘同步證據、reviewer/date、enabled 與停用理由。實體 meterRole／部門歸屬只存 E6，不塞入 E1 的另一份帳務定義。

## 觀察與對帳計畫（尚未執行）

提案以至少 72 小時且涵蓋兩個 Asia/Taipei 午夜邊界作首輪 shadow／受控觀察目標；這不是承諾目前已量測或資料已完整。將來源表值、bridge exact value、Player accepted value 逐筆比對；區間誤差容許值由儀表精度與採樣時差審核，不任意寫 1% 就通過。

掉線、重啟、重送、舊 retained、單點失敗、公式改組、跨廠誤標測試，先在隔離 Broker 和 synthetic fixtures 執行，不能為驗證去中斷正式設備。現場測試另經授權，只讀觀察；保留測試環境、版本、時間、原始證據與結果。72 小時不能補足當月月初 baseline，缺的仍標不可用或覆蓋不完整。

## 立即停止條件與回退

site/physical mapping 不確定、數值方向／單位錯誤、重複 Client ID、topic 多主、品質無法評估、來源時間被偽造成發布時間、raw/virtual 重複入帳，任一出現就停止該新通道啟用。關閉新 KN admission，不替換成 CL 值、不刪既有 accepted rows、不重設基線、不解除 Solar managed 訂閱。

回退前保存兩個發布端與 Player 的配置快照；各自只復原自己的設定。既有 legacy admission 恢復須再次確認 single-writer，不能靠兩路全開後看哪個比較快來「容錯」。

## 尚缺的現場資料

KN source 協定／主機與操作 Session、精確 Item、物理錶號、全廠負載和購電邊界、分錶階層、CT/PT、事件時間／品質與更新週期都未取得。上述缺口不以猜測填滿；tag-register 中 reserved rows 保持 null 和 disabled，文件提交不代表 commissioning 通過。
