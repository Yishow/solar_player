## Context

`readImagePlaylist()` 會解析 assets 並透過 `fileHash()` 對每個 `/uploads/images/` source同步讀整個檔案再算 SHA-256。Effective rotation 在 cache key/evaluation之前會取得 Images playlist duration，因此多個 display 的頻繁 runtime refresh仍會先支付 hash成本。Upload route 已經手上有完整 buffer，最適合一次計算 hash。Delete route目前則沒有 filesystem/DB 原子性；SQLite transaction也無法直接包含 unlink。

## Goals / Non-Goals

**Goals:**

- 未變圖片在 runtime read 上不讀完整 file body。
- asset hash仍能代表實際 bytes，供 offline cache integrity 使用。
- bulk duration錯誤 input 零 mutation。
- delete 任一階段失敗都不留下「catalog消失但檔案仍可被正式 URL 存取」的狀態。

**Non-Goals:**

- 不做圖片壓縮/CDN。
- 不改 playlist entry ownership model。

## Decisions

### Content hash 成為 asset metadata

`image_assets` 新增 `content_sha256`，並可搭配 `content_size`/mtime identity 供 out-of-band file replacement detection。正常 upload 直接從已驗證 buffer 計算並寫入 DB；seed/import 在 bootstrap時計算。Runtime `readImagePlaylist()` 只讀 metadata，不再 `readFileSync`。

若允許 deployment/restore 直接替換 uploads，startup/backfill helper 比對 size/mtime identity，不一致才重算 hash並更新 metadata。Hash計算離開 5–7 秒 polling hot path。

### Bulk duration route 先 validate 再呼叫 mutation

Route parser要求 `durationSeconds` 為 JSON number、finite、integer 且 `>=1`。不合法直接 400；service也 defensive reject/throw，不再把 NaN/0 normalize成 1。

### Delete 使用 served-namespace tombstone

刪除前確認 reference governance。若可刪，先將檔案原子 rename 到 uploads 外或不會被 static prefix服務的 `.trash` 目錄；rename失敗則不動 DB。接著在 SQLite transaction刪 playlist rows與 asset row；transaction失敗就 rename回原位。Commit成功後 unlink tombstone；unlink失敗不回復已刪 DB，但記錄 bounded cleanup-pending狀態，因檔案已不在 served namespace所以不會形成可存取 orphan。

## Implementation Contract

- 同一未變 playlist 連續讀取 100 次，hash file-body read 次數不得隨讀取次數成長。
- upload bytes 的 stored hash 必須等於 runtime manifest使用的 hash。
- `{}`、`0`、負數、字串或非整數 bulk duration request 回 400，所有 entry duration保持原值。
- file stage rename失敗時 DB/playlist完全不變。
- DB delete transaction失敗時 staged file回到原 URL。
- final tombstone unlink失敗時原 `/uploads/images/<file>` 不可再被服務，cleanup diagnostic可見。

## Migration Plan

新增 nullable hash metadata columns；migration不在 DDL transaction內掃大檔。升級後由 bounded bootstrap/backfill依現有 assets補值，並可分批執行。直到某 asset hash補完前，該 asset可標記 cache-not-ready；不得每個 playback request都重算。Rollback保留額外 columns不影響舊 binary。

## Risks / Trade-offs

- [Risk] hash backfill 首次升級會讀所有圖片 → 在 startup/maintenance階段分批並記錄進度，不放進 request hot path。
- [Risk] 外部直接改檔造成 metadata hash過期 → 使用 size/mtime identity或 deployment restore hook標記 dirty，必要時重算。
- [Risk] tombstone cleanup累積 → 提供 bounded startup cleanup與 Device Status/diagnostic warning，不讓 tombstone位於 public static root。
