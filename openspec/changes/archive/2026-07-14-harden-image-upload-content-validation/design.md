## Context

upload route已限制 extension與10 MB，但在 writeFileSync前沒有byte-level type/dimension檢查。引入 sharp會增加Pi native dependency與部署風險；需求只需要三種既有格式的 container identification、dimensions與截斷防護。

## Goals / Non-Goals

**Goals:**

- 寫檔／DB前辨識 PNG/JPEG/WebP bytes與 dimensions。
- extension、declared MIME、detected type一致。
- 拒絕 truncated與超 budget圖片。
- 保留10 MB、cleanup與安全 error contract。

**Non-Goals:**

- 不decode/transcode完整 pixels。
- 不新增格式、virus scan或media pipeline。
- 不引入 native image dependency。

## Decisions

### Use a pure byte parser with no native dependency

新增純函式 validator：

- PNG：驗8-byte signature、IHDR長度/type、正整數 width/height，逐 chunk檢查 bounds並要求 IEND完整。
- JPEG：驗 SOI，逐 marker segment檢查 length bounds，從支援的 SOF marker讀 dimensions，要求 EOI存在且不允許截斷 segment。
- WebP：驗 RIFF/WEBP、RIFF declared size不超過buffer，從 VP8／VP8L／VP8X讀 dimensions並驗 chunk bounds。

回傳 discriminated result：ok時含 format、mimeType、width、height；失敗含固定 validation code，不含 raw bytes。

### Enforce type agreement and fixed dimension budgets

extension mapping固定 .jpg/.jpeg→image/jpeg、.png→image/png、.webp→image/webp。declared multipart MIME與detected MIME必須完全相符。width/height各<=8192且 width*height<=33,177,600；10 MB compressed-size先後皆維持。

limits是FHD 4x與8K級素材的上界，不由 env調整，避免新增未要求的config surface。

### Validate before writes and preserve cleanup

route取得buffer並檢查10 MB後立即呼叫validator；任何 failure回400 safe message，且不呼叫 ensureUploadsDir、writeFileSync或 DB insert。成功時 DB mime_type使用detected值。

validation後若 metadata insert或playlist bootstrap失敗，沿用既有 deleteImageFile cleanup與 transaction behavior。

## Implementation Contract

- Behavior：合法三格式正常上傳；renamed、MIME mismatch、truncated、invalid dimensions與超 budget輸入在persist前400。
- Interface：validateImageContent(buffer)回 tagged success/error；error codes固定為 unsupported-signature、truncated-container、invalid-dimensions、dimension-limit。
- Failure modes：任何 parser bounds讀取先檢查offset；unexpected input轉成 validation error，不拋出含buffer/path的例外。
- Acceptance：pure fixture tests、route persistence-negative tests、既有 image/playlist/fallback tests、server build/test通過。
- In scope：三格式 parser、fixed limits、route integration、docs。
- Out of scope：full decode、transcode、新格式、native dependencies。

## Risks / Trade-offs

- [header-valid但像素資料損壞] → contract只保證 container bounds與dimensions，不宣稱完整decode；full decode另開media change。
- [嚴格 JPEG/WebP bounds拒絕少數非標準檔] → 用現有 production assets與合法 fixtures作compatibility corpus。
- [parser出現integer overflow] → 所有 length與pixel arithmetic先驗 safe integer與buffer bounds。

## Migration Plan

無資料 migration；既有 files不回溯掃描。新規則只套用新 upload。若 compatibility corpus發現合法既有 producer被拒，先補格式 fixture與parser規則，不放寬byte/type一致性。
