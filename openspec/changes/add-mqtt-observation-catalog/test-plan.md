# Test Plan｜MQTT已接收資料清單與受控來源探索

所有數值、Topic、tag和payload均為合成fixture，不是現場資料。此文件列出未執行的產品測試，不能當測試結果。

## Requirement / Scenario Matrix

### M1-R1-S01 — Unmapped message is visible

需求：M1-R1。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an allowed exact topic has no generic mapping
- WHEN a discovery subscriber receives its payload
- THEN an unmapped candidate appears without inserting a metric, a meter baseline, or a page binding
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R1-S02 — Configured source has no observation

需求：M1-R1。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a mapping exists but no matching message has been observed
- WHEN the operator opens the catalog
- THEN the mapping appears as waiting for data, not as a discovered live meter
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R2-S01 — Configured KN reception group

需求：M1-R2。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN KN has an approved named MQTT reception group
- WHEN the KN operator presses find meters
- THEN the server uses that group under the current authorization without asking for topic strings or broker credentials again
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R2-S02 — Unknown namespace

需求：M1-R2。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN no KN reception scope is approved
- WHEN discovery is requested
- THEN the UI explains the one-time missing scope and offers authorized inline configuration; it does not silently guess kn/# or subscribe to everything
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R3-S01 — Stop does not unsubscribe production

需求：M1-R3。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an existing production mapping and a discovery session observe the same topic
- WHEN the discovery session expires
- THEN production subscription and accepted readings continue unchanged and the discovery connection is closed
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R3-S02 — Two simultaneous users

需求：M1-R3。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN two authorized operators start discovery
- WHEN the sessions connect and one is canceled
- THEN unique client IDs prevent runtime disconnection and the remaining session is unaffected
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R4-S01 — No new data after a grant

需求：M1-R4。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN the broker grants the approved filter but sends no matching packet
- WHEN capture ends
- THEN the UI reports the observation window and no received data, offering retry or scope review without declaring zero installed meters
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R4-S02 — One filter refused

需求：M1-R4。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN one filter is granted and another is refused
- WHEN capture returns candidates
- THEN coverage is partial and the refusal is shown; the result is not reported as a complete scan
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R5-S01 — Publisher client ID unavailable

需求：M1-R5。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a normal MQTT message contains only a meter reading
- WHEN the UI shows source details
- THEN publisher client ID remains unknown; the subscriber runtime client ID is not shown as its publisher
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R5-S02 — Publisher claims a device ID

需求：M1-R5。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a payload includes clientId and deviceId fields
- WHEN the candidate is displayed
- THEN the UI labels them payload-declared identifiers and preserves the exact topic and receive time as independent evidence
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R6-S01 — Old retained sample

需求：M1-R6。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a retained packet observed last month is delivered now
- WHEN the operator reviews it
- THEN it can help configure extraction but is not shown as a fresh reading or counted as current-period energy
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R6-S02 — One retained tag on a multiplexed topic

需求：M1-R6。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN one topic previously carried many tags but only the latest retained packet is available
- WHEN discovery receives that packet
- THEN the catalog shows only that observed tag and explicitly does not claim to know all historical tags
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R7-S01 — Interleaved tag observations

需求：M1-R7。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN one exact topic reports MAIN then STAMP then MAIN
- WHEN the catalog updates
- THEN both candidate tags remain selectable and are not merged into a single changing meter
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R7-S02 — Schema changes during selection

需求：M1-R7。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN one selected topic reports a new payload shape
- WHEN the catalog refreshes
- THEN the selected candidate keeps its original revision and shows a changed-schema warning rather than silently repointing its value
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R8-S01 — Oversized or hostile payload

需求：M1-R8。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a packet is oversized or contains a script-like field and a token
- WHEN it is inspected
- THEN bounded handling rejects or truncates with a visible reason, renders text safely, redacts the token and does not block production ingestion
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R8-S02 — Unauthorized sample access

需求：M1-R8。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a CL-only user obtains the ID of a KN capture
- WHEN they request a sample or stream
- THEN the server denies access without returning KN topic names, payloads, or cached samples
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R9-S01 — A device is temporarily offline

需求：M1-R9。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN no live candidate is available but an operator has a JSON example
- WHEN they paste it inside the current task
- THEN the preview is labeled offline example and can prepare a waiting-for-data mapping without claiming actual reception
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R9-S02 — Return after expiry

需求：M1-R9。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an earlier catalog entry remains known but its raw samples expired
- WHEN the operator opens its field picker
- THEN the UI requests a new capture or an example in place and does not reuse an expired raw body
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R10-S01 — Expired sample reference

需求：M1-R10。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a draft selects a capture that expires
- WHEN preview is requested
- THEN the draft is preserved and the UI offers refresh evidence; it does not substitute an unrelated latest payload
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R10-S02 — Broker injection in sample

需求：M1-R10。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an example payload contains a host field pointing elsewhere
- WHEN the candidate is previewed
- THEN no network connection to that host occurs; connection identity stays the approved configured reference
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R11-S01 — Feature rollback

需求：M1-R11。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN catalog discovery is disabled while a session is active
- WHEN rollback completes
- THEN the session ends and production sources, mappings and history remain available
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M1-R11-S02 — Managed Solar candidate

需求：M1-R11。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a discovered topic belongs to a registered managed adapter
- WHEN the operator selects it
- THEN the UI offers the managed source or diagnostics and does not create a conflicting generic energy mapping
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

## Required Test Boundaries

先以隔離Broker測MQTT 3.1.1，若實作開啟5.0亦跑該版本；包含retained重送、SUBACK失敗、重連、相同Topic不同tag、錯序array、慢速/不發資料、capture退出與production不中断。shared extractor使用正反例，SQLite前後snapshot確認preview零寫入。API測越權、expired refs、schema/conflict、idempotency。UI測1366×768及1920×1080、鍵盤焦點、批次選取不因更新跳動、原任務返回與錯誤恢復。最終Q1以同一批真實測試流程對帳來源、期間用量、月圖與部門占比。

## Negative Completion Claims

自建Python文件／合成selector示範不是production extractor測試；沒有現場樣本時不宣稱支援現場格式已驗收；沒有至少三位未受教學操作員測試不能宣稱免手冊成功。
