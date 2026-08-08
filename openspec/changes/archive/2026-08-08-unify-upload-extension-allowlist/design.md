## Context

兩個上傳路由，兩套限制：

| | images | brand |
|---|---|---|
| 副檔名 | `.jpg`、`.jpeg`、`.png`、`.webp`、`.svg` | 同上，另一份複製 |
| MIME 檢查 | 無 | 有 |
| 大小上限 | 10 MB | 2 MB |
| 副檔名拒絕訊息 | 由清單推導 | 寫死 |
| 大小拒絕訊息 | — | 寫死 `2 MB` |

副檔名那一列是唯一真正重複的東西；其餘三列是刻意的差異。`repair-freshness-upload-and-playback-runtime-defects` 修好了 images 側的訊息推導，但沒有處理 brand 側，conventions.md 也還停在「兩份尚未合併」的描述。

## Goals / Non-Goals

**Goals:**

- 副檔名允許清單只有一份，改動它就不可能只改到一半。
- 兩個路由的拒絕訊息都由實際生效的限制推導。
- conventions.md 描述的是現況。

**Non-Goals:**

- 不合併 MIME 檢查、大小上限，或任何其他刻意的差異。
- 不新增內容驗證，不改 `/uploads/` 安全 header。
- 不改成功路徑或回應形狀。

## Decisions

### 清單放在既有的上傳支援模組，不新開一個檔案

`imagesSupport.ts` 已經是上傳處理的共用支援模組——它持有 `ALLOWED_EXTENSIONS`、`MAX_FILE_SIZE`、`INVALID_FILE_TYPE_MESSAGE`、`generateUniqueFilename`、`ensureUploadsDir`。把清單再搬到一個新的中立檔案會製造第三個位置與一輪 import 更新，收益只是名稱好聽一點。brand 直接引用既有匯出即可。

清單的名稱維持 `ALLOWED_EXTENSIONS` 不變，避免無謂的 import 改動。

### 訊息由限制推導，而不是反過來

拒絕訊息的唯一職責是告訴呼叫端「實際的限制是什麼」。只要它是獨立寫死的字串，它就會漂移——images 側已經漂移過一次。因此兩個訊息都改為在模組載入時從常數算出來：副檔名訊息從清單算，大小訊息從該路由自己的上限算。

大小訊息刻意從 brand 自己的 `MAX_FILE_SIZE` 算，而不是共用 images 的，因為 2 MB 與 10 MB 是刻意的差異。

### conventions.md 必須跟著改

`docs/ops/conventions.md` 目前寫「兩份尚未合併」。合併之後那句話會變成錯的，而 CLAUDE.md 的事實順序是程式高於文件——所以文件必須修正，否則下一個讀它的 agent 會去找一份不存在的第二清單。改寫後要說明的是：清單一份、MIME 檢查與大小上限兩份且刻意不同。

## Implementation Contract

**Behavior**

- 上傳一個副檔名不被接受的 logo，回傳的訊息列出的副檔名集合與該路由實際接受的集合完全相同。
- 上傳一個超過 brand 上限的 logo，回傳的訊息中的大小數字與該路由實際生效的上限一致。
- 兩個路由實際接受與拒絕的檔案集合完全不變；MIME 檢查與大小上限的差異保持原狀。

**Interface / data shape**

- `apps/server/src/routes/imagesSupport.ts` 匯出一個由副檔名集合產生訊息的函式，`INVALID_FILE_TYPE_MESSAGE` 由它產生。
- `apps/server/src/routes/brand.ts` 移除自己的副檔名集合宣告，改為 import；`ALLOWED_MIME` 與 `MAX_FILE_SIZE` 留在 brand。
- 沒有任何 HTTP 回應的欄位名稱或狀態碼改變。

**Failure modes**

- 拒絕訊息的語言與語氣維持各自現況（images 為英文、brand 為繁體中文），只有被列舉的內容改為推導。
- 若未來有人在 brand 加入 images 不接受的副檔名，正確做法是為 brand 建立自己的具名集合，而不是把它加進共用清單；本 change 不預先建立那個擴充點。

**Acceptance criteria**

- `apps/server/src/routes/brand.test.ts` 斷言副檔名拒絕訊息列舉的集合等於實際生效的集合，且大小拒絕訊息中的數字等於實際生效的上限。
- `grep -c "ALLOWED_EXTENSIONS = new Set" apps/server/src/routes/` 在整個 routes 目錄下的結果為 1。
- `apps/server/src/routes/images.test.ts` 與 `brand.test.ts` 既有斷言未修改且全綠。
- `docs/ops/conventions.md` 不再宣稱存在兩份副檔名清單。
- `pnpm verify` 全綠。

**Scope boundaries**

- 在範圍內：`brand.ts`、`imagesSupport.ts`、`brand.test.ts`、`docs/ops/conventions.md`。
- 不在範圍內：MIME 檢查、大小上限數值、內容驗證、`/uploads/` 安全 header、`images.ts` 的既有行為、任何前端檔案。

## Risks / Trade-offs

- brand 引用 images 的支援模組讓兩個路由產生 import 相依。這是刻意的：相依正是「改一份就會同時影響兩邊」的機制，而那就是本 change 想要的結果。若日後兩者的副檔名政策真的分歧，屆時再拆是明確且有理由的動作，而不是現在預先分好。
- 訊息改為推導後，未來調整清單會同時改變使用者看到的文字。這是正確的行為，但代表任何依賴訊息字面內容的測試都必須改為依賴推導結果——本 change 的測試即以此方式撰寫。
