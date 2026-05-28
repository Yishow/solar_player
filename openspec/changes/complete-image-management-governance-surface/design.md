## Context

`Image Management` 已經從第二套主圖庫轉向 governance + editor handoff surface，但目前還有幾個真空區：selection editor 一次只編輯一筆 playlist row、focus/crop action 仍是 disabled placeholder、display references 與 delete blockers 只有 raw status text、playlist bootstrap 雖可補 row，卻沒有被放進完整治理流程裡。這些問題會讓頁面看起來像方向正確但尚未收尾的工作台。

## Goals / Non-Goals

**Goals:**

- 補齊 `Image Management` 作為 playlist/runtime governance surface 的完整操作閉環。
- 保持 asset replacement 與 layout authoring 仍由 editor workspace 承接，不再長第二套 authoring UI。
- 讓 references、delete blockers、playlist rows、cover/fallback actions 都有清楚的治理語義。

**Non-Goals:**

- 不在 `Image Management` 內重建完整的 editor asset workspace。
- 不擴大成通用 DAM 或批次內容管理系統。
- 不重做 image upload storage contract，除非是支援治理操作所必須的最小調整。

## Decisions

### Keep asset replacement and focal editing on the editor handoff path

目前 disabled 的 focus/crop action 不應被補成第二套 page-local editor。這個 change 會把該 action補成可執行的 handoff workflow，例如帶著 selected asset deep-link 進入 editor workspace，使 asset authoring 仍維持單一路徑。

### Separate asset metadata governance from playlist entry governance

單一素材可能對應多筆 playlist/runtime rows，因此 editor panel 不應再只編輯排序最前的第一筆。設計上會把 asset metadata 與 playlist entry governance 明確分開，讓 operators 能切換或總覽多筆 rows 的 runtime/fallback/order/duration/enable 狀態。

### Make references and delete blockers structured triage surfaces

display references、delete blockers、playlist bootstrap 狀態必須是結構化 triage surface，而不是單一 `mgmt-status` 文字塊。這樣 operators 才能知道是 live 還是 draft 參照、哪個目標正在阻擋刪除、以及需要回 editor 還是先補 governance row。

## Implementation Contract

**Behavior**

- `Image Management` SHALL 讓 operators 清楚區分 asset metadata、playlist/runtime governance、display references、editor handoff 四個工作面。
- 當單一素材對應多筆 playlist rows 時，頁面 SHALL 提供可理解且可切換的 row-level governance，而不是隱性只編輯第一筆。
- focus/crop action SHALL 成為真實工作流；若 authoring 仍由 editor 承接，頁面 SHALL 提供帶上下文的 handoff，而不是 disabled placeholder。
- delete blockers SHALL 明確指出阻擋來源與下一步，而不是只顯示泛用禁止訊息。

**Interface / data shape**

- selection panel data SHALL 區分 asset fields 與 playlist entry fields，並能表示 one-to-many playlist entry relationship。
- references data SHALL 區分 stage、target label、reference kind 與 operator-facing message。
- handoff action SHALL 保留 selected asset context，讓 editor workspace 可直接承接。

**Failure modes**

- 若多筆 playlist rows 仍只能編輯第一筆，視為 change 未完成。
- 若 focus/crop 按鈕仍然 disabled，或沒有明確 handoff context，視為未完成。
- 若 delete blockers 與 references 仍只能靠自由文字掃讀，視為治理 surface 不完整。

**Acceptance criteria**

- image-management tests 能驗證 multi-entry governance、reference triage、delete blocker behavior 與 handoff contract。
- manual review 能回答「這張圖被哪裡用到」「我現在編的是哪筆 playlist row」「要改焦點該去哪裡」「為什麼不能刪」。

**Scope boundaries**

- 本 change 補 governance completeness，不承諾完整重做 asset editing 引擎。
- editor workspace 仍是唯一的 asset authoring 主入口。

## Risks / Trade-offs

- [把頁面做回第二套 editor] → 明確限制為治理面，authoring 只做深連結 handoff。
- [multi-entry governance 讓右側面板過度複雜] → 將 asset fields 與 playlist row fields 分層，避免所有欄位同時攤平。
- [references 呈現太細造成資訊噪音] → 先以 triage-first 結構呈現，只把關鍵阻擋與 stage 差異放進首屏。
