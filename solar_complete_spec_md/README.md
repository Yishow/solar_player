# Solar Display Complete Specification

此壓縮包包含太陽能播放系統的完整規格文件，技術棧如下：

- Vite + React + TypeScript
- Node.js + Fastify
- MQTT.js
- WebSocket / Socket.IO
- SQLite，用於儲存累積值、歷史資料、設定與圖片 metadata
- OpenAPI 3.1
- 不包含權限 / 登入策略

## 文件列表

1. `00_System_Overview.md`
2. `01_Frontend_Spec_Vite_React_TS.md`
3. `02_Backend_Spec_Fastify.md`
4. `03_MQTT_Spec.md`
5. `04_Realtime_WebSocket_SocketIO_Spec.md`
6. `05_Database_Spec_SQLite.md`
7. `06_OpenAPI_Spec.md`
8. `07_openapi.yaml`
9. `08_design_tokens.md`
10. `09_Page_Requirements.md`
11. `10_Implementation_Roadmap.md`
12. `11_Acceptance_Criteria.md`
13. `12_database_schema.sql`
14. `13_Environment_and_Deployment.md`

## 結論

這份規格已經足夠作為開發依據，可直接拆分為 frontend、backend、MQTT、database、deployment 任務。
