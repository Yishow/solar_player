# Test Plan｜三階段MQTT欄位選取、穩定tag與批次電錶配對

所有數值、Topic、tag和payload均為合成fixture，不是現場資料。此文件列出未執行的產品測試，不能當測試結果。

## Requirement / Scenario Matrix

### M2-R1-S01 — Return from KN total picker

需求：M2-R1。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN the KN total-meter picker opens add from received data
- WHEN the operator completes the three stages
- THEN eligible sources return to the same picker with KN and all other profile draft values preserved
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R1-S02 — Connection already configured

需求：M2-R1。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN the existing broker and KN reception group are authorized
- WHEN the operator selects ten known candidates
- THEN the task does not require ten connections, ten wizard restarts or ten external topic lookups
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R2-S01 — Pick nested cumulative field

需求：M2-R2。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a JSON packet contains measurements.importEnergy and activePower
- WHEN the operator selects importEnergy
- THEN the selector is generated without typing a path and the power field is not selected as energy
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R2-S02 — Change a display name

需求：M2-R2。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a source already has a reviewed stable identity
- WHEN its Chinese name is edited
- THEN the meter ID, profile references and history epoch remain unchanged
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R3-S01 — Two tags share a topic

需求：M2-R3。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN packets on one topic alternate tag MAIN value 1000 and tag STAMP value 200
- WHEN the MAIN binding processes them
- THEN only MAIN updates that meter and the STAMP packet cannot change its value or baseline
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R3-S02 — Array order changes

需求：M2-R3。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a reviewed binding selects tag MAIN in an array
- WHEN MAIN moves from index 0 to index 3
- THEN the same meter is updated using tag identity and not the value now at index 0
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R3-S03 — Duplicate tag in one packet

需求：M2-R3。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN two array records both match MAIN
- WHEN the binding is evaluated
- THEN that binding reports ambiguous identity and emits no accepted reading
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R4-S01 — Literal dotted key

需求：M2-R4。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a payload has the literal key meter.total and also nested meter.total
- WHEN one candidate is selected
- THEN the compiled property tokens identify the selected value unambiguously in preview and runtime
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R4-S02 — High precision counter

需求：M2-R4。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN source lexemes are 9007199254740992.000 and 9007199254740992.125
- WHEN selection and ingestion normalize them
- THEN E1 receives exact decimal values permitting a 0.125 kWh difference without JavaScript precision loss
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R4-S03 — Unsupported binary payload

需求：M2-R4。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a candidate payload requires an unimplemented vendor codec
- WHEN the operator selects it
- THEN the UI says the format is unsupported and offers an example or supported decoder configuration rather than claiming successful mapping
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R5-S01 — Cumulative batch

需求：M2-R5。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN ten reviewed counters use kWh and no additional multiplier
- WHEN the operator confirms the shared cumulative-energy template
- THEN all ten get explicit semantics without ten formula editors, while daily/monthly/yearly values still await appropriate baselines
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R5-S02 — Power and unscaled register mixed

需求：M2-R5。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN some candidates use kW and another has an unknown raw register factor
- WHEN a kWh batch template is chosen
- THEN incompatible or uncertain rows require correction and are not silently enabled as cumulative kWh
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R6-S01 — Highest counter is not necessarily main

需求：M2-R6。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a department counter has the largest lifetime value
- WHEN suggestions are generated
- THEN it is not automatically selected as the site denominator or main meter
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R6-S02 — Two MAIN candidates

需求：M2-R6。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN two approved namespaces contain a tag named MAIN
- WHEN the user searches MAIN
- THEN both show distinguishable topic or device evidence and no target is chosen silently
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R7-S01 — Repeat known format

需求：M2-R7。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN twenty observed KN records share a reviewed extraction structure
- WHEN the operator applies its recipe and reviews targets
- THEN selectors and shared units are filled in bulk while identities remain distinct and only unresolved rows need manual correction
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R7-S02 — Rerun the same batch

需求：M2-R7。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN ten identical bindings already exist
- WHEN the same recipe is applied again
- THEN the UI reports existing matches and does not create another ten meters
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R8-S01 — Preview has no side effects

需求：M2-R8。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an operator previews an uncommitted source batch
- WHEN multiple positive and negative samples are evaluated
- THEN only preview output changes; MQTT publish count and live/history/config tables stay unchanged
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R8-S02 — First sample is not a month

需求：M2-R8。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN one cumulative reading is available
- WHEN the preview succeeds
- THEN the UI confirms extraction but says insufficient period baseline rather than claiming a valid monthly usage
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R9-S01 — Request retry after timeout

需求：M2-R9。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a batch transaction commits but the response is lost
- WHEN the UI retries using the same idempotency key
- THEN the existing result is returned without duplicate sources or resets
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R9-S02 — Broker rejects activation

需求：M2-R9。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN source settings are saved but required runtime subscription is refused
- WHEN apply results are displayed
- THEN the UI reports saved but reception not active and offers retry; it does not report complete/live or inject preview values
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R9-S03 — Concurrent target edit

需求：M2-R9。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a target metric revision changed after preview
- WHEN apply is attempted
- THEN the batch is rejected with a version conflict and the draft remains available
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R10-S01 — Batch feeds department setup

需求：M2-R10。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN new KN MAIN and STAMP source drafts are reviewed within U6
- WHEN the complete profile is applied
- THEN one reviewed transaction establishes source references and the selected profile changes, with no second display-local denominator
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R10-S02 — Standalone source creation

需求：M2-R10。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a source is added without an accounting task
- **WHEN** source apply succeeds
- **THEN** it is available to the site picker but is not silently made the whole-site total or a department denominator
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R11-S01 — Wrong site candidate

需求：M2-R11。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a CL-owned source is selected in KN setup
- WHEN the batch is reviewed
- THEN that row is blocked with a site correction or authorized review action instead of silently relabeling it
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R11-S02 — Existing managed metric

需求：M2-R11。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a candidate proposes a destination managed by Solar or derived-metric ownership
- WHEN apply is requested
- THEN the conflict is blocked and offers the existing compatible source rather than overwriting ownership
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R12-S01 — Value field disappears

需求：M2-R12。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an active meter changes energy to energyRaw with no approved migration
- WHEN the next packet arrives
- THEN the source shows needs-review; no other number is substituted and its last accepted reading is not marked fresh
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R12-S02 — Physical meter is replaced

需求：M2-R12。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a different device takes the same topic and tag
- WHEN an operator confirms replacement
- THEN a new epoch and explicit review are required; no negative delta or fake rollover bridges the devices
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R13-S01 — Old screen saves another mapping

需求：M2-R13。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a selector-aware KN binding exists and a legacy screen edits an unrelated CL mapping
- WHEN the legacy save is received
- THEN the KN selector, identity and revision remain unchanged or the unsafe save is rejected before any mutation
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R13-S02 — Upgrade existing scalar source

需求：M2-R13。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an old scalar mapping receives valid values
- WHEN the new feature is enabled
- THEN its operation is preserved and a guided review can reuse its identity without recreating or double-ingesting it
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R14-S01 — Unassisted batch task

需求：M2-R14。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN an operator is given an authorized broker fixture with twenty mixed candidates
- WHEN they configure the intended KN cumulative sources and target roles
- THEN they use the product UI only, do not type selectors or metric IDs, reject incompatible power rows and complete the reviewed profile without assistance
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

### M2-R14-S02 — Extraction failure recovery

需求：M2-R14。層：shared extraction＋SQLite/API＋isolated MQTT broker＋UI journey。
- GIVEN a selected source no longer has a valid value field
- WHEN the operator follows its inline issue action
- THEN they repair or reselect in the same task with unrelated rows preserved; if coaching is necessary the usability gate fails
- 證據：實際測試輸出、受影響表/訊息/版本對照；UI案例記錄操作與結果，不接正式Broker。

## Required Test Boundaries

先以隔離Broker測MQTT 3.1.1，若實作開啟5.0亦跑該版本；包含retained重送、SUBACK失敗、重連、相同Topic不同tag、錯序array、慢速/不發資料、capture退出與production不中断。shared extractor使用正反例，SQLite前後snapshot確認preview零寫入。API測越權、expired refs、schema/conflict、idempotency。UI測1366×768及1920×1080、鍵盤焦點、批次選取不因更新跳動、原任務返回與錯誤恢復。最終Q1以同一批真實測試流程對帳來源、期間用量、月圖與部門占比。

## Negative Completion Claims

自建Python文件／合成selector示範不是production extractor測試；沒有現場樣本時不宣稱支援現場格式已驗收；沒有至少三位未受教學操作員測試不能宣稱免手冊成功。
