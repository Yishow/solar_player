# 正式入口管理畫面（synthetic broker）

### R1 正常情境：保存並啟用（active）

```text
接入新資料目前廠區 KN。連線廠區已接收資料確認先在已批准的接收範圍取得實際樣本，才能選欄位；樣本不會寫入正式讀值。開始接收重新整理factory/kn/mainkn-main — cumulative-energy / consumption / kWh已選 Topic factory/kn/main已選來源 kn-main（cumulative-energy，kWh）從已接收資料選欄位預覽已完成，尚未套用。套用對應對應已保存。訂閱已生效（factory/kn/main）。尚未收到資料。已收到 1 個 Topic 的樣本，可選取要對應的 Topic。上一步下一步
```

### R1 失敗情境：已保存但 broker 拒絕訂閱（failed，可重試）

```text
接入新資料目前廠區 KN。連線廠區已接收資料確認先在已批准的接收範圍取得實際樣本，才能選欄位；樣本不會寫入正式讀值。開始接收重新整理factory/kn/mainkn-main — cumulative-energy / consumption / kWh已選 Topic factory/kn/main已選來源 kn-main（cumulative-energy，kWh）從已接收資料選欄位預覽已完成，尚未套用。套用對應對應已保存。訂閱尚未生效：BROKER_SUBSCRIBE_REFUSED。可重試套用，不需重新新增來源。尚未收到資料。已收到 1 個 Topic 的樣本，可選取要對應的 Topic。上一步下一步
```

### R1 重試情境：同一操作重試後訂閱生效且已收到資料

```text
接入新資料目前廠區 KN。連線廠區已接收資料確認先在已批准的接收範圍取得實際樣本，才能選欄位；樣本不會寫入正式讀值。開始接收重新整理factory/kn/mainkn-main — cumulative-energy / consumption / kWh已選 Topic factory/kn/main已選來源 kn-main（cumulative-energy，kWh）從已接收資料選欄位預覽已完成，尚未套用。套用對應對應已保存。訂閱已生效（factory/kn/main）。已收到資料。已收到 1 個 Topic 的樣本，可選取要對應的 Topic。上一步下一步
```

### R4 確認畫面（server 解析出的實際目標）

```text
即將發送到 broker localhost:1883 / topic factory/kn/main， 廠區 kn，指標 consumptionEnergy，來源 kn-main r1， 值 77.25 kWh，retain=false。payload：{"value":77.25}確認發送取消發送
```

### R4 失敗情境：目標已變更，前端被要求重新確認

```text
接入新資料目前廠區 KN。連線廠區已接收資料確認確認後可到廠區用電設定指定總錶與部門。解析預覽不會發送 MQTT。真的發送測試值是另一個動作，預設不 retained，且要由後端解析出實際目標後確認。要發送的值發送測試值（需確認）發送目標或內容已變更，未發送任何訊息；請重新確認實際目標。上一步下一步
```
