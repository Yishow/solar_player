# 觀音工程別導入：依成果接收，不以逐錶重建為前提

2026-09-16修訂，取代8beacbd的SITE_LOAD／FEEDER先行與KN必填DDE／meterId計畫。詳規為G的KNE/EPR、F的KNP啟用關卡，以及 [交接契約](KN-ENGINEERING-CONTRACT.md)。此文件沒有聲稱已確認實際payload或已部署。

## 最小成果

先接一個已確認工程的成果，再擴至八個既有工程：stamping、body、painting、assembly、utility、office、heavy_vehicle、ed_coating。上游自行處理工程內來源；Player不重算同一工程內的raw加總，不要求先找總錶或複製CL點表。

每工程mode由實樣決定：kW功率、每日已算好kWh、或連續累積kWh。發布頻率不是mode。八工程來源可以逐一啟用；缺件列保留。SITE_LOAD/GRID_IMPORT等其他量測可日後明確提出，但不是本次八工程的必要來源。

## 交付關卡

| Gate | 要做什麼 | 通過證據 |
|---|---|---|
| K0 工程交接 | 確認engineeringId、publisher、實樣、mode/unit、範圍及definition | 不需要每顆錶／Item；未知欄位明示，source draft停用 |
| K1 合約 | 批准exact topic、calendar、quality、delivery/replay與更正權限 | identity與欄位完整，不用上游發送時間猜所屬期別 |
| K2 隔離驗證 | preview與shared gate、錯topic、日界／版本、duplicate、partial | fixture／隔離Broker結果明列；不發正式測試值 |
| K3 Shadow | 原始上游成果與Player解析/結果比對，零canonical寫入 | 日量直接比、counter看連續性、power看observedAt；各自證据 |
| K4 接收啟用 | reviewed source、SUBACK、正式到件／usable period分開 | 單authority、無fake meter、可見7/8缺件、不等待全廠總錶 |
| K5 會計與展示 | typed profile/provider與period-aware display binding | raw/工程擇一層；不覆寫kW、日月期別一致，缺件不0 |
| K6 回退演練 | 停新來源、版本更正／補收故障檢查 | history保留、其他工程／CL／Solar不變 |

操作責任：上游成果owner提供樣本、定義、訂正與可補收期間；Player管理者批准source/calendar／authority；整合工程師驗證正反例與readers；現場責任人核對工程涵蓋範圍。這些角色尚未指派姓名，不填虛構owner。

## 觀察目標按模式，不一律72小時

功率依批准cadence/freshness驗證；累積模式需有效baseline與definition/epoch連續性；daily至少測兩個不同期間、一次同期間修正、一次缺件／補收，且確認日界歸屬。需要連續現場天數由選定mode和上游頻率審核；舊72小時是舊raw計畫建議，不是所有工程接入前提，也不是已完成的測量。每日100與120應合計220；首筆完整日成果不等下一筆counter。

## 停止與回退

錯工程／錯單位、未知definition或雙authority、期間重疊、同版異值、舊projection偽current時阻擋對應新結果。未收到或報表partial不能改成0。停用只影響此receiver來源，不下上游控制命令；history與修正紀錄保留，raw fallback不得暗中啟動。

## 尚待上游確認

實際mode/payload、工程範圍定義、發布責任、deadline/grace、可補收期間、訂正與換發布者的權限。這些是工程成果交接，不是要求提供DDE/OPC或所有物理錶；未確認的保持未配置，文件提交不是現場驗收。
